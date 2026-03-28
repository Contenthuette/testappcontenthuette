import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
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
  return (
    <View style={[styles.container, isMine ? styles.mine : styles.other]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: "hidden",
    maxWidth: 240,
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
    width: 240,
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    margin: 4,
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
});
