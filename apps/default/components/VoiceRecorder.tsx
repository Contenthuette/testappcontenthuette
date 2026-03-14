import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  FadeIn,
  FadeOut,
  Easing,
} from "react-native-reanimated";
import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "@/lib/audio-safe";
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

type RecorderPhase = "idle" | "recording" | "preview";

const BAR_COUNT = 32;

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

  // Pulsing red dot
  const dotScale = useSharedValue(1);
  useEffect(() => {
    if (phase === "recording") {
      dotScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      dotScale.value = withTiming(1, { duration: 200 });
    }
  }, [phase, dotScale]);

  const dotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

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

  // Waveform bars (pseudo-random but deterministic per bar index + time)
  const waveformHeights = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const seed = Math.sin(i * 0.9 + elapsed * 1.2) * 0.5 + 0.5;
      const wave = Math.sin(i * 0.4 + elapsed * 0.6) * 0.3;
      const h = 4 + (seed + wave) * 16;
      return Math.max(3, Math.min(22, h));
    });
  }, [elapsed]);

  // Static waveform for preview (frozen at record time)
  const frozenWaveform = useRef<number[]>([]);

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

  const stopRecording = useCallback(async () => {
    try {
      // Freeze waveform before stopping
      frozenWaveform.current = waveformHeights;
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        setRecordedUri(uri);
        setRecordedDuration(elapsed);
        setPhase("preview");
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        onCancel();
      }
    } catch (err) {
      console.error("Stop recording error:", err);
      onCancel();
    }
  }, [audioRecorder, elapsed, onCancel, waveformHeights]);

  const handleSend = useCallback(() => {
    if (recordedUri) {
      if (previewPlayer && isPreviewPlaying) {
        previewPlayer.pause();
      }
      onSend(recordedUri, recordedDuration * 1000);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
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
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [onCancel, previewPlayer, isPreviewPlaying]);

  const togglePreview = useCallback(() => {
    if (!previewPlayer) return;
    if (isPreviewPlaying) {
      previewPlayer.pause();
    } else {
      if (
        previewStatus.currentTime >= previewStatus.duration &&
        previewStatus.duration > 0
      ) {
        previewPlayer.seekTo(0);
      }
      previewPlayer.play();
    }
  }, [previewPlayer, isPreviewPlaying, previewStatus]);

  // Auto-start on mount
  useEffect(() => {
    if (phase === "idle") {
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === RECORDING STATE ===
  if (phase === "recording") {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={styles.bar}
      >
        {/* Delete */}
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.iconBtn}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <SymbolView name="trash" size={17} tintColor="#9CA3AF" />
        </TouchableOpacity>

        {/* Waveform area */}
        <View style={styles.center}>
          <Animated.View style={[styles.redDot, dotAnimStyle]} />
          <View style={styles.waveform}>
            {waveformHeights.map((h, i) => (
              <View
                key={`w-${i}`}
                style={[
                  styles.waveBar,
                  {
                    height: h,
                    backgroundColor:
                      i < BAR_COUNT * 0.8 ? "#000" : "#D1D5DB",
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        </View>

        {/* Stop → goes to preview */}
        <TouchableOpacity
          onPress={stopRecording}
          style={styles.stopBtn}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <View style={styles.stopSquare} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // === PREVIEW STATE ===
  if (phase === "preview") {
    const previewBars =
      frozenWaveform.current.length > 0
        ? frozenWaveform.current
        : Array.from({ length: BAR_COUNT }, (_, i) => 4 + Math.sin(i * 0.6) * 8);

    const progress =
      previewStatus.duration > 0
        ? Math.min(previewStatus.currentTime / previewStatus.duration, 1)
        : 0;

    const displayTime = isPreviewPlaying
      ? formatTime(previewStatus.currentTime)
      : formatTime(recordedDuration);

    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={styles.bar}
      >
        {/* Delete */}
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.iconBtn}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <SymbolView name="trash" size={17} tintColor="#9CA3AF" />
        </TouchableOpacity>

        {/* Play/Pause */}
        <TouchableOpacity
          onPress={togglePreview}
          style={styles.playBtn}
          activeOpacity={0.7}
          hitSlop={6}
        >
          <SymbolView
            name={isPreviewPlaying ? "pause.fill" : "play.fill"}
            size={14}
            tintColor="#000"
          />
        </TouchableOpacity>

        {/* Waveform + time */}
        <View style={styles.center}>
          <View style={styles.waveform}>
            {previewBars.map((h, i) => (
              <View
                key={`p-${i}`}
                style={[
                  styles.waveBar,
                  {
                    height: h,
                    backgroundColor:
                      i / BAR_COUNT <= progress ? "#000" : "#D1D5DB",
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.previewTime}>{displayTime}</Text>
        </View>

        {/* Send */}
        <TouchableOpacity
          onPress={handleSend}
          style={styles.sendBtn}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <SymbolView name="arrow.up" size={15} tintColor="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // === IDLE (preparing) ===
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.bar}>
      <TouchableOpacity
        onPress={handleDelete}
        style={styles.iconBtn}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <SymbolView name="xmark" size={15} tintColor="#9CA3AF" />
      </TouchableOpacity>
      <View style={styles.center}>
        <View style={styles.preparingDot} />
        <Text style={styles.preparingText}>Aufnahme wird vorbereitet…</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 6,
    gap: 4,
  },

  // Shared icon button
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Center area (fills remaining space)
  center: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },

  // Red pulsing dot
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },

  // Waveform
  waveform: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 1.5,
    height: 24,
    overflow: "hidden",
  },
  waveBar: {
    width: 2.5,
    borderRadius: 1.5,
  },

  // Timer during recording
  timer: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
    fontVariant: ["tabular-nums"],
    minWidth: 32,
    textAlign: "right",
  },

  // Stop button (square icon)
  stopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  stopSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "#FFF",
  },

  // Play button in preview
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Preview time
  previewTime: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    fontVariant: ["tabular-nums"],
    minWidth: 30,
    textAlign: "right",
  },

  // Send button
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },

  // Preparing state
  preparingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
  },
  preparingText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
