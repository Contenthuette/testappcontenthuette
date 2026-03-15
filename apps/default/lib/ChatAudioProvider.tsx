import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";

interface ChatAudioState {
  /** Currently playing/loaded audio URL */
  currentUrl: string | null;
  isPlaying: boolean;
  isLoaded: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  /** Call to play/pause a specific audio URL */
  toggle: (url: string) => void;
}

const ChatAudioContext = createContext<ChatAudioState>({
  currentUrl: null,
  isPlaying: false,
  isLoaded: false,
  isLoading: false,
  currentTime: 0,
  duration: 0,
  toggle: () => {},
});

export function useChatAudio() {
  return useContext(ChatAudioContext);
}

export function ChatAudioProvider({ children }: { children: React.ReactNode }) {
  // Single audio player for the entire chat
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const currentUrlRef = useRef<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-play once loaded after replace()
  useEffect(() => {
    if (isLoading && status.isLoaded) {
      setIsLoading(false);
      try {
        player.play();
      } catch (e) {
        console.error("ChatAudio auto-play error:", e);
      }
    }
  }, [isLoading, status.isLoaded, player]);

  // Reset when playback finishes
  useEffect(() => {
    if (status.didJustFinish) {
      try {
        player.seekTo(0);
      } catch { /* ignore */ }
    }
  }, [status.didJustFinish, player]);

  const toggle = useCallback(async (url: string) => {
    if (!url) return;

    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    } catch { /* best effort */ }

    try {
      if (currentUrlRef.current === url && status.isLoaded) {
        // Same audio – toggle play/pause
        if (status.playing) {
          player.pause();
        } else {
          player.play();
        }
      } else {
        // Different audio – load new source
        if (status.playing) {
          player.pause();
        }
        currentUrlRef.current = url;
        setCurrentUrl(url);
        setIsLoading(true);
        player.replace(url);
      }
    } catch (e) {
      console.error("ChatAudio toggle error:", e);
      setIsLoading(false);
    }
  }, [player, status.playing, status.isLoaded]);

  const value: ChatAudioState = {
    currentUrl,
    isPlaying: status.playing,
    isLoaded: status.isLoaded,
    isLoading,
    currentTime: status.currentTime,
    duration: status.duration,
    toggle,
  };

  return (
    <ChatAudioContext.Provider value={value}>
      {children}
    </ChatAudioContext.Provider>
  );
}
