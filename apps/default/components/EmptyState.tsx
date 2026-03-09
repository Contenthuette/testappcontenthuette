import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";
import { colors, spacing } from "@/lib/theme";

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <SymbolView name={icon as any} size={48} tintColor={colors.gray300} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxxl,
    paddingVertical: 80,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gray600,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray400,
    marginTop: spacing.sm,
    textAlign: "center",
    lineHeight: 20,
  },
});
