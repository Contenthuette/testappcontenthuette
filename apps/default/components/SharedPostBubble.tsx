import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "@/components/Icon";
import type { Id } from "@/convex/_generated/dataModel";

interface SharedPostBubbleProps {
  postId: Id<"posts">;
  preview?: {
    thumbnailUrl?: string;
    mediaUrl?: string;
    postType: "photo" | "video";
    authorName: string;
    caption?: string;
    deleted?: boolean;
  };
  isMine: boolean;
  timestamp?: string;
}

export function SharedPostBubble({ postId, preview, isMine, timestamp }: SharedPostBubbleProps) {
  const router = useRouter();

  // Deleted post
  if (preview?.deleted) {
    return (
      <View
        style={[styles.container, isMine ? styles.meContainer : styles.otherContainer]}
      >
        <View style={styles.deletedWrap}>
          <SymbolView name="eye.slash" size={28} tintColor="#bbb" />
          <Text style={styles.deletedText}>Nicht mehr verfügbar</Text>
          <Text style={styles.deletedSub}>Dieser Beitrag wurde gelöscht</Text>
        </View>
        {timestamp ? <Text style={[styles.time, { paddingHorizontal: 10, paddingBottom: 8 }]}>{timestamp}</Text> : null}
      </View>
    );
  }

  if (!preview) {
    return (
      <TouchableOpacity
        style={[styles.container, isMine ? styles.meContainer : styles.otherContainer]}
        onPress={() => router.navigate({ pathname: "/post-detail", params: { id: postId } })}
        activeOpacity={0.8}
      >
        <View style={styles.fallback}>
          <SymbolView name="photo" size={28} tintColor="#999" />
          <Text style={styles.fallbackText}>Geteilter Beitrag</Text>
        </View>
        {timestamp ? <Text style={styles.time}>{timestamp}</Text> : null}
      </TouchableOpacity>
    );
  }

  const isVideo = preview.postType === "video";
  const hasThumb = !!preview.thumbnailUrl;
  const hasMedia = !!preview.mediaUrl;

  return (
    <TouchableOpacity
      style={[styles.container, isMine ? styles.meContainer : styles.otherContainer]}
      onPress={() => router.navigate({ pathname: "/post-detail", params: { id: postId } })}
      activeOpacity={0.8}
    >
      <View style={styles.mediaWrap}>
        {isVideo && hasMedia ? (
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: preview.thumbnailUrl ?? preview.mediaUrl }}
              style={styles.media}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              recyclingKey={`shared-vid-${postId}`}
            />
            <View style={styles.videoPlayOverlay}>
              <View style={styles.videoPlayCircle}>
                <View style={styles.videoPlayTriangle} />
              </View>
            </View>
          </View>
        ) : hasThumb ? (
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: preview.thumbnailUrl }}
              style={styles.media}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              recyclingKey={`shared-${postId}`}
            />
            {isVideo && (
              <View style={styles.videoPlayOverlay}>
                <View style={styles.videoPlayCircle}>
                  <View style={styles.videoPlayTriangle} />
                </View>
              </View>
            )}
          </View>
        ) : hasMedia && !isVideo ? (
          <Image
            source={{ uri: preview.mediaUrl }}
            style={styles.media}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
            recyclingKey={`shared-media-${postId}`}
          />
        ) : (
          <View style={[styles.media, styles.placeholder]}>
            <SymbolView name={isVideo ? "video" : "photo"} size={32} tintColor="#bbb" />
          </View>
        )}
      </View>

      <View style={styles.meta}>
        <Text style={styles.author} numberOfLines={1}>
          {preview.authorName}
        </Text>
        {preview.caption ? (
          <Text style={styles.caption} numberOfLines={2}>
            {preview.caption}
          </Text>
        ) : null}
        <View style={styles.bottomRow}>
          <View style={styles.openRow}>
            <Text style={styles.openLabel}>Im Feed ansehen</Text>
            <SymbolView name="chevron.right" size={10} tintColor="#999" />
          </View>
          {timestamp ? <Text style={styles.time}>{timestamp}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  meContainer: {
    backgroundColor: "#f0f0f0",
  },
  otherContainer: {
    backgroundColor: "#f5f5f5",
  },
  deletedWrap: {
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  deletedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
    marginTop: 4,
  },
  deletedSub: {
    fontSize: 11,
    color: "#bbb",
    textAlign: "center",
  },
  mediaWrap: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#e8e8e8",
  },
  imageWrap: {
    width: "100%",
    height: "100%",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlayCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlayTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: "#fff",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    marginLeft: 4,
  },
  meta: {
    padding: 10,
    gap: 3,
  },
  author: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  caption: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  openRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  openLabel: {
    fontSize: 11,
    color: "#999",
  },
  fallback: {
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  fallbackText: {
    fontSize: 13,
    color: "#999",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  time: {
    fontSize: 10,
    color: "#aaa",
  },
});
