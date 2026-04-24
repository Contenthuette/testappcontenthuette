import React, { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "@/components/Icon";
import { Avatar } from "@/components/Avatar";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCallContext } from "@/lib/call-context";

interface RTCViewProps {
  streamURL: string;
  style?: unknown;
  objectFit?: "contain" | "cover";
  mirror?: boolean;
  zOrder?: number;
}

interface MinimizedCallBannerProps {
  callId: Id<"calls">;
}

const HEARTBEAT_INTERVAL_MS = 10_000;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };
const SNAP_EDGE_PADDING = 12;

// Audio pill dimensions
const PILL_HEIGHT = 36;
const PILL_WIDTH = 200;

// Video PiP dimensions
const PIP_WIDTH = 130;
const PIP_HEIGHT = 180;

export function MinimizedCallBanner({ callId }: MinimizedCallBannerProps) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useConvexAuth();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const call = useQuery(
    api.calls.getCallDetails,
    isAuthenticated ? { callId } : "skip",
  );
  const heartbeat = useMutation(api.calls.heartbeat);
  const endCallMutation = useMutation(api.calls.endCall);
  const { expandCall, webrtc, stopWebRTC } = useCallContext();
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isVideo = call?.type === "video";
  const hasRemoteVideo = isVideo && !!webrtc?.remoteStreamUrl;
  const itemWidth = isVideo ? PIP_WIDTH : PILL_WIDTH;
  const itemHeight = isVideo ? PIP_HEIGHT : PILL_HEIGHT;

  const RTCViewComponent = webrtc?.RTCView as ComponentType<RTCViewProps> | null;

  // Draggable position
  const translateX = useSharedValue(
    screenWidth - itemWidth - SNAP_EDGE_PADDING
  );
  const translateY = useSharedValue(insets.top + 8);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scale = useSharedValue(1);

  // Timer
  useEffect(() => {
    if (call?.status !== "active" || !call.answeredAt) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    setElapsed(Math.floor((Date.now() - call.answeredAt) / 1000));
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [call?.answeredAt, call?.status]);

  // Heartbeat
  useEffect(() => {
    if (!call || (call.status !== "ringing" && call.status !== "active")) return;
    heartbeat({ callId }).catch(() => {});
    const interval = setInterval(() => {
      heartbeat({ callId }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [call, callId, heartbeat]);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function handleTap() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    expandCall();
    router.push({
      pathname: "/(main)/call" as "/",
      params: { id: callId },
    });
  }

  function handleEndCall() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    stopWebRTC();
    endCallMutation({ callId }).catch(() => {});
  }

  const panGesture = Gesture.Pan()
    .onStart(() => {
      "worklet";
      offsetX.value = translateX.value;
      offsetY.value = translateY.value;
      scale.value = withSpring(1.05, SPRING_CONFIG);
    })
    .onUpdate((event) => {
      "worklet";
      translateX.value = offsetX.value + event.translationX;
      translateY.value = offsetY.value + event.translationY;
    })
    .onEnd(() => {
      "worklet";
      // Snap to nearest edge
      const center = translateX.value + itemWidth / 2;
      const snapX =
        center < screenWidth / 2
          ? SNAP_EDGE_PADDING
          : screenWidth - itemWidth - SNAP_EDGE_PADDING;

      // Clamp Y
      const minY = insets.top + 4;
      const maxY = screenHeight - itemHeight - insets.bottom - 80;
      const clampedY = Math.max(minY, Math.min(maxY, translateY.value));

      translateX.value = withSpring(snapX, SPRING_CONFIG);
      translateY.value = withSpring(clampedY, SPRING_CONFIG);
      scale.value = withSpring(1, SPRING_CONFIG);
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    "worklet";
    runOnJS(handleTap)();
  });

  const longPressGesture = Gesture.LongPress()
    .minDuration(600)
    .onEnd(() => {
      "worklet";
      runOnJS(handleEndCall)();
    });

  const composedGesture = Gesture.Race(
    panGesture,
    Gesture.Exclusive(longPressGesture, tapGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (
    !call ||
    call.status === "ended" ||
    call.status === "declined" ||
    call.status === "missed"
  ) {
    return null;
  }

  const otherParticipant = call.participants.find(
    (p: { userId: string }) => p.userId !== call.callerId || call.participants.length === 1
  );
  const displayName =
    call.groupName ?? otherParticipant?.userName ?? call.callerName;
  const displayAvatar = otherParticipant?.userAvatarUrl;
  const statusText =
    call.status === "ringing"
      ? "Klingelt\u2026"
      : call.status === "active"
        ? formatTime(elapsed)
        : "Verbinde\u2026";

  // ─── Video PiP Card (with live remote stream) ───
  if (isVideo) {
    return (
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[styles.pipContainer, animatedStyle]}
        >
          <View style={styles.pipCard}>
            {/* Show remote video stream if available */}
            {hasRemoteVideo && RTCViewComponent && webrtc?.remoteStreamUrl ? (
              <View style={styles.pipVideoFill}>
                <RTCViewComponent
                  streamURL={webrtc.remoteStreamUrl}
                  style={styles.pipVideo}
                  objectFit="cover"
                  zOrder={0}
                />
                {/* Overlay with name + timer */}
                <View style={styles.pipVideoOverlay}>
                  <Text style={styles.pipVideoName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <View style={styles.pipStatusRow}>
                    <SymbolView name="video.fill" size={10} tintColor="#34C759" />
                    <Text style={styles.pipStatus}>{statusText}</Text>
                  </View>
                </View>
              </View>
            ) : (
              /* Fallback: avatar when no remote stream */
              <>
                <View style={styles.pipAvatarArea}>
                  <Avatar uri={displayAvatar} name={displayName} size={52} />
                  <View style={styles.pipLiveIndicator}>
                    <View style={styles.pipLiveDot} />
                  </View>
                </View>
                <Text style={styles.pipName} numberOfLines={1}>
                  {displayName}
                </Text>
                <View style={styles.pipStatusRow}>
                  <SymbolView name="video.fill" size={10} tintColor="#34C759" />
                  <Text style={styles.pipStatus}>{statusText}</Text>
                </View>
              </>
            )}
          </View>

          {/* Expand hint */}
          <View style={styles.pipExpandHint}>
            <SymbolView
              name="arrow.up.left.and.arrow.down.right"
              size={10}
              tintColor="rgba(255,255,255,0.5)"
            />
          </View>
        </Animated.View>
      </GestureDetector>
    );
  }

  // ─── Audio Call Pill ───
  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={[styles.audioPillContainer, animatedStyle]}
      >
        <View style={styles.audioPill}>
          <View style={styles.audioPillIcon}>
            <SymbolView name="phone.fill" size={11} tintColor="#FFF" />
          </View>
          <Text style={styles.audioPillText} numberOfLines={1}>
            {displayName} · {statusText}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // ─── Video PiP ───
  pipContainer: {
    position: "absolute",
    width: PIP_WIDTH,
    height: PIP_HEIGHT,
    zIndex: 9999,
  },
  pipCard: {
    flex: 1,
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 0,
    paddingHorizontal: 0,
    boxShadow: "0px 4px 20px rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pipVideoFill: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  pipVideo: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  pipVideoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    gap: 2,
  },
  pipVideoName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
    textAlign: "center",
  },
  pipAvatarArea: {
    position: "relative",
    marginTop: 16,
  },
  pipLiveIndicator: {
    position: "absolute",
    bottom: 0,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#1c1c1e",
    justifyContent: "center",
    alignItems: "center",
  },
  pipLiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#34C759",
  },
  pipName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
    textAlign: "center",
    maxWidth: PIP_WIDTH - 16,
    marginTop: 8,
  },
  pipStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pipStatus: {
    fontSize: 11,
    fontWeight: "600",
    color: "#34C759",
    fontVariant: ["tabular-nums"],
  },
  pipExpandHint: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ─── Audio Pill ───
  audioPillContainer: {
    position: "absolute",
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    zIndex: 9999,
  },
  audioPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 6,
    backgroundColor: "#34C759",
    borderRadius: 20,
    boxShadow: "0px 2px 12px rgba(0,0,0,0.2)",
  },
  audioPillIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  audioPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    maxWidth: 150,
  },
});
