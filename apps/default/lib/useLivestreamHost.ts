import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type { ComponentType } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/* ---- Conditional RTC import (native only) ---- */
interface RTCPeerConnectionLike {
  addTrack: (track: MediaTrackLike, stream: MediaStreamLike) => void;
  close: () => void;
  createOffer: (opts?: unknown) => Promise<unknown>;
  createAnswer: () => Promise<unknown>;
  setLocalDescription: (desc: unknown) => Promise<void>;
  setRemoteDescription: (desc: unknown) => Promise<void>;
  addIceCandidate: (c: unknown) => Promise<void>;
  remoteDescription?: unknown;
  connectionState?: string;
  iceConnectionState?: string;
  ontrack: ((e: { streams?: Array<MediaStreamLike> }) => void) | null;
  onicecandidate: ((e: { candidate?: unknown }) => void) | null;
  onconnectionstatechange: (() => void) | null;
  oniceconnectionstatechange: (() => void) | null;
}

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

interface IceServerConfig {
  urls: string;
  username?: string;
  credential?: string;
}

let RTC: {
  RTCPeerConnection: new (cfg: unknown) => RTCPeerConnectionLike;
  RTCSessionDescription: new (d: unknown) => unknown;
  RTCIceCandidate: new (c: unknown) => unknown;
  mediaDevices: { getUserMedia: (c: unknown) => Promise<MediaStreamLike> };
  RTCView: unknown;
} | null = null;

if (Platform.OS !== "web") {
  try {
    RTC = require("react-native-webrtc") as typeof RTC;
  } catch { /* not available */ }
}

const DEFAULT_ICE: Array<IceServerConfig> = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const SIGNAL_ACK_DEBOUNCE_MS = 400;

interface UseLivestreamHostOptions {
  livestreamId: Id<"livestreams"> | null;
  enabled: boolean;
}

/**
 * Hook for a livestream participant (host or coHost).
 * Captures local media and establishes a P2P connection with the other participant.
 * Max 2 participants total.
 */
export function useLivestreamHost({ livestreamId, enabled }: UseLivestreamHostOptions) {
  const [localStreamUrl, setLocalStreamUrl] = useState<string | null>(null);
  const [remoteStreamUrl, setRemoteStreamUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [iceServers, setIceServers] = useState<Array<IceServerConfig>>(DEFAULT_ICE);
  const [iceReady, setIceReady] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);

  const localStreamRef = useRef<MediaStreamLike | null>(null);
  const pcRef = useRef<RTCPeerConnectionLike | null>(null);
  const currentPeerId = useRef<string | null>(null);
  const processedSignalIds = useRef<Set<string>>(new Set());
  const pendingCandidates = useRef<Array<unknown>>([]);
  const hasCreatedOffer = useRef(false);
  const ackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAckIds = useRef<Array<Id<"livestreamSignaling">>>([]);

  const sendSignal = useMutation(api.livestreams.sendSignal);
  const ackSignals = useMutation(api.livestreams.ackSignals);
  const getIceServers = useAction(api.callActions.getIceServers);

  const stream = useQuery(
    api.livestreams.getById,
    livestreamId && enabled ? { livestreamId } : "skip",
  );
  const signals = useQuery(
    api.livestreams.getSignals,
    livestreamId && enabled && mediaReady ? { livestreamId } : "skip",
  );

  /* -- Debounced ack -- */
  const flushAcks = useCallback(() => {
    if (pendingAckIds.current.length === 0) return;
    const ids = [...pendingAckIds.current];
    pendingAckIds.current = [];
    ackSignals({ signalIds: ids }).catch(() => {});
  }, [ackSignals]);

  const scheduleAck = useCallback(
    (id: Id<"livestreamSignaling">) => {
      pendingAckIds.current.push(id);
      if (ackTimerRef.current) clearTimeout(ackTimerRef.current);
      ackTimerRef.current = setTimeout(flushAcks, SIGNAL_ACK_DEBOUNCE_MS);
    },
    [flushAcks],
  );

  /* -- Load ICE servers -- */
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getIceServers({}).then((servers) => {
      if (cancelled) return;
      const valid = servers.filter(
        (s: IceServerConfig) =>
          s.urls.startsWith("stun:") || s.urls.startsWith("turn:") || s.urls.startsWith("turns:"),
      );
      if (valid.length > 0) setIceServers(valid);
      setIceReady(true);
    }).catch(() => { if (!cancelled) setIceReady(true); });
    return () => { cancelled = true; };
  }, [enabled, getIceServers]);

  /* -- Capture local media -- */
  useEffect(() => {
    if (!enabled || !RTC || !iceReady) return;
    let cancelled = false;
    const rtc = RTC;

    (async () => {
      try {
        const localStream = await rtc.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: "user", width: 480, height: 640, frameRate: 24 },
        });
        if (cancelled) { localStream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = localStream;
        setLocalStreamUrl(localStream.toURL());
        setMediaReady(true);
      } catch (err) {
        console.error("[LiveHost] getUserMedia failed:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        setLocalStreamUrl(null);
        setMediaReady(false);
      }
    };
  }, [enabled, iceReady]);

  /* -- Create/manage peer connection to the other participant -- */
  useEffect(() => {
    if (!stream || !localStreamRef.current || !livestreamId || !RTC || !mediaReady) return;
    const rtc = RTC;
    const localStream = localStreamRef.current;

    // Determine peer: if I'm host, peer is coHost; if I'm coHost, peer is host
    // We don't know "who am I" from this hook, so we react to coHost changes:
    // The HOST creates an offer when coHost joins.
    // The coHost waits for an offer via signals.
    const coHostId = stream.coHostId;
    const hostId = stream.hostId;

    // If coHost left, tear down the connection
    if (!coHostId) {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
        currentPeerId.current = null;
        hasCreatedOffer.current = false;
        pendingCandidates.current = [];
        setRemoteStreamUrl(null);
        setPeerConnected(false);
      }
      return;
    }

    // Peer already set up for this coHost
    if (currentPeerId.current === coHostId) return;

    // Tear down old PC if peer changed
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
      processedSignalIds.current.clear();
      pendingCandidates.current = [];
      hasCreatedOffer.current = false;
      setRemoteStreamUrl(null);
      setPeerConnected(false);
    }

    currentPeerId.current = coHostId;

    const pc = new rtc.RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (e) => {
      if (e.streams?.[0]) setRemoteStreamUrl(e.streams[0].toURL());
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate || !livestreamId) return;
      // Send to the other participant
      const recipientId = coHostId;
      sendSignal({
        livestreamId,
        recipientId,
        type: "ice-candidate",
        payload: JSON.stringify(e.candidate),
      }).catch(() => {});
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      setPeerConnected(state === "connected" || state === "completed");
      if (state === "failed" || state === "closed") {
        setPeerConnected(false);
      }
    };

    // HOST creates the offer to coHost
    // Only the host should create the offer (lower ID creates offer to avoid collision)
    // Simple rule: host always offers
    if (!hasCreatedOffer.current) {
      hasCreatedOffer.current = true;
      (async () => {
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          await pc.setLocalDescription(offer);
          await sendSignal({
            livestreamId,
            recipientId: coHostId,
            type: "offer",
            payload: JSON.stringify(offer),
          });
        } catch (err) {
          console.error("[LiveHost] Offer creation failed:", err);
          hasCreatedOffer.current = false;
        }
      })();
    }
  }, [stream, livestreamId, iceServers, sendSignal, mediaReady]);

  /* -- Process incoming signals -- */
  useEffect(() => {
    if (!signals || !RTC) return;
    const rtc = RTC;

    (async () => {
      for (const signal of signals) {
        if (processedSignalIds.current.has(signal._id)) continue;
        processedSignalIds.current.add(signal._id);

        const pc = pcRef.current;

        try {
          if (signal.type === "offer" && pc) {
            await pc.setRemoteDescription(new rtc.RTCSessionDescription(JSON.parse(signal.payload)));
            for (const c of pendingCandidates.current) {
              await pc.addIceCandidate(new rtc.RTCIceCandidate(c));
            }
            pendingCandidates.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (livestreamId) {
              await sendSignal({
                livestreamId,
                recipientId: signal.senderId,
                type: "answer",
                payload: JSON.stringify(answer),
              });
            }
          }

          if (signal.type === "answer" && pc) {
            await pc.setRemoteDescription(new rtc.RTCSessionDescription(JSON.parse(signal.payload)));
            for (const c of pendingCandidates.current) {
              await pc.addIceCandidate(new rtc.RTCIceCandidate(c));
            }
            pendingCandidates.current = [];
          }

          if (signal.type === "ice-candidate") {
            const candidate = JSON.parse(signal.payload);
            if (pc?.remoteDescription) {
              await pc.addIceCandidate(new rtc.RTCIceCandidate(candidate));
            } else {
              pendingCandidates.current.push(candidate);
            }
          }
        } catch (err) {
          console.error("[LiveHost] Signal error:", signal.type, err);
        }

        scheduleAck(signal._id);
      }
    })();
  }, [signals, scheduleAck, livestreamId, sendSignal]);

  /* -- Cleanup -- */
  const cleanup = useCallback(() => {
    if (ackTimerRef.current) { clearTimeout(ackTimerRef.current); ackTimerRef.current = null; }
    flushAcks();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    currentPeerId.current = null;
    processedSignalIds.current.clear();
    pendingCandidates.current = [];
    pendingAckIds.current = [];
    hasCreatedOffer.current = false;
    setLocalStreamUrl(null);
    setRemoteStreamUrl(null);
    setPeerConnected(false);
    setMediaReady(false);
  }, [flushAcks]);

  useEffect(() => () => cleanup(), [cleanup]);

  /* -- Controls -- */
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()?.[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsVideoOff(!track.enabled);
  }, []);

  const flipCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks()?.[0]?._switchCamera?.();
  }, []);

  return {
    localStreamUrl,
    remoteStreamUrl,
    peerConnected,
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
