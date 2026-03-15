import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SymbolView } from "@/components/Icon";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Snap {
  url: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  loading: boolean;
}

const EMPTY: Snap = { url: null, playing: false, currentTime: 0, duration: 0, loading: false };

// ─── Singleton audio controller ──────────────────────────────────────────────
// One player at a time. We keep it simple: create per URL, poll for progress.

let _snap: Snap = { ...EMPTY };
let _subs = new Set<() => void>();
let _poll: ReturnType<typeof setInterval> | null = null;

// expo-audio player (native or web)
let _player: {
  play(): void;
  pause(): void;
  seekTo(s: number): Promise<void>;
  replace(src: unknown): void;
  remove(): void;
  readonly playing: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly isLoaded: boolean;
} | null = null;

// Web fallback (HTMLAudioElement) when expo-audio doesn't work
let _webAudio: HTMLAudioElement | null = null;

function notify() {
  _subs.forEach((fn) => fn());
}

function set(patch: Partial<Snap>) {
  _snap = { ..._snap, ...patch };
  notify();
}

function stopPoll() {
  if (_poll) { clearInterval(_poll); _poll = null; }
}

function startPoll() {
  stopPoll();
  _poll = setInterval(() => {
    if (Platform.OS === "web" && _webAudio) {
      // Web fallback path
      const wa = _webAudio;
      const playing = !wa.paused && !wa.ended && wa.currentTime > 0;
      const dur = isFinite(wa.duration) ? wa.duration : 0;
      const ct = wa.currentTime;

      // Detect end
      if (_snap.playing && (wa.ended || (dur > 0 && ct >= dur - 0.1))) {
        wa.currentTime = 0;
        wa.pause();
        set({ playing: false, currentTime: 0 });
        stopPoll();
        return;
      }

      if (_snap.playing !== playing || Math.abs(_snap.currentTime - ct) > 0.04 || Math.abs(_snap.duration - dur) > 0.04) {
        set({ playing, currentTime: ct, duration: dur });
      }
      return;
    }

    if (!_player) { stopPoll(); return; }
    const p = _player;
    const playing = p.playing;
    const ct = p.currentTime;
    const dur = p.duration;

    // Detect end
    if (_snap.playing && !playing && dur > 0 && ct >= dur - 0.15) {
      p.seekTo(0).catch(() => {});
      set({ playing: false, currentTime: 0 });
      stopPoll();
      return;
    }

    if (_snap.playing !== playing || Math.abs(_snap.currentTime - ct) > 0.04 || Math.abs(_snap.duration - dur) > 0.04) {
      set({ playing, currentTime: ct, duration: dur, loading: false });
    }

    if (!playing && !_snap.loading) stopPoll();
  }, 80);
}

// ─── Web fallback player using HTMLAudioElement directly ─────────────────────

function playWithWebFallback(url: string) {
  if (_webAudio && _snap.url === url) {
    // Same URL — toggle
    if (_snap.playing) {
      _webAudio.pause();
      set({ playing: false });
      stopPoll();
    } else {
      if (_webAudio.ended || (_webAudio.duration > 0 && _webAudio.currentTime >= _webAudio.duration - 0.2)) {
        _webAudio.currentTime = 0;
      }
      _webAudio.play().catch((e) => console.warn("[Voice] web play failed", e));
      set({ playing: true });
      startPoll();
    }
    return;
  }

  // New URL
  if (_webAudio) {
    _webAudio.pause();
    _webAudio.src = "";
  }
  set({ url, playing: false, currentTime: 0, duration: 0, loading: true });

  const audio = new Audio(url);
  audio.preload = "auto";
  _webAudio = audio;

  audio.oncanplaythrough = () => {
    set({ loading: false, duration: isFinite(audio.duration) ? audio.duration : 0 });
  };
  audio.onended = () => {
    audio.currentTime = 0;
    set({ playing: false, currentTime: 0 });
    stopPoll();
  };
  audio.onerror = (e) => {
    console.warn("[Voice] web audio error", e);
    set({ loading: false, playing: false });
    stopPoll();
  };

  // Play immediately — must be synchronous from user gesture
  audio.play()
    .then(() => {
      set({ playing: true, loading: false });
      startPoll();
    })
    .catch((e) => {
      console.warn("[Voice] web autoplay blocked", e);
      set({ loading: false });
    });
}

// ─── Native player using expo-audio ──────────────────────────────────────────

function playWithExpoAudio(url: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("expo-audio") as typeof import("expo-audio");

  // Ensure silent mode works on iOS
  mod.setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});

  if (_player && _snap.url === url) {
    // Same URL — toggle
    if (_snap.playing) {
      _player.pause();
      set({ playing: false });
      stopPoll();
    } else {
      if (_snap.duration > 0 && _snap.currentTime >= _snap.duration - 0.2) {
        _player.seekTo(0).catch(() => {});
        set({ currentTime: 0 });
      }
      _player.play();
      set({ playing: true });
      startPoll();
    }
    return;
  }

  // New URL — create or replace
  set({ url, playing: false, currentTime: 0, duration: 0, loading: true });

  if (_player) {
    _player.pause();
    try {
      _player.replace({ uri: url });
    } catch {
      // If replace fails, create a new player
      try { _player.remove(); } catch { /* ignore */ }
      _player = null;
    }
  }

  if (!_player) {
    try {
      _player = mod.createAudioPlayer({ uri: url }) as unknown as typeof _player;
    } catch (e) {
      console.warn("[Voice] createAudioPlayer failed", e);
      set({ loading: false });
      return;
    }
  }

  // Play immediately — don't wait for isLoaded.
  // The native audio engine buffers internally and starts when ready.
  if (!_player) {
    set({ loading: false });
    return;
  }
  try {
    _player.play();
    set({ playing: true, loading: false });
    startPoll();
  } catch (e) {
    console.warn("[Voice] native play() failed", e);
    set({ loading: false });
  }
}

// ─── Main toggle function ────────────────────────────────────────────────────

function togglePlay(url: string) {
  if (!url) return;

  if (Platform.OS === "web") {
    // Always use web fallback — HTMLAudioElement is more reliable
    playWithWebFallback(url);
    return;
  }

  // Native: try expo-audio
  try {
    playWithExpoAudio(url);
  } catch (e) {
    console.warn("[Voice] expo-audio unavailable, trying web fallback", e);
    // Fallback to web audio on native-web (shouldn't happen but safe)
    if (typeof Audio !== "undefined") {
      playWithWebFallback(url);
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

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

  const active = _snap.url === audioUrl;
  const playing = active && _snap.playing;
  const loading = active && _snap.loading;
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
