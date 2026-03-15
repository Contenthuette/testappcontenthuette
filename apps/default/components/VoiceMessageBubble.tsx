import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SymbolView } from "@/components/Icon";
import { useChatAudio } from "@/lib/ChatAudioProvider";

interface VoiceMessageBubbleProps {
  audioUrl: string;
  duration?: number;
  durationMs?: number;
  isMine?: boolean;
  isMe?: boolean;
  timestamp?: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const BAR_COUNT = 24;

function generateStableBars(seed: number): number[] {
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const a = Math.sin(seed * 0.001 + i * 0.8) * 6;
    const b = Math.sin(seed * 0.0007 + i * 1.3) * 4;
    const h = 10 + a + b;
    return Math.max(4, Math.min(22, h));
  });
}

function WaveformBars({ bars, progress, mine }: { bars: number[]; progress: number; mine: boolean }) {
  return (
    <View style={styles.waveContainer}>
      <View style={styles.bars}>
        {bars.map((h, i) => (
          <View
            key={`bar-${i}`}
            style={[
              styles.bar,
              {
                height: h,
                backgroundColor:
                  i / bars.length <= progress
                    ? (mine ? "#FFFFFF" : "#000000")
                    : (mine ? "rgba(255,255,255,0.3)" : "#D4D4D8"),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function VoiceMessageBubble(props: VoiceMessageBubbleProps) {
  const { audioUrl, duration, durationMs, isMine, isMe, timestamp } = props;
  const mine = isMine ?? isMe ?? false;
  const totalDuration = duration ?? (durationMs ? durationMs / 1000 : 0);
  const bars = useMemo(() => generateStableBars(hashString(audioUrl || "x")), [audioUrl]);

  // Use the shared single audio player from context
  const audio = useChatAudio();
  const isThisPlaying = audio.currentUrl === audioUrl && audio.isPlaying;
  const isThisLoading = audio.currentUrl === audioUrl && audio.isLoading;
  const isThisActive = audio.currentUrl === audioUrl && audio.isLoaded;

  const handleToggle = () => {
    if (!audioUrl) return;
    audio.toggle(audioUrl);
  };

  // Progress for this specific message
  const effectiveDuration = isThisActive && audio.duration > 0 ? audio.duration : totalDuration;
  const progress = isThisActive && effectiveDuration > 0
    ? Math.min(audio.currentTime / effectiveDuration, 1)
    : 0;
  const displayTime = isThisPlaying
    ? formatTime(audio.currentTime)
    : formatTime(effectiveDuration);

  // No URL fallback
  if (!audioUrl) {
    return (
      <View style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}>
        <View style={styles.playBtn}>
          <SymbolView name="exclamationmark.triangle" size={14} tintColor={mine ? "rgba(255,255,255,0.5)" : "#A1A1AA"} />
        </View>
        <Text style={[styles.errorLabel, { color: mine ? "rgba(255,255,255,0.6)" : "#A1A1AA" }]}>
          Audio nicht verfügbar
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}>
      <TouchableOpacity onPress={handleToggle} style={styles.playBtn} activeOpacity={0.7}>
        {isThisLoading ? (
          <ActivityIndicator size="small" color={mine ? "#FFFFFF" : "#000000"} />
        ) : (
          <SymbolView
            name={isThisPlaying ? "pause.fill" : "play.fill"}
            size={16}
            tintColor={mine ? "#FFFFFF" : "#000000"}
          />
        )}
      </TouchableOpacity>
      <WaveformBars bars={bars} progress={isThisPlaying ? progress : 0} mine={mine} />
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
  meContainer: { backgroundColor: "#000000" },
  otherContainer: { backgroundColor: "#F4F4F5" },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(128,128,128,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  waveContainer: { flex: 1, justifyContent: "center" },
  bars: { flexDirection: "row", alignItems: "center", gap: 2, height: 24 },
  bar: { width: 3, borderRadius: 2 },
  time: { fontSize: 11, fontWeight: "500", fontVariant: ["tabular-nums"] },
  errorLabel: { fontSize: 12, fontWeight: "500", flex: 1 },
});
