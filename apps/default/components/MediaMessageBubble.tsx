import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { SymbolView } from "@/components/Icon";

const SCREEN = Dimensions.get("window");

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

  return (
    <>
      <Pressable
        onPress={() => type === "image" && setFullscreen(true)}
        style={[styles.container, isMine ? styles.mine : styles.other]}
      >
        <View style={styles.mediaWrap}>
          <Image
            source={{ uri: mediaUrl }}
            style={styles.media}
            contentFit="cover"
            transition={200}
          />
          {type === "video" && (
            <View style={styles.playOverlay}>
              <View style={styles.playCircle}>
                <SymbolView name="play.fill" size={20} tintColor="#FFF" />
              </View>
            </View>
          )}
        </View>
        {caption ? (
          <Text style={[styles.caption, isMine && styles.captionMine]}>
            {caption}
          </Text>
        ) : null}
        <Text style={[styles.timestamp, isMine && styles.timestampMine]}>
          {timestamp}
        </Text>
      </Pressable>

      {/* Fullscreen image modal */}
      <Modal
        visible={fullscreen}
        transparent
        animationType={Platform.OS === "web" ? "fade" : "fade"}
        statusBarTranslucent
        onRequestClose={() => setFullscreen(false)}
      >
        <Pressable style={styles.modalBg} onPress={() => setFullscreen(false)}>
          <View style={styles.modalContent}>
            <Image
              source={{ uri: mediaUrl }}
              style={styles.fullImage}
              contentFit="contain"
              transition={200}
            />
          </View>
          <Pressable
            style={styles.closeBtn}
            onPress={() => setFullscreen(false)}
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
    aspectRatio: 9 / 16,
  },
  media: {
    width: "100%",
    height: "100%",
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

  // Fullscreen modal
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: SCREEN.width,
    height: SCREEN.height * 0.75,
  },
  fullImage: {
    width: "100%",
    height: "100%",
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
