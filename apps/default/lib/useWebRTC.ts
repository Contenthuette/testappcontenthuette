import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type { ComponentType } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

let RTC: {
  RTCPeerConnection: new (config: unknown) => RTCPeerConnectionLike;
  RTCSessionDescription: new (description: unknown) => RTCSessionDescriptionLike;
  RTCIceCandidate: new (candidate: unknown) => RTCIceCandidateLike;
  mediaDevices: {
    getUserMedia: (constraints: unknown) => Promise<MediaStreamLike>;
  };
  RTCView: unknown;
} | null = null;

interface RTCPeerConnectionLike {
  addTrack: (track: MediaTrackLike, stream: MediaStreamLike) => void;
  close: () => void;
  createAnswer: () => Promise<unknown>;
  createOffer: (options?: unknown) => Promise<unknown>;
  setLocalDescription: (description: unknown) => Promise<void>;
  setRemoteDescription: (description: unknown) => Promise<void>;
  addIceCandidate: (candidate: unknown) => Promise<void>;
  localDescription?: unknown;
  remoteDescription?: unknown;
  currentTime?: number;
  duration?: number;
  connectionState?: string;
  iceConnectionState?: string;
  ontrack: ((event: { streams?: Array<MediaStreamLike> }) => void) | null;
  onicecandidate: ((event: { candidate?: unknown }) => void) | null;
  onconnectionstatechange: (() => void) | null;
  oniceconnectionstatechange: (() => void) | null;
}

interface RTCSessionDescriptionLike {}
interface RTCIceCandidateLike {}

interface MediaTrackLike {
  enabled: boolean;
  stop: () => void;
  _switchCamera?: () => void;
}

interface MediaStreamLike {
  getTracks: () => Array<MediaTrackLike>;
  getAudioTracks: () => Array<MediaTrackLike>;
  getVideoTracks: () => Array<MediaTrackLike>;
  toURL: () => string;
}

interface RTCViewProps {
  streamURL: string;
  style?: unknown;
  objectFit?: "contain" | "cover";
  mirror?: boolean;
  zOrder?: number;
}

type RTCViewComponent = ComponentType<RTCViewProps>;

if (Platform.OS !== "web") {
  try {
    RTC = require("react-native-webrtc") as typeof RTC;
  } catch {
    // react-native-webrtc not available
  }
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
] as const;

const HEARTBEAT_INTERVAL_MS = 10_000;

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
  const [connectionState, setConnectionState] = useState("new");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);
  const [setupComplete, setSetupComplete] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnectionLike | null>(null);
  const localStreamRef = useRef<MediaStreamLike | null>(null);
  const processedSignalIdsRef = useRef<Set<string>>(new Set());
  const hasHandledOfferRef = useRef(false);
  const pendingCandidatesRef = useRef<Array<unknown>>([]);
  const setupDoneRef = useRef(false);

  const sendSignal = useMutation(api.calls.sendSignal);
  const heartbeat = useMutation(api.calls.heartbeat);
  const signals = useQuery(
    api.calls.getSignals,
    callId && enabled ? { callId } : "skip",
  );

  useEffect(() => {
    if (!enabled || !callId) return;

    heartbeat({ callId }).catch(() => {});
    const interval = setInterval(() => {
      heartbeat({ callId }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [callId, enabled, heartbeat]);

  useEffect(() => {
    if (!enabled || !callId || !RTC || setupDoneRef.current) return;
    setupDoneRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const stream = await RTC.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo
            ? {
                facingMode: "user",
                width: 480,
                height: 360,
                frameRate: 20,
              }
            : false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStreamUrl(stream.toURL());

        const peerConnection = new RTC.RTCPeerConnection({
          iceServers: ICE_SERVERS,
        });
        peerConnectionRef.current = peerConnection;

        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        peerConnection.ontrack = (event) => {
          if (event.streams?.[0]) {
            setRemoteStreamUrl(event.streams[0].toURL());
          }
        };

        peerConnection.onicecandidate = (event) => {
          if (!event.candidate || !callId) return;

          sendSignal({
            callId,
            type: "ice-candidate",
            payload: JSON.stringify(event.candidate),
          }).catch(() => {});
        };

        peerConnection.onconnectionstatechange = () => {
          setConnectionState(peerConnection.connectionState ?? "new");
        };

        peerConnection.oniceconnectionstatechange = () => {
          if (
            peerConnection.iceConnectionState === "connected" ||
            peerConnection.iceConnectionState === "completed"
          ) {
            setConnectionState("connected");
          }
        };

        if (isInitiator) {
          const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: isVideo,
          });
          await peerConnection.setLocalDescription(offer);
          await sendSignal({
            callId,
            type: "offer",
            payload: JSON.stringify(offer),
          });
        }

        if (!cancelled) {
          setSetupComplete(true);
        }
      } catch (error) {
        console.error("WebRTC setup error:", error);
        setConnectionState("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [callId, enabled, isInitiator, isVideo, sendSignal]);

  useEffect(() => {
    if (!signals || !peerConnectionRef.current || !setupComplete || !RTC) return;

    const peerConnection = peerConnectionRef.current;

    (async () => {
      for (const signal of signals) {
        if (processedSignalIdsRef.current.has(signal._id)) continue;
        processedSignalIdsRef.current.add(signal._id);

        try {
          if (signal.type === "offer" && !isInitiator && !hasHandledOfferRef.current) {
            hasHandledOfferRef.current = true;
            const offer = JSON.parse(signal.payload);
            await peerConnection.setRemoteDescription(
              new RTC.RTCSessionDescription(offer),
            );

            for (const candidate of pendingCandidatesRef.current) {
              await peerConnection.addIceCandidate(new RTC.RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current = [];

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            if (callId) {
              await sendSignal({
                callId,
                type: "answer",
                payload: JSON.stringify(answer),
              });
            }
          }

          if (signal.type === "answer" && isInitiator) {
            const answer = JSON.parse(signal.payload);
            await peerConnection.setRemoteDescription(
              new RTC.RTCSessionDescription(answer),
            );

            for (const candidate of pendingCandidatesRef.current) {
              await peerConnection.addIceCandidate(new RTC.RTCIceCandidate(candidate));
            }
            pendingCandidatesRef.current = [];
          }

          if (signal.type === "ice-candidate") {
            const candidate = JSON.parse(signal.payload);
            if (peerConnection.remoteDescription) {
              await peerConnection.addIceCandidate(new RTC.RTCIceCandidate(candidate));
            } else {
              pendingCandidatesRef.current.push(candidate);
            }
          }
        } catch (error) {
          console.error("Signal processing error:", signal.type, error);
        }
      }
    })();
  }, [callId, isInitiator, sendSignal, setupComplete, signals]);

  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()?.[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  }, []);

  const toggleVideo = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()?.[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoOff(!videoTrack.enabled);
  }, []);

  const flipCamera = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()?.[0];
    videoTrack?._switchCamera?.();
  }, []);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    setLocalStreamUrl(null);
    setRemoteStreamUrl(null);
    setConnectionState("closed");
    processedSignalIdsRef.current.clear();
    hasHandledOfferRef.current = false;
    pendingCandidatesRef.current = [];
    setupDoneRef.current = false;
    setSetupComplete(false);
  }, []);

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
    RTCView: (RTC?.RTCView as RTCViewComponent | null) ?? null,
  };
}
