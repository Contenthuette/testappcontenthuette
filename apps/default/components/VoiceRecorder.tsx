import React, { useState, useEffect, useCallback, useRef } from "react";
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
import * as Haptics from "expo-haptics";
import { SymbolView } from "@/components/Icon";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  createAudioPlayer,
  type RecordingOptions,
} from "expo-audio";

interface VoiceRecorderProps {
  onSend: (uri: string, duration: number) => void;
  onCancel: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type RecorderPhase = "idle" | "recording" | "stopped" | "previewing" | "error";

const BAR_COUNT = 32;
const MIN_WAVE_HEIGHT = 4;
const MAX_WAVE_HEIGHT = 24;
const METERING_FLOOR = -60;
const METERING_CEILING = -6;
const VOICE_RECORDING_PRESET = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
} satisfies RecordingOptions;

function meteringToHeight(metering: number | undefined): number {
  if (metering === undefined || metering === null) return MIN_WAVE_HEIGHT;
  const clamped = Math.max(METERING_FLOOR, Math.min(METERING_CEILING, metering));
  const normalized = (clamped - METERING_FLOOR) / (METERING_CEILING - METERING_FLOOR);
  const eased = Math.pow(normalized, 1.6);
  return MIN_WAVE_HEIGHT + eased * (MAX_WAVE_HEIGHT - MIN_WAVE_HEIGHT);
}

function smoothWaveHeight(nextHeight: number, previousHeight: number): number {
  const factor = nextHeight > previousHeight ? 0.6 : 0.22;
  return previousHeight + (nextHeight - previousHeight) * factor;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const hasStartedRef = useRef(false);

  // ── Official expo-audio hooks for recording ──
  const recorder = useAudioRecorder(VOICE_RECORDING_PRESET);
  const recorderState = useAudioRecorderState(recorder, 80);

  // Imperative ref for preview player only
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live metering bars
  const levelsRef = useRef<number[]>([]);
  const frozenBarsRef = useRef<number[]>([]);
  const [liveBars, setLiveBars] = useState<number[]>(Array(BAR_COUNT).fill(MIN_WAVE_HEIGHT));

  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);

  // Pulsing red dot
  const dotScale = useSharedValue(1);
  useEffect(() => {
    if (phase === "recording") {
      dotScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      dotScale.value = withTiming(1, { duration: 200 });
    }
  }, [phase, dotScale]);
  const dotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  // Update live bars from metering
  useEffect(() => {
    if (phase !== "recording") return;
    const rawHeight = meteringToHeight(recorderState.metering);
    const previousHeight = levelsRef.current[levelsRef.current.length - 1] ?? MIN_WAVE_HEIGHT;
    const smoothedHeight = smoothWaveHeight(rawHeight, previousHeight);
    levelsRef.current.push(smoothedHeight);
    if (levelsRef.current.length > BAR_COUNT * 10) {
      levelsRef.current = levelsRef.current.slice(-BAR_COUNT * 2);
    }
    const recent = levelsRef.current.slice(-BAR_COUNT);
    const padCount = Math.max(0, BAR_COUNT - recent.length);
    const padded = padCount > 0
      ? [...Array<number>(padCount).fill(MIN_WAVE_HEIGHT), ...recent]
      : recent;
    setLiveBars(padded);
  }, [phase, recorderState.metering]);

  // Cleanup on unmount — CRITICAL: always restore audio mode for playback
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      try { playerRef.current?.pause(); } catch { /* ignore */ }
      try { playerRef.current?.remove(); } catch { /* ignore */ }
      // Restore audio session to playback mode so VoiceMessageBubble works
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setPhase("error");
        setErrorMsg("Mikrofon-Zugriff verweigert");
        return;
      }

      // Set audio mode for recording
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

      await recorder.prepareToRecordAsync();
      recorder.record();

      setPhase("recording");
      frozenBarsRef.current = [];
      levelsRef.current = [];
      setLiveBars(Array(BAR_COUNT).fill(MIN_WAVE_HEIGHT));

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error("[VoiceRecorder] Start recording error:", err);
      setPhase("error");
      setErrorMsg("Aufnahme konnte nicht gestartet werden");
      // Restore audio mode on error
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      } catch { /* ignore */ }
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      frozenBarsRef.current = [...liveBars];
      const dur = recorderState.durationMillis / 1000;

      await recorder.stop();

      // CRITICAL: Restore audio mode for playback BEFORE creating preview player
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

      const uri = recorder.uri;
      setRecordedDuration(dur);

      // Create preview player
      if (uri) {
        try {
          // Use string URI for local files — more reliable on iOS
          playerRef.current = createAudioPlayer(uri);
        } catch (e) {
          console.warn("[VoiceRecorder] Preview player creation failed:", e);
        }
      }

      setPhase("stopped");
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.error("[VoiceRecorder] Stop recording error:", err);
      setPhase("error");
      setErrorMsg("Aufnahme konnte nicht gestoppt werden");
      // Still try to restore audio mode
      try {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      } catch { /* ignore */ }
    }
  }, [recorder, recorderState.durationMillis, liveBars]);

  const handlePreviewPlay = useCallback(async () => {
    // Always ensure playback mode before playing preview
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    } catch { /* best effort */ }

    const pl = playerRef.current;
    if (!pl) {
      console.warn("[VoiceRecorder] No preview player available");
      return;
    }

    try {
      pl.play();
      setPreviewPlaying(true);
      setPhase("previewing");

      previewTimerRef.current = setInterval(() => {
        const p = playerRef.current;
        if (!p) return;
        const ct = p.currentTime;
        const dur = p.duration > 0 ? p.duration : recordedDuration;
        setPreviewCurrentTime(ct);
        setPreviewProgress(dur > 0 ? Math.min(ct / dur, 1) : 0);

        if (!p.playing && ct > 0) {
          if (previewTimerRef.current) clearInterval(previewTimerRef.current);
          setPreviewPlaying(false);
          setPhase("stopped");
          try { p.seekTo(0); } catch { /* ignore */ }
        }
      }, 150);
    } catch (e) {
      console.error("[VoiceRecorder] Preview play error:", e);
    }
  }, [recordedDuration]);

  const handlePreviewPause = useCallback(() => {
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    try { playerRef.current?.pause(); } catch { /* ignore */ }
    setPreviewPlaying(false);
    setPhase("stopped");
  }, []);

  const handleSend = useCallback(() => {
    handlePreviewPause();
    const uri = recorder.uri;
    if (uri) {
      onSend(uri, recordedDuration * 1000);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      console.warn("[VoiceRecorder] No recording URI available");
      setPhase("error");
      setErrorMsg("Keine Aufnahme vorhanden");
    }
  }, [recorder.uri, recordedDuration, onSend, handlePreviewPause]);

  const handleDelete = useCallback(() => {
    handlePreviewPause();
    try { playerRef.current?.remove(); } catch { /* ignore */ }
    playerRef.current = null;
    setPhase("idle");
    levelsRef.current = [];
    onCancel();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [onCancel, handlePreviewPause]);

  // Auto-start on mount
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      startRecording();
    }
  }, []);

  const elapsed = recorderState.durationMillis / 1000;
  const previewBars = frozenBarsRef.current.length > 0 ? frozenBarsRef.current : liveBars;

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
                  { height: h, backgroundColor: i < liveBars.length - 4 ? "#000" : "#9CA3AF" },
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

  // === PREVIEWING STATE ===
  if (phase === "previewing") {
    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.bar}>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7} hitSlop={8}>
          <SymbolView name="trash" size={17} tintColor="#9CA3AF" />
        </TouchableOpacity>
        <View style={styles.center}>
          <TouchableOpacity onPress={handlePreviewPause} style={styles.previewPlayBtn} activeOpacity={0.7}>
            <SymbolView name="pause.fill" size={14} tintColor="#000" />
          </TouchableOpacity>
          <View style={styles.waveform}>
            {previewBars.map((h, i) => (
              <View
                key={`p-${i}`}
                style={[
                  styles.waveBar,
                  {
                    height: h,
                    backgroundColor: i / previewBars.length <= previewProgress ? "#000" : "#D4D4D8",
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.previewTime}>
            {previewPlaying ? formatTime(previewCurrentTime) : formatTime(recordedDuration)}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.7} hitSlop={8}>
          <SymbolView name="arrow.up" size={15} tintColor="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // === STOPPED / REVIEW STATE ===
  if (phase === "stopped") {
    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.bar}>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7} hitSlop={8}>
          <SymbolView name="trash" size={17} tintColor="#9CA3AF" />
        </TouchableOpacity>
        <View style={styles.center}>
          <TouchableOpacity onPress={handlePreviewPlay} style={styles.previewPlayBtn} activeOpacity={0.7}>
            <SymbolView name="play.fill" size={14} tintColor="#000" />
          </TouchableOpacity>
          <View style={styles.waveform}>
            {previewBars.map((h, i) => (
              <View
                key={`s-${i}`}
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
        <Text style={styles.preparingText}>Audioaufnahme wird vorbereitet</Text>
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
  previewPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
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
