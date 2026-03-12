import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius } from "@/lib/theme";
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
          <SymbolView name="plus" size={18} tintColor={colors.gray500} />
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />

        {/* Mic or Send button */}
        {hasText ? (
          <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.7}>
            <SymbolView name="arrow.up" size={16} tintColor={colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleMicPress} style={styles.micBtn} activeOpacity={0.7}>
            <SymbolView name="mic.fill" size={16} tintColor={colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.gray100,
    borderRadius: 26,
    paddingLeft: 5,
    paddingRight: 5,
    paddingVertical: 5,
    minHeight: 48,
    gap: 6,
  },
  plusBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.black,
    maxHeight: 100,
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
    paddingHorizontal: 4,
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
});
