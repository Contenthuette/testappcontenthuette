import React, { useCallback, useEffect, useState, useRef } from "react";
import { View, StyleSheet, Pressable, LayoutChangeEvent } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { SymbolView } from "expo-symbols";

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
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const barWidthRef = useRef(0);
  const isSeeking = useRef(false);
  const didSeekInit = useRef(false);

  // Seek to 0.1s on mount when not auto-playing to show a preview frame
  useEffect(() => {
    if (!autoPlay && !didSeekInit.current) {
      didSeekInit.current = true;
      const timer = setTimeout(() => {
        try {
          player.currentTime = 0.1;
        } catch {
          // player may not be ready
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [player, autoPlay]);

  useEffect(() => {
    if (isVisible && autoPlay) {
      player.play();
      setIsPlaying(true);
    } else if (!isVisible) {
      player.pause();
      setIsPlaying(false);
    }
  }, [isVisible, autoPlay, player]);

  const handleTapToPlay = useCallback(() => {
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, [player, isPlaying]);

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
        <Pressable onPress={handleTapToPlay} style={StyleSheet.absoluteFill}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit={contentFit}
            nativeControls={isPlaying}
          />
          {!isPlaying && (
            <View style={styles.playOverlay}>
              <View style={styles.playCircle}>
                <SymbolView name="play.fill" size={28} tintColor="#fff" />
              </View>
            </View>
          )}
        </Pressable>
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
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
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
