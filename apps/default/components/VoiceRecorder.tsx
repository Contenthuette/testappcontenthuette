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
  Easing,
} from "react-native-reanimated";
import {
  useAudioRecorder,
  useAudioRecorderState,
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

/** Normalise dBFS metering (typically -160…0) to a bar height in px. */
function meteringToHeight(metering: number | undefined): number {
  if (metering === undefined || metering === null) return 4;
  // Map -50 dB … 0 dB  →  3 px … 22 px
  const clamped = Math.max(-50, Math.min(0, metering));
  const normalised = (clamped + 50) / 50; // 0 … 1
  return 3 + normalised * 19;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStartedRef = useRef(false);

  // expo-audio hooks
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 100);

  // ── Real-time waveform from metering ──
  const levelsRef = useRef<number[]>([]);
  const [liveBars, setLiveBars] = useState<number[]>(Array(BAR_COUNT).fill(4));
  const frozenBarsRef = useRef<number[]>([]);

  // Collect metering values every ~100 ms
  useEffect(() => {
    if (phase !== "recording") return;
    const h = meteringToHeight(recorderState.metering);
    levelsRef.current.push(h);
    // Keep buffer bounded
    if (levelsRef.current.length > BAR_COUNT * 10) {
      levelsRef.current = levelsRef.current.slice(-BAR_COUNT * 2);
    }
    // Take last BAR_COUNT values, pad left if not enough
    const recent = levelsRef.current.slice(-BAR_COUNT);
    const padCount = Math.max(0, BAR_COUNT - recent.length);
    const padded = padCount > 0
      ? [...Array<number>(padCount).fill(3), ...recent]
      : recent;
    setLiveBars(padded);
  }, [recorderState.durationMillis, phase]);

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

  // Timer (1 s for display)
  useEffect(() => {
    if (phase === "recording") {
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
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

      levelsRef.current = [];
      setLiveBars(Array(BAR_COUNT).fill(4));

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
      frozenBarsRef.current = [...liveBars];
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
  }, [audioRecorder, elapsed, liveBars]);

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
    levelsRef.current = [];
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
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7} hitSlop={8}>
          <SymbolView name="xmark" size={15} tintColor="#9CA3AF" />
        </TouchableOpacity>
        <View style={styles.center}>
          <SymbolView name="exclamationmark.triangle" size={16} tintColor="#EF4444" />
          <Text style={styles.errorText}>{errorMsg || "Fehler"}</Text>
        </View>
      </View>
    );
  }

  // === RECORDING STATE ===
  if (phase === "recording") {
    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.bar}>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7} hitSlop={8}>
          <SymbolView name="trash" size={17} tintColor="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.center}>
          <Animated.View style={[styles.redDot, dotAnimStyle]} />
          <View style={styles.waveform}>
            {liveBars.map((h, i) => (
              <View
                key={`w-${i}`}
                style={[
                  styles.waveBar,
                  {
                    height: h,
                    backgroundColor: i < liveBars.length - 4 ? "#000" : "#9CA3AF",
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        </View>

        <TouchableOpacity onPress={stopRecording} style={styles.stopBtn} activeOpacity={0.7} hitSlop={8}>
          <View style={styles.stopSquare} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // === STOPPED / REVIEW STATE ===
  if (phase === "stopped") {
    const previewBars =
      frozenBarsRef.current.length > 0
        ? frozenBarsRef.current
        : liveBars;

    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.bar}>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7} hitSlop={8}>
          <SymbolView name="trash" size={17} tintColor="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.center}>
          <SymbolView name="waveform" size={16} tintColor="#000" />
          <View style={styles.waveform}>
            {previewBars.map((h, i) => (
              <View
                key={`p-${i}`}
                style={[styles.waveBar, { height: h, backgroundColor: "#000" }]}
              />
            ))}
          </View>
          <Text style={styles.previewTime}>{formatTime(recordedDuration)}</Text>
        </View>

        <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.7} hitSlop={8}>
          <SymbolView name="arrow.up" size={15} tintColor="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // === IDLE (preparing) ===
  return (
    <View style={styles.bar}>
      <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7} hitSlop={8}>
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
