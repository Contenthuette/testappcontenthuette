import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Audio } from "expo-audio";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";

interface VoiceRecorderProps {
  onSend: (uri: string, durationMs: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const playerRef = useRef<Audio.AudioPlayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermission();
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      await Audio.setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (uri) {
        setRecordedUri(uri);
        setRecordedDuration(recordingDuration);
        setIsPreviewing(true);
      }

      recordingRef.current = null;
      setIsRecording(false);

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.error("Failed to stop recording", err);
    }
  }, [recordingDuration]);

  // Play preview
  const playPreview = useCallback(async () => {
    if (!recordedUri) return;
    try {
      if (playerRef.current) {
        await playerRef.current.release();
      }
      const player = Audio.createAudioPlayer({ uri: recordedUri });
      playerRef.current = player;
      setIsPlaying(true);
      player.play();

      // Auto-stop after duration
      setTimeout(() => {
        setIsPlaying(false);
      }, recordedDuration * 1000 + 500);
    } catch (err) {
      console.error("Failed to play preview", err);
      setIsPlaying(false);
    }
  }, [recordedUri, recordedDuration]);

  // Stop preview
  const stopPreview = useCallback(async () => {
    if (playerRef.current) {
      playerRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Handle send
  const handleSend = useCallback(() => {
    if (recordedUri) {
      onSend(recordedUri, recordedDuration * 1000);
    }
  }, [recordedUri, recordedDuration, onSend]);

  // Handle delete / cancel
  const handleCancel = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
    }
    if (playerRef.current) {
      playerRef.current.release();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    onCancel();
  }, [onCancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playerRef.current) playerRef.current.release();
    };
  }, []);

  // Auto-start recording on mount
  useEffect(() => {
    startRecording();
  }, [startRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      {/* Cancel button */}
      <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
        <SymbolView name="trash" size={20} tintColor={colors.gray500} />
      </TouchableOpacity>

      {/* Center: Recording or Preview */}
      <View style={styles.center}>
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.redDot} />
            <Text style={styles.timerText}>{formatTime(recordingDuration)}</Text>
          </View>
        )}

        {isPreviewing && !isRecording && (
          <View style={styles.previewRow}>
            <TouchableOpacity
              onPress={isPlaying ? stopPreview : playPreview}
              style={styles.playBtn}
            >
              <SymbolView
                name={isPlaying ? "pause" : "play"}
                size={16}
                tintColor={colors.white}
              />
            </TouchableOpacity>
            <View style={styles.waveform}>
              {Array.from({ length: 20 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: 4 + Math.random() * 16,
                      backgroundColor: isPlaying
                        ? colors.black
                        : colors.gray300,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.durationText}>{formatTime(recordedDuration)}</Text>
          </View>
        )}
      </View>

      {/* Right: Stop or Send */}
      {isRecording && (
        <TouchableOpacity onPress={stopRecording} style={styles.stopBtn}>
          <View style={styles.stopSquare} />
        </TouchableOpacity>
      )}

      {isPreviewing && !isRecording && (
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
          <SymbolView name="arrow.up" size={18} tintColor={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  cancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF3B30",
  },
  timerText: {
    fontSize: 18,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: colors.black,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: 1.5,
  },
  durationText: {
    fontSize: 13,
    color: colors.gray500,
    fontVariant: ["tabular-nums"],
    minWidth: 36,
  },
  stopBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  stopSquare: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
});
