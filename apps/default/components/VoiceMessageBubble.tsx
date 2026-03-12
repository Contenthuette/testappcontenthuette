import React, { useState, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Audio } from "expo-audio";
import { colors, spacing } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";

interface VoiceMessageBubbleProps {
  audioUrl: string | null;
  durationMs?: number;
  isMine: boolean;
  timestamp: string;
}

export function VoiceMessageBubble({
  audioUrl,
  durationMs,
  isMine,
  timestamp,
}: VoiceMessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const playerRef = useRef<Audio.AudioPlayer | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = durationMs ? Math.round(durationMs / 1000) : 0;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handlePlay = useCallback(async () => {
    if (!audioUrl) return;

    if (isPlaying && playerRef.current) {
      playerRef.current.pause();
      setIsPlaying(false);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    try {
      if (playerRef.current) {
        playerRef.current.release();
      }

      const player = Audio.createAudioPlayer({ uri: audioUrl });
      playerRef.current = player;
      setIsPlaying(true);
      setProgress(0);
      player.play();

      const totalMs = durationMs || 3000;
      const startTime = Date.now();
      progressTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const p = Math.min(elapsed / totalMs, 1);
        setProgress(p);
        if (p >= 1) {
          setIsPlaying(false);
          setProgress(0);
          if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        }
      }, 100);
    } catch (err) {
      console.error("Failed to play audio", err);
      setIsPlaying(false);
    }
  }, [audioUrl, durationMs, isPlaying]);

  // Random but deterministic-looking waveform bars
  const barHeights = React.useMemo(() => {
    const heights: number[] = [];
    for (let i = 0; i < 28; i++) {
      heights.push(4 + Math.sin(i * 0.7) * 8 + Math.cos(i * 1.3) * 6);
    }
    return heights;
  }, []);

  return (
    <View style={[styles.container, isMine ? styles.mine : styles.other]}>
      <View style={styles.row}>
        <TouchableOpacity onPress={handlePlay} style={[styles.playBtn, isMine ? styles.playBtnMine : styles.playBtnOther]}>
          <SymbolView
            name={isPlaying ? "pause" : "play"}
            size={14}
            tintColor={isMine ? colors.black : colors.white}
          />
        </TouchableOpacity>

        <View style={styles.waveContainer}>
          {barHeights.map((h, i) => {
            const filled = progress > i / barHeights.length;
            return (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: h,
                    backgroundColor: filled
                      ? isMine
                        ? colors.white
                        : colors.black
                      : isMine
                        ? "rgba(255,255,255,0.35)"
                        : colors.gray300,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.duration, isMine && styles.durationMine]}>
          {formatTime(totalSeconds)}
        </Text>
        <Text style={[styles.time, isMine && styles.timeMine]}>{timestamp}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    minWidth: 200,
    maxWidth: 280,
  },
  mine: {
    backgroundColor: colors.black,
    borderBottomRightRadius: 6,
  },
  other: {
    backgroundColor: colors.gray100,
    borderBottomLeftRadius: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtnMine: {
    backgroundColor: colors.white,
  },
  playBtnOther: {
    backgroundColor: colors.black,
  },
  waveContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 28,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  duration: {
    fontSize: 12,
    color: colors.gray500,
    fontVariant: ["tabular-nums"],
  },
  durationMine: {
    color: "rgba(255,255,255,0.6)",
  },
  time: {
    fontSize: 10,
    color: colors.gray400,
  },
  timeMine: {
    color: "rgba(255,255,255,0.5)",
  },
});
