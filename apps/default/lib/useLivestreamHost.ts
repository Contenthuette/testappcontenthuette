import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type { ComponentType } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/* ─── Conditional RTC import (native only) ─── */
interface RTCPeerConnectionLike {
  addTrack: (track: MediaTrackLike, stream: MediaStreamLike) => void;
  close: () => void;
  createOffer: (opts?: unknown) => Promise<unknown>;
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

export function useLivestreamHost({ livestreamId, enabled }: UseLivestreamHostOptions) {
  const [localStreamUrl, setLocalStreamUrl] = useState<string | null>(null);
  const [connectedPeers, setConnectedPeers] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [iceServers, setIceServers] = useState<Array<IceServerConfig>>(DEFAULT_ICE);
  const [iceReady, setIceReady] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);

  const localStreamRef = useRef<MediaStreamLike | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnectionLike>>(new Map());
  const knownViewerIds = useRef<Set<string>>(new Set());
  const processedSignalIds = useRef<Set<string>>(new Set());
  const pendingCandidates = useRef<Map<string, Array<unknown>>>(new Map());
  const ackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAckIds = useRef<Array<Id<"livestreamSignaling">>>([]);
  const setupDone = useRef(false);

  const sendSignal = useMutation(api.livestreams.sendSignal);
  const ackSignals = useMutation(api.livestreams.ackSignals);
  const getIceServers = useAction(api.callActions.getIceServers);

  const viewers = useQuery(
    api.livestreams.getViewers,
    livestreamId && enabled ? { livestreamId } : "skip",
  );
  const signals = useQuery(
    api.livestreams.getSignals,
    livestreamId && enabled && mediaReady ? { livestreamId } : "skip",
  );

  /* ── Debounced ack ── */
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

  /* ── Load ICE servers ── */
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

  /* ── Capture local media ── */
  useEffect(() => {
    if (!enabled || !RTC || !iceReady) return;
    let cancelled = false;
    const rtc = RTC;

    (async () => {
      try {
        const stream = await rtc.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: "user", width: 480, height: 640, frameRate: 24 },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        setLocalStreamUrl(stream.toURL());
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

  /* ── Manage viewer peer connections ── */
  useEffect(() => {
    if (!viewers || !localStreamRef.current || !livestreamId || !RTC || !mediaReady) return;
    const rtc = RTC;
    const stream = localStreamRef.current;

    const activeViewerIds = new Set(viewers.map((v_) => v_.userId));

    // Remove PCs for viewers who left
    for (const [vid, pc] of peerConnections.current.entries()) {
      if (!activeViewerIds.has(vid as Id<"users">)) {
        pc.close();
        peerConnections.current.delete(vid);
        knownViewerIds.current.delete(vid);
        pendingCandidates.current.delete(vid);
      }
    }

    // Create PCs for new viewers
    for (const viewer of viewers) {
      const vid = viewer.userId;
      if (knownViewerIds.current.has(vid)) continue;
      knownViewerIds.current.add(vid);

      const pc = new rtc.RTCPeerConnection({ iceServers });
      peerConnections.current.set(vid, pc);

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // ICE candidates → viewer
      pc.onicecandidate = (e) => {
        if (!e.candidate || !livestreamId) return;
        sendSignal({
          livestreamId,
          recipientId: vid,
          type: "ice-candidate",
          payload: JSON.stringify(e.candidate),
        }).catch(() => {});
      };

      // Track connection state
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === "failed" || state === "closed") {
          peerConnections.current.delete(vid);
          knownViewerIds.current.delete(vid);
        }
        // Recount connected peers
        let count = 0;
        for (const [, p] of peerConnections.current) {
          if (p.iceConnectionState === "connected" || p.iceConnectionState === "completed") count++;
        }
        setConnectedPeers(count);
      };

      // Create + send offer
      (async () => {
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
          await pc.setLocalDescription(offer);
          await sendSignal({
            livestreamId,
            recipientId: vid,
            type: "offer",
            payload: JSON.stringify(offer),
          });
        } catch (err) {
          console.error("[LiveHost] Offer creation failed for viewer", vid, err);
        }
      })();
    }
  }, [viewers, livestreamId, iceServers, sendSignal, mediaReady]);

  /* ── Process incoming signals (answers + ICE from viewers) ── */
  useEffect(() => {
    if (!signals || !RTC) return;
    const rtc = RTC;

    (async () => {
      for (const signal of signals) {
        if (processedSignalIds.current.has(signal._id)) continue;
        processedSignalIds.current.add(signal._id);

        const senderId = signal.senderId;
        const pc = peerConnections.current.get(senderId);

        try {
          if (signal.type === "answer" && pc) {
            await pc.setRemoteDescription(new rtc.RTCSessionDescription(JSON.parse(signal.payload)));
            // Drain pending ICE candidates
            const pending = pendingCandidates.current.get(senderId) ?? [];
            for (const c of pending) {
              await pc.addIceCandidate(new rtc.RTCIceCandidate(c));
            }
            pendingCandidates.current.delete(senderId);
          }

          if (signal.type === "ice-candidate" && pc) {
            const candidate = JSON.parse(signal.payload);
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new rtc.RTCIceCandidate(candidate));
            } else {
              const pending = pendingCandidates.current.get(senderId) ?? [];
              pending.push(candidate);
              pendingCandidates.current.set(senderId, pending);
            }
          }
        } catch (err) {
          console.error("[LiveHost] Signal error:", signal.type, err);
        }

        scheduleAck(signal._id);
      }
    })();
  }, [signals, scheduleAck]);

  /* ── Cleanup ── */
  const cleanup = useCallback(() => {
    if (ackTimerRef.current) { clearTimeout(ackTimerRef.current); ackTimerRef.current = null; }
    flushAcks();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    for (const [, pc] of peerConnections.current) pc.close();
    peerConnections.current.clear();
    knownViewerIds.current.clear();
    processedSignalIds.current.clear();
    pendingCandidates.current.clear();
    pendingAckIds.current = [];
    setupDone.current = false;
    setLocalStreamUrl(null);
    setConnectedPeers(0);
    setMediaReady(false);
  }, [flushAcks]);

  useEffect(() => () => cleanup(), [cleanup]);

  /* ── Controls ── */
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
    connectedPeers,
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
