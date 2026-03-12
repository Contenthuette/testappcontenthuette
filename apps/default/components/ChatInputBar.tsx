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
  placeholder?: string;
}

export function ChatInputBar({
  onSend,
  onSendVoice,
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
      <VoiceRecorder
        onSend={handleVoiceSend}
        onCancel={handleVoiceCancel}
      />
    );
  }

  const hasText = text.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
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

        {hasText ? (
          <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
            <SymbolView name="arrow.up" size={18} tintColor={colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleMicPress} style={styles.micBtn}>
            <SymbolView name="mic" size={20} tintColor={colors.gray500} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.gray100,
    borderRadius: radius.xl,
    paddingLeft: spacing.md,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.black,
    maxHeight: 100,
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
