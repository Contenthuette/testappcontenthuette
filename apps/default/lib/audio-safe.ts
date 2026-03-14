/* Safe re-export of expo-audio with web fallback stubs */

let _useAudioRecorder: unknown;
let _useAudioPlayer: unknown;
let _useAudioPlayerStatus: unknown;
let _useAudioRecorderState: unknown;
let _requestRecordingPermissionsAsync: unknown;
let _RecordingPresets: unknown;
let _AudioModule: unknown;
let _setAudioModeAsync: unknown;

try {
  const mod = require("expo-audio");
  _useAudioRecorder = mod.useAudioRecorder;
  _useAudioPlayer = mod.useAudioPlayer;
  _useAudioPlayerStatus = mod.useAudioPlayerStatus;
  _useAudioRecorderState = mod.useAudioRecorderState;
  _requestRecordingPermissionsAsync = mod.requestRecordingPermissionsAsync;
  _RecordingPresets = mod.RecordingPresets;
  _AudioModule = mod.AudioModule;
  _setAudioModeAsync = mod.setAudioModeAsync;
} catch {
  // Provide no-op stubs for web
  _useAudioRecorder = () => ({
    record: () => {},
    stop: async () => {},
    pause: () => {},
    prepareToRecordAsync: async () => {},
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
    playing: false,
    duration: 0,
  });
  _useAudioRecorderState = () => ({
    isRecording: false,
    durationMillis: 0,
  });
  _requestRecordingPermissionsAsync = async () => ({ granted: false });
  _RecordingPresets = { HIGH_QUALITY: {} };
  _AudioModule = {
    requestRecordingPermissionsAsync: async () => ({ granted: false }),
  };
  _setAudioModeAsync = async () => {};
}

export const useAudioRecorder = _useAudioRecorder as typeof import("expo-audio").useAudioRecorder;
export const useAudioPlayer = _useAudioPlayer as typeof import("expo-audio").useAudioPlayer;
export const useAudioPlayerStatus = _useAudioPlayerStatus as typeof import("expo-audio").useAudioPlayerStatus;
export const useAudioRecorderState = _useAudioRecorderState as typeof import("expo-audio").useAudioRecorderState;
export const requestRecordingPermissionsAsync = _requestRecordingPermissionsAsync as typeof import("expo-audio").requestRecordingPermissionsAsync;
export const RecordingPresets = _RecordingPresets as typeof import("expo-audio").RecordingPresets;
export const AudioModule = _AudioModule as typeof import("expo-audio").AudioModule;
export const setAudioModeAsync = _setAudioModeAsync as typeof import("expo-audio").setAudioModeAsync;
