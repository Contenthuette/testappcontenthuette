import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { SymbolView } from "expo-symbols";

export default function CreateScreen() {
  const options = [
    { icon: "camera", label: "Foto posten", desc: "Teile ein Foto mit der Community", action: () => router.push("/(main)/create-post") },
    { icon: "video", label: "Video posten", desc: "Lade ein Video hoch", action: () => router.push("/(main)/create-post") },
    { icon: "person.3", label: "Gruppe erstellen", desc: "Starte eine neue Gruppe", action: () => router.push("/(main)/create-group") },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>Erstellen</Text>
      <View style={styles.options}>
        {options.map((opt, i) => (
          <TouchableOpacity key={i} style={styles.optionCard} onPress={opt.action} activeOpacity={0.7}>
            <View style={styles.optionIcon}>
              <SymbolView name={opt.icon as any} size={24} tintColor={colors.black} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionLabel}>{opt.label}</Text>
              <Text style={styles.optionDesc}>{opt.desc}</Text>
            </View>
            <SymbolView name="chevron.right" size={16} tintColor={colors.gray400} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  title: { fontSize: 28, fontWeight: "700", color: colors.black, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  options: { paddingHorizontal: spacing.xl, gap: spacing.md },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray100,
    gap: spacing.lg,
    borderCurve: "continuous",
    ...shadows.sm,
  },
  optionIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  optionLabel: { fontSize: 16, fontWeight: "600", color: colors.black },
  optionDesc: { fontSize: 13, color: colors.gray500, marginTop: 2 },
});
