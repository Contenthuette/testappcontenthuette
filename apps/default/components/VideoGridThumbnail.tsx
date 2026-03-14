import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "@/components/Icon";

interface VideoGridThumbnailProps {
  thumbnailUrl?: string;
  videoUrl?: string;
  style: object;
  recyclingKey?: string;
}

/**
 * Instant video grid thumbnail.
 * Shows stored thumbnail immediately, or a styled placeholder.
 * NEVER downloads the video file for extraction — that was killing performance.
 */
export function VideoGridThumbnail({
  thumbnailUrl,
  style,
  recyclingKey,
}: VideoGridThumbnailProps) {
  // Instant render: stored thumbnail
  if (thumbnailUrl) {
    return (
      <Image
        source={{ uri: thumbnailUrl }}
        style={style}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
        recyclingKey={recyclingKey}
      />
    );
  }

  // No thumbnail stored: instant dark placeholder with play icon
  return (
    <View style={[style, styles.placeholder]}>
      <View style={styles.playCircle}>
        <SymbolView name="play.fill" size={16} tintColor="#fff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  playCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
