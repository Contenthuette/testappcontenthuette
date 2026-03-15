import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SymbolView } from "@/components/Icon";

// ─── Singleton audio player with polling ────────────────────────────────────
// ONE player at a time. Polling reads properties directly — no event issues.

interface PlayerSnapshot {
  url: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  isLoaded: boolean;
  isLoading: boolean;
}

const EMPTY: PlayerSnapshot = {
  url: null,
  playing: false,
  currentTime: 0,
  duration: 0,
  isLoaded: false,
  isLoading: false,
};

type AudioPlayer = {
  play(): void;
  pause(): void;
  seekTo(s: number): Promise<void>;
  replace(source: string | { uri: string }): void;
  remove(): void;
  playing: boolean;
  currentTime: number;
  duration: number;
  isLoaded: boolean;
};

let _snap: PlayerSnapshot = { ...EMPTY };
let _player: AudioPlayer | null = null;
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _subs = new Set<() => void>();
let _audioModCache: typeof import("expo-audio") | null | false = null;

function getAudio(): typeof import("expo-audio") | null {
  if (_audioModCache === false) return null;
  if (_audioModCache) return _audioModCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _audioModCache = require("expo-audio") as typeof import("expo-audio");
    return _audioModCache;
  } catch {
    _audioModCache = false;
    return null;
  }
}

function notify() {
  _subs.forEach((fn) => fn());
}

function startPolling() {
  if (_pollTimer) return;
  _pollTimer = setInterval(() => {
    if (!_player) {
      stopPolling();
      return;
    }
    const prev = _snap;
    const playing = _player.playing;
    const currentTime = _player.currentTime;
    const duration = _player.duration;
    const isLoaded = _player.isLoaded;

    // Detect playback finished (was playing, now stopped, near end)
    if (prev.playing && !playing && duration > 0 && currentTime >= duration - 0.15) {
      _player.seekTo(0).catch(() => {});
      _snap = { ..._snap, playing: false, currentTime: 0, isLoaded };
      notify();
      stopPolling();
      return;
    }

    if (
      prev.playing !== playing ||
      Math.abs(prev.currentTime - currentTime) > 0.05 ||
      Math.abs(prev.duration - duration) > 0.05 ||
      prev.isLoaded !== isLoaded
    ) {
      _snap = { ..._snap, playing, currentTime, duration, isLoaded };
      notify();
    }

    // Stop polling when paused & not loading
    if (!playing && isLoaded && !_snap.isLoading) {
      stopPolling();
    }
  }, 80);
}

function stopPolling() {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

async function togglePlay(url: string) {
  const mod = getAudio();
  if (!mod || !url) return;

  try {
    await mod.setAudioModeAsync({ playsInSilentMode: true });
  } catch { /* best effort */ }

  // ── Same URL: toggle play/pause ──
  if (_player && _snap.url === url) {
    if (_snap.playing) {
      _player.pause();
      _snap = { ..._snap, playing: false };
      notify();
      stopPolling();
    } else {
      // If at end, restart
      if (_snap.duration > 0 && _snap.currentTime >= _snap.duration - 0.2) {
        await _player.seekTo(0);
        _snap = { ..._snap, currentTime: 0 };
      }
      _player.play();
      _snap = { ..._snap, playing: true };
      notify();
      startPolling();
    }
    return;
  }

  // ── Different URL or first play ──
  _snap = { url, playing: false, currentTime: 0, duration: 0, isLoaded: false, isLoading: true };
  notify();

  if (_player) {
    // Reuse existing player, swap source
    _player.pause();
    _player.replace({ uri: url });
  } else {
    // Create brand new player
    _player = mod.createAudioPlayer({ uri: url }) as unknown as AudioPlayer;
  }

  // Poll until loaded (max 5s)
  startPolling();
  const maxWait = 5000;
  const step = 60;
  let waited = 0;
  while (waited < maxWait) {
    if (_player?.isLoaded) break;
    await new Promise<void>((r) => setTimeout(r, step));
    waited += step;
  }

  if (!_player?.isLoaded) {
    // Timed out — still try to play, some platforms report isLoaded late
    console.warn("[Voice] isLoaded timeout, attempting play anyway");
  }

  _snap = { ..._snap, isLoading: false, isLoaded: true };
  notify();

  try {
    _player?.play();
    _snap = { ..._snap, playing: true };
    notify();
    startPolling();
  } catch (e) {
    console.warn("[Voice] play() failed", e);
    _snap = { ..._snap, playing: false, isLoading: false };
    notify();
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const N_BARS = 24;
function makeBars(seed: number): number[] {
  return Array.from({ length: N_BARS }, (_, i) => {
    const a = Math.sin(seed * 0.001 + i * 0.8) * 6;
    const b = Math.sin(seed * 0.0007 + i * 1.3) * 4;
    return Math.max(4, Math.min(22, 10 + a + b));
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  audioUrl: string;
  duration?: number;
  durationMs?: number;
  isMine?: boolean;
  isMe?: boolean;
  timestamp?: string;
}

export function VoiceMessageBubble(props: Props) {
  const { audioUrl, duration, durationMs, isMine, isMe } = props;
  const mine = isMine ?? isMe ?? false;
  const totalDur = duration ?? (durationMs ? durationMs / 1000 : 0);
  const bars = useMemo(() => makeBars(hash(audioUrl || "x")), [audioUrl]);

  // Subscribe to singleton state
  const [, bump] = useState(0);
  useEffect(() => {
    const cb = () => bump((n) => n + 1);
    _subs.add(cb);
    return () => { _subs.delete(cb); };
  }, []);

  const active = _snap.url === audioUrl && _player != null;
  const playing = active && _snap.playing;
  const loading = active && _snap.isLoading;
  const curTime = active ? _snap.currentTime : 0;
  const dur = active && _snap.duration > 0 ? _snap.duration : totalDur;
  const progress = dur > 0 ? Math.min(curTime / dur, 1) : 0;
  const timeLabel = playing ? fmt(curTime) : fmt(dur);

  const onPress = useCallback(() => {
    if (!audioUrl) return;
    togglePlay(audioUrl);
  }, [audioUrl]);

  if (!audioUrl) {
    return (
      <View style={[s.wrap, mine ? s.wrapMine : s.wrapOther]}>
        <View style={s.btn}>
          <SymbolView name="exclamationmark.triangle" size={14} tintColor={mine ? "rgba(255,255,255,0.5)" : "#A1A1AA"} />
        </View>
        <Text style={[s.errTxt, { color: mine ? "rgba(255,255,255,0.6)" : "#A1A1AA" }]}>Audio nicht verfügbar</Text>
      </View>
    );
  }

  return (
    <View style={[s.wrap, mine ? s.wrapMine : s.wrapOther]}>
      <TouchableOpacity onPress={onPress} style={s.btn} activeOpacity={0.7}>
        {loading ? (
          <ActivityIndicator size="small" color={mine ? "#FFF" : "#000"} />
        ) : (
          <SymbolView
            name={playing ? "pause.fill" : "play.fill"}
            size={16}
            tintColor={mine ? "#FFFFFF" : "#000000"}
          />
        )}
      </TouchableOpacity>

      <View style={s.wavWrap}>
        <View style={s.barsRow}>
          {bars.map((h, i) => {
            const filled = i / bars.length <= progress;
            return (
              <View
                key={i}
                style={[
                  s.singleBar,
                  {
                    height: h,
                    backgroundColor: filled
                      ? (mine ? "#FFFFFF" : "#000000")
                      : (mine ? "rgba(255,255,255,0.3)" : "#D4D4D8"),
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      <Text style={[s.time, { color: mine ? "rgba(255,255,255,0.7)" : "#71717A" }]}>
        {timeLabel}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 10,
    minWidth: 200,
    maxWidth: 280,
  },
  wrapMine: { backgroundColor: "#000" },
  wrapOther: { backgroundColor: "#F4F4F5" },
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(128,128,128,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  wavWrap: { flex: 1, justifyContent: "center" },
  barsRow: { flexDirection: "row", alignItems: "center", gap: 2, height: 24 },
  singleBar: { width: 3, borderRadius: 2 },
  time: { fontSize: 11, fontWeight: "500", fontVariant: ["tabular-nums"] },
  errTxt: { fontSize: 12, fontWeight: "500", flex: 1 },
});
