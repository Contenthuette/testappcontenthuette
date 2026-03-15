import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { SymbolView } from "@/components/Icon";

// ─── Shared singleton audio player ──────────────────────────────────────────
// Only ONE player instance exists at a time. When a different bubble is tapped,
// the old source is replaced. This avoids resource exhaustion on iOS.

type PlayerState = {
  url: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  isLoaded: boolean;
};

const DEFAULT_STATE: PlayerState = {
  url: null,
  playing: false,
  currentTime: 0,
  duration: 0,
  isLoaded: false,
};

let _state: PlayerState = { ...DEFAULT_STATE };
let _player: ReturnType<typeof import("expo-audio")["createAudioPlayer"]> | null = null;
let _statusSub: { remove: () => void } | null = null;
let _listeners = new Set<() => void>();
let _audioLoaded = false;
let _audioFailed = false;

// Lazy-load expo-audio (crash-safe)
function getAudioModule(): typeof import("expo-audio") | null {
  if (_audioLoaded) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-audio") as typeof import("expo-audio");
  }
  if (_audioFailed) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-audio") as typeof import("expo-audio");
    _audioLoaded = true;
    return mod;
  } catch (e) {
    console.warn("[VoiceMessageBubble] expo-audio not available", e);
    _audioFailed = true;
    return null;
  }
}

function broadcastState() {
  _listeners.forEach((fn) => fn());
}

function updateState(patch: Partial<PlayerState>) {
  _state = { ..._state, ...patch };
  broadcastState();
}

function handleStatusUpdate(status: { playing: boolean; currentTime: number; duration: number; isLoaded?: boolean }) {
  const wasPlaying = _state.playing;
  const isPlaying = status.playing;
  
  updateState({
    playing: isPlaying,
    currentTime: status.currentTime,
    duration: status.duration,
    isLoaded: status.isLoaded ?? _state.isLoaded,
  });

  // Auto-reset when playback finishes naturally
  if (wasPlaying && !isPlaying && status.duration > 0 && status.currentTime >= status.duration - 0.1) {
    _player?.seekTo(0).catch(() => { /* ignore */ });
    updateState({ playing: false, currentTime: 0 });
  }
}

function ensurePlayer(audioMod: typeof import("expo-audio"), url: string) {
  if (!_player) {
    // First ever player — create with the source URL
    _player = audioMod.createAudioPlayer(url);
    _statusSub = (_player as unknown as { addListener: (event: string, cb: (s: unknown) => void) => { remove: () => void } })
      .addListener("playbackStatusUpdate", (s: unknown) => {
        const status = s as { playing: boolean; currentTime: number; duration: number; isLoaded?: boolean };
        handleStatusUpdate(status);
      });
    _state.url = url;
    return true; // new player
  }
  if (_state.url !== url) {
    // Switch to a different audio — replace source
    _player.pause();
    _player.replace(url);
    _state = { url, playing: false, currentTime: 0, duration: 0, isLoaded: false };
    return true; // source changed
  }
  return false; // same player, same source
}

async function toggleAudio(url: string) {
  const audioMod = getAudioModule();
  if (!audioMod || !url) return;

  // Ensure silent mode playback works on iOS
  try {
    await audioMod.setAudioModeAsync({ playsInSilentMode: true });
  } catch { /* best effort */ }

  const isNew = ensurePlayer(audioMod, url);

  if (isNew) {
    // Wait for the source to load before playing
    // Poll isLoaded with a max wait of 3 seconds
    let waited = 0;
    const pollInterval = 50;
    const maxWait = 3000;
    while (waited < maxWait) {
      if (_player && (_player as unknown as { isLoaded: boolean }).isLoaded) break;
      await new Promise<void>((r) => setTimeout(r, pollInterval));
      waited += pollInterval;
    }
    updateState({ isLoaded: true });
    try {
      _player?.play();
      updateState({ playing: true });
    } catch (e) {
      console.warn("[VoiceMessageBubble] play failed", e);
    }
  } else {
    // Same source — toggle play/pause
    if (_state.playing) {
      _player?.pause();
      updateState({ playing: false });
    } else {
      // If at the end, seek back to start
      if (_state.duration > 0 && _state.currentTime >= _state.duration - 0.2) {
        await _player?.seekTo(0);
        updateState({ currentTime: 0 });
      }
      _player?.play();
      updateState({ playing: true });
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

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

  // Subscribe to singleton player state
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  const isThisActive = _state.url === audioUrl && _player != null;
  const playing = isThisActive && _state.playing;
  const currentTime = isThisActive ? _state.currentTime : 0;
  const effectiveDuration = (isThisActive && _state.duration > 0) ? _state.duration : totalDuration;

  const progress = effectiveDuration > 0 ? Math.min(currentTime / effectiveDuration, 1) : 0;
  const displayTime = playing ? formatTime(currentTime) : formatTime(effectiveDuration);

  const handleToggle = useCallback(() => {
    if (!audioUrl) return;
    toggleAudio(audioUrl);
  }, [audioUrl]);

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
          name={playing ? "pause.fill" : "play.fill"}
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
