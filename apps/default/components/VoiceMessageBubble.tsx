import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SymbolView } from "@/components/Icon";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";

// ─── Module-level singleton player ────────────────────────────────────
// Only ONE native AudioPlayer exists for the entire app.
// Created lazily on first play tap.
let _sharedPlayer: AudioPlayer | null = null;
let _currentUrl: string | null = null;
let _listeners: Set<() => void> = new Set();
let _pollTimer: ReturnType<typeof setInterval> | null = null;

function getSharedPlayer(): AudioPlayer {
  if (!_sharedPlayer) {
    _sharedPlayer = createAudioPlayer();
  }
  return _sharedPlayer;
}

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

async function toggleAudio(url: string) {
  if (!url) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  } catch { /* best effort */ }

  const player = getSharedPlayer();

  if (_currentUrl === url) {
    // Same URL → toggle
    if (player.playing) {
      player.pause();
      stopPolling();
    } else {
      player.play();
      startPolling();
    }
  } else {
    // Different URL → load new
    if (player.playing) player.pause();
    _currentUrl = url;
    player.replace(url);
    // Wait a tick for loading, then play
    setTimeout(() => {
      try {
        player.play();
        startPolling();
      } catch { /* ignore */ }
    }, 150);
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

// ─── Component ────────────────────────────────────────────────────────

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

  const player = _sharedPlayer;
  const isThisActive = _currentUrl === audioUrl && player != null;
  const isThisPlaying = isThisActive && (player?.playing ?? false);

  const handleToggle = useCallback(() => {
    if (!audioUrl) return;
    toggleAudio(audioUrl);
  }, [audioUrl]);

  // Progress
  const currentTime = isThisActive ? (player?.currentTime ?? 0) : 0;
  const playerDuration = isThisActive ? (player?.duration ?? 0) : 0;
  const effectiveDuration = playerDuration > 0 ? playerDuration : totalDuration;
  const progress = isThisPlaying && effectiveDuration > 0
    ? Math.min(currentTime / effectiveDuration, 1)
    : 0;
  const displayTime = isThisPlaying
    ? formatTime(currentTime)
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
          name={isThisPlaying ? "pause.fill" : "play.fill"}
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
