import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
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
  const [isReady, setIsReady] = useState(false);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
  });

  const seekToPreview = useCallback(() => {
    try {
      player.pause();
      player.currentTime = 0.1;
      setIsReady(true);
    } catch {
      // player not ready yet
    }
  }, [player]);

  useEffect(() => {
    // Listen for the player to be ready before seeking
    const sub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay") {
        seekToPreview();
      }
    });

    // If the player is already ready (e.g. cached), seek immediately
    if ((player as unknown as { status: string }).status === "readyToPlay") {
      seekToPreview();
    }

    // Fallback: try after a longer delay
    const fallback = setTimeout(() => {
      if (!isReady) seekToPreview();
    }, 800);

    return () => {
      sub.remove();
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, seekToPreview]);

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={[styles.video, !isReady && styles.hidden]}
        nativeControls={false}
        allowsPictureInPicture={false}
        contentFit="cover"
      />
      {!isReady && (
        <View style={styles.placeholder}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
        </View>
      )}
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
  hidden: {
    opacity: 0,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
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
