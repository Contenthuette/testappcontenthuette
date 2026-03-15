import React, { useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { SymbolView } from "@/components/Icon";

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

/** Simple deterministic hash from string → stable seed */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const BAR_COUNT = 24;

/** Generate stable waveform heights from a seed so they never jitter */
function generateStableBars(seed: number): number[] {
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const a = Math.sin(seed * 0.001 + i * 0.8) * 6;
    const b = Math.sin(seed * 0.0007 + i * 1.3) * 4;
    const h = 10 + a + b;
    return Math.max(4, Math.min(22, h));
  });
}

function VoiceMessageBubbleInner({
  audioUrl,
  duration: durationSec,
  durationMs,
  isMine,
  isMe,
}: VoiceMessageBubbleProps) {
  const mine = isMine ?? isMe ?? false;
  const totalDuration = durationSec ?? (durationMs ? durationMs / 1000 : 0);

  const player = useAudioPlayer(audioUrl);
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;
  const currentTime = status.currentTime;
  const effectiveDuration =
    status.duration > 0 ? status.duration : totalDuration;

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

  const progress =
    effectiveDuration > 0 ? Math.min(currentTime / effectiveDuration, 1) : 0;
  const displayTime = isPlaying
    ? formatTime(currentTime)
    : formatTime(effectiveDuration);

  // Stable waveform – seeded by URL so it never changes between renders
  const bars = useMemo(() => generateStableBars(hashString(audioUrl)), [audioUrl]);

  return (
    <View
      style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}
    >
      <TouchableOpacity
        onPress={togglePlay}
        style={styles.playBtn}
        activeOpacity={0.7}
      >
        <SymbolView
          name={isPlaying ? "pause.fill" : "play.fill"}
          size={16}
          tintColor={mine ? "#FFFFFF" : "#000000"}
        />
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
                  backgroundColor:
                    i / bars.length <= progress
                      ? mine
                        ? "#FFFFFF"
                        : "#000000"
                      : mine
                        ? "rgba(255,255,255,0.3)"
                        : "#D4D4D8",
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Text
        style={[
          styles.time,
          { color: mine ? "rgba(255,255,255,0.7)" : "#71717A" },
        ]}
      >
        {displayTime}
      </Text>
    </View>
  );
}

/** Fallback UI shown when audio URL is missing or player crashes */
function VoiceMessageFallback({
  durationMs,
  duration: durationSec,
  isMine,
  isMe,
}: Omit<VoiceMessageBubbleProps, "audioUrl"> & { audioUrl?: string }) {
  const mine = isMine ?? isMe ?? false;
  const totalDuration = durationSec ?? (durationMs ? durationMs / 1000 : 0);
  const bars = useMemo(() => generateStableBars(12345), []);

  return (
    <View
      style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}
    >
      <View style={styles.playBtn}>
        <SymbolView
          name="waveform"
          size={16}
          tintColor={mine ? "rgba(255,255,255,0.5)" : "#A1A1AA"}
        />
      </View>

      <View style={styles.waveContainer}>
        <View style={styles.bars}>
          {bars.map((h, i) => (
            <View
              key={`bar-${i}`}
              style={[
                styles.bar,
                {
                  height: h,
                  backgroundColor: mine
                    ? "rgba(255,255,255,0.25)"
                    : "#E4E4E7",
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Text
        style={[
          styles.time,
          { color: mine ? "rgba(255,255,255,0.5)" : "#A1A1AA" },
        ]}
      >
        {totalDuration > 0 ? formatTime(totalDuration) : "…"}
      </Text>
    </View>
  );
}

/**
 * Safe wrapper: renders the inner player only when audioUrl is a valid string.
 * Falls back gracefully otherwise to prevent chat screen crashes.
 */
export function VoiceMessageBubble(props: VoiceMessageBubbleProps) {
  if (!props.audioUrl || props.audioUrl.length === 0) {
    return <VoiceMessageFallback {...props} />;
  }

  return <VoiceMessageBubbleInner {...props} />;
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
