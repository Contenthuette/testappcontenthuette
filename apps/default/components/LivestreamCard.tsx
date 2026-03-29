import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";
import type { Id } from "@/convex/_generated/dataModel";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from "react-native-reanimated";
import { useEffect } from "react";

interface LivestreamCardProps {
  _id: Id<"livestreams">;
  title: string;
  hostName: string;
  hostAvatarUrl?: string;
  groupName: string;
  viewerCount: number;
}

export function LivestreamCard({
  _id,
  title,
  hostName,
  hostAvatarUrl,
  groupName,
  viewerCount,
}: LivestreamCardProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: "/(main)/watch-stream", params: { id: _id } })}
      activeOpacity={0.75}
    >
      {/* Top: LIVE badge + viewers */}
      <View style={styles.topRow}>
        <View style={styles.liveBadge}>
          <Animated.View style={[styles.liveDot, dotStyle]} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.viewerPill}>
          <SymbolView name="eye" size={10} tintColor={colors.white} />
          <Text style={styles.viewerText}>{viewerCount}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{title}</Text>

      {/* Host info */}
      <View style={styles.hostRow}>
        <Avatar uri={hostAvatarUrl} name={hostName} size={22} />
        <Text style={styles.hostName} numberOfLines={1}>{hostName}</Text>
      </View>

      {/* Group */}
      <Text style={styles.groupName} numberOfLines={1}>{groupName}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    backgroundColor: colors.gray900,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: spacing.md,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  liveText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  viewerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  viewerText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  title: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hostName: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  groupName: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "500",
  },
});
