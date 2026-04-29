import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth-client";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SymbolView } from "@/components/Icon";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleChangePassword() {
    const trimmedCurrentPassword = currentPassword.trim();

    if (!trimmedCurrentPassword) {
      setError("Bitte gib dein aktuelles Passwort ein.");
      setSuccessMessage("");
      return;
    }

    if (newPassword.length < 8) {
      setError("Das neue Passwort muss mindestens 8 Zeichen lang sein.");
      setSuccessMessage("");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Die neuen Passwörter stimmen nicht überein.");
      setSuccessMessage("");
      return;
    }

    if (trimmedCurrentPassword === newPassword) {
      setError("Bitte wähle ein neues Passwort, das sich vom bisherigen unterscheidet.");
      setSuccessMessage("");
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const { error: authError } = await authClient.changePassword({
        currentPassword: trimmedCurrentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (authError) {
        const message = authError.message ?? authError.code ?? "";
        if (
          message.includes("Invalid password") ||
          message.includes("invalid password") ||
          message.includes("credentials") ||
          message.includes("password")
        ) {
          setError("Dein aktuelles Passwort ist nicht korrekt.");
        } else {
          setError(message || "Das Passwort konnte nicht geändert werden. Bitte versuche es erneut.");
        }
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("Dein neues Passwort ist jetzt gespeichert und gilt ab sofort.");
    } catch (changePasswordError: unknown) {
      const message = changePasswordError instanceof Error
        ? changePasswordError.message
        : "Das Passwort konnte nicht geändert werden. Bitte versuche es erneut.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("change-password")} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Passwort ändern</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <SymbolView name="key.fill" size={18} tintColor={colors.black} />
          </View>
          <Text style={styles.heroTitle}>Neues Passwort festlegen</Text>
          <Text style={styles.heroText}>
            Sobald du speicherst, wird dein neues Passwort sofort für dein Konto übernommen.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

        <View style={styles.formCard}>
          <Input
            label="Aktuelles Passwort"
            placeholder="Dein bisheriges Passwort"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            isPassword
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSaving}
            textContentType="password"
          />
          <Input
            label="Neues Passwort"
            placeholder="Mindestens 8 Zeichen"
            value={newPassword}
            onChangeText={setNewPassword}
            isPassword
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSaving}
            textContentType="newPassword"
          />
          <Input
            label="Neues Passwort bestätigen"
            placeholder="Neues Passwort wiederholen"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isPassword
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSaving}
            textContentType="newPassword"
          />

          <Button
            title={isSaving ? "Wird gespeichert..." : "Passwort speichern"}
            onPress={handleChangePassword}
            loading={isSaving}
            disabled={isSaving}
            fullWidth
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.gray50,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.black,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.black,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.gray500,
  },
  error: {
    fontSize: 14,
    color: colors.danger,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.md,
    padding: spacing.md,
    overflow: "hidden",
  },
  success: {
    fontSize: 14,
    color: "#166534",
    backgroundColor: "#F0FDF4",
    borderRadius: radius.md,
    padding: spacing.md,
    overflow: "hidden",
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
});
