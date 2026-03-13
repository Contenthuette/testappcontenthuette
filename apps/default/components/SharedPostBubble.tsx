import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
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
  };
  isMine: boolean;
  timestamp?: string;
}

function VideoThumbnail({ mediaUrl }: { mediaUrl: string }) {
  const player = useVideoPlayer(mediaUrl, (p) => {
    p.loop = false;
    p.muted = true;
    p.pause();
  });

  useEffect(() => {
    // Seek to 0.1s to get a frame (avoid black first frame)
    const timer = setTimeout(() => {
      try {
        player.currentTime = 0.1;
      } catch {
        // ignore if not ready
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [player]);

  return (
    <View style={thumbStyles.videoContainer}>
      <VideoView
        player={player}
        style={thumbStyles.video}
        nativeControls={false}
        allowsPictureInPicture={false}
        contentFit="cover"
      />
      <View style={thumbStyles.playOverlay}>
        <View style={thumbStyles.playCircle}>
          <View style={thumbStyles.playTriangle} />
        </View>
      </View>
    </View>
  );
}

const thumbStyles = StyleSheet.create({
  videoContainer: {
    width: "100%",
    aspectRatio: 3 / 4,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  playTriangle: {
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
});

export function SharedPostBubble({ postId, preview, isMine, timestamp }: SharedPostBubbleProps) {
  const router = useRouter();

  if (!preview) {
    return (
      <TouchableOpacity
        style={[styles.container, isMine ? styles.meContainer : styles.otherContainer]}
        onPress={() => router.push({ pathname: "/post-detail", params: { postId } })}
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
      onPress={() => router.push({ pathname: "/post-detail", params: { postId } })}
      activeOpacity={0.8}
    >
      <View style={styles.mediaWrap}>
        {isVideo && hasMedia && !hasThumb ? (
          <VideoThumbnail mediaUrl={preview.mediaUrl!} />
        ) : hasThumb ? (
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: preview.thumbnailUrl }}
              style={styles.media}
              contentFit="cover"
              transition={200}
            />
            {isVideo && (
              <View style={thumbStyles.playOverlay}>
                <View style={thumbStyles.playCircle}>
                  <View style={thumbStyles.playTriangle} />
                </View>
              </View>
            )}
          </View>
        ) : hasMedia && !isVideo ? (
          <Image
            source={{ uri: preview.mediaUrl }}
            style={styles.media}
            contentFit="cover"
            transition={200}
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
