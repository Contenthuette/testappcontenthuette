import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import * as Haptics from "expo-haptics";

const createOptions = [
  {
    icon: "photo" as const,
    label: "Foto posten",
    desc: "Teile einen Moment mit der Z Community",
    route: "/(main)/create-post?type=photo" as const,
  },
  {
    icon: "video" as const,
    label: "Video posten",
    desc: "Lade ein Video hoch und teile es",
    route: "/(main)/create-post?type=video" as const,
  },
  {
    icon: "chart.bar.fill" as const,
    label: "Umfrage erstellen",
    desc: "Erstelle eine Z Umfrage",
    route: "/(main)/create-poll" as const,
  },
  {
    icon: "video.badge.waveform" as const,
    label: "Live gehen",
    desc: "Starte einen Z Livestream",
    route: "/(main)/go-live" as const,
  },
  {
    icon: "person.3.fill" as const,
    label: "Gruppe erstellen",
    desc: "Starte deine eigene Z Gruppe",
    route: "/(main)/create-group" as const,
  },
  {
    icon: "calendar.badge.plus" as const,
    label: "Member Event erstellen",
    desc: "Starte dein eigenes Z Member Event!",
    route: "/(main)/create-member-event" as const,
  },
];

export default function CreateScreen() {
  const handlePress = (route: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.navigate(route as "/");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>Erstellen</Text>
      <Text style={styles.subtitle}>Was möchtest du teilen?</Text>

      <View style={styles.options}>
        {createOptions.map((opt, i) => (
          <TouchableOpacity
            key={i}
            style={styles.card}
            onPress={() => handlePress(opt.route)}
            activeOpacity={0.65}
          >
            <View style={styles.iconWrap}>
              <SymbolView name={opt.icon} size={22} tintColor={colors.black} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardLabel}>{opt.label}</Text>
              <Text style={styles.cardDesc}>{opt.desc}</Text>
            </View>
            <SymbolView name="chevron.right" size={14} tintColor={colors.gray300} />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.5,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  subtitle: {
    fontSize: 16,
    color: colors.gray400,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    letterSpacing: -0.2,
  },
  options: { paddingHorizontal: spacing.xl, gap: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    gap: spacing.lg,
    borderCurve: "continuous",
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 16, fontWeight: "600", color: colors.black, letterSpacing: -0.2 },
  cardDesc: { fontSize: 13, color: colors.gray500, marginTop: 2, letterSpacing: -0.1 },
});
