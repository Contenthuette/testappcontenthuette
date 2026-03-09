import React, { useCallback, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

interface VideoPlayerProps {
  uri: string;
  height: number;
  width?: number;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  hideControls?: boolean;
  isVisible?: boolean;
  borderRadius?: number;
  contentFit?: "cover" | "contain";
}

export function VideoPlayer({
  uri,
  height,
  width,
  autoPlay = true,
  loop = true,
  muted = false,
  hideControls = false,
  isVisible = true,
  borderRadius = 0,
  contentFit = "cover",
}: VideoPlayerProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    p.muted = muted;
  });

  useEffect(() => {
    if (isVisible && autoPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, autoPlay, player]);

  const handlePressIn = useCallback(() => {
    if (hideControls) {
      player.pause();
    }
  }, [player, hideControls]);

  const handlePressOut = useCallback(() => {
    if (hideControls && isVisible) {
      player.play();
    }
  }, [player, hideControls, isVisible]);

  const containerStyle = [
    styles.container,
    { height, ...(width ? { width } : {}) },
    borderRadius > 0 && { borderRadius, overflow: "hidden" as const },
  ];

  return (
    <View style={containerStyle}>
      {hideControls ? (
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={StyleSheet.absoluteFill}
        >
          <VideoView
            player={player}
            style={styles.video}
            contentFit={contentFit}
            nativeControls={false}
          />
        </Pressable>
      ) : (
        <VideoView
          player={player}
          style={styles.video}
          contentFit={contentFit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#000",
  },
  video: {
    flex: 1,
  },
});
