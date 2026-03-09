import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet, TextInputProps, TouchableOpacity } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: string;
  isPassword?: boolean;
}

export function Input({ label, error, icon, isPassword, style, ...props }: InputProps) {
  const [secure, setSecure] = useState(isPassword);
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {icon && (
          <SymbolView name={icon as any} size={18} tintColor={colors.gray400} style={styles.icon} />
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.gray400}
          secureTextEntry={secure}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setSecure(!secure)} style={styles.eyeBtn}>
            <SymbolView name={secure ? "eye.slash" : "eye"} size={18} tintColor={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  label: { fontSize: 14, fontWeight: "500", color: colors.gray700, marginBottom: spacing.xs },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  inputError: { borderColor: colors.danger },
  icon: { marginRight: spacing.sm },
  input: { flex: 1, fontSize: 16, color: colors.black, paddingVertical: spacing.md },
  eyeBtn: { padding: spacing.xs },
  error: { fontSize: 13, color: colors.danger, marginTop: spacing.xs },
});
