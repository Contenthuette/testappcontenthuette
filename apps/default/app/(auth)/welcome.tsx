import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, useWindowDimensions,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { SymbolView } from "@/components/Icon";
import { ZLogo } from "@/components/ZLogo";

const VIDEO_URL =
  "https://glad-canary-992.convex.cloud/api/storage/736a5b5b-c6d4-4adb-9080-180beb9a14e3";

const FEATURES = [
  {
    icon: "mappin.and.ellipse" as const,
    label: "Nur Leute\naus MV",
  },
  {
    icon: "hands.sparkles" as const,
    label: "Gemeinsam\nbewegen",
  },
  {
    icon: "sparkles" as const,
    label: "Exklusive\nEvents",
  },
  {
    icon: "person.2" as const,
    label: "Finde Leute\nwie dich",
  },
];

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const videoWidth = width - spacing.xl * 2;
  const videoHeight = videoWidth * (16 / 9);
  const featureSize = (width - spacing.xl * 2 - spacing.sm * 3) / 4;

  const [agbAccepted, setAgbAccepted] = useState(false);

  const player = useVideoPlayer(VIDEO_URL, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const handleJoin = useCallback(() => {
    router.navigate("/(auth)/signup");
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View style={styles.logoRow}>
          <ZLogo size={72} />
        </View>

        <Text style={styles.title}>We are Z</Text>
        <Text style={styles.subtitle}>{"Social Media. Nur für MV."}</Text>

        {/* Video */}
        <View style={[styles.videoWrap, { width: videoWidth, height: videoHeight }]}>
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            allowsPictureInPicture={false}
          />
        </View>

        {/* Compact Feature Chips */}
        <View style={styles.featureRow}>
          {FEATURES.map((feature, index) => (
            <View
              key={index}
              style={[styles.featureChip, { width: featureSize }]}
            >
              <View style={styles.chipIcon}>
                <SymbolView name={feature.icon} size={18} tintColor={colors.gray500} />
              </View>
              <Text style={styles.chipLabel}>{feature.label}</Text>
            </View>
          ))}
        </View>

        {/* Bottom Statement */}
        <View style={styles.bottomText}>
          <Text style={styles.statement}>{"Social Media ist\nnicht mehr social."}</Text>
          <Text style={styles.punchline}>{"Wir ändern das."}</Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <Button
          title="Join the Movement"
          onPress={handleJoin}
          disabled={!agbAccepted}
          fullWidth
        />

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
                router.navigate("/(main)/privacy-center" as "/");
              }}
            >
              AGB
            </Text>
            {" "}und{" "}
            <Text
              style={styles.agbLink}
              onPress={(e) => {
                e.stopPropagation();
                router.navigate("/(main)/privacy-center" as "/");
              }}
            >
              Datenschutzerklärung
            </Text>
            {" "}gelesen und akzeptiere diese.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.navigate("/(auth)/login")}
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
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: colors.black,
    letterSpacing: -1,
    lineHeight: 38,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.gray400,
    marginTop: spacing.xs,
    letterSpacing: -0.2,
    textAlign: "center",
  },

  /* Video */
  videoWrap: {
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: colors.gray100,
    alignSelf: "center",
  },

  /* Compact Feature Chips */
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  featureChip: {
    alignItems: "center",
    gap: spacing.xs,
  },
  chipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.gray500,
    lineHeight: 13,
    letterSpacing: -0.1,
    textAlign: "center",
  },

  /* Bottom */
  bottomText: {
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  statement: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.8,
    lineHeight: 28,
    textAlign: "center",
  },
  punchline: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.gray400,
    letterSpacing: -0.2,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  /* CTA */
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
