import { Platform } from "react-native";

// expo-audio requires native modules not available on web preview.
// Re-export safely so the app doesn't crash.
let _useAudioRecorder: unknown;
let _useAudioPlayer: unknown;
let _useAudioPlayerStatus: unknown;
let _requestRecordingPermissionsAsync: unknown;
let _RecordingPresets: unknown;

try {
  const mod = require("expo-audio");
  _useAudioRecorder = mod.useAudioRecorder;
  _useAudioPlayer = mod.useAudioPlayer;
  _useAudioPlayerStatus = mod.useAudioPlayerStatus;
  _requestRecordingPermissionsAsync = mod.requestRecordingPermissionsAsync;
  _RecordingPresets = mod.RecordingPresets;
} catch {
  // Provide no-op stubs for web
  _useAudioRecorder = () => ({
    record: () => {},
    stop: () => {},
    pause: () => {},
    uri: null,
    isRecording: false,
    currentTime: 0,
  });
  _useAudioPlayer = () => ({
    play: () => {},
    pause: () => {},
    seekTo: () => {},
    release: () => {},
  });
  _useAudioPlayerStatus = () => ({
    currentTime: 0,
    isPlaying: false,
    duration: 0,
  });
  _requestRecordingPermissionsAsync = async () => ({ granted: false });
  _RecordingPresets = { HIGH_QUALITY: {} };
}

export const useAudioRecorder = _useAudioRecorder as typeof import("expo-audio").useAudioRecorder;
export const useAudioPlayer = _useAudioPlayer as typeof import("expo-audio").useAudioPlayer;
export const useAudioPlayerStatus = _useAudioPlayerStatus as typeof import("expo-audio").useAudioPlayerStatus;
export const requestRecordingPermissionsAsync = _requestRecordingPermissionsAsync as typeof import("expo-audio").requestRecordingPermissionsAsync;
export const RecordingPresets = _RecordingPresets as typeof import("expo-audio").RecordingPresets;
