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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
  seekTo(s: number): Promise<void>;
  replace(src: { uri: string }): void;
  remove(): void;
  readonly playing: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly isLoaded: boolean;
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

let _loadPollCount = 0; // Tracks how many poll cycles we've waited for loading
const MAX_LOAD_POLLS = 75; // ~6 seconds at 80ms interval → give up

function startNativePoll() {
  stopPoll();
  _loadPollCount = 0;
  _poll = setInterval(() => {
    if (!_player) {
      stopPoll();
      return;
    }
    const p = _player;

    // ── Still waiting for buffer/load ──
    if (_snap.loading) {
      _loadPollCount++;

      // Check MULTIPLE indicators that the player is ready:
      // 1. isLoaded (official) — not always reliable on older iOS
      // 2. duration > 0 — alternative indicator that metadata loaded
      const ready = p.isLoaded || p.duration > 0;

      if (ready) {
        try {
          p.play();
          set({ playing: true, loading: false, duration: p.duration > 0 ? p.duration : 0 });
        } catch (e) {
          console.warn("[Voice] deferred play() failed:", e);
          set({ loading: false });
          stopPoll();
        }
        return;
      }

      // Timeout: give up after MAX_LOAD_POLLS
      if (_loadPollCount >= MAX_LOAD_POLLS) {
        console.warn("[Voice] Loading timed out after", MAX_LOAD_POLLS * 80, "ms");
        set({ loading: false });
        stopPoll();
        // Dispose the broken player
        try { _player?.pause(); } catch { /* ignore */ }
        try { _player?.remove(); } catch { /* ignore */ }
        _player = null;
      }
      return;
    }

    // ── Playing state tracking ──
    const playing = p.playing;
    const ct = p.currentTime;
    const dur = p.duration;

    // Detect natural end
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
  if (!expoAudio) {
    console.warn("[Voice] expo-audio not available, cannot play");
    return;
  }

  // ALWAYS set audio mode before playback — critical after recording
  await ensurePlaybackMode();

  // ── Same URL: toggle play/pause ──
  if (_player && _snap.url === url) {
    if (_snap.playing) {
      try { _player.pause(); } catch { /* ignore */ }
      set({ playing: false });
      stopPoll();
    } else {
      // Resume
      if (_snap.duration > 0 && _snap.currentTime >= _snap.duration - 0.2) {
        try { await _player.seekTo(0); } catch { /* ignore */ }
        set({ currentTime: 0 });
      }
      try {
        _player.play();
        set({ playing: true });
        startNativePoll();
      } catch (e) {
        console.warn("[Voice] resume play() failed:", e);
      }
    }
    return;
  }

  // ── New URL: dispose old player entirely ──
  if (_player) {
    try { _player.pause(); } catch { /* ignore */ }
    try { _player.remove(); } catch { /* ignore */ }
    _player = null;
  }

  set({ url, playing: false, currentTime: 0, duration: 0, loading: true });

  // Create a fresh player
  try {
    // Try both source formats — some expo-audio versions prefer string, others object
    _player = expoAudio.createAudioPlayer({ uri: url }) as unknown as ExpoPlayer;
  } catch (e1) {
    console.warn("[Voice] createAudioPlayer({uri}) failed, trying string:", e1);
    try {
      _player = expoAudio.createAudioPlayer(url) as unknown as ExpoPlayer;
    } catch (e2) {
      console.warn("[Voice] createAudioPlayer(string) also failed:", e2);
      set({ loading: false });
      return;
    }
  }

  if (!_player) {
    set({ loading: false });
    return;
  }

  // Start polling — the loop will auto-detect isLoaded/duration and call play()
  startNativePoll();

  // Also try eager play after a short delay.
  // On some iOS versions, play() queues internally and starts when buffered.
  const playerRef = _player;
  setTimeout(() => {
    if (playerRef === _player && _snap.loading && _player) {
      try {
        _player.play();
      } catch {
        /* poll will handle it */
      }
    }
  }, 250);

  // Second eager attempt slightly later
  setTimeout(() => {
    if (playerRef === _player && _snap.loading && _player) {
      try {
        _player.play();
      } catch {
        /* poll will handle it */
      }
    }
  }, 800);
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEB AUDIO ENGINE — used in browser preview
// ═══════════════════════════════════════════════════════════════════════════════

let _webAudio: HTMLAudioElement | null = null;

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

  // Same URL: toggle
  if (_webAudio && _snap.url === url) {
    if (_snap.playing) {
      _webAudio.pause();
      set({ playing: false });
      stopPoll();
    } else {
      if (
        _webAudio.ended ||
        (isFinite(_webAudio.duration) &&
          _webAudio.currentTime >= _webAudio.duration - 0.2)
      ) {
        _webAudio.currentTime = 0;
      }
      _webAudio
        .play()
        .then(() => {
          set({ playing: true });
          startWebPoll();
        })
        .catch((e) => console.warn("[Voice] web resume failed", e));
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
    set({
      loading: false,
      duration: isFinite(audio.duration) ? audio.duration : 0,
    });
  };
  audio.onended = () => {
    audio.currentTime = 0;
    set({ playing: false, currentTime: 0 });
    stopPoll();
  };
  audio.onerror = () => {
    console.warn("[Voice] web audio error");
    set({ loading: false, playing: false });
    stopPoll();
  };

  audio
    .play()
    .then(() => {
      set({ playing: true, loading: false });
      startWebPoll();
    })
    .catch(() => {
      // Autoplay blocked — mark as loaded, next tap will resume
      setTimeout(() => {
        if (_snap.loading && _snap.url === url) {
          set({ loading: false });
        }
      }, 2000);
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT — guarded against rapid taps
// ═══════════════════════════════════════════════════════════════════════════════

function togglePlay(url: string): void {
  if (!url || _busy) return;
  _busy = true;

  if (IS_WEB) {
    try {
      playWeb(url);
    } catch (e) {
      console.warn("[Voice] web play error:", e);
    } finally {
      _busy = false;
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
