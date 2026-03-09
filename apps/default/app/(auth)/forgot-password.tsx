import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SymbolView } from "expo-symbols";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleReset = () => {
    if (!email.trim()) { setError("Bitte gib deine E-Mail ein"); return; }
    setError("");
    setSent(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>

        <Text style={styles.title}>Passwort zurücksetzen</Text>
        <Text style={styles.subtitle}>
          Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {sent ? (
          <View style={styles.successBox}>
            <SymbolView name="checkmark.circle.fill" size={40} tintColor={colors.success} />
            <Text style={styles.successTitle}>E-Mail gesendet</Text>
            <Text style={styles.successText}>
              Prüfe deinen Posteingang und folge dem Link zum Zurücksetzen deines Passworts.
            </Text>
            <Button title="Zurück zur Anmeldung" onPress={() => router.replace("/(auth)/login")} fullWidth style={{ marginTop: spacing.xl }} />
          </View>
        ) : (
          <>
            <Input label="E-Mail" placeholder="name@email.de" value={email}
              onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Button title="Link senden" onPress={handleReset} fullWidth style={{ marginTop: spacing.md }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: spacing.xxl, paddingBottom: 40 },
  backBtn: { marginTop: spacing.md, marginBottom: spacing.lg, width: 40, height: 40, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", color: colors.black, marginBottom: spacing.sm },
  subtitle: { fontSize: 16, color: colors.gray500, lineHeight: 22, marginBottom: spacing.xxl },
  error: { fontSize: 14, color: colors.danger, marginBottom: spacing.lg, padding: spacing.md, backgroundColor: "#FEF2F2", borderRadius: radius.sm, overflow: "hidden" },
  successBox: { alignItems: "center", paddingVertical: spacing.xxxl, gap: spacing.md },
  successTitle: { fontSize: 20, fontWeight: "700", color: colors.black },
  successText: { fontSize: 15, color: colors.gray500, textAlign: "center", lineHeight: 22 },
});
