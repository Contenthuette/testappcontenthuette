declare module "expo-video" {
  export function useVideoPlayer(
    source: string | null,
    setup?: (player: VideoPlayer) => void
  ): VideoPlayer;

  export interface VideoPlayer {
    loop: boolean;
    muted: boolean;
    play(): void;
    pause(): void;
    release(): void;
  }

  export interface VideoViewProps {
    player: VideoPlayer;
    style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
    contentFit?: "contain" | "cover" | "fill";
    nativeControls?: boolean;
    allowsFullscreen?: boolean;
    allowsPictureInPicture?: boolean;
  }

  export const VideoView: import("react").ComponentType<VideoViewProps>;
}
