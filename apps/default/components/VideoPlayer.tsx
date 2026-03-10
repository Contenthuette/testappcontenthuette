import React, { useCallback, useEffect, useState, useRef } from "react";
import { View, StyleSheet, Pressable, LayoutChangeEvent } from "react-native";
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

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const barWidthRef = useRef(0);
  const isSeeking = useRef(false);

  useEffect(() => {
    if (isVisible && autoPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVisible, autoPlay, player]);

  // Track playback progress
  useEffect(() => {
    if (!hideControls) return;
    const interval = setInterval(() => {
      if (isSeeking.current) return;
      try {
        const ct = player.currentTime ?? 0;
        const dur = player.duration ?? 0;
        if (dur > 0) {
          setDuration(dur);
          setProgress(ct / dur);
        }
      } catch {
        // player may not be ready
      }
    }, 250);
    return () => clearInterval(interval);
  }, [player, hideControls]);

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

  const handleBarLayout = useCallback((e: LayoutChangeEvent) => {
    barWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  const handleSeek = useCallback((locationX: number) => {
    const w = barWidthRef.current;
    if (w <= 0 || duration <= 0) return;
    const ratio = Math.max(0, Math.min(1, locationX / w));
    isSeeking.current = true;
    player.currentTime = ratio * duration;
    setProgress(ratio);
    setTimeout(() => { isSeeking.current = false; }, 300);
  }, [player, duration]);

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
      {/* Scrubber bar */}
      {hideControls && duration > 0 && (
        <Pressable
          style={styles.scrubberWrap}
          onLayout={handleBarLayout}
          onPress={(e) => handleSeek(e.nativeEvent.locationX)}
          hitSlop={{ top: 14, bottom: 6 }}
        >
          <View style={styles.scrubberTrack}>
            <View style={[styles.scrubberFill, { width: `${progress * 100}%` }]} />
          </View>
        </Pressable>
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
  scrubberWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 14,
  },
  scrubberTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 1.5,
    overflow: "hidden",
  },
  scrubberFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 1.5,
  },
});
