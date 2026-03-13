import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { SymbolView } from "@/components/Icon";

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
  const [hasSeeked, setHasSeeked] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 5;

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
  });

  const seekToPreview = useCallback(() => {
    try {
      player.pause();
      player.currentTime = 0.1;
      setHasSeeked(true);
    } catch {
      // player not ready yet, will retry
    }
  }, [player]);

  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay" && !hasSeeked) {
        seekToPreview();
      }
    });

    // Try immediately in case player is already ready
    const immediateTimer = setTimeout(() => {
      seekToPreview();
    }, 100);

    // Multiple retry attempts with increasing delays
    const retryTimers: ReturnType<typeof setTimeout>[] = [];
    const scheduleRetry = () => {
      if (retryCount.current >= maxRetries) return;
      const delay = 300 + retryCount.current * 400;
      const timer = setTimeout(() => {
        if (!hasSeeked) {
          retryCount.current += 1;
          seekToPreview();
          scheduleRetry();
        }
      }, delay);
      retryTimers.push(timer);
    };
    scheduleRetry();

    return () => {
      sub.remove();
      clearTimeout(immediateTimer);
      retryTimers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, seekToPreview]);

  return (
    <View style={[styles.container, style]}>
      {/* Always show VideoView - no hidden state */}
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        allowsPictureInPicture={false}
        contentFit="cover"
      />
      {showPlayIcon && (
        <View style={styles.playOverlay}>
          <View
            style={[
              styles.playCircle,
              {
                width: playIconSize * 1.5,
                height: playIconSize * 1.5,
                borderRadius: playIconSize * 0.75,
              },
            ]}
          >
            <SymbolView
              name="play.fill"
              size={playIconSize * 0.5}
              tintColor="#fff"
            />
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
