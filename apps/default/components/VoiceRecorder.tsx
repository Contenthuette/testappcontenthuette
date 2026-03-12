import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useAudioRecorder, requestRecordingPermissionsAsync, RecordingPresets, useAudioPlayer, useAudioPlayerStatus } from "@/lib/audio-safe";
import * as Haptics from "expo-haptics";
import { SymbolView } from "@/components/Icon";

interface VoiceRecorderProps {
  onSend: (uri: string, duration: number) => void;
  onCancel: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type RecorderPhase = "idle" | "recording" | "paused" | "preview";

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const previewPlayer = useAudioPlayer(recordedUri ?? undefined);
  const previewStatus = useAudioPlayerStatus(previewPlayer);
  const isPreviewPlaying = previewStatus.playing;

  // Timer
  useEffect(() => {
    if (phase === "recording") {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const startRecording = useCallback(async () => {
    try {
      const status = await requestRecordingPermissionsAsync();
      if (!status.granted) {
        onCancel();
        return;
      }
      audioRecorder.record();
      setElapsed(0);
      setPhase("recording");
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error("Start recording error:", err);
      onCancel();
    }
  }, [audioRecorder, onCancel]);

  const pauseRecording = useCallback(async () => {
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        setRecordedUri(uri);
        setRecordedDuration(elapsed);
        setPhase("preview");
      } else {
        onCancel();
      }
    } catch (err) {
      console.error("Pause recording error:", err);
      onCancel();
    }
  }, [audioRecorder, elapsed, onCancel]);

  const togglePreview = useCallback(() => {
    if (!previewPlayer) return;
    if (isPreviewPlaying) {
      previewPlayer.pause();
    } else {
      previewPlayer.play();
    }
  }, [previewPlayer, isPreviewPlaying]);

  const handleSend = useCallback(() => {
    if (recordedUri) {
      if (previewPlayer && isPreviewPlaying) {
        previewPlayer.pause();
      }
      onSend(recordedUri, recordedDuration);
    }
  }, [recordedUri, recordedDuration, onSend, previewPlayer, isPreviewPlaying]);

  const handleDelete = useCallback(() => {
    if (previewPlayer && isPreviewPlaying) {
      previewPlayer.pause();
    }
    setRecordedUri(null);
    setElapsed(0);
    setPhase("idle");
    onCancel();
  }, [onCancel, previewPlayer, isPreviewPlaying]);

  // Auto-start on mount
  useEffect(() => {
    if (phase === "idle") {
      startRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Waveform dots (animated-ish based on elapsed)
  const waveformDots = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const base = 4 + Math.sin(i * 0.6 + elapsed * 0.8) * 3;
      const h = Math.max(3, Math.min(14, base + Math.random() * 2));
      return h;
    });
  }, [elapsed]);

  // Circular progress (max 120s recording)
  const maxDuration = 120;
  const progress = Math.min(elapsed / maxDuration, 1);
  const circumference = 2 * Math.PI * 15;
  const strokeDashoffset = circumference * (1 - progress);

  // === RECORDING STATE ===
  if (phase === "recording") {
    return (
      <View style={styles.card}>
        {/* Top row: timer + waveform + circular progress */}
        <View style={styles.topRow}>
          <Text style={styles.timer}>{formatTime(elapsed)}</Text>

          <View style={styles.waveform}>
            {waveformDots.map((h, i) => (
              <View
                key={`dot-${i}`}
                style={[
                  styles.dot,
                  {
                    height: h,
                    backgroundColor:
                      i < waveformDots.length * 0.7 ? "#000" : "#D1D5DB",
                  },
                ]}
              />
            ))}
          </View>

          {/* Circular timer */}
          <View style={styles.circularTimer}>
            <View style={styles.circleTrack}>
              <Text style={styles.circleTime}>{formatTime(elapsed)}</Text>
            </View>
          </View>
        </View>

        {/* Bottom row: delete, pause/stop, send */}
        <View style={styles.bottomRow}>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteBtn}
            activeOpacity={0.7}
          >
            <SymbolView name="trash" size={18} tintColor="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={pauseRecording}
            style={styles.pauseBtn}
            activeOpacity={0.7}
          >
            <SymbolView name="pause.fill" size={18} tintColor="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await pauseRecording();
              // Send will be handled via preview state
            }}
            style={styles.sendBtnBlack}
            activeOpacity={0.7}
          >
            <SymbolView name="arrow.up" size={16} tintColor="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // === PREVIEW STATE (after stop) ===
  if (phase === "preview") {
    const previewProgress =
      previewStatus.duration > 0
        ? Math.min(previewStatus.currentTime / previewStatus.duration, 1)
        : 0;

    return (
      <View style={styles.card}>
        {/* Top row: play/pause + waveform + time */}
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={togglePreview}
            style={styles.previewPlayBtn}
            activeOpacity={0.7}
          >
            <SymbolView
              name={isPreviewPlaying ? "pause.fill" : "play.fill"}
              size={16}
              tintColor="#000"
            />
          </TouchableOpacity>

          <View style={styles.waveform}>
            {waveformDots.map((h, i) => (
              <View
                key={`pdot-${i}`}
                style={[
                  styles.dot,
                  {
                    height: h,
                    backgroundColor:
                      i / waveformDots.length <= previewProgress
                        ? "#000"
                        : "#D1D5DB",
                  },
                ]}
              />
            ))}
          </View>

          <Text style={styles.previewTime}>
            {formatTime(
              isPreviewPlaying
                ? previewStatus.currentTime
                : recordedDuration
            )}
          </Text>
        </View>

        {/* Bottom row: delete + send */}
        <View style={styles.bottomRow}>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteBtn}
            activeOpacity={0.7}
          >
            <SymbolView name="trash" size={18} tintColor="#9CA3AF" />
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            onPress={handleSend}
            style={styles.sendBtnBlack}
            activeOpacity={0.7}
          >
            <SymbolView name="arrow.up" size={16} tintColor="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // idle – nothing visible (auto-starts recording)
  return null;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F3F4F6",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 14,
  },

  /* ---- Top row ---- */
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timer: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    fontVariant: ["tabular-nums"],
    minWidth: 34,
  },
  waveform: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 18,
    overflow: "hidden",
  },
  dot: {
    width: 3,
    borderRadius: 1.5,
  },
  circularTimer: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  circleTrack: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  circleTime: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6B7280",
    fontVariant: ["tabular-nums"],
  },

  /* ---- Bottom row ---- */
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  deleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  pauseBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnBlack: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ---- Preview row ---- */
  previewPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewTime: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    fontVariant: ["tabular-nums"],
    minWidth: 30,
    textAlign: "right",
  },
});
