import React, { useMemo, useState, useCallback, useEffect, Component } from "react";
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
  try {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    _modeReady = true;
  } catch {
    /* ignore – best effort */
  }
}

/* ─── Waveform bars sub-component ─── */
function WaveformBars({ bars, progress, mine }: { bars: number[]; progress: number; mine: boolean }) {
  return (
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
  );
}

/* ─── Active player (only mounted when user taps play) ─── */
function ActiveVoicePlayer({
  audioUrl,
  bars,
  mine,
  totalDuration,
  timestamp,
  onDeactivate,
}: {
  audioUrl: string;
  bars: number[];
  mine: boolean;
  totalDuration: number;
  timestamp?: string;
  onDeactivate: () => void;
}) {
  // Pass URL string directly as AudioSource
  const player = useAudioPlayer(audioUrl);
  const status = useAudioPlayerStatus(player);
  const [autoPlayed, setAutoPlayed] = useState(false);

  // Auto-play once loaded
  useEffect(() => {
    if (status.isLoaded && !autoPlayed) {
      setAutoPlayed(true);
      ensurePlaybackMode().then(() => {
        try { player.play(); } catch { /* ignore */ }
      });
    }
  }, [status.isLoaded, autoPlayed, player]);

  // On finish → deactivate back to static bubble
  useEffect(() => {
    if (status.didJustFinish) {
      try { player.seekTo(0); } catch { /* ignore */ }
      onDeactivate();
    }
  }, [status.didJustFinish, player, onDeactivate]);

  const togglePlay = useCallback(async () => {
    try {
      await ensurePlaybackMode();
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch {
      onDeactivate();
    }
  }, [player, status.playing, onDeactivate]);

  const effectiveDuration = status.duration > 0 ? status.duration : totalDuration;
  const progress = effectiveDuration > 0 ? Math.min(status.currentTime / effectiveDuration, 1) : 0;
  const displayTime = status.playing
    ? formatTime(status.currentTime)
    : formatTime(effectiveDuration);

  return (
    <View style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}>
      <TouchableOpacity onPress={togglePlay} style={styles.playBtn} activeOpacity={0.7}>
        {!status.isLoaded ? (
          <ActivityIndicator size="small" color={mine ? "#FFFFFF" : "#000000"} />
        ) : (
          <SymbolView
            name={status.playing ? "pause.fill" : "play.fill"}
            size={16}
            tintColor={mine ? "#FFFFFF" : "#000000"}
          />
        )}
      </TouchableOpacity>
      <WaveformBars bars={bars} progress={progress} mine={mine} />
      <Text style={[styles.time, { color: mine ? "rgba(255,255,255,0.7)" : "#71717A" }]}>
        {displayTime}
      </Text>
    </View>
  );
}

/* ─── Static bubble (no audio hooks, shown by default) ─── */
function StaticVoiceBubble({
  bars,
  mine,
  totalDuration,
  timestamp,
  onPlay,
  hasError,
}: {
  bars: number[];
  mine: boolean;
  totalDuration: number;
  timestamp?: string;
  onPlay?: () => void;
  hasError?: boolean;
}) {
  if (hasError) {
    return (
      <View style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}>
        <View style={styles.playBtn}>
          <SymbolView
            name="exclamationmark.triangle"
            size={14}
            tintColor={mine ? "rgba(255,255,255,0.5)" : "#A1A1AA"}
          />
        </View>
        <Text style={[styles.errorLabel, { color: mine ? "rgba(255,255,255,0.6)" : "#A1A1AA" }]}>
          Audio nicht verfügbar
        </Text>
        {timestamp ? (
          <Text style={[styles.time, { color: mine ? "rgba(255,255,255,0.5)" : "#A1A1AA" }]}>
            {timestamp}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, mine ? styles.meContainer : styles.otherContainer]}>
      <TouchableOpacity onPress={onPlay} style={styles.playBtn} activeOpacity={0.7}>
        <SymbolView name="play.fill" size={16} tintColor={mine ? "#FFFFFF" : "#000000"} />
      </TouchableOpacity>
      <WaveformBars bars={bars} progress={0} mine={mine} />
      <Text style={[styles.time, { color: mine ? "rgba(255,255,255,0.7)" : "#71717A" }]}>
        {formatTime(totalDuration)}
      </Text>
    </View>
  );
}

/* ─── Public export ─── */
export function VoiceMessageBubble(props: VoiceMessageBubbleProps) {
  const { audioUrl, duration, durationMs, isMine, isMe, timestamp } = props;
  const mine = isMine ?? isMe ?? false;
  const totalDuration = duration ?? (durationMs ? durationMs / 1000 : 0);
  const bars = useMemo(() => generateStableBars(hashString(audioUrl || "x")), [audioUrl]);
  const [active, setActive] = useState(false);
  const [hasError, setHasError] = useState(false);

  // No URL → static fallback
  if (!audioUrl || audioUrl.length === 0) {
    return (
      <StaticVoiceBubble
        bars={bars}
        mine={mine}
        totalDuration={totalDuration}
        timestamp={timestamp}
      />
    );
  }

  // Player active → render hook-based player
  if (active && !hasError) {
    return (
      <AudioErrorBoundary
        fallback={
          <StaticVoiceBubble
            bars={bars}
            mine={mine}
            totalDuration={totalDuration}
            timestamp={timestamp}
            hasError
          />
        }
      >
        <ActiveVoicePlayer
          audioUrl={audioUrl}
          bars={bars}
          mine={mine}
          totalDuration={totalDuration}
          timestamp={timestamp}
          onDeactivate={() => setActive(false)}
        />
      </AudioErrorBoundary>
    );
  }

  // Default: static bubble with play button
  return (
    <StaticVoiceBubble
      bars={bars}
      mine={mine}
      totalDuration={totalDuration}
      timestamp={timestamp}
      onPlay={() => {
        setHasError(false);
        setActive(true);
      }}
      hasError={hasError}
    />
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
