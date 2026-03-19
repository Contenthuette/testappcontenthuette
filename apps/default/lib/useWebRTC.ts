import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Conditional native-only import
let RTC: {
  RTCPeerConnection: any;
  RTCSessionDescription: any;
  RTCIceCandidate: any;
  mediaDevices: any;
  RTCView: any;
} | null = null;

if (Platform.OS !== "web") {
  try {
    RTC = require("react-native-webrtc");
  } catch {
    // react-native-webrtc not available
  }
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface UseWebRTCOptions {
  callId: Id<"calls"> | null;
  isInitiator: boolean;
  isVideo: boolean;
  enabled: boolean;
}

export function useWebRTC({
  callId,
  isInitiator,
  isVideo,
  enabled,
}: UseWebRTCOptions) {
  const [localStreamUrl, setLocalStreamUrl] = useState<string | null>(null);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string>("new");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);

  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const processedRef = useRef<Set<string>>(new Set());
  const hasOfferRef = useRef(false);
  const hasAnswerRef = useRef(false);
  const pendingCandidatesRef = useRef<any[]>([]);
  const setupDoneRef = useRef(false);

  const sendSignal = useMutation(api.calls.sendSignal);
  const signals = useQuery(
    api.calls.getSignals,
    callId && enabled ? { callId } : "skip"
  );

  // Setup WebRTC peer connection & local media
  useEffect(() => {
    if (!enabled || !callId || !RTC || setupDoneRef.current) return;
    setupDoneRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        // Get local media
        const stream = await RTC!.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo
            ? { facingMode: "user", width: 640, height: 480 }
            : false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t: any) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStreamUrl(stream.toURL());

        // Create peer connection
        const pc = new RTC!.RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        // Add local tracks
        stream
          .getTracks()
          .forEach((track: any) => pc.addTrack(track, stream));

        // Handle remote tracks
        pc.ontrack = (e: any) => {
          if (e.streams?.[0]) {
            setRemoteStreamUrl(e.streams[0].toURL());
          }
        };

        // Handle ICE candidates
        pc.onicecandidate = (e: any) => {
          if (e.candidate && callId) {
            sendSignal({
              callId,
              type: "ice-candidate" as const,
              payload: JSON.stringify(e.candidate),
            }).catch(() => {});
          }
        };

        // Connection state changes
        pc.onconnectionstatechange = () =>
          setConnectionState(pc.connectionState);

        pc.oniceconnectionstatechange = () => {
          if (
            pc.iceConnectionState === "connected" ||
            pc.iceConnectionState === "completed"
          ) {
            setConnectionState("connected");
          }
        };

        // Caller creates offer immediately
        if (isInitiator) {
          hasOfferRef.current = true;
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: isVideo,
          });
          await pc.setLocalDescription(offer);
          await sendSignal({
            callId,
            type: "offer" as const,
            payload: JSON.stringify(offer),
          });
        }
      } catch (err) {
        console.error("WebRTC setup error:", err);
        setConnectionState("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
    // These don't change during a call
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, callId]);

  // Process incoming signals reactively
  useEffect(() => {
    if (!signals || !pcRef.current) return;
    const pc = pcRef.current;

    (async () => {
      for (const sig of signals) {
        if (processedRef.current.has(sig._id)) continue;
        processedRef.current.add(sig._id);

        try {
          if (
            sig.type === "offer" &&
            !isInitiator &&
            !hasAnswerRef.current
          ) {
            hasAnswerRef.current = true;
            const offer = JSON.parse(sig.payload);
            await pc.setRemoteDescription(
              new RTC!.RTCSessionDescription(offer)
            );

            // Flush buffered candidates
            for (const c of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTC!.RTCIceCandidate(c));
            }
            pendingCandidatesRef.current = [];

            // Create and send answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (callId) {
              await sendSignal({
                callId,
                type: "answer" as const,
                payload: JSON.stringify(answer),
              });
            }
          } else if (sig.type === "answer" && isInitiator) {
            const answer = JSON.parse(sig.payload);
            await pc.setRemoteDescription(
              new RTC!.RTCSessionDescription(answer)
            );

            // Flush buffered candidates
            for (const c of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTC!.RTCIceCandidate(c));
            }
            pendingCandidatesRef.current = [];
          } else if (sig.type === "ice-candidate") {
            const candidate = JSON.parse(sig.payload);
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTC!.RTCIceCandidate(candidate));
            } else {
              pendingCandidatesRef.current.push(candidate);
            }
          }
        } catch (err) {
          console.error("Signal processing error:", sig.type, err);
        }
      }
    })();
  }, [signals, isInitiator, callId, sendSignal]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()?.[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()?.[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoOff(!track.enabled);
    }
  }, []);

  const flipCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()?.[0];
    if (track?._switchCamera) track._switchCamera();
  }, []);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t: any) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    setLocalStreamUrl(null);
    setRemoteStreamUrl(null);
    setConnectionState("closed");
    processedRef.current.clear();
    hasOfferRef.current = false;
    hasAnswerRef.current = false;
    pendingCandidatesRef.current = [];
    setupDoneRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  return {
    localStreamUrl,
    remoteStreamUrl,
    connectionState,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
    flipCamera,
    cleanup,
    isSupported: !!RTC,
    RTCView: RTC?.RTCView ?? null,
  };
}
