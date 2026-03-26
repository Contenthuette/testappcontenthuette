import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  PanResponder,
  LayoutChangeEvent,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { SymbolView } from "@/components/Icon";
import { colors, spacing, radius } from "@/lib/theme";
import * as Haptics from "expo-haptics";

interface EventVideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function EventVideoPlayer({ videoUrl, thumbnailUrl }: EventVideoPlayerProps) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasEnded, setHasEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const barWidth = useRef(0);

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });

  const haptic = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Progress polling
  useEffect(() => {
    if (showPlayer && player) {
      progressTimer.current = setInterval(() => {
        if (!isSeeking) {
          setCurrentTime(player.currentTime);
          if (player.duration > 0) setDuration(player.duration);
        }
      }, 250);
      return () => {
        if (progressTimer.current) clearInterval(progressTimer.current);
      };
    }
    return undefined;
  }, [showPlayer, player, isSeeking]);

  // Player events
  useEffect(() => {
    if (!player) return;

    const statusSub = player.addListener("statusChange", (payload) => {
      if (payload.status === "readyToPlay") {
        setIsBuffering(false);
        if (player.duration > 0) setDuration(player.duration);
      } else if (payload.status === "loading") {
        setIsBuffering(true);
      } else if (payload.status === "idle") {
        setIsBuffering(false);
      }
    });

    const playingSub = player.addListener("playingChange", (payload) => {
      setIsPlaying(payload.isPlaying);
      if (payload.isPlaying) {
        setHasEnded(false);
        scheduleHideControls();
      } else {
        setShowControls(true);
        clearHideTimer();
      }
    });

    const endSub = player.addListener("playToEnd", () => {
      setHasEnded(true);
      setIsPlaying(false);
      setShowControls(true);
      setShowPlayer(false);
      setCurrentTime(0);
      clearHideTimer();
    });

    return () => {
      statusSub.remove();
      playingSub.remove();
      endSub.remove();
    };
  }, [player]);

  const clearHideTimer = useCallback(() => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    clearHideTimer();
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, [clearHideTimer]);

  // Seekbar PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsSeeking(true);
        clearHideTimer();
        setShowControls(true);
        const x = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, x / barWidth.current));
        setSeekTime(ratio * duration);
      },
      onPanResponderMove: (evt) => {
        const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / barWidth.current));
        setSeekTime(ratio * duration);
      },
      onPanResponderRelease: () => {
        setIsSeeking(false);
        if (player) {
          player.currentTime = seekTime;
          setCurrentTime(seekTime);
        }
        scheduleHideControls();
      },
    }),
  ).current;

  const handleBarLayout = useCallback((e: LayoutChangeEvent) => {
    barWidth.current = e.nativeEvent.layout.width;
  }, []);

  const handleTapThumbnail = useCallback(() => {
    haptic();
    setShowPlayer(true);
    setIsBuffering(true);
    setTimeout(() => {
      player.play();
    }, 200);
  }, [player, haptic]);

  const handleTogglePlay = useCallback(() => {
    haptic();
    if (hasEnded) {
      player.currentTime = 0;
      player.play();
      setHasEnded(false);
    } else if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, isPlaying, hasEnded, haptic]);

  const handleTapOverlay = useCallback(() => {
    if (isPlaying) {
      setShowControls((prev) => {
        if (!prev) {
          scheduleHideControls();
          return true;
        }
        clearHideTimer();
        return false;
      });
    }
  }, [isPlaying, scheduleHideControls, clearHideTimer]);

  const progress = duration > 0 ? (isSeeking ? seekTime : currentTime) / duration : 0;
  const displayTime = isSeeking ? seekTime : currentTime;

  // Thumbnail view
  if (!showPlayer) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionLabel}>Erklärvideo</Text>
        <TouchableOpacity
          style={styles.thumbnailWrap}
          onPress={handleTapThumbnail}
          activeOpacity={0.85}
        >
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <SymbolView name="film" size={32} tintColor={colors.gray400} />
            </View>
          )}
          <View style={styles.playOverlay}>
            <View style={styles.bigPlayBtn}>
              <SymbolView name="play.fill" size={28} tintColor={colors.white} />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Player view
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Erklärvideo</Text>
      <View style={styles.playerWrap}>
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={false}
          contentFit="contain"
        />

        {/* Tap overlay */}
        <TouchableOpacity
          style={styles.controlOverlay}
          onPress={handleTapOverlay}
          activeOpacity={1}
        >
          {/* Buffering */}
          {isBuffering && (
            <View style={styles.centerControl}>
              <ActivityIndicator size="large" color={colors.white} />
            </View>
          )}

          {/* Play/Pause center button */}
          {showControls && !isBuffering && (
            <View style={styles.centerControl}>
              <TouchableOpacity
                style={styles.mainControlBtn}
                onPress={handleTogglePlay}
                hitSlop={12}
              >
                <SymbolView
                  name={
                    hasEnded
                      ? "arrow.counterclockwise"
                      : isPlaying
                        ? "pause.fill"
                        : "play.fill"
                  }
                  size={28}
                  tintColor={colors.white}
                />
              </TouchableOpacity>
              {hasEnded && <Text style={styles.endedText}>Video beendet</Text>}
            </View>
          )}
        </TouchableOpacity>

        {/* Bottom bar with seekbar + time */}
        {showControls && !isBuffering && (
          <View style={styles.bottomControls}>
            <Text style={styles.timeText}>{formatTime(displayTime)}</Text>
            <View
              style={styles.seekBarWrap}
              onLayout={handleBarLayout}
              {...panResponder.panHandlers}
            >
              <View style={styles.seekBarTrack}>
                <View style={[styles.seekBarFill, { width: `${progress * 100}%` }]} />
              </View>
              <View
                style={[
                  styles.seekThumb,
                  { left: `${progress * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  thumbnailWrap: {
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: colors.gray100,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gray100,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  bigPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4,
  },
  playerWrap: {
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: colors.black,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  controlOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  centerControl: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mainControlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  endedText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },

  /* Bottom seek bar */
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 28,
    backgroundColor: "rgba(0,0,0,0.0)",
    // gradient effect via top padding
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    fontVariant: ["tabular-nums"],
    minWidth: 36,
    textAlign: "center",
  },
  seekBarWrap: {
    flex: 1,
    height: 28,
    justifyContent: "center",
  },
  seekBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  seekBarFill: {
    height: "100%",
    backgroundColor: colors.white,
    borderRadius: 2,
  },
  seekThumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
    marginLeft: -7,
    top: 7,
    boxShadow: "0px 1px 4px rgba(0,0,0,0.3)",
  },
});
