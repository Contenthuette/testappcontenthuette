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

// ─── Static import for expo-audio (native only) ──────────────────────────────
// Static import is more reliable than dynamic require() in Bloom native runtime.
// On web this module may not exist, but we only use it when Platform.OS !== 'web'.
let expoAudio: typeof import("expo-audio") | null = null;
try {
  if (Platform.OS !== "web") {
    expoAudio = require("expo-audio") as typeof import("expo-audio");
  }
} catch {
  console.warn("[Voice] expo-audio not available");
}

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
let _busy = false;

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

// ─── Platform ────────────────────────────────────────────────────────────────

const IS_WEB = Platform.OS === "web";

// ═══════════════════════════════════════════════════════════════════════════════
// NATIVE AUDIO ENGINE (expo-audio) — used on iOS & Android
// ═══════════════════════════════════════════════════════════════════════════════

type ExpoPlayer = {
  play(): void;
  pause(): void;
  seekTo(s: number): void;
  replace(src: { uri: string }): void;
  remove(): void;
  readonly playing: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly isBuffering: boolean;
};
let _player: ExpoPlayer | null = null;

// CRITICAL: Always set audio mode before EVERY playback attempt.
// The VoiceRecorder changes the session to "record" mode. If we only set it once,
// subsequent playback after recording will fail silently on iOS.
async function ensurePlaybackMode(): Promise<boolean> {
  if (!expoAudio) return false;
  try {
    await expoAudio.setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,  // Switch back from record → playback mode
    });
    return true;
  } catch (e) {
    console.warn("[Voice] setAudioModeAsync failed:", e);
    return false;
  }
}

// Poll ONLY observes state — never calls play(). play() is called exactly once
// in playNative/createAndPlayNative to avoid iOS audio session conflicts.
function startNativePoll() {
  stopPoll();
  _poll = setInterval(() => {
    if (!_player) {
      stopPoll();
      return;
    }
    const p = _player;
    const playing = p.playing;
    const ct = p.currentTime;
    const dur = p.duration;

    // ── Transition from loading → playing ──
    if (_snap.loading && (playing || dur > 0)) {
      set({ playing, loading: false, duration: dur, currentTime: ct });
      return;
    }

    // ── Detect natural end of playback ──
    // CRITICAL FIX: Fully destroy the player on end instead of seekTo(0).
    // Reusing a completed player causes silent failures on subsequent plays.
    if (_snap.playing && !playing && dur > 0 && ct >= dur - 0.15) {
      const finishedUrl = _snap.url;
      destroyPlayer();
      set({ url: finishedUrl, playing: false, currentTime: 0, duration: dur });
      return;
    }

    // ── Regular state sync ──
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

function destroyPlayer() {
  if (_player) {
    try { _player.pause(); } catch { /* ignore */ }
    try { _player.remove(); } catch { /* ignore */ }
    _player = null;
  }
  stopPoll();
}

async function createAndPlayNative(url: string): Promise<void> {
  if (!expoAudio) return;

  set({ url, playing: false, currentTime: 0, duration: 0, loading: true });

  // Create player — try string URI first (most reliable), then object form
  try {
    _player = expoAudio.createAudioPlayer(url) as unknown as ExpoPlayer;
  } catch {
    try {
      _player = expoAudio.createAudioPlayer({ uri: url }) as unknown as ExpoPlayer;
    } catch {
      set({ loading: false });
      return;
    }
  }

  if (!_player) {
    set({ loading: false });
    return;
  }

  // Call play() exactly ONCE — expo-audio will buffer internally and start
  // when ready. Calling play() multiple times can cause iOS audio conflicts.
  try {
    _player.play();
  } catch { /* poll will detect state */ }

  // Start state tracking (observe only, no play calls)
  startNativePoll();

  // Safety timeout: if still loading after 8s, give up
  const savedUrl = url;
  setTimeout(() => {
    if (_snap.url === savedUrl && _snap.loading) {
      console.warn("[Voice] Loading timed out after 8s");
      set({ loading: false, playing: false });
      destroyPlayer();
    }
  }, 8000);
}

async function playNative(url: string): Promise<void> {
  if (!expoAudio) {
    console.warn("[Voice] expo-audio not available, cannot play");
    return;
  }

  // ALWAYS set audio mode before playback — critical after recording
  await ensurePlaybackMode();

  // ── Same URL: toggle play/pause ──
  if (_snap.url === url && _player) {
    if (_snap.playing) {
      try { _player.pause(); } catch { /* ignore */ }
      set({ playing: false });
      stopPoll();
    } else {
      // CRITICAL FIX: Always create a fresh player for replay.
      // After natural end the old player is destroyed, and even if it
      // still exists calling play() on a completed player is unreliable.
      destroyPlayer();
      await createAndPlayNative(url);
    }
    return;
  }

  // ── Same URL but player was already destroyed (finished naturally) ──
  if (_snap.url === url && !_player) {
    await createAndPlayNative(url);
    return;
  }

  // ── New URL: dispose old player, create fresh ──
  destroyPlayer();
  await createAndPlayNative(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEB AUDIO ENGINE — singleton for WKWebView compatibility
// ═══════════════════════════════════════════════════════════════════════════════

// CRITICAL: iOS WKWebView only allows audio playback from a user-gesture-activated
// element. Creating new Audio() elements breaks the gesture chain. We MUST reuse
// a single element and swap `.src` to change tracks.
let _webAudio: HTMLAudioElement | null = null;

function getWebAudio(): HTMLAudioElement {
  if (!_webAudio && typeof Audio !== "undefined") {
    _webAudio = new Audio();
    _webAudio.preload = "auto";
    // Attach persistent end handler
    _webAudio.addEventListener("ended", () => {
      if (_webAudio) _webAudio.currentTime = 0;
      set({ playing: false, currentTime: 0 });
      stopPoll();
    });
    _webAudio.addEventListener("error", () => {
      console.warn("[Voice] web audio error");
      set({ loading: false, playing: false });
      stopPoll();
    });
  }
  return _webAudio!;
}

function startWebPoll() {
  stopPoll();
  _poll = setInterval(() => {
    const a = _webAudio;
    if (!a) {
      stopPoll();
      return;
    }
    const dur = isFinite(a.duration) ? a.duration : 0;
    const ct = a.currentTime;
    const playing = !a.paused && !a.ended;

    if (_snap.playing && (a.ended || (dur > 0 && ct >= dur - 0.05))) {
      a.pause();
      a.currentTime = 0;
      set({ playing: false, currentTime: 0 });
      stopPoll();
      return;
    }

    // Update duration once available (WKWebView may report it late)
    if (_snap.loading && dur > 0) {
      set({ loading: false, duration: dur });
    }

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

  const audio = getWebAudio();
  if (!audio) return;

  // ── Same URL: toggle play / pause ──
  if (_snap.url === url) {
    if (_snap.playing) {
      audio.pause();
      set({ playing: false });
      stopPoll();
    } else {
      // Resume or replay
      if (
        audio.ended ||
        (isFinite(audio.duration) &&
          audio.currentTime >= audio.duration - 0.2)
      ) {
        audio.currentTime = 0;
      }
      // play() must stay in synchronous gesture stack for WKWebView
      audio
        .play()
        .then(() => {
          set({ playing: true });
          startWebPoll();
        })
        .catch((e) => console.warn("[Voice] web resume failed", e));
    }
    return;
  }

  // ── New URL: reuse singleton, swap source ──
  audio.pause();
  set({ url, playing: false, currentTime: 0, duration: 0, loading: true });

  // Swap source on the SAME element (keeps gesture activation in WKWebView)
  audio.src = url;
  audio.currentTime = 0;

  // MUST call play() synchronously here — in the gesture callback stack.
  // WKWebView will buffer + start playback once data arrives.
  audio
    .play()
    .then(() => {
      const dur = isFinite(audio.duration) ? audio.duration : 0;
      set({ playing: true, loading: false, duration: dur });
      startWebPoll();
    })
    .catch(() => {
      // Autoplay blocked or not yet loaded — poll will pick up state
      startWebPoll();
      setTimeout(() => {
        if (_snap.loading && _snap.url === url) {
          set({ loading: false });
        }
      }, 3000);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT — guarded against rapid taps
// ═══════════════════════════════════════════════════════════════════════════════

function togglePlay(url: string): void {
  if (!url || _busy) return;
  _busy = true;

  // Safety: auto-release _busy after 10s to prevent permanent lockout
  const busyTimer = setTimeout(() => { _busy = false; }, 10000);

  if (IS_WEB) {
    try {
      playWeb(url);
    } catch (e) {
      console.warn("[Voice] web play error:", e);
    } finally {
      _busy = false;
      clearTimeout(busyTimer);
    }
    return;
  }

  // Native path — async but guarded
  playNative(url)
    .catch((e) => {
      console.warn("[Voice] native play error:", e);
      set({ loading: false, playing: false });
    })
    .finally(() => {
      _busy = false;
      clearTimeout(busyTimer);
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
