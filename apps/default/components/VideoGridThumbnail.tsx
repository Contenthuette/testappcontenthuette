import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Image } from "expo-image";
import * as VideoThumbnails from "expo-video-thumbnails";

interface VideoGridThumbnailProps {
  thumbnailUrl?: string;
  videoUrl?: string;
  style: object;
  recyclingKey?: string;
}

// Cache extracted thumbnails across renders
const thumbnailCache = new Map<string, string>();

export function VideoGridThumbnail({
  thumbnailUrl,
  videoUrl,
  style,
  recyclingKey,
}: VideoGridThumbnailProps) {
  const [extractedUri, setExtractedUri] = useState<string | null>(
    videoUrl ? thumbnailCache.get(videoUrl) ?? null : null,
  );
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    // If we already have a real thumbnail, skip extraction
    if (thumbnailUrl) return;
    // If we already have a cached extraction, skip
    if (videoUrl && thumbnailCache.has(videoUrl)) {
      setExtractedUri(thumbnailCache.get(videoUrl)!);
      return;
    }
    if (!videoUrl) return;
    if (Platform.OS === "web") return;

    let cancelled = false;
    (async () => {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUrl, {
          time: 500, // 0.5s into the video
          quality: 0.5,
        });
        if (!cancelled && mounted.current) {
          thumbnailCache.set(videoUrl, uri);
          setExtractedUri(uri);
        }
      } catch {
        // Silently fail - show dark placeholder
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [thumbnailUrl, videoUrl]);

  const displayUri = thumbnailUrl || extractedUri;

  if (!displayUri) {
    return <View style={[style, styles.placeholder]} />;
  }

  return (
    <Image
      source={{ uri: displayUri }}
      style={style}
      contentFit="cover"
      cachePolicy="memory-disk"
      priority="high"
      transition={0}
      recyclingKey={recyclingKey}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#1a1a1a",
  },
});
