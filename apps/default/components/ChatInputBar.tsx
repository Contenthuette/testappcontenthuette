import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { colors, spacing } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";

interface ChatInputBarProps {
  onSend: (text: string) => void;
  onPlusPress?: () => void;
  placeholder?: string;
}

export function ChatInputBar({
  onSend,
  onPlusPress,
  placeholder = "Nachricht...",
}: ChatInputBarProps) {
  const [text, setText] = useState("");

  const hasText = text.trim().length > 0;

  const handleSend = () => {
    if (!hasText) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <View style={styles.outerWrap}>
      <View style={styles.bar}>
        {/* Plus button */}
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={onPlusPress}
          activeOpacity={0.6}
          hitSlop={6}
        >
          <SymbolView name="plus" size={20} tintColor={colors.gray500} />
        </TouchableOpacity>

        {/* Input field */}
        <View style={styles.inputWrap}>
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
        </View>

        {/* Mic or Send */}
        {hasText ? (
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSend}
            activeOpacity={0.7}
            hitSlop={6}
          >
            <SymbolView name="arrow.up" size={16} tintColor={colors.white} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.circleBtn}
            activeOpacity={0.6}
            hitSlop={6}
          >
            <SymbolView name="mic" size={20} tintColor={colors.gray500} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? spacing.sm : spacing.md,
  },
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.gray200,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.06)",
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: 19,
    paddingHorizontal: spacing.md,
    minHeight: 38,
    maxHeight: 120,
    justifyContent: "center",
  },
  input: {
    fontSize: 16,
    color: colors.black,
    lineHeight: 22,
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
