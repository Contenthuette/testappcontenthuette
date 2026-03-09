import React, { useCallback, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

interface VideoPlayerProps {
  uri: string;
  height: number;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  hideControls?: boolean;
  isVisible?: boolean;
}

export function VideoPlayer({
  uri,
  height,
  autoPlay = true,
  loop = true,
  muted = false,
  hideControls = false,
  isVisible = true,
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

  return (
    <View style={[styles.container, { height }]}>
      {hideControls ? (
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={StyleSheet.absoluteFill}
        >
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
          />
        </Pressable>
      ) : (
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#000",
    borderRadius: 16,
    overflow: "hidden",
  },
  video: {
    flex: 1,
  },
});
