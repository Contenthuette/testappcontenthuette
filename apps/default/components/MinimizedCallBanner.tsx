import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SymbolView } from "@/components/Icon";
import { router } from "expo-router";
import { useCallContext } from "@/lib/call-context";

interface MinimizedCallBannerProps {
  callId: Id<"calls">;
}

export function MinimizedCallBanner({ callId }: MinimizedCallBannerProps) {
  const insets = useSafeAreaInsets();
  const call = useQuery(api.calls.getCallDetails, { callId });
  const { expandCall } = useCallContext();
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (call?.status === "active" && call.answeredAt) {
      setElapsed(Math.floor((Date.now() - call.answeredAt) / 1000));
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [call?.status, call?.answeredAt]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    expandCall();
    router.push({
      pathname: "/(main)/call" as "/",
      params: { id: callId },
    });
  };

  if (!call || call.status === "ended" || call.status === "declined" || call.status === "missed") {
    return null;
  }

  const isVideo = call.type === "video";
  const displayName = call.groupName ?? call.callerName;
  const statusText = call.status === "ringing"
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
      <TouchableOpacity
        style={styles.banner}
        onPress={handlePress}
        activeOpacity={0.8}
      >
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
