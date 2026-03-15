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

/* ─── Preview player (only mounted in "previewing" phase) ─── */
function PreviewPlayer({
  uri,
  bars,
  duration,
  onFinish,
  onPause,
}: {
  uri: string;
  bars: number[];
  duration: number;
  onFinish: () => void;
  onPause: () => void;
}) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const [autoPlayed, setAutoPlayed] = useState(false);

  useEffect(() => {
    if (status.isLoaded && !autoPlayed) {
      setAutoPlayed(true);
      setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false })
        .catch(() => {})
        .then(() => {
          try { player.play(); } catch { /* ignore */ }
        });
    }
  }, [status.isLoaded, autoPlayed, player]);

  useEffect(() => {
    if (status.didJustFinish) {
      onFinish();
    }
  }, [status.didJustFinish, onFinish]);

  const effectiveDur = status.duration > 0 ? status.duration : duration;
  const progress = effectiveDur > 0 ? Math.min(status.currentTime / effectiveDur, 1) : 0;

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          try { player.pause(); } catch { /* ignore */ }
          onPause();
        }}
        style={styles.previewPlayBtn}
        activeOpacity={0.7}
      >
        {!status.isLoaded ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <SymbolView name="pause.fill" size={14} tintColor="#000" />
        )}
      </TouchableOpacity>
      <View style={styles.waveform}>
        {bars.map((h, i) => (
          <View
            key={`p-${i}`}
            style={[
              styles.waveBar,
              {
                height: h,
                backgroundColor:
                  i / bars.length <= progress ? "#000" : "#D4D4D8",
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.previewTime}>
        {status.playing ? formatTime(status.currentTime) : formatTime(effectiveDur)}
      </Text>
    </>
  );
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const hasStartedRef = useRef(false);

  const audioRecorder = useAudioRecorder(RECORD_OPTIONS);
  const recorderState = useAudioRecorderState(audioRecorder, 100);

  const levelsRef = useRef<number[]>([]);
  const [liveBars, setLiveBars] = useState<number[]>(Array(BAR_COUNT).fill(4));
  const frozenBarsRef = useRef<number[]>([]);

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
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
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
    setPhase("idle");
    levelsRef.current = [];
    onCancel();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [onCancel]);

  // Auto-start on mount
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

  // === PREVIEWING STATE (player mounted) ===
  if (phase === "previewing" && audioRecorder.uri) {
    const previewBars = frozenBarsRef.current.length > 0 ? frozenBarsRef.current : liveBars;
    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.bar}>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7} hitSlop={8}>
          <SymbolView name="trash" size={17} tintColor="#9CA3AF" />
        </TouchableOpacity>
        <View style={styles.center}>
          <PreviewPlayer
            uri={audioRecorder.uri}
            bars={previewBars}
            duration={recordedDuration}
            onFinish={() => setPhase("stopped")}
            onPause={() => setPhase("stopped")}
          />
        </View>
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.7} hitSlop={8}>
          <SymbolView name="arrow.up" size={15} tintColor="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // === STOPPED / REVIEW STATE ===
  if (phase === "stopped") {
    const previewBars = frozenBarsRef.current.length > 0 ? frozenBarsRef.current : liveBars;
    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.bar}>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} activeOpacity={0.7} hitSlop={8}>
          <SymbolView name="trash" size={17} tintColor="#9CA3AF" />
        </TouchableOpacity>
        <View style={styles.center}>
          <TouchableOpacity
            onPress={() => setPhase("previewing")}
            style={styles.previewPlayBtn}
            activeOpacity={0.7}
          >
            <SymbolView name="play.fill" size={14} tintColor="#000" />
          </TouchableOpacity>
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
