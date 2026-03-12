import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import type { Id } from "@/convex/_generated/dataModel";

interface SharedPostBubbleProps {
  postId: Id<"posts">;
  preview?: {
    thumbnailUrl?: string;
    postType: "photo" | "video";
    authorName: string;
    caption?: string;
  };
  isMine: boolean;
  timestamp: string;
}

export function SharedPostBubble({
  postId,
  preview,
  isMine,
  timestamp,
}: SharedPostBubbleProps) {
  const handlePress = () => {
    router.push({ pathname: "/(main)/post-detail", params: { id: postId } });
  };

  if (!preview) {
    return (
      <TouchableOpacity
        style={[styles.fallback, isMine ? styles.fallbackMine : styles.fallbackOther]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <SymbolView name="photo" size={18} tintColor={isMine ? "rgba(255,255,255,0.6)" : colors.gray400} />
        <Text style={[styles.fallbackText, isMine && styles.fallbackTextMine]}>
          Geteilter Beitrag
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, isMine ? styles.cardMine : styles.cardOther]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      {preview.thumbnailUrl ? (
        <View style={styles.thumbWrap}>
          <Image
            source={{ uri: preview.thumbnailUrl }}
            style={styles.thumb}
            contentFit="cover"
            transition={200}
          />
          {/* Video play overlay */}
          {preview.postType === "video" && (
            <View style={styles.playOverlay}>
              <View style={styles.playCircle}>
                <SymbolView name="play.fill" size={14} tintColor={colors.white} />
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.thumbWrap, styles.thumbPlaceholder]}>
          <SymbolView
            name={preview.postType === "video" ? "video.fill" : "photo.fill"}
            size={28}
            tintColor={colors.gray300}
          />
        </View>
      )}

      {/* Info bar */}
      <View style={[styles.infoBar, isMine ? styles.infoBarMine : styles.infoBarOther]}>
        <View style={styles.infoContent}>
          <Text
            style={[styles.authorLabel, isMine && styles.authorLabelMine]}
            numberOfLines={1}
          >
            {preview.authorName}
          </Text>
          {preview.caption ? (
            <Text
              style={[styles.captionLabel, isMine && styles.captionLabelMine]}
              numberOfLines={2}
            >
              {preview.caption}
            </Text>
          ) : (
            <Text style={[styles.captionLabel, isMine && styles.captionLabelMine]}>
              {preview.postType === "video" ? "🎬 Video" : "📷 Foto"}
            </Text>
          )}
        </View>
        <SymbolView
          name="chevron.right"
          size={12}
          tintColor={isMine ? "rgba(255,255,255,0.4)" : colors.gray300}
        />
      </View>

      {/* Timestamp */}
      <Text style={[styles.time, isMine && styles.timeMine]}>{timestamp}</Text>
    </TouchableOpacity>
  );
}

const CARD_WIDTH = 220;
const THUMB_HEIGHT = 160;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  cardOther: {
    backgroundColor: colors.gray100,
  },
  cardMine: {
    backgroundColor: colors.black,
  },

  /* Thumbnail */
  thumbWrap: {
    width: CARD_WIDTH,
    height: THUMB_HEIGHT,
    backgroundColor: colors.gray200,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  /* Video play overlay */
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  playCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 2,
  },

  /* Info bar */
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  infoBarOther: {},
  infoBarMine: {},
  infoContent: {
    flex: 1,
    gap: 2,
  },
  authorLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.black,
  },
  authorLabelMine: {
    color: colors.white,
  },
  captionLabel: {
    fontSize: 12,
    color: colors.gray500,
    lineHeight: 16,
  },
  captionLabelMine: {
    color: "rgba(255,255,255,0.6)",
  },

  /* Timestamp */
  time: {
    fontSize: 10,
    color: colors.gray400,
    paddingHorizontal: 12,
    paddingBottom: 8,
    alignSelf: "flex-end",
  },
  timeMine: {
    color: "rgba(255,255,255,0.5)",
  },

  /* Fallback (no preview) */
  fallback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  fallbackOther: {
    backgroundColor: colors.gray100,
  },
  fallbackMine: {
    backgroundColor: colors.black,
  },
  fallbackText: {
    fontSize: 14,
    color: colors.gray500,
  },
  fallbackTextMine: {
    color: "rgba(255,255,255,0.6)",
  },
});
