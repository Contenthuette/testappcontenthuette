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
      <View style={styles.iconWrap}>
        <SymbolView name={icon as Parameters<typeof SymbolView>[0]["name"]} size={32} tintColor={colors.gray300} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
    paddingVertical: 100,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.gray700,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: colors.gray400,
    marginTop: spacing.sm,
    textAlign: "center",
    lineHeight: 22,
  },
});
