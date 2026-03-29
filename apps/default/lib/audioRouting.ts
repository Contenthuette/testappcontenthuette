import { Platform } from "react-native";
import { setAudioModeAsync } from "expo-audio";

/**
 * Force audio to play through the loudspeaker (not earpiece).
 * Used for livestreams (always on) and calls (toggle).
 */
export async function setSpeakerOn(enabled: boolean): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: !enabled,
      interruptionMode: "doNotMix",
      allowsRecording: true,
    });
  } catch (err) {
    console.warn("[audioRouting] setSpeakerOn failed:", err);
  }
}
