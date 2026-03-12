import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAudioPlayer } from "expo-audio";
import { Icon } from "@/components/Icon";

interface VoiceMessageBubbleProps {
  audioUrl: string;
  duration?: number;
  isMe: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMessageBubble({ audioUrl, duration = 0, isMe }: VoiceMessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const player = useAudioPlayer(audioUrl);

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener("playbackStatusUpdate", (status) => {
      if (status.playing) {
        setCurrentTime(status.currentTime);
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
      if (status.didJustFinish) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    });
    return () => sub.remove();
  }, [player]);

  const togglePlay = useCallback(() => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      if (currentTime >= (duration || 0)) {
        player.seekTo(0);
      }
      player.play();
    }
  }, [player, isPlaying, currentTime, duration]);

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const displayTime = isPlaying ? formatTime(currentTime) : formatTime(duration);

  // Waveform bars
  const bars = Array.from({ length: 24 }, (_, i) => {
    const h = 8 + Math.sin(i * 0.8) * 6 + Math.random() * 4;
    return Math.max(4, Math.min(20, h));
  });

  return (
    <View style={[styles.container, isMe ? styles.meContainer : styles.otherContainer]}>
      <TouchableOpacity onPress={togglePlay} style={styles.playBtn} activeOpacity={0.7}>
        <Icon name={isPlaying ? "pause" : "play"} size={18} color={isMe ? "#FFFFFF" : "#000000"} />
      </TouchableOpacity>

      <View style={styles.waveContainer}>
        <View style={styles.bars}>
          {bars.map((h, i) => (
            <View
              key={`bar-${i}`}
              style={[
                styles.bar,
                {
                  height: h,
                  backgroundColor: i / bars.length <= progress
                    ? (isMe ? "#FFFFFF" : "#000000")
                    : (isMe ? "rgba(255,255,255,0.35)" : "#D4D4D8"),
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Text style={[styles.time, { color: isMe ? "rgba(255,255,255,0.7)" : "#71717A" }]}>
        {displayTime}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 10,
    minWidth: 200,
    maxWidth: 280,
  },
  meContainer: {
    backgroundColor: "#000000",
  },
  otherContainer: {
    backgroundColor: "#F4F4F5",
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(128,128,128,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  waveContainer: {
    flex: 1,
    justifyContent: "center",
  },
  bars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 24,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
  time: {
    fontSize: 11,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
});
