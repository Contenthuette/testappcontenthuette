import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { SymbolView } from "@/components/Icon";

interface MediaMessageBubbleProps {
  mediaUrl: string;
  type: "image" | "video";
  isMine: boolean;
  timestamp: string;
  caption?: string;
}

export function MediaMessageBubble({
  mediaUrl,
  type,
  isMine,
  timestamp,
  caption,
}: MediaMessageBubbleProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Video player for inline preview (muted, no autoplay)
  const inlinePlayer = useVideoPlayer(type === "video" ? mediaUrl : null, (p) => {
    p.loop = false;
    p.muted = true;
  });

  // Video player for fullscreen playback (with sound)
  const fullscreenPlayer = useVideoPlayer(
    type === "video" && fullscreen ? mediaUrl : null,
    (p) => {
      p.loop = false;
      p.muted = false;
      if (fullscreen) p.play();
    },
  );

  const handlePress = useCallback(() => {
    setFullscreen(true);
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreen(false);
    try {
      fullscreenPlayer?.pause();
    } catch {
      // ignore
    }
  }, [fullscreenPlayer]);

  if (!mediaUrl) {
    return (
      <View style={[styles.container, isMine ? styles.mine : styles.other]}>
        <View style={[styles.mediaWrap, styles.errorWrap]}>
          <SymbolView name="exclamationmark.triangle" size={20} tintColor="#9CA3AF" />
          <Text style={styles.errorText}>Medium nicht verfügbar</Text>
        </View>
        <Text style={[styles.timestamp, isMine && styles.timestampMine]}>{timestamp}</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={[styles.container, isMine ? styles.mine : styles.other]}
      >
        <View style={styles.mediaWrap}>
          {type === "video" && inlinePlayer ? (
            <View style={styles.videoContainer}>
              <VideoView
                player={inlinePlayer}
                style={styles.media}
                nativeControls={false}
                contentFit="cover"
              />
              <View style={styles.playOverlay}>
                <View style={styles.playCircle}>
                  <SymbolView name="play.fill" size={20} tintColor="#FFF" />
                </View>
              </View>
            </View>
          ) : (
            <>
              <Image
                source={{ uri: mediaUrl }}
                style={styles.media}
                contentFit="cover"
                transition={200}
                onLoadStart={() => setImageLoading(true)}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
              {imageLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color="#FFF" />
                </View>
              )}
              {imageError && (
                <View style={styles.loadingOverlay}>
                  <SymbolView name="photo" size={24} tintColor="#9CA3AF" />
                </View>
              )}
            </>
          )}
        </View>
        {caption ? (
          <Text style={[styles.caption, isMine && styles.captionMine]}>{caption}</Text>
        ) : null}
        <Text style={[styles.timestamp, isMine && styles.timestampMine]}>{timestamp}</Text>
      </Pressable>

      {/* Fullscreen modal */}
      <Modal
        visible={fullscreen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseFullscreen}
      >
        <Pressable
          style={styles.modalBg}
          onPress={type === "image" ? handleCloseFullscreen : undefined}
        >
          <View style={{ width: screenWidth, height: screenHeight * 0.75 }}>
            {type === "video" && fullscreenPlayer ? (
              <VideoView
                player={fullscreenPlayer}
                style={StyleSheet.absoluteFill}
                nativeControls
                contentFit="contain"
              />
            ) : (
              <Image
                source={{ uri: mediaUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                transition={200}
              />
            )}
          </View>
          <Pressable
            style={styles.closeBtn}
            onPress={handleCloseFullscreen}
            hitSlop={16}
          >
            <SymbolView name="xmark" size={18} tintColor="#FFF" />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const MEDIA_PAD = 3;

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: "hidden",
    maxWidth: 260,
  },
  mine: {
    backgroundColor: "#000",
    borderBottomRightRadius: 6,
  },
  other: {
    backgroundColor: "#F2F2F7",
    borderBottomLeftRadius: 6,
  },
  mediaWrap: {
    margin: MEDIA_PAD,
    borderRadius: 15,
    overflow: "hidden",
    width: 240,
    height: 240,
  },
  media: {
    width: "100%",
    height: "100%",
  },
  videoContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  errorWrap: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  caption: {
    fontSize: 14,
    color: "#000",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 2,
  },
  captionMine: {
    color: "#FFF",
  },
  timestamp: {
    fontSize: 10,
    color: "rgba(0,0,0,0.4)",
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  timestampMine: {
    color: "rgba(255,255,255,0.5)",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
});
