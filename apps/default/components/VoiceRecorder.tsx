import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  FadeIn,
  Easing,
} from "react-native-reanimated";
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from "expo-audio";
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

type RecorderPhase = "idle" | "recording" | "stopped" | "error";

const BAR_COUNT = 28;

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStartedRef = useRef(false);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

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

  // Waveform bars
  const waveformHeights = useMemo(() => {
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const seed = Math.sin(i * 0.9 + elapsed * 1.2) * 0.5 + 0.5;
      const wave = Math.sin(i * 0.4 + elapsed * 0.6) * 0.3;
      const h = 4 + (seed + wave) * 16;
      return Math.max(3, Math.min(22, h));
    });
  }, [elapsed]);

  const frozenWaveform = useRef<number[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setPhase("error");
        setErrorMsg("Mikrofon-Zugriff verweigert");
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setElapsed(0);
      setPhase("recording");
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error("Start recording error:", err);
      setPhase("error");
      setErrorMsg("Aufnahme konnte nicht gestartet werden");
    }
  }, [audioRecorder]);

  const stopRecording = useCallback(async () => {
    try {
      frozenWaveform.current = [...waveformHeights];
      const dur = elapsed;
      await audioRecorder.stop();
      setRecordedDuration(dur);
      setPhase("stopped");
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.error("Stop recording error:", err);
      setPhase("error");
      setErrorMsg("Aufnahme konnte nicht gestoppt werden");
    }
  }, [audioRecorder, elapsed, waveformHeights]);

  const handleSend = useCallback(() => {
    const uri = audioRecorder.uri;
    if (uri) {
      onSend(uri, recordedDuration * 1000);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      setPhase("error");
      setErrorMsg("Keine Aufnahme vorhanden");
    }
  }, [audioRecorder.uri, recordedDuration, onSend]);

  const handleDelete = useCallback(() => {
    setElapsed(0);
    setPhase("idle");
    onCancel();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [onCancel]);

  // Auto-start on mount (once)
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === ERROR STATE ===
  if (phase === "error") {
    return (
      <View style={styles.bar}>
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.iconBtn}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <SymbolView name="xmark" size={15} tintColor="#9CA3AF" />
        </TouchableOpacity>
        <View style={styles.center}>
          <SymbolView
            name="exclamationmark.triangle"
            size={16}
            tintColor="#EF4444"
          />
          <Text style={styles.errorText}>{errorMsg || "Fehler"}</Text>
        </View>
      </View>
    );
  }

  // === RECORDING STATE ===
  if (phase === "recording") {
    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.bar}>
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.iconBtn}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <SymbolView name="trash" size={17} tintColor="#9CA3AF" />
        </TouchableOpacity>

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

  // === STOPPED / REVIEW STATE ===
  if (phase === "stopped") {
    const previewBars =
      frozenWaveform.current.length > 0
        ? frozenWaveform.current
        : Array.from({ length: BAR_COUNT }, (_, i) => 4 + Math.sin(i * 0.6) * 8);

    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.bar}>
        <TouchableOpacity
          onPress={handleDelete}
          style={styles.iconBtn}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <SymbolView name="trash" size={17} tintColor="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.center}>
          <SymbolView name="waveform" size={16} tintColor="#000" />
          <View style={styles.waveform}>
            {previewBars.map((h, i) => (
              <View
                key={`p-${i}`}
                style={[
                  styles.waveBar,
                  { height: h, backgroundColor: "#000" },
                ]}
              />
            ))}
          </View>
          <Text style={styles.previewTime}>
            {formatTime(recordedDuration)}
          </Text>
        </View>

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
    <View style={styles.bar}>
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
    </View>
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
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
  timer: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
    fontVariant: ["tabular-nums"],
    minWidth: 32,
    textAlign: "right",
  },
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
  previewTime: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    fontVariant: ["tabular-nums"],
    minWidth: 30,
    textAlign: "right",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
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
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "500",
  },
});
