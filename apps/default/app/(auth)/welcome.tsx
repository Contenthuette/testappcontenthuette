import React from "react";
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { SymbolView } from "@/components/Icon";

const FEATURES = [
  {
    icon: "mappin.and.ellipse" as const,
    label: "Nur Leute aus\ndeiner Gegend",
  },
  {
    icon: "lock.shield" as const,
    label: "Private\nCommunity",
  },
  {
    icon: "sparkles" as const,
    label: "Exklusive Events\nin MV",
  },
  {
    icon: "person.2" as const,
    label: "Finde Leute\nwie dich",
  },
];

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const cardSize = (width - spacing.xl * 2 - spacing.md) / 2;
  const cardHeight = cardSize * 0.8;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logo}>Z</Text>
        </View>

        {/* Hero text */}
        <Text style={styles.title}>Members Only</Text>
        <Text style={styles.subtitle}>Social Media. Nur für MV.</Text>

        {/* Feature grid */}
        <View style={styles.grid}>
          {FEATURES.map((feature, index) => (
            <View
              key={index}
              style={[styles.card, { width: cardSize, height: cardHeight }]}
            >
              <View style={styles.cardIconWrap}>
                <SymbolView name={feature.icon} size={26} tintColor={colors.gray600} />
              </View>
              <Text style={styles.cardLabel}>{feature.label}</Text>
            </View>
          ))}
        </View>

        {/* Bottom text */}
        <View style={styles.bottomText}>
          <Text style={styles.statement}>Social Media ist{"\n"}nicht mehr social.</Text>
          <Text style={styles.punchline}>Wir ändern das.</Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <Button
          title="Join the Movement"
          onPress={() => router.push("/(auth)/login")}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 100,
  },
  logoRow: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logo: {
    fontSize: 42,
    fontWeight: "900",
    color: colors.black,
    letterSpacing: -1.5,
  },
  title: {
    fontSize: 38,
    fontWeight: "900",
    color: colors.black,
    letterSpacing: -1,
    lineHeight: 42,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 17,
    fontWeight: "500",
    color: colors.gray400,
    marginTop: spacing.sm,
    letterSpacing: -0.2,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.black,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  bottomText: {
    marginTop: spacing.xxl + spacing.md,
    gap: spacing.xs,
  },
  statement: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.8,
    lineHeight: 32,
    textAlign: "center",
  },
  punchline: {
    fontSize: 17,
    fontWeight: "500",
    color: colors.gray400,
    letterSpacing: -0.2,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  ctaWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
  },
});
