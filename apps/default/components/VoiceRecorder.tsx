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
import {
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
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

type RecorderPhase = "idle" | "recording" | "stopped" | "previewing" | "error";

const BAR_COUNT = 28;

const RECORD_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

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
  const hasStartedRef = useRef(false);

  const audioRecorder = useAudioRecorder(RECORD_OPTIONS);
  const recorderState = useAudioRecorderState(audioRecorder, 100);

  // Preview player – always created with null, source replaced after recording
  const previewPlayer = useAudioPlayer(null);
  const previewStatus = useAudioPlayerStatus(previewPlayer);

  const levelsRef = useRef<number[]>([]);
  const [liveBars, setLiveBars] = useState<number[]>(Array(BAR_COUNT).fill(4));
  const frozenBarsRef = useRef<number[]>([]);

  // Update live waveform bars during recording
  useEffect(() => {
    if (phase !== "recording") return;
    const h = meteringToHeight(recorderState.metering);
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
  }, [recorderState.durationMillis, recorderState.metering, phase]);

  const elapsed = Math.floor((recorderState.durationMillis ?? 0) / 1000);

  // When preview finishes playing, go back to stopped
  useEffect(() => {
    if (previewStatus.didJustFinish && phase === "previewing") {
      try { previewPlayer.seekTo(0); } catch { /* ignore */ }
      setPhase("stopped");
    }
  }, [previewStatus.didJustFinish, phase, previewPlayer]);

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

  const startRecording = useCallback(async () => {
    try {
      const permStatus = await AudioModule.requestRecordingPermissionsAsync();
      if (!permStatus.granted) {
        setPhase("error");
        setErrorMsg("Mikrofon-Zugriff verweigert");
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      levelsRef.current = [];
      setLiveBars(Array(BAR_COUNT).fill(4));
      await audioRecorder.prepareToRecordAsync(RECORD_OPTIONS);
      audioRecorder.record();
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
      // Switch audio mode back to playback
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      // Load the recorded file into the preview player
      const uri = audioRecorder.uri;
      if (uri) {
        previewPlayer.replace(uri);
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
  }, [audioRecorder, elapsed, liveBars, previewPlayer]);

  const handlePreviewPlay = useCallback(async () => {
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    } catch { /* best effort */ }
    try {
      previewPlayer.play();
      setPhase("previewing");
    } catch (e) {
      console.error("Preview play error:", e);
    }
  }, [previewPlayer]);

  const handlePreviewPause = useCallback(() => {
    try {
      previewPlayer.pause();
    } catch { /* ignore */ }
    setPhase("stopped");
  }, [previewPlayer]);

  const handleSend = useCallback(() => {
    // Stop preview if playing
    try { previewPlayer.pause(); } catch { /* ignore */ }
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
  }, [audioRecorder.uri, recordedDuration, onSend, previewPlayer]);

  const handleDelete = useCallback(() => {
    try { previewPlayer.pause(); } catch { /* ignore */ }
    setPhase("idle");
    levelsRef.current = [];
    onCancel();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [onCancel, previewPlayer]);

  // Auto-start on mount
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      startRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Frozen bars for preview
  const previewBars = frozenBarsRef.current.length > 0 ? frozenBarsRef.current : liveBars;
  const previewDur = previewStatus.duration > 0 ? previewStatus.duration : recordedDuration;
  const previewProgress = previewDur > 0 ? Math.min(previewStatus.currentTime / previewDur, 1) : 0;

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

  // === PREVIEWING STATE (audio playing) ===
  if (phase === "previewing") {
    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.bar}>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7} hitSlop={8}>
          <SymbolView name="trash" size={17} tintColor="#9CA3AF" />
        </TouchableOpacity>
        <View style={styles.center}>
          <TouchableOpacity onPress={handlePreviewPause} style={styles.previewPlayBtn} activeOpacity={0.7}>
            {!previewStatus.isLoaded ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <SymbolView name="pause.fill" size={14} tintColor="#000" />
            )}
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
            {previewStatus.playing ? formatTime(previewStatus.currentTime) : formatTime(previewDur)}
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
