import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useSound } from "@/lib/sounds";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title, onPress, variant = "primary", size = "md",
  loading = false, disabled = false, fullWidth = false, style, textStyle,
}: ButtonProps) {
  const { playSound } = useSound();
  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playSound("tap");
    onPress();
  };
  return (
    <TouchableOpacity
      style={[
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.black} size="small" />
      ) : (
        <Text style={[styles.text, variantTextStyles[variant], sizeTextStyles[size], textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.4 },
  text: { fontWeight: "600" },
});

const sizeStyles: Record<string, ViewStyle> = {
  sm: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 36 },
  md: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, minHeight: 48 },
  lg: { paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg, minHeight: 56 },
};

const variantStyles: Record<string, ViewStyle> = {
  primary: { backgroundColor: colors.black },
  secondary: { backgroundColor: colors.gray100 },
  outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.gray300 },
  ghost: { backgroundColor: "transparent" },
  danger: { backgroundColor: colors.danger },
};

const variantTextStyles: Record<string, TextStyle> = {
  primary: { color: colors.white },
  secondary: { color: colors.black },
  outline: { color: colors.black },
  ghost: { color: colors.black },
  danger: { color: colors.white },
};

const sizeTextStyles: Record<string, TextStyle> = {
  sm: { fontSize: 14 },
  md: { fontSize: 16 },
  lg: { fontSize: 17 },
};
