import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Play } from "lucide-react-native";

interface VideoThumbnailProps {
  uri: string;
  style?: object;
  showPlayIcon?: boolean;
  playIconSize?: number;
}

export function VideoThumbnail({
  uri,
  style,
  showPlayIcon = true,
  playIconSize = 28,
}: VideoThumbnailProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
    p.pause();
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        player.currentTime = 0.1;
      } catch {
        // player may not be ready
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [player]);

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        allowsPictureInPicture={false}
        contentFit="cover"
      />
      {showPlayIcon && (
        <View style={styles.playOverlay}>
          <View style={[styles.playCircle, { width: playIconSize * 1.5, height: playIconSize * 1.5, borderRadius: playIconSize * 0.75 }]}>
            <Play size={playIconSize * 0.45} color="#fff" fill="#fff" />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1a1a1a",
    overflow: "hidden",
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
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
