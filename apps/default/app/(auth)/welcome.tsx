import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, useWindowDimensions,
  TouchableOpacity, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { SymbolView } from "@/components/Icon";
import { ZLogo } from "@/components/ZLogo";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import { convexSiteUrl } from "@/lib/convex-urls";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";

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
  const { isAuthenticated } = useConvexAuth();

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const createCheckout = useAction(api.stripeActions.createCheckoutSession);
  const claimSubscription = useMutation(api.stripeHelpers.claimSubscription);

  const pendingStatus = useQuery(
    api.stripeHelpers.getPendingByToken,
    sessionToken ? { sessionToken } : "skip",
  );

  useEffect(() => {
    if (pendingStatus?.status !== "completed") return;
    if (!sessionToken) return;

    if (isAuthenticated) {
      claimSubscription({ sessionToken })
        .then(() => router.replace("/"))
        .catch(() => router.replace("/"));
    } else {
      router.replace({ pathname: "/(auth)/signup", params: { sessionToken } });
    }
  }, [pendingStatus, sessionToken, isAuthenticated, claimSubscription]);

  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const token = Crypto.randomUUID();
      setSessionToken(token);

      const { url } = await createCheckout({
        plan: selectedPlan,
        sessionToken: token,
        siteUrl: convexSiteUrl,
      });

      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });

      setLoading(false);
    } catch (e) {
      console.error("Checkout error:", e);
      setSessionToken(null);
      setLoading(false);
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Checkout konnte nicht gestartet werden. Bitte versuche es erneut.");
      }
    }
  }, [selectedPlan, createCheckout]);

  const isWaiting = sessionToken !== null && pendingStatus?.status === "pending";

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
        <Text style={styles.subtitle}>{"Social Media. Nur f\u00fcr MV."}</Text>

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
          <Text style={styles.punchline}>{"Wir \u00e4ndern das."}</Text>
        </View>

        <View style={styles.planToggle}>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planOption,
                selectedPlan === plan.id && styles.planOptionSelected,
              ]}
              onPress={() => setSelectedPlan(plan.id as "monthly" | "yearly")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.planOptionName,
                  selectedPlan === plan.id && styles.planOptionNameSelected,
                ]}
              >
                {plan.name}
              </Text>
              <Text
                style={[
                  styles.planOptionPrice,
                  selectedPlan === plan.id && styles.planOptionPriceSelected,
                ]}
              >
                {"\u20ac"}{plan.price.toFixed(2)}/{plan.interval === "month" ? "Mo" : "Jahr"}
              </Text>
              {"savings" in plan && plan.savings && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>-{plan.savings}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.ctaWrap}>
        <Button
          title={isWaiting ? "Zahlung wird verarbeitet..." : "Join the Movement"}
          onPress={handleSubscribe}
          loading={loading || isWaiting}
          fullWidth
        />
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
  planToggle: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  planOption: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: spacing.lg,
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  planOptionSelected: {
    borderColor: colors.black,
    backgroundColor: colors.white,
  },
  planOptionName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.gray400,
  },
  planOptionNameSelected: {
    color: colors.black,
  },
  planOptionPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.gray400,
  },
  planOptionPriceSelected: {
    color: colors.black,
  },
  savingsBadge: {
    backgroundColor: colors.black,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 2,
  },
  savingsText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
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
});
