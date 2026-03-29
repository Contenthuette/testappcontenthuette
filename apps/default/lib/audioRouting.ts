import { Platform } from "react-native";
import { setAudioModeAsync } from "expo-audio";

/**
 * Force audio to play through the loudspeaker (not earpiece).
 * Used for livestreams (always on) and calls (toggle).
 *
 * WebRTC often overrides the audio session after connecting,
 * so we retry to ensure the speaker stays forced.
 */
export async function setSpeakerOn(enabled: boolean): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: !enabled,
      interruptionMode: "duckOthers",
      allowsRecording: true,
    });
  } catch (err) {
    console.warn("[audioRouting] setSpeakerOn failed:", err);
  }
}

/**
 * Aggressively force speaker on with retries.
 * WebRTC resets the audio session when tracks arrive,
 * so we re-apply speaker mode multiple times.
 * Returns a cleanup function to cancel pending retries.
 */
export function forceSpeakerWithRetries(): () => void {
  if (Platform.OS === "web") return () => {};

  const timers: Array<ReturnType<typeof setTimeout>> = [];

  // Immediate
  setSpeakerOn(true);

  // Retry at increasing intervals to override WebRTC audio session resets
  const delays = [300, 800, 1500, 3000];
  for (const delay of delays) {
    timers.push(setTimeout(() => setSpeakerOn(true), delay));
  }

  return () => {
    for (const t of timers) clearTimeout(t);
  };
}
