import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import SymbolView from "@/components/Icon";

interface VoiceMessageBubbleProps {
  audioUrl: string;
  duration?: number;
  durationMs?: number;
  isMine?: boolean;
  isMe?: boolean;
  timestamp?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMessageBubble({ audioUrl, duration: durationSec, durationMs, isMine, isMe, timestamp }: VoiceMessageBubbleProps) {
  const mine = isMine ?? isMe ?? false;
  const totalDuration = durationSec ?? (durationMs ? durationMs / 1000 : 0);
  const player = useAudioPlayer(audioUrl);
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;
  const currentTime = status.currentTime;
  const effectiveDuration = status.duration > 0 ? status.duration : totalDuration;

  const togglePlay = useCallback(() => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      if (currentTime >= effectiveDuration && effectiveDuration > 0) {
        player.seekTo(0);
      }
      player.play();
    }
  }, [player, isPlaying, currentTime, effectiveDuration]);

  const progress = effectiveDuration > 0 ? Math.min(currentTime / effectiveDuration, 1) : 0;
  const displayTime = isPlaying ? formatTime(currentTime) : formatTime(effectiveDuration);

  // Waveform bars
  const bars = Array.from({ length: 24 }, (_, i) => {
    const h = 8 + Math.sin(i * 0.8) * 6 + Math.random() * 4;
    return Math.max(4, Math.min(20, h));
  });

  return (
    <View style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}>
      <TouchableOpacity onPress={togglePlay} style={styles.playBtn} activeOpacity={0.7}>
        <SymbolView name={isPlaying ? "pause" : "play"} size={18} tintColor={mine ? "#FFFFFF" : "#000000"} />
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
                    ? (mine ? "#FFFFFF" : "#000000")
                    : (mine ? "rgba(255,255,255,0.35)" : "#D4D4D8"),
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Text style={[styles.time, { color: mine ? "rgba(255,255,255,0.7)" : "#71717A" }]}>
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
