import { createContext, useContext } from "react";
import type { ComponentType } from "react";
import type { Id } from "@/convex/_generated/dataModel";

interface RTCViewProps {
  streamURL: string;
  style?: unknown;
  objectFit?: "contain" | "cover";
  mirror?: boolean;
  zOrder?: number;
}

export interface WebRTCState {
  localStreamUrl: string | null;
  remoteStreamUrl: string | null;
  connectionState: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isFrontCamera: boolean;
  toggleMute: () => void;
  toggleVideo: () => void;
  flipCamera: () => void;
  cleanup: () => void;
  isSupported: boolean;
  RTCView: ComponentType<RTCViewProps> | null;
}

export interface CallContextType {
  minimizedCallId: Id<"calls"> | null;
  minimizeCall: (callId: Id<"calls">) => void;
  expandCall: () => void;
  // Active WebRTC session (persists across minimize/expand)
  activeCallId: Id<"calls"> | null;
  webrtc: WebRTCState | null;
  startWebRTC: (callId: Id<"calls">, isInitiator: boolean, isVideo: boolean) => void;
  stopWebRTC: () => void;
}

const _defaultWebRTC: WebRTCState = {
  localStreamUrl: null,
  remoteStreamUrl: null,
  connectionState: "new",
  isMuted: false,
  isVideoOff: false,
  isFrontCamera: true,
  toggleMute: () => {},
  toggleVideo: () => {},
  flipCamera: () => {},
  cleanup: () => {},
  isSupported: false,
  RTCView: null,
};

export const CallContext = createContext<CallContextType>({
  minimizedCallId: null,
  minimizeCall: () => {},
  expandCall: () => {},
  activeCallId: null,
  webrtc: null,
  startWebRTC: () => {},
  stopWebRTC: () => {},
});

export function useCallContext() {
  return useContext(CallContext);
}
