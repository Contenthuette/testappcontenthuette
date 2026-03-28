import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from "react-native";
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

export default function SignupScreen() {
  const { isAuthenticated } = useConvexAuth();
  const params = useLocalSearchParams<{ sessionToken?: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [awaitingAuth, setAwaitingAuth] = useState(false);
  const claimSubscription = useMutation(api.stripeHelpers.claimSubscription);
  const claimAttempted = useRef(false);

  // Once Convex confirms auth, claim the subscription if we have a token
  useEffect(() => {
    if (!awaitingAuth || !isAuthenticated) return;
    if (claimAttempted.current) return;
    claimAttempted.current = true;

    const token = params.sessionToken;
    if (token) {
      // Retry claiming a few times since user record may still be creating
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

  // Timeout fallback
  useEffect(() => {
    if (!awaitingAuth) return;
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace("/");
        return;
      }
      setAwaitingAuth(false);
      setLoading(false);
      claimAttempted.current = false;
      setError("Registrierung dauert zu lange. Bitte versuche es erneut.");
    }, 15000);
    return () => clearTimeout(timer);
  }, [awaitingAuth, isAuthenticated]);

  const handleSignup = async () => {
    if (!name.trim()) { setError("Bitte gib deinen Namen ein"); return; }
    if (!email.trim()) { setError("Bitte gib deine E-Mail ein"); return; }
    if (password.length < 8) { setError("Passwort muss mindestens 8 Zeichen lang sein"); return; }
    setLoading(true);
    setError("");
    try {
      const result = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name.trim(),
      });
      if (result.error) {
        const msg = result.error.message ?? result.error.code ?? "";
        if (msg.includes("already") || msg.includes("exists")) {
          setError("Ein Konto mit dieser E-Mail existiert bereits. Bitte melde dich an.");
        } else {
          setError(msg || "Registrierung fehlgeschlagen. Bitte versuche es erneut.");
        }
        setLoading(false);
      } else {
        try { await authClient.getSession(); } catch { /* ignore */ }
        setAwaitingAuth(true);
      }
    } catch (signupError: unknown) {
      const msg = signupError instanceof Error ? signupError.message : String(signupError);
      setError(msg || "Registrierung fehlgeschlagen. Bitte versuche es erneut.");
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await authClient.signIn.social({ provider: "google" });
      // OAuth flow will redirect; once auth is confirmed, the effect above handles claiming
      setAwaitingAuth(true);
    } catch {
      setError("Google-Registrierung fehlgeschlagen");
    }
  };

  const handleAppleSignup = async () => {
    try {
      await authClient.signIn.social({ provider: "apple" });
      setAwaitingAuth(true);
    } catch {
      setError("Apple-Registrierung fehlgeschlagen");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => safeBack("signup")} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>

        <View style={styles.header}>
          <ZLogo size={40} />
          <Text style={styles.title}>Konto erstellen</Text>
          <Text style={styles.subtitle}>Werde Teil der Z Community in MV</Text>
          {params.sessionToken && (
            <View style={styles.paidBadge}>
              <SymbolView name="checkmark.seal.fill" size={16} tintColor={colors.black} />
              <Text style={styles.paidBadgeText}>Zahlung bestätigt — Erstelle jetzt dein Konto</Text>
            </View>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Input label="Name" placeholder="Max Mustermann" value={name}
          onChangeText={setName} autoCapitalize="words" />
        <Input label="E-Mail" placeholder="name@email.de" value={email}
          onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Passwort" placeholder="Min. 8 Zeichen" value={password}
          onChangeText={setPassword} isPassword />

        <Button title="Registrieren" onPress={handleSignup} loading={loading} fullWidth style={{ marginTop: spacing.md }} />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>oder</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button title="Mit Google registrieren" onPress={handleGoogleSignup} variant="outline" fullWidth />
        {Platform.OS === "ios" && (
          <Button title="Mit Apple registrieren" onPress={handleAppleSignup} variant="outline" fullWidth style={{ marginTop: spacing.md }} />
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Bereits ein Konto? </Text>
          <TouchableOpacity
            onPress={() =>
              params.sessionToken
                ? router.replace({ pathname: "/(auth)/login", params: { sessionToken: params.sessionToken } })
                : router.replace("/(auth)/login")
            }
          >
            <Text style={styles.footerLink}>Anmelden</Text>
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
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.gray50,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderCurve: "continuous",
    marginTop: spacing.sm,
  },
  paidBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.black,
    flex: 1,
  },
  error: { fontSize: 14, color: colors.danger, marginBottom: spacing.lg, padding: spacing.md, backgroundColor: "#FEF2F2", borderRadius: radius.sm, overflow: "hidden" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: spacing.xxl },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.gray200 },
  dividerText: { marginHorizontal: spacing.lg, fontSize: 14, color: colors.gray400 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xxl },
  footerText: { fontSize: 15, color: colors.gray500 },
  footerLink: { fontSize: 15, fontWeight: "600", color: colors.black },
});
