import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { ZLogo } from "@/components/ZLogo";

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <ZLogo size={80} />
          <Text style={styles.title}>Z</Text>
          <Text style={styles.subtitle}>Dein soziales Netzwerk{"\n"}für Mecklenburg-Vorpommern</Text>
        </View>

        <View style={styles.buttons}>
          <Button title="Anmelden" onPress={() => router.push("/(auth)/login")} fullWidth />
          <Button title="Konto erstellen" onPress={() => router.push("/(auth)/signup")} variant="secondary" fullWidth />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: "space-between",
    paddingBottom: spacing.xxxl,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  title: {
    fontSize: 64,
    fontWeight: "900",
    color: colors.black,
    letterSpacing: -2,
  },
  subtitle: {
    fontSize: 17,
    color: colors.gray500,
    textAlign: "center",
    lineHeight: 24,
  },
  buttons: {
    gap: spacing.md,
  },
});
