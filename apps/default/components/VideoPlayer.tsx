import React, { useCallback, useRef, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

interface VideoPlayerProps {
  uri: string;
  height: number;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export function VideoPlayer({
  uri,
  height,
  autoPlay = true,
  loop = true,
  muted = true,
}: VideoPlayerProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    p.muted = muted;
    if (autoPlay) {
      p.play();
    }
  });

  return (
    <View style={[styles.container, { height }]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
      />
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
