import React, { useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { router } from "expo-router";
import { IncomingCallOverlay } from "./IncomingCallOverlay";

/**
 * Wrap this around the app to listen for incoming calls.
 * When a call comes in, shows a full-screen overlay.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const incomingCall = useQuery(
    api.calls.getIncomingCall,
    isAuthenticated ? {} : "skip"
  );
  const answerCall = useMutation(api.calls.answerCall);
  const declineCall = useMutation(api.calls.declineCall);

  const handleAccept = useCallback(async () => {
    if (!incomingCall) return;
    try {
      await answerCall({ callId: incomingCall._id });
      router.push({
        pathname: "/(main)/call" as "/",
        params: { id: incomingCall._id },
      });
    } catch (e) {
      console.error("Failed to answer call", e);
    }
  }, [incomingCall, answerCall]);

  const handleDecline = useCallback(async () => {
    if (!incomingCall) return;
    try {
      await declineCall({ callId: incomingCall._id });
    } catch (e) {
      console.error("Failed to decline call", e);
    }
  }, [incomingCall, declineCall]);

  return (
    <>
      {children}
      {incomingCall && (
        <IncomingCallOverlay
          callerName={incomingCall.callerName}
          callerAvatarUrl={incomingCall.callerAvatarUrl}
          callType={incomingCall.type}
          groupName={incomingCall.groupName}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
    </>
  );
}
