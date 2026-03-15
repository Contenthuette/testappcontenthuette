import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
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

// Lazy-load expo-audio to prevent chat screen crash
let _audioModule: Record<string, unknown> | null = null;
function getAudioModule(): Record<string, unknown> | null {
  if (_audioModule) return _audioModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _audioModule = require("expo-audio");
    return _audioModule;
  } catch (e) {
    console.warn("VoiceRecorder: expo-audio not available", e);
    return null;
  }
}

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

const BAR_COUNT = 28;

function meteringToHeight(metering: number | undefined): number {
  if (metering === undefined || metering === null) return 4;
  const clamped = Math.max(-50, Math.min(0, metering));
  const normalised = (clamped + 50) / 50;
  return 4 + normalised * 18;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const hasStartedRef = useRef(false);

  // Imperative refs for recorder and player (no hooks from expo-audio)
  const recorderRef = useRef<Record<string, unknown> | null>(null);
  const playerRef = useRef<Record<string, unknown> | null>(null);
  const recordedUriRef = useRef<string | null>(null);
  const meteringTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [liveBars, setLiveBars] = useState<number[]>(Array(BAR_COUNT).fill(4));
  const frozenBarsRef = useRef<number[]>([]);
  const levelsRef = useRef<number[]>([]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (meteringTimerRef.current) clearInterval(meteringTimerRef.current);
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      try {
        const rec = recorderRef.current;
        if (rec && typeof rec.stop === "function") rec.stop();
      } catch { /* ignore */ }
      try {
        const pl = playerRef.current;
        if (pl && typeof pl.pause === "function") (pl.pause as () => void)();
      } catch { /* ignore */ }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const mod = getAudioModule();
      if (!mod) {
        setPhase("error");
        setErrorMsg("Audio-Modul nicht verf\u00fcgbar");
        return;
      }

      // Request permission
      const AudioModule = mod.AudioModule as Record<string, unknown>;
      if (AudioModule && typeof AudioModule.requestRecordingPermissionsAsync === "function") {
        const permStatus = await (AudioModule.requestRecordingPermissionsAsync as () => Promise<{ granted: boolean }>)();
        if (!permStatus.granted) {
          setPhase("error");
          setErrorMsg("Mikrofon-Zugriff verweigert");
          return;
        }
      }

      // Set audio mode
      const setMode = mod.setAudioModeAsync as ((opts: Record<string, boolean>) => Promise<void>) | undefined;
      if (setMode) {
        await setMode({ playsInSilentMode: true, allowsRecording: true });
      }

      // Create recorder
      const RecordingPresets = mod.RecordingPresets as Record<string, unknown>;
      const recordOptions = {
        ...(RecordingPresets?.HIGH_QUALITY ?? {}),
        isMeteringEnabled: true,
      };

      const useRecorder = mod.useAudioRecorder;
      // Since we can't use hooks imperatively, use createAudioRecorder if available
      // Otherwise fall back to direct native module call
      let recorder: Record<string, unknown> | null = null;

      // expo-audio v1.x exposes AudioRecorder class or we use the module directly
      if (typeof mod.createAudioRecorder === "function") {
        recorder = (mod.createAudioRecorder as (opts: unknown) => Record<string, unknown>)(recordOptions);
      } else if (AudioModule && typeof AudioModule.createRecorder === "function") {
        recorder = (AudioModule.createRecorder as (opts: unknown) => Record<string, unknown>)(recordOptions);
      }

      if (!recorder) {
        // Fallback: use useAudioRecorder via a manual instantiation workaround
        // The recorder API varies by version; try the most common pattern
        if (typeof AudioModule.AudioRecorder === "function") {
          recorder = new (AudioModule.AudioRecorder as new (opts: unknown) => Record<string, unknown>)(recordOptions);
        }
      }

      if (!recorder) {
        setPhase("error");
        setErrorMsg("Recorder konnte nicht erstellt werden");
        return;
      }

      recorderRef.current = recorder;
      levelsRef.current = [];
      setLiveBars(Array(BAR_COUNT).fill(4));

      // Prepare and record
      if (typeof recorder.prepareToRecordAsync === "function") {
        await (recorder.prepareToRecordAsync as (opts: unknown) => Promise<void>)(recordOptions);
      }
      if (typeof recorder.record === "function") {
        (recorder.record as () => void)();
      }

      setPhase("recording");
      setElapsed(0);

      // Start metering poll
      const startTime = Date.now();
      meteringTimerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(secs);

        const rec = recorderRef.current;
        if (!rec) return;
        const metering = typeof rec.currentMetering === "number" ? rec.currentMetering : undefined;
        const h = meteringToHeight(metering);
        levelsRef.current.push(h);
        if (levelsRef.current.length > BAR_COUNT * 10) {
          levelsRef.current = levelsRef.current.slice(-BAR_COUNT * 2);
        }
        const recent = levelsRef.current.slice(-BAR_COUNT);
        const padCount = Math.max(0, BAR_COUNT - recent.length);
        const padded = padCount > 0
          ? [...Array<number>(padCount).fill(4), ...recent]
          : recent;
        setLiveBars(padded);
      }, 100);

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      console.error("Start recording error:", err);
      setPhase("error");
      setErrorMsg("Aufnahme konnte nicht gestartet werden");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      if (meteringTimerRef.current) {
        clearInterval(meteringTimerRef.current);
        meteringTimerRef.current = null;
      }
      frozenBarsRef.current = [...liveBars];
      const dur = elapsed;

      const rec = recorderRef.current;
      if (rec && typeof rec.stop === "function") {
        await (rec.stop as () => Promise<void>)();
      }

      const uri = rec?.uri as string | undefined;
      recordedUriRef.current = uri ?? null;
      setRecordedDuration(dur);

      // Switch audio mode back
      const mod = getAudioModule();
      if (mod) {
        const setMode = mod.setAudioModeAsync as ((opts: Record<string, boolean>) => Promise<void>) | undefined;
        if (setMode) await setMode({ playsInSilentMode: true, allowsRecording: false });
      }

      // Create preview player
      if (uri && mod) {
        try {
          const createPlayer = mod.createAudioPlayer as ((src: string) => Record<string, unknown>) | undefined;
          if (createPlayer) {
            playerRef.current = createPlayer(uri);
          }
        } catch { /* ignore preview player creation failure */ }
      }

      setPhase("stopped");
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.error("Stop recording error:", err);
      setPhase("error");
      setErrorMsg("Aufnahme konnte nicht gestoppt werden");
    }
  }, [elapsed, liveBars]);

  const handlePreviewPlay = useCallback(async () => {
    const mod = getAudioModule();
    if (mod) {
      try {
        const setMode = mod.setAudioModeAsync as ((opts: Record<string, boolean>) => Promise<void>) | undefined;
        if (setMode) await setMode({ playsInSilentMode: true, allowsRecording: false });
      } catch { /* best effort */ }
    }
    const pl = playerRef.current;
    if (pl && typeof pl.play === "function") {
      try {
        (pl.play as () => void)();
        setPreviewPlaying(true);
        setPhase("previewing");

        // Poll progress
        previewTimerRef.current = setInterval(() => {
          const p = playerRef.current;
          if (!p) return;
          const ct = typeof p.currentTime === "number" ? p.currentTime : 0;
          const dur = typeof p.duration === "number" ? p.duration : recordedDuration;
          setPreviewCurrentTime(ct);
          setPreviewProgress(dur > 0 ? Math.min(ct / dur, 1) : 0);

          // Check if finished
          const playing = !!p.playing;
          if (!playing && ct > 0) {
            if (previewTimerRef.current) clearInterval(previewTimerRef.current);
            setPreviewPlaying(false);
            setPhase("stopped");
            try { if (typeof p.seekTo === "function") (p.seekTo as (t: number) => void)(0); } catch { /* ignore */ }
          }
        }, 150);
      } catch (e) {
        console.error("Preview play error:", e);
      }
    }
  }, [recordedDuration]);

  const handlePreviewPause = useCallback(() => {
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    const pl = playerRef.current;
    if (pl && typeof pl.pause === "function") {
      try { (pl.pause as () => void)(); } catch { /* ignore */ }
    }
    setPreviewPlaying(false);
    setPhase("stopped");
  }, []);

  const handleSend = useCallback(() => {
    handlePreviewPause();
    const uri = recordedUriRef.current;
    if (uri) {
      onSend(uri, recordedDuration * 1000);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      setPhase("error");
      setErrorMsg("Keine Aufnahme vorhanden");
    }
  }, [recordedDuration, onSend, handlePreviewPause]);

  const handleDelete = useCallback(() => {
    handlePreviewPause();
    if (meteringTimerRef.current) {
      clearInterval(meteringTimerRef.current);
      meteringTimerRef.current = null;
    }
    try {
      const rec = recorderRef.current;
      if (rec && typeof rec.stop === "function") (rec.stop as () => void)();
    } catch { /* ignore */ }
    recorderRef.current = null;
    playerRef.current = null;
    recordedUriRef.current = null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
