import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "@/components/Icon";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCallContext } from "@/lib/call-context";

interface MinimizedCallBannerProps {
  callId: Id<"calls">;
}

const HEARTBEAT_INTERVAL_MS = 10_000;

export function MinimizedCallBanner({ callId }: MinimizedCallBannerProps) {
  const insets = useSafeAreaInsets();
  const call = useQuery(api.calls.getCallDetails, { callId });
  const heartbeat = useMutation(api.calls.heartbeat);
  const { expandCall } = useCallContext();
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (call?.status !== "active" || !call.answeredAt) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    setElapsed(Math.floor((Date.now() - call.answeredAt) / 1000));
    timerRef.current = setInterval(() => {
      setElapsed((previous) => previous + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [call?.answeredAt, call?.status]);

  useEffect(() => {
    if (!call || (call.status !== "ringing" && call.status !== "active")) return;

    heartbeat({ callId }).catch(() => {});
    const interval = setInterval(() => {
      heartbeat({ callId }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [call, callId, heartbeat]);

  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  function handlePress(): void {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    expandCall();
    router.push({
      pathname: "/(main)/call" as "/",
      params: { id: callId },
    });
  }

  if (!call || call.status === "ended" || call.status === "declined" || call.status === "missed") {
    return null;
  }

  const isVideo = call.type === "video";
  const displayName = call.groupName ?? call.callerName;
  const statusText =
    call.status === "ringing"
      ? "Klingelt…"
      : call.status === "active"
        ? formatTime(elapsed)
        : "Verbinde…";

  return (
    <Animated.View
      entering={SlideInUp.duration(300)}
      exiting={SlideOutUp.duration(200)}
      style={[styles.container, { top: insets.top + 4 }]}
    >
      <TouchableOpacity style={styles.banner} onPress={handlePress} activeOpacity={0.8}>
        <View style={styles.iconContainer}>
          <SymbolView
            name={isVideo ? "video.fill" : "phone.fill"}
            size={11}
            tintColor="#FFFFFF"
          />
        </View>
        <Text style={styles.text} numberOfLines={1}>
          {displayName} · {statusText}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 6,
    backgroundColor: "#34C759",
    borderRadius: 20,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.15)",
  },
  iconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    maxWidth: 160,
  },
});
