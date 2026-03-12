import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { SymbolView } from "@/components/Icon";
import { VoiceRecorder } from "@/components/VoiceRecorder";

interface ChatInputBarProps {
  onSend: (text: string) => void;
  onSendVoice?: (uri: string, durationMs: number) => void;
  onPlusPress?: () => void;
  placeholder?: string;
}

export function ChatInputBar({
  onSend,
  onSendVoice,
  onPlusPress,
  placeholder = "Nachricht...",
}: ChatInputBarProps) {
  const [text, setText] = useState("");
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleMicPress = () => {
    setShowVoiceRecorder(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleVoiceSend = (uri: string, durationMs: number) => {
    setShowVoiceRecorder(false);
    onSendVoice?.(uri, durationMs);
  };

  const handleVoiceCancel = () => {
    setShowVoiceRecorder(false);
  };

  if (showVoiceRecorder) {
    return (
      <View style={styles.wrapper}>
        <VoiceRecorder
          onSend={handleVoiceSend}
          onCancel={handleVoiceCancel}
        />
      </View>
    );
  }

  const hasText = text.trim().length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {/* Plus button */}
        <TouchableOpacity
          onPress={onPlusPress}
          style={styles.plusBtn}
          activeOpacity={0.7}
        >
          <SymbolView name="plus" size={20} tintColor="#8E8E93" />
        </TouchableOpacity>

        {/* Text input with inner background */}
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

        {/* Mic or Send button */}
        {hasText ? (
          <TouchableOpacity
            onPress={handleSend}
            style={styles.sendBtn}
            activeOpacity={0.7}
          >
            <SymbolView name="arrow.up" size={16} tintColor="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleMicPress}
            style={styles.micBtn}
            activeOpacity={0.7}
          >
            <SymbolView name="mic.fill" size={18} tintColor="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>
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
    height: 44,
    gap: 6,
    boxShadow: "0px 1px 8px rgba(0,0,0,0.08)",
  },
  plusBtn: {
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
    height: 36,
    justifyContent: "center",
  },
  input: {
    fontSize: 15,
    color: "#000000",
    height: 36,
    paddingVertical: 0,
    paddingHorizontal: 14,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
});
