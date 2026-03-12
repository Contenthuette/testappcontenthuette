import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { router } from "expo-router";
import { IncomingCallOverlay } from "./IncomingCallOverlay";
import { MinimizedCallBanner } from "./MinimizedCallBanner";
import { CallContext } from "@/lib/call-context";

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const incomingCall = useQuery(
    api.calls.getIncomingCall,
    isAuthenticated ? {} : "skip"
  );
  const answerCall = useMutation(api.calls.answerCall);
  const declineCall = useMutation(api.calls.declineCall);

  const [minimizedCallId, setMinimizedCallId] = useState<Id<"calls"> | null>(null);

  const minimizeCall = useCallback((callId: Id<"calls">) => {
    setMinimizedCallId(callId);
  }, []);

  const expandCall = useCallback(() => {
    setMinimizedCallId(null);
  }, []);

  // Clear minimized state when the call we're tracking ends
  const minimizedCall = useQuery(
    api.calls.getCallDetails,
    minimizedCallId ? { callId: minimizedCallId } : "skip"
  );
  if (
    minimizedCallId &&
    minimizedCall &&
    (minimizedCall.status === "ended" ||
      minimizedCall.status === "declined" ||
      minimizedCall.status === "missed")
  ) {
    // Schedule clear on next tick to avoid render-during-render
    setTimeout(() => setMinimizedCallId(null), 0);
  }

  const handleAccept = useCallback(async () => {
    if (!incomingCall) return;
    try {
      await answerCall({ callId: incomingCall._id });
      setMinimizedCallId(null);
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
    <CallContext.Provider value={{ minimizedCallId, minimizeCall, expandCall }}>
      <View style={styles.root}>
        {children}
        {minimizedCallId && (
          <MinimizedCallBanner callId={minimizedCallId} />
        )}
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
      </View>
    </CallContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
