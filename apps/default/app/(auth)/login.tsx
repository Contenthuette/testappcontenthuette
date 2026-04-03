import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ZLogo } from "@/components/ZLogo";
import { SymbolView } from "@/components/Icon";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function LoginScreen() {
  const { isAuthenticated } = useConvexAuth();
  const params = useLocalSearchParams<{ sessionToken?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [awaitingAuth, setAwaitingAuth] = useState(false);
  const claimSubscription = useMutation(api.stripeHelpers.claimSubscription);
  const claimAttempted = React.useRef(false);

  // Navigate once Convex confirms authentication
  useEffect(() => {
    if (!awaitingAuth || !isAuthenticated) return;
    if (claimAttempted.current) return;
    claimAttempted.current = true;

    const token = params.sessionToken;
    if (token) {
      const attemptClaim = async (retries: number): Promise<void> => {
        try {
          const result = await claimSubscription({ sessionToken: token });
          if (result === "no_user" && retries > 0) {
            await new Promise((r) => setTimeout(r, 1500));
            return attemptClaim(retries - 1);
          }
        } catch {
          if (retries > 0) {
            await new Promise((r) => setTimeout(r, 1500));
            return attemptClaim(retries - 1);
          }
        }
        router.replace("/");
      };
      attemptClaim(3);
    } else {
      router.replace("/");
    }
  }, [awaitingAuth, isAuthenticated, params.sessionToken, claimSubscription]);

  // Timeout fallback — if Convex doesn't confirm within 15s, let the user retry
  useEffect(() => {
    if (!awaitingAuth) return;
    const timer = setTimeout(() => {
      // If we're already authenticated by now, just navigate
      if (isAuthenticated) {
        router.replace("/");
        return;
      }
      setAwaitingAuth(false);
      setLoading(false);
      setError("Anmeldung dauert zu lange. Bitte versuche es erneut.");
    }, 15000);
    return () => clearTimeout(timer);
  }, [awaitingAuth, isAuthenticated]);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Bitte E-Mail und Passwort eingeben");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        const msg = result.error.message ?? result.error.code ?? "";
        if (msg.includes("not found") || msg.includes("Invalid") || msg.includes("invalid")) {
          setError("Kein Konto mit dieser E-Mail gefunden. Bitte registriere dich zuerst.");
        } else {
          setError(msg || "Anmeldung fehlgeschlagen. Bitte versuche es erneut.");
        }
        setLoading(false);
      } else {
        // Force session refresh so the auth provider picks up the new session immediately
        try {
          await authClient.getSession();
        } catch {
          // Ignore — the session may still propagate reactively
        }
        // Don't navigate yet — wait for Convex to confirm auth state
        setAwaitingAuth(true);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Anmeldung fehlgeschlagen. Bitte versuche es erneut.");
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => safeBack("login")} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>

        <View style={styles.header}>
          <ZLogo size={40} />
          <Text style={styles.title}>Willkommen zurück</Text>
          <Text style={styles.subtitle}>Melde dich in deinem Konto an</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Input label="E-Mail" placeholder="name@email.de" value={email}
          onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Passwort" placeholder="••••••••" value={password}
          onChangeText={setPassword} isPassword />

        <TouchableOpacity onPress={() => router.navigate("/(auth)/forgot-password")}>
          <Text style={styles.forgotText}>Passwort vergessen?</Text>
        </TouchableOpacity>

        <Button title="Anmelden" onPress={handleEmailLogin} loading={loading} fullWidth style={{ marginTop: spacing.xl }} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Noch kein Konto? </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/signup")}>
            <Text style={styles.footerLink}>Registrieren</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: spacing.xxl, paddingBottom: 40 },
  backBtn: { marginTop: spacing.md, marginBottom: spacing.lg, width: 40, height: 40, justifyContent: "center" },
  header: { gap: spacing.sm, marginBottom: spacing.xxl },
  title: { fontSize: 28, fontWeight: "700", color: colors.black },
  subtitle: { fontSize: 16, color: colors.gray500 },
  error: { fontSize: 14, color: colors.danger, marginBottom: spacing.lg, padding: spacing.md, backgroundColor: "#FEF2F2", borderRadius: radius.sm, overflow: "hidden" },
  forgotText: { fontSize: 14, color: colors.gray600, fontWeight: "500", textAlign: "right", marginTop: -spacing.sm },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xxl },
  footerText: { fontSize: 15, color: colors.gray500 },
  footerLink: { fontSize: 15, fontWeight: "600", color: colors.black },
});
