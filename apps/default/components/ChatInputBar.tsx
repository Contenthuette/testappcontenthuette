import React, { useState, Component, type ReactNode } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "@/components/Icon";
import { useSound } from "@/lib/sounds";
import { VoiceRecorder } from "@/components/VoiceRecorder";

// Error boundary to catch native module crashes
interface ErrorBoundaryState {
  hasError: boolean;
}

class VoiceRecorderErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("VoiceRecorder crashed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.errorBar}>
          <Pressable
            onPress={() => {
              this.setState({ hasError: false });
              this.props.onReset();
            }}
            style={ebStyles.closeBtn}
          >
            <SymbolView name="xmark" size={14} tintColor="#9CA3AF" />
          </Pressable>
          <Text style={ebStyles.errorText}>
            Sprachaufnahme nicht verfügbar
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  errorBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 14,
    gap: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});

export interface MediaPickResult {
  uri: string;
  type: "image" | "video";
  mimeType: string;
}

interface ChatInputBarProps {
  onSend: (text: string) => void;
  onSendVoice?: (uri: string, durationMs: number) => void;
  onSendMedia?: (media: MediaPickResult) => void;
  onPlusPress?: () => void;
  placeholder?: string;
}

export function ChatInputBar({
  onSend,
  onSendVoice,
  onSendMedia,
  onPlusPress,
  placeholder = "Nachricht...",
}: ChatInputBarProps) {
  const [text, setText] = useState("");
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isPickingMedia, setIsPickingMedia] = useState(false);
  const { playSound } = useSound();

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    playSound("send");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleMicPress = () => {
    setShowVoiceRecorder(true);
    playSound("tap");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleGalleryPress = async () => {
    if (isPickingMedia || !onSendMedia) return;
    playSound("tap");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsPickingMedia(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const isVideo = asset.mimeType?.startsWith("video") ?? false;
        onSendMedia({
          uri: asset.uri,
          type: isVideo ? "video" : "image",
          mimeType: asset.mimeType ?? (isVideo ? "video/mp4" : "image/jpeg"),
        });
      }
    } catch (err) {
      console.error("Media picker error:", err);
    } finally {
      setIsPickingMedia(false);
    }
  };

  const handleVoiceSend = (uri: string, durationMs: number) => {
    setShowVoiceRecorder(false);
    onSendVoice?.(uri, durationMs);
  };

  const handleVoiceCancel = () => {
    setShowVoiceRecorder(false);
  };

  const hasText = text.trim().length > 0;

  return (
    <View style={styles.wrapper}>
      {showVoiceRecorder ? (
        <VoiceRecorderErrorBoundary onReset={handleVoiceCancel}>
          <VoiceRecorder
            onSend={handleVoiceSend}
            onCancel={handleVoiceCancel}
          />
        </VoiceRecorderErrorBoundary>
      ) : (
        <View style={styles.bar}>
          {/* Gallery button */}
          {onSendMedia && (
            <Pressable
              onPress={handleGalleryPress}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.btnPressed,
              ]}
              hitSlop={6}
              disabled={isPickingMedia}
            >
              {isPickingMedia ? (
                <ActivityIndicator size="small" color="#8E8E93" />
              ) : (
                <SymbolView name="photo.on.rectangle" size={19} tintColor="#8E8E93" />
              )}
            </Pressable>
          )}

          {/* Plus button */}
          {onPlusPress && (
            <Pressable
              onPress={onPlusPress}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.btnPressed,
              ]}
              hitSlop={6}
            >
              <SymbolView name="plus" size={20} tintColor="#8E8E93" />
            </Pressable>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#C7C7CC"
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
              returnKeyType="default"
            />
          </View>

          {hasText ? (
            <Pressable
              onPress={handleSend}
              style={({ pressed }) => [
                styles.sendBtn,
                pressed && styles.btnPressed,
              ]}
              hitSlop={6}
            >
              <SymbolView name="arrow.up" size={16} tintColor="#FFF" />
            </Pressable>
          ) : (
            onSendVoice && (
              <Pressable
                onPress={handleMicPress}
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && styles.btnPressed,
                ]}
                hitSlop={6}
              >
                <SymbolView name="mic.fill" size={18} tintColor="#8E8E93" />
              </Pressable>
            )
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 48,
    gap: 4,
    boxShadow: "0px 1px 8px rgba(0,0,0,0.08)",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  inputContainer: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 18,
    minHeight: 36,
    justifyContent: "center",
  },
  input: {
    fontSize: 15,
    color: "#000000",
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
