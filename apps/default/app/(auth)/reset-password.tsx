import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SymbolView } from "@/components/Icon";
import { authClient } from "@/lib/auth-client";

export default function ResetPasswordScreen() {
  const { token, error: urlError } = useLocalSearchParams<{ token?: string; error?: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (urlError === "INVALID_TOKEN" || urlError === "invalid_token") {
      setError("Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen an.");
    }
  }, [urlError]);

  const handleReset = async () => {
    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    if (!token) {
      setError("Kein gültiger Token. Bitte fordere einen neuen Link an.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error: authError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (authError) {
        setError(authError.message || "Fehler beim Zurücksetzen. Versuche es erneut.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Etwas ist schiefgelaufen. Versuche es erneut.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>

        <Text style={styles.title}>Neues Passwort</Text>
        <Text style={styles.subtitle}>
          Lege ein neues Passwort für dein Z-Konto fest.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {success ? (
          <View style={styles.successBox}>
            <SymbolView name="checkmark.circle.fill" size={40} tintColor={colors.success} />
            <Text style={styles.successTitle}>Passwort geändert</Text>
            <Text style={styles.successText}>
              Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich jetzt anmelden.
            </Text>
            <Button
              title="Zur Anmeldung"
              onPress={() => router.replace("/(auth)/login")}
              fullWidth
              style={{ marginTop: spacing.xl }}
            />
          </View>
        ) : (
          <>
            <Input
              label="Neues Passwort"
              placeholder="Mindestens 8 Zeichen"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <View style={{ height: spacing.md }} />
            <Input
              label="Passwort bestätigen"
              placeholder="Passwort wiederholen"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <Button
              title={loading ? "Wird gespeichert..." : "Passwort speichern"}
              onPress={handleReset}
              fullWidth
              disabled={loading || !token}
              style={{ marginTop: spacing.lg }}
            />
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
