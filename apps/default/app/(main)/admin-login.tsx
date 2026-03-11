import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";

export default function AdminLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const verify = useMutation(api.admin.verifyAdminPassword);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Bitte alle Felder ausfüllen");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const ok = await verify({ email: email.trim(), password });
      if (ok) {
        router.replace("/(main)/admin" as "/");
      } else {
        setError("Ungültige Anmeldedaten");
      }
    } catch {
      setError("Fehler bei der Anmeldung");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.body}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>Z</Text>
          </View>
          <Text style={styles.title}>Admin-Bereich</Text>
          <Text style={styles.subtitle}>Zugang nur für autorisierte Personen</Text>

          {error ? (
            <View style={styles.errorBox}>
              <SymbolView name="exclamationmark.triangle" size={14} tintColor={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>E-Mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="admin@z-social.com"
              placeholderTextColor={colors.gray300}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Passwort</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
              placeholderTextColor={colors.gray300}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.loginBtnText}>Anmelden</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    marginTop: -60,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
    borderCurve: "continuous",
  },
  logoText: { fontSize: 28, fontWeight: "800", color: colors.white },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.black,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: "center",
    marginBottom: spacing.xxl,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.08)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  errorText: { fontSize: 14, color: colors.danger, flex: 1 },
  field: { marginBottom: spacing.lg },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray600,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.black,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  loginBtn: {
    backgroundColor: colors.black,
    borderRadius: radius.sm,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.md,
    borderCurve: "continuous",
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
});
