import React, { useMemo, useState, useCallback, useRef, useEffect, Component } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { SymbolView } from "@/components/Icon";

type Player = ReturnType<typeof createAudioPlayer>;

interface VoiceMessageBubbleProps {
  audioUrl: string;
  duration?: number;
  durationMs?: number;
  isMine?: boolean;
  isMe?: boolean;
  timestamp?: string;
}

function formatTime(seconds: number): string {
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

/* ─── Error Boundary ─── */
interface EBProps { fallback: React.ReactNode; children: React.ReactNode }
interface EBState { hasError: boolean }
class AudioErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError(): EBState { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

/* ─── Inner player ─── */
function VoiceMessageBubbleInner({
  audioUrl,
  duration: durationSec,
  durationMs,
  isMine,
  isMe,
  timestamp,
}: VoiceMessageBubbleProps) {
  const mine = isMine ?? isMe ?? false;
  const totalDuration = durationSec ?? (durationMs ? durationMs / 1000 : 0);

  const playerRef = useRef<Player | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingTicksRef = useRef(0);

  // Clean up
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try { playerRef.current?.remove(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    loadingTicksRef.current = 0;
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    timerRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;

      try {
        const ct = p.currentTime;
        const dur = p.duration;

        setCurrentTime(ct);
        if (dur > 0) {
          setPlayerDuration(dur);
          setIsLoading(false);
          loadingTicksRef.current = 0;
        }

        if (p.playing) {
          // Actively playing – keep polling
          loadingTicksRef.current = 0;
        } else if (dur > 0 && ct >= dur - 0.3) {
          // Finished
          setCurrentTime(dur);
          setIsPlaying(false);
          stopPolling();
        } else if (dur === 0) {
          // Still loading
          loadingTicksRef.current++;
          if (loadingTicksRef.current > 75) {
            // 15 s timeout
            setIsPlaying(false);
            setIsLoading(false);
            setError(true);
            stopPolling();
          }
        } else {
          // Paused or stopped mid-track
          setIsPlaying(false);
          stopPolling();
        }
      } catch {
        setIsPlaying(false);
        setIsLoading(false);
        stopPolling();
      }
    }, 200);
  }, [stopPolling]);

  const togglePlay = useCallback(async () => {
    try {
      // Create player lazily on first tap
      if (!playerRef.current) {
        setIsLoading(true);
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
        const p = createAudioPlayer({ uri: audioUrl });
        playerRef.current = p;
        // Give native player a moment to initialise
        await new Promise((r) => setTimeout(r, 250));
      }

      const p = playerRef.current;

      if (isPlaying) {
        p.pause();
        setIsPlaying(false);
        stopPolling();
      } else {
        // Reset if at end
        const dur = p.duration > 0 ? p.duration : totalDuration;
        if (dur > 0 && p.currentTime >= dur - 0.3) {
          p.seekTo(0);
          setCurrentTime(0);
          await new Promise((r) => setTimeout(r, 80));
        }
        p.play();
        setIsPlaying(true);
        startPolling();
      }
    } catch (err) {
      console.warn("VoiceMessageBubble play error:", err);
      setIsPlaying(false);
      setIsLoading(false);
      setError(true);
      stopPolling();
    }
  }, [audioUrl, isPlaying, totalDuration, startPolling, stopPolling]);

  const effectiveDuration = playerDuration > 0 ? playerDuration : totalDuration;
  const progress = effectiveDuration > 0 ? Math.min(currentTime / effectiveDuration, 1) : 0;
  const displayTime = isPlaying ? formatTime(currentTime) : formatTime(effectiveDuration);
  const bars = useMemo(() => generateStableBars(hashString(audioUrl)), [audioUrl]);

  if (error) {
    return (
      <View style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}>
        <View style={styles.playBtn}>
          <SymbolView name="exclamationmark.triangle" size={14} tintColor={mine ? "rgba(255,255,255,0.5)" : "#A1A1AA"} />
        </View>
        <Text style={[styles.errorLabel, { color: mine ? "rgba(255,255,255,0.6)" : "#A1A1AA" }]}>Audio nicht verfügbar</Text>
        {timestamp ? <Text style={[styles.time, { color: mine ? "rgba(255,255,255,0.5)" : "#A1A1AA" }]}>{timestamp}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}>
      <TouchableOpacity onPress={togglePlay} style={styles.playBtn} activeOpacity={0.7}>
        {isLoading && !isPlaying ? (
          <ActivityIndicator size="small" color={mine ? "#FFFFFF" : "#000000"} />
        ) : (
          <SymbolView
            name={isPlaying ? "pause.fill" : "play.fill"}
            size={16}
            tintColor={mine ? "#FFFFFF" : "#000000"}
          />
        )}
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

/* ─── Fallback ─── */
function VoiceMessageFallback({
  durationMs,
  duration: durationSec,
  isMine,
  isMe,
}: Omit<VoiceMessageBubbleProps, "audioUrl">) {
  const mine = isMine ?? isMe ?? false;
  const totalDuration = durationSec ?? (durationMs ? durationMs / 1000 : 0);
  const bars = useMemo(() => generateStableBars(12345), []);

  return (
    <View style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}>
      <View style={styles.playBtn}>
        <SymbolView name="waveform" size={16} tintColor={mine ? "rgba(255,255,255,0.5)" : "#A1A1AA"} />
      </View>
      <View style={styles.waveContainer}>
        <View style={styles.bars}>
          {bars.map((h, i) => (
            <View
              key={`bar-${i}`}
              style={[styles.bar, { height: h, backgroundColor: mine ? "rgba(255,255,255,0.25)" : "#E4E4E7" }]}
            />
          ))}
        </View>
      </View>
      <Text style={[styles.time, { color: mine ? "rgba(255,255,255,0.5)" : "#A1A1AA" }]}>
        {totalDuration > 0 ? formatTime(totalDuration) : "…"}
      </Text>
    </View>
  );
}

/* ─── Public export ─── */
export function VoiceMessageBubble(props: VoiceMessageBubbleProps) {
  if (!props.audioUrl || props.audioUrl.length === 0) {
    return <VoiceMessageFallback {...props} />;
  }
  return (
    <AudioErrorBoundary fallback={<VoiceMessageFallback {...props} />}>
      <VoiceMessageBubbleInner {...props} />
    </AudioErrorBoundary>
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
