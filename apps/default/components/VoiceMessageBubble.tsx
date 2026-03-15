import React, { useMemo, useState, useCallback, useRef, useEffect, Component } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import { SymbolView } from "@/components/Icon";

interface VoiceMessageBubbleProps {
  audioUrl: string;
  duration?: number;
  durationMs?: number;
  isMine?: boolean;
  isMe?: boolean;
  timestamp?: string;
}

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

/* ─── Error Boundary ─── */
interface EBProps { fallback: React.ReactNode; children: React.ReactNode }
interface EBState { hasError: boolean }
class AudioErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError(): EBState { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

/* ─── Audio mode singleton ─── */
let _modeReady = false;
async function ensurePlaybackMode() {
  if (_modeReady) return;
  await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
  _modeReady = true;
}

/* ─── Inner player (hook-based) ─── */
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

  // Hook-based player – auto-cleans up on unmount
  const player = useAudioPlayer({ uri: audioUrl }, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);
  const [error, setError] = useState(false);

  // Reset position when playback finishes
  useEffect(() => {
    if (status.didJustFinish) {
      try { player.seekTo(0); } catch { /* ignore */ }
    }
  }, [status.didJustFinish, player]);

  const togglePlay = useCallback(async () => {
    try {
      await ensurePlaybackMode();
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (err) {
      console.warn("VoiceMessageBubble play error:", err);
      setError(true);
    }
  }, [player, status.playing]);

  const effectiveDuration = status.duration > 0 ? status.duration : totalDuration;
  const progress = effectiveDuration > 0 ? Math.min(status.currentTime / effectiveDuration, 1) : 0;
  const displayTime = status.playing
    ? formatTime(status.currentTime)
    : formatTime(effectiveDuration);
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

  const isLoading = !status.isLoaded && !status.playing;

  return (
    <View style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}>
      <TouchableOpacity onPress={togglePlay} style={styles.playBtn} activeOpacity={0.7}>
        {isLoading ? (
          <ActivityIndicator size="small" color={mine ? "#FFFFFF" : "#000000"} />
        ) : (
          <SymbolView
            name={status.playing ? "pause.fill" : "play.fill"}
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
