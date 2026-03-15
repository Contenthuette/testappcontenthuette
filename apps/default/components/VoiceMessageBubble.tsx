import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SymbolView } from "@/components/Icon";

// ─── Audio engine (lazy-loaded, crash-safe) ──────────────────────────
// expo-audio is imported dynamically the first time the user taps Play.
// If it fails to load, the UI remains intact – only playback is disabled.

interface AudioEngine {
  playing: boolean;
  currentTime: number;
  duration: number;
}

let _player: unknown = null;
let _currentUrl: string | null = null;
let _listeners: Set<() => void> = new Set();
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _audioModuleLoaded = false;
let _audioModuleFailed = false;
let _createPlayerFn: ((src?: unknown) => unknown) | null = null;
let _setModeFn: ((opts: Record<string, boolean>) => Promise<void>) | null = null;

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

function startPolling() {
  if (_pollTimer) return;
  _pollTimer = setInterval(notifyListeners, 200);
}

function stopPolling() {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

function loadAudioModule(): boolean {
  if (_audioModuleLoaded) return true;
  if (_audioModuleFailed) return false;
  try {
    // Dynamic require – if expo-audio crashes, we catch it
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-audio");
    _createPlayerFn = mod.createAudioPlayer;
    _setModeFn = mod.setAudioModeAsync;
    _audioModuleLoaded = true;
    return true;
  } catch (e) {
    console.warn("VoiceMessageBubble: expo-audio could not be loaded", e);
    _audioModuleFailed = true;
    return false;
  }
}

function getPlayerState(): AudioEngine {
  if (!_player) return { playing: false, currentTime: 0, duration: 0 };
  try {
    const p = _player as Record<string, unknown>;
    return {
      playing: !!p.playing,
      currentTime: (typeof p.currentTime === "number" ? p.currentTime : 0),
      duration: (typeof p.duration === "number" ? p.duration : 0),
    };
  } catch {
    return { playing: false, currentTime: 0, duration: 0 };
  }
}

async function toggleAudio(url: string) {
  if (!url) return;
  if (!loadAudioModule()) return;

  try { await _setModeFn?.({ playsInSilentMode: true, allowsRecording: false }); } catch { /* best effort */ }

  if (!_player && _createPlayerFn) {
    _player = _createPlayerFn();
  }
  if (!_player) return;

  const p = _player as Record<string, unknown>;

  try {
    if (_currentUrl === url) {
      // Same URL → toggle
      if (p.playing) {
        (p.pause as () => void)();
        stopPolling();
      } else {
        (p.play as () => void)();
        startPolling();
      }
    } else {
      // Different URL → load new
      if (p.playing) (p.pause as () => void)();
      _currentUrl = url;
      (p.replace as (src: string) => void)(url);
      setTimeout(() => {
        try {
          (p.play as () => void)();
          startPolling();
        } catch { /* ignore */ }
      }, 150);
    }
  } catch (e) {
    console.warn("VoiceMessageBubble: playback error", e);
  }
  notifyListeners();
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const BAR_COUNT = 24;

function generateStableBars(seed: number): number[] {
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const a = Math.sin(seed * 0.001 + i * 0.8) * 6;
    const b = Math.sin(seed * 0.0007 + i * 1.3) * 4;
    const h = 10 + a + b;
    return Math.max(4, Math.min(22, h));
  });
}

// ─── Component ───────────────────────────────────────────────────────

interface VoiceMessageBubbleProps {
  audioUrl: string;
  duration?: number;
  durationMs?: number;
  isMine?: boolean;
  isMe?: boolean;
  timestamp?: string;
}

export function VoiceMessageBubble(props: VoiceMessageBubbleProps) {
  const { audioUrl, duration, durationMs, isMine, isMe, timestamp } = props;
  const mine = isMine ?? isMe ?? false;
  const totalDuration = duration ?? (durationMs ? durationMs / 1000 : 0);
  const bars = useMemo(() => generateStableBars(hashString(audioUrl || "x")), [audioUrl]);

  // Subscribe to shared player state changes
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    _listeners.add(listener);
    return () => {
      _listeners.delete(listener);
    };
  }, []);

  const isThisActive = _currentUrl === audioUrl && _player != null;
  const state = isThisActive ? getPlayerState() : { playing: false, currentTime: 0, duration: 0 };

  const handleToggle = useCallback(() => {
    if (!audioUrl) return;
    toggleAudio(audioUrl);
  }, [audioUrl]);

  // Progress
  const effectiveDuration = state.duration > 0 ? state.duration : totalDuration;
  const progress = state.playing && effectiveDuration > 0
    ? Math.min(state.currentTime / effectiveDuration, 1)
    : 0;
  const displayTime = state.playing
    ? formatTime(state.currentTime)
    : formatTime(effectiveDuration);

  // No URL fallback
  if (!audioUrl) {
    return (
      <View style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}>
        <View style={styles.playBtn}>
          <SymbolView name="exclamationmark.triangle" size={14} tintColor={mine ? "rgba(255,255,255,0.5)" : "#A1A1AA"} />
        </View>
        <Text style={[styles.errorLabel, { color: mine ? "rgba(255,255,255,0.6)" : "#A1A1AA" }]}>
          Audio nicht verfügbar
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}>
      <TouchableOpacity onPress={handleToggle} style={styles.playBtn} activeOpacity={0.7}>
        <SymbolView
          name={state.playing ? "pause.fill" : "play.fill"}
          size={16}
          tintColor={mine ? "#FFFFFF" : "#000000"}
        />
      </TouchableOpacity>
      <View style={styles.waveContainer}>
        <View style={styles.bars}>
          {bars.map((h, i) => (
            <View
              key={`bar-${i}`}
              style={[
                styles.bar,
                {
                  height: h,
                  backgroundColor:
                    i / bars.length <= progress
                      ? (mine ? "#FFFFFF" : "#000000")
                      : (mine ? "rgba(255,255,255,0.3)" : "#D4D4D8"),
                },
              ]}
            />
          ))}
        </View>
      </View>
      <Text style={[styles.time, { color: mine ? "rgba(255,255,255,0.7)" : "#71717A" }]}>
        {displayTime}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 10,
    minWidth: 200,
    maxWidth: 280,
  },
  meContainer: { backgroundColor: "#000000" },
  otherContainer: { backgroundColor: "#F4F4F5" },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(128,128,128,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  waveContainer: { flex: 1, justifyContent: "center" },
  bars: { flexDirection: "row", alignItems: "center", gap: 2, height: 24 },
  bar: { width: 3, borderRadius: 2 },
  time: { fontSize: 11, fontWeight: "500", fontVariant: ["tabular-nums"] },
  errorLabel: { fontSize: 12, fontWeight: "500", flex: 1 },
});
