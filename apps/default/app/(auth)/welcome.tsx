import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, useWindowDimensions,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { SymbolView } from "@/components/Icon";
import { ZLogo } from "@/components/ZLogo";

const FEATURES = [
  {
    icon: "mappin.and.ellipse" as const,
    label: "Nur Leute aus\ndeiner Gegend",
  },
  {
    icon: "hands.sparkles" as const,
    label: "Wir bewegen etwas,\ngemeinsam.",
  },
  {
    icon: "sparkles" as const,
    label: "Exklusive Events\nnur für Z Member",
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

  const [agbAccepted, setAgbAccepted] = useState(false);

  const handleJoin = useCallback(() => {
    router.push("/(auth)/signup");
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.logoRow}>
          <ZLogo size={96} />
        </View>

        <Text style={styles.title}>We are Z</Text>
        <Text style={styles.subtitle}>{"Social Media. Nur für MV."}</Text>

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

        <View style={styles.bottomText}>
          <Text style={styles.statement}>{"Social Media ist\nnicht mehr social."}</Text>
          <Text style={styles.punchline}>{"Wir ändern das."}</Text>
        </View>
      </ScrollView>

      <View style={styles.ctaWrap}>
        <Button
          title="Join the Movement"
          onPress={handleJoin}
          disabled={!agbAccepted}
          fullWidth
        />

        {/* AGB Checkbox — below button */}
        <TouchableOpacity
          style={styles.agbRow}
          onPress={() => setAgbAccepted(!agbAccepted)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agbAccepted && styles.checkboxChecked]}>
            {agbAccepted && (
              <SymbolView name="checkmark" size={10} tintColor={colors.white} />
            )}
          </View>
          <Text style={styles.agbText}>
            Ich habe die{" "}
            <Text
              style={styles.agbLink}
              onPress={(e) => {
                e.stopPropagation();
                router.push("/(main)/privacy-center");
              }}
            >
              AGB
            </Text>
            {" "}und{" "}
            <Text
              style={styles.agbLink}
              onPress={(e) => {
                e.stopPropagation();
                router.push("/(main)/privacy-center");
              }}
            >
              Datenschutzerklärung
            </Text>
            {" "}gelesen und akzeptiere diese.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          style={styles.loginLink}
        >
          <Text style={styles.loginText}>
            {"Bereits Mitglied? "}<Text style={styles.loginBold}>Anmelden</Text>
          </Text>
        </TouchableOpacity>
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
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },
  logoRow: {
    alignItems: "center",
    marginBottom: spacing.md,
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
    gap: spacing.md,
  },
  loginLink: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  loginText: {
    fontSize: 15,
    color: colors.gray500,
  },
  loginBold: {
    fontWeight: "600",
    color: colors.black,
  },
  agbRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    borderCurve: "continuous",
  },
  checkboxChecked: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  agbText: {
    flex: 1,
    fontSize: 11,
    color: colors.gray400,
    lineHeight: 16,
  },
  agbLink: {
    color: colors.gray600,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
