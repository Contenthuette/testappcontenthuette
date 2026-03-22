import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
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

export function EventVideoPlayer({ videoUrl, thumbnailUrl }: EventVideoPlayerProps) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasEnded, setHasEnded] = useState(false);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });

  const haptic = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Listen for player status changes
  React.useEffect(() => {
    if (!player) return;

    const statusSub = player.addListener("statusChange", (payload) => {
      if (payload.status === "readyToPlay") {
        setIsBuffering(false);
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
    }, 2500);
  }, [clearHideTimer]);

  const handleTapThumbnail = useCallback(() => {
    haptic();
    setShowPlayer(true);
    setIsBuffering(true);
    // Small delay for player to mount
    setTimeout(() => {
      player.play();
    }, 200);
  }, [player, haptic]);

  const handleTogglePlay = useCallback(() => {
    haptic();
    if (hasEnded) {
      // Restart from beginning
      player.currentTime = 0;
      player.play();
      setHasEnded(false);
    } else if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, isPlaying, hasEnded, haptic]);

  const handleRestart = useCallback(() => {
    haptic();
    player.currentTime = 0;
    player.play();
    setHasEnded(false);
  }, [player, haptic]);

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

  // Thumbnail view (before playing)
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
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <SymbolView name="film" size={32} tintColor={colors.gray400} />
            </View>
          )}
          {/* Big play button overlay */}
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

        {/* Tap overlay for showing/hiding controls */}
        <TouchableOpacity
          style={styles.controlOverlay}
          onPress={handleTapOverlay}
          activeOpacity={1}
        >
          {/* Buffering indicator */}
          {isBuffering && (
            <View style={styles.centerControl}>
              <ActivityIndicator size="large" color={colors.white} />
            </View>
          )}

          {/* Controls (play/pause, restart) */}
          {showControls && !isBuffering && (
            <View style={styles.centerControl}>
              <View style={styles.controlsRow}>
                {/* Restart button */}
                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={handleRestart}
                  hitSlop={12}
                >
                  <SymbolView
                    name="backward.end.fill"
                    size={20}
                    tintColor={colors.white}
                  />
                </TouchableOpacity>

                {/* Play/Pause button */}
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

                {/* Spacer for symmetry */}
                <View style={styles.controlBtn} />
              </View>

              {hasEnded && (
                <Text style={styles.endedText}>Video beendet</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    height: 220,
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
    paddingLeft: 4, // optical center for play icon
  },
  playerWrap: {
    height: 220,
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
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 32,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
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
});
