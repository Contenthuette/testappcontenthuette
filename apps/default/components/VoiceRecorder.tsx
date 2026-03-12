import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useAudioRecorder, requestRecordingPermissionsAsync, RecordingPresets, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";

interface VoiceRecorderProps {
  onSend: (uri: string, duration: number) => void;
  onCancel: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type RecorderPhase = "idle" | "recording" | "preview";

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
      setElapsed(0);
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
      if (!status.granted) return;
      audioRecorder.record();
      setPhase("recording");
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error("Start recording error:", err);
    }
  }, [audioRecorder]);

  const stopRecording = useCallback(async () => {
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
      console.error("Stop recording error:", err);
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

  // Fake waveform bars
  const waveformBars = Array.from({ length: 20 }, (_, i) => {
    const height = 6 + Math.sin(i * 0.7 + elapsed) * 8 + Math.random() * 4;
    return Math.max(4, Math.min(22, height));
  });

  if (phase === "recording") {
    return (
      <View style={styles.container}>
        <View style={styles.recordingRow}>
          <View style={styles.redDot} />
          <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
        </View>

        <View style={styles.waveform}>
          {waveformBars.map((h, i) => (
            <View
              key={`wave-${i}`}
              style={[
                styles.waveBar,
                {
                  height: h,
                  backgroundColor: i < waveformBars.length * 0.7 ? "#000000" : "#D4D4D8",
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={handleDelete} style={styles.actionBtn} activeOpacity={0.7}>
            <Icon name="trash" size={20} tintColor="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity onPress={stopRecording} style={styles.stopBtn} activeOpacity={0.7}>
            <View style={styles.stopSquare} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === "preview") {
    return (
      <View style={styles.container}>
        <View style={styles.previewRow}>
          <TouchableOpacity onPress={togglePreview} style={styles.playBtn} activeOpacity={0.7}>
            <Icon name={isPreviewPlaying ? "pause" : "play"} size={18} tintColor="#000" />
          </TouchableOpacity>
          <Text style={styles.previewTime}>{formatTime(recordedDuration)}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={handleDelete} style={styles.actionBtn} activeOpacity={0.7}>
            <Icon name="trash" size={20} tintColor="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.7}>
            <Icon name="send" size={18} tintColor="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F4F5",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
  },
  timerText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    fontVariant: ["tabular-nums"],
  },
  waveform: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 24,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  stopSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  previewRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewTime: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    fontVariant: ["tabular-nums"],
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
});
