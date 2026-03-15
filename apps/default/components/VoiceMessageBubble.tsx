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

const EMPTY: Snap = {
  url: null,
  playing: false,
  currentTime: 0,
  duration: 0,
  loading: false,
};

// ─── Reactive state store ────────────────────────────────────────────────────

let _snap: Snap = { ...EMPTY };
const _subs = new Set<() => void>();
let _poll: ReturnType<typeof setInterval> | null = null;

function notify() {
  _subs.forEach((fn) => fn());
}
function set(patch: Partial<Snap>) {
  _snap = { ..._snap, ...patch };
  notify();
}
function stopPoll() {
  if (_poll) {
    clearInterval(_poll);
    _poll = null;
  }
}

// ─── Platform detection ─────────────────────────────────────────────────────

const IS_WEB = Platform.OS === "web";

// ═══════════════════════════════════════════════════════════════════════════════
// WEB AUDIO ENGINE
// Works in desktop browsers AND iOS WKWebView (Bloom App)
// ═══════════════════════════════════════════════════════════════════════════════

// Singleton HTMLAudioElement — reused across all voice messages.
// iOS WKWebView is very strict: creating new Audio() elements and calling
// play() immediately fails silently. A singleton that is "unlocked" once
// on the first user gesture avoids this.
let _el: HTMLAudioElement | null = null;
let _unlocked = false;

// Base64-encoded 44-byte silent WAV file.
// Playing this on the first tap "unlocks" the iOS audio session so that
// subsequent play() calls on real URLs succeed.
const SILENCE =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

function getEl(): HTMLAudioElement {
  if (!_el && typeof Audio !== "undefined") {
    const a = new Audio();
    a.preload = "auto";
    // Critical for iOS WebView:
    a.setAttribute("playsinline", "true");
    a.setAttribute("webkit-playsinline", "true");
    _el = a;
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return _el!;
}

/** Play a tiny silent WAV to unlock the iOS audio session. */
function unlockAudio(): void {
  if (_unlocked) return;
  try {
    const a = getEl();
    a.src = SILENCE;
    a.volume = 0;
    const p = a.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        a.pause();
        a.currentTime = 0;
        a.volume = 1;
        _unlocked = true;
      }).catch(() => {
        a.volume = 1;
      });
    }
  } catch {
    /* ignore */
  }
}

function startWebPoll() {
  stopPoll();
  _poll = setInterval(() => {
    const a = _el;
    if (!a) {
      stopPoll();
      return;
    }
    const dur = isFinite(a.duration) ? a.duration : 0;
    const ct = a.currentTime;
    const playing = !a.paused && !a.ended;

    // Detect natural end
    if (_snap.playing && (a.ended || (dur > 0 && ct >= dur - 0.05))) {
      a.pause();
      a.currentTime = 0;
      set({ playing: false, currentTime: 0 });
      stopPoll();
      return;
    }

    // Update reactive state
    if (
      _snap.playing !== playing ||
      Math.abs(_snap.currentTime - ct) > 0.03 ||
      Math.abs(_snap.duration - dur) > 0.03
    ) {
      set({ playing, currentTime: ct, duration: dur, loading: false });
    }

    if (!playing && !_snap.loading) stopPoll();
  }, 80);
}

function playWeb(url: string): void {
  if (typeof Audio === "undefined") return;
  const audio = getEl();
  if (!audio) return;

  // Always try to unlock on user gesture (no-op if already unlocked)
  if (!_unlocked) unlockAudio();

  // ── Same URL: toggle play/pause ──
  if (_snap.url === url) {
    if (_snap.playing) {
      audio.pause();
      set({ playing: false });
      stopPoll();
      return;
    }
    // Resume or restart
    if (
      audio.ended ||
      (isFinite(audio.duration) && audio.currentTime >= audio.duration - 0.2)
    ) {
      audio.currentTime = 0;
    }
    const p = audio.play();
    set({ playing: true });
    startWebPoll();
    if (p) {
      p.catch(() => {
        set({ playing: false });
        stopPoll();
      });
    }
    return;
  }

  // ── New URL ──
  audio.pause();

  // Remove old event listeners
  audio.onended = null;
  audio.onerror = null;
  audio.onloadedmetadata = null;
  audio.oncanplaythrough = null;

  set({ url, playing: false, currentTime: 0, duration: 0, loading: true });

  audio.src = url;

  // Attach listeners
  audio.onended = () => {
    audio.currentTime = 0;
    set({ playing: false, currentTime: 0 });
    stopPoll();
  };
  audio.onerror = () => {
    console.warn("[Voice] web audio error", audio.error?.message);
    set({ loading: false, playing: false });
    stopPoll();
  };
  audio.onloadedmetadata = () => {
    const dur = isFinite(audio.duration) ? audio.duration : 0;
    if (dur > 0) set({ duration: dur });
  };

  // Force iOS to start buffering
  audio.load();

  // Attempt to play immediately (we're in user gesture context)
  const p = audio.play();
  if (p && typeof p.then === "function") {
    p.then(() => {
      set({
        playing: true,
        loading: false,
        duration: isFinite(audio.duration) ? audio.duration : 0,
      });
      startWebPoll();
    }).catch(() => {
      // iOS blocked play — audio is loading in background.
      // When ready, mark as loaded. The NEXT tap will use the "same URL"
      // resume path which calls play() in a fresh gesture context.
      audio.oncanplaythrough = () => {
        audio.oncanplaythrough = null;
        set({
          loading: false,
          duration: isFinite(audio.duration) ? audio.duration : 0,
        });
      };
      // Also set a timeout fallback in case oncanplaythrough never fires
      setTimeout(() => {
        if (_snap.loading && _snap.url === url) {
          set({ loading: false });
        }
      }, 3000);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NATIVE AUDIO ENGINE (expo-audio)
// Used when running as a real native Expo app (not via Bloom WebView)
// ═══════════════════════════════════════════════════════════════════════════════

type ExpoPlayer = {
  play(): void;
  pause(): void;
  seekTo(s: number): Promise<void>;
  replace(src: { uri: string }): void;
  remove(): void;
  readonly playing: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly isLoaded: boolean;
};
let _player: ExpoPlayer | null = null;
let _audioModeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (_audioModeReady) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-audio") as typeof import("expo-audio");
    await mod.setAudioModeAsync({ playsInSilentMode: true });
    _audioModeReady = true;
  } catch (e) {
    console.warn("[Voice] setAudioModeAsync failed", e);
  }
}

function startNativePoll() {
  stopPoll();
  _poll = setInterval(() => {
    if (!_player) {
      stopPoll();
      return;
    }
    const p = _player;

    // Deferred play: wait for isLoaded
    if (_snap.loading && p.isLoaded) {
      try {
        p.play();
        set({ playing: true, loading: false, duration: p.duration });
      } catch {
        set({ loading: false });
        stopPoll();
      }
      return;
    }

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

    if (
      _snap.playing !== playing ||
      Math.abs(_snap.currentTime - ct) > 0.04 ||
      Math.abs(_snap.duration - dur) > 0.04
    ) {
      set({ playing, currentTime: ct, duration: dur, loading: false });
    }

    if (!playing && !_snap.loading) stopPoll();
  }, 80);
}

async function playNative(url: string): Promise<void> {
  await ensureAudioMode();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("expo-audio") as typeof import("expo-audio");

  // Same URL → toggle
  if (_player && _snap.url === url) {
    if (_snap.playing) {
      _player.pause();
      set({ playing: false });
      stopPoll();
    } else {
      if (
        _snap.duration > 0 &&
        _snap.currentTime >= _snap.duration - 0.2
      ) {
        await _player.seekTo(0).catch(() => {});
        set({ currentTime: 0 });
      }
      _player.play();
      set({ playing: true });
      startNativePoll();
    }
    return;
  }

  // New URL — dispose old player
  if (_player) {
    _player.pause();
    try {
      _player.remove();
    } catch {
      /* ignore */
    }
    _player = null;
  }

  set({ url, playing: false, currentTime: 0, duration: 0, loading: true });

  try {
    _player = mod.createAudioPlayer({ uri: url }) as unknown as ExpoPlayer;
  } catch (e) {
    console.warn("[Voice] createAudioPlayer failed", e);
    set({ loading: false });
    return;
  }

  // Start polling — poll loop auto-plays when isLoaded becomes true
  startNativePoll();

  // Eager play attempt after short delay
  const ref = _player;
  setTimeout(() => {
    if (ref === _player && _snap.loading && _player) {
      try {
        _player.play();
      } catch {
        /* poll will retry */
      }
    }
  }, 300);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT — fully synchronous for web, async for native
// ═══════════════════════════════════════════════════════════════════════════════

function togglePlay(url: string): void {
  if (!url) return;

  if (IS_WEB) {
    // MUST stay synchronous to preserve iOS user-gesture context
    playWeb(url);
    return;
  }

  // Native path — fire-and-forget
  playNative(url).catch((e) => {
    console.warn("[Voice] native play error", e);
    set({ loading: false, playing: false });
  });
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
  for (let i = 0; i < str.length; i++)
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
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
    return () => {
      _subs.delete(cb);
    };
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
          <SymbolView
            name="exclamationmark.triangle"
            size={14}
            tintColor={mine ? "rgba(255,255,255,0.5)" : "#A1A1AA"}
          />
        </View>
        <Text
          style={[
            s.errTxt,
            { color: mine ? "rgba(255,255,255,0.6)" : "#A1A1AA" },
          ]}
        >
          Audio nicht verfügbar
        </Text>
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
                      ? mine
                        ? "#FFFFFF"
                        : "#000000"
                      : mine
                        ? "rgba(255,255,255,0.3)"
                        : "#D4D4D8",
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      <Text
        style={[
          s.time,
          { color: mine ? "rgba(255,255,255,0.7)" : "#71717A" },
        ]}
      >
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
