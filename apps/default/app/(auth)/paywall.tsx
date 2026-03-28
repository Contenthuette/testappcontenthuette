import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Link } from "expo-router";
import { useAction, useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { ZLogo } from "@/components/ZLogo";
import { SymbolView } from "@/components/Icon";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";
import { convexSiteUrl } from "@/lib/convex-urls";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";

export default function PaywallScreen() {
  const { isAuthenticated } = useConvexAuth();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [agbAccepted, setAgbAccepted] = useState(false);

  const createCheckout = useAction(api.stripeActions.createCheckoutSession);
  const claimSubscription = useMutation(api.stripeHelpers.claimSubscription);

  // Watch the pending subscription status reactively
  const pendingStatus = useQuery(
    api.stripeHelpers.getPendingByToken,
    sessionToken ? { sessionToken } : "skip",
  );

  // When subscription is completed, navigate forward
  useEffect(() => {
    if (pendingStatus?.status !== "completed") return;
    if (!sessionToken) return;

    if (isAuthenticated) {
      // User is already logged in — claim directly
      claimSubscription({ sessionToken })
        .then(() => router.replace("/"))
        .catch(() => router.replace("/"));
    } else {
      // Not logged in — go to signup with sessionToken
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

      // Open Stripe Checkout in browser
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });

      // Browser closed — pendingStatus query will reactively update
      // If the payment was not completed, allow retry
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

  // Show waiting state after browser closes if payment is processing
  const isWaiting = sessionToken !== null && pendingStatus?.status === "pending";
  const canSubscribe = agbAccepted && !loading && !isWaiting;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ZLogo size={48} />
          <Text style={styles.title}>Z Premium</Text>
          <Text style={styles.subtitle}>Unbegrenzter Zugang zu allen Funktionen</Text>
        </View>

        <View style={styles.features}>
          {[
            "Unbegrenzte Gruppen & Chats",
            "Alle Events entdecken",
            "Direktnachrichten",
            "Medien teilen",
            "Exklusive Community",
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.black} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan(plan.id as "monthly" | "yearly")}
              activeOpacity={0.7}
            >
              <View style={styles.planHeader}>
                <View
                  style={[
                    styles.radio,
                    selectedPlan === plan.id && styles.radioSelected,
                  ]}
                >
                  {selectedPlan === plan.id && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.planName}>{plan.name}</Text>
                {"savings" in plan && plan.savings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>-{plan.savings}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.planPrice}>
                €{plan.price.toFixed(2)}
                <Text style={styles.planInterval}>
                  {" / "}
                  {plan.interval === "month" ? "Monat" : "Jahr"}
                </Text>
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AGB Checkbox */}
        <TouchableOpacity
          style={styles.agbRow}
          onPress={() => setAgbAccepted(!agbAccepted)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agbAccepted && styles.checkboxChecked]}>
            {agbAccepted && (
              <SymbolView name="checkmark" size={12} tintColor={colors.white} />
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

        <Button
          title={isWaiting ? "Zahlung wird verarbeitet..." : "Jetzt abonnieren"}
          onPress={handleSubscribe}
          loading={loading || isWaiting}
          disabled={!canSubscribe}
          fullWidth
          size="lg"
        />

        <View style={styles.paymentMethods}>
          <Text style={styles.paymentLabel}>Bezahle sicher mit</Text>
          <View style={styles.paymentIcons}>
            <View style={styles.paymentBadge}><Text style={styles.paymentBadgeText}>Apple Pay</Text></View>
            <View style={styles.paymentBadge}><Text style={styles.paymentBadgeText}>Google Pay</Text></View>
            <View style={styles.paymentBadge}><Text style={styles.paymentBadgeText}>Kreditkarte</Text></View>
          </View>
        </View>

        <Text style={styles.terms}>
          Mit dem Abonnement stimmst du den Nutzungsbedingungen zu.{"\n"}
          Abonnement kann jederzeit gekündigt werden.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: spacing.xxl, paddingBottom: 40 },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  title: { fontSize: 34, fontWeight: "800", color: colors.black },
  subtitle: { fontSize: 16, color: colors.gray500, textAlign: "center" },
  features: { gap: spacing.md, marginBottom: spacing.xxxl },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  featureText: { fontSize: 16, color: colors.black },
  plans: { gap: spacing.md, marginBottom: spacing.xxl },
  planCard: {
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderCurve: "continuous",
  },
  planCardSelected: {
    borderColor: colors.black,
    backgroundColor: colors.gray50,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.black },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.black },
  planName: { fontSize: 17, fontWeight: "600", color: colors.black, flex: 1 },
  savingsBadge: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  savingsText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  planPrice: { fontSize: 24, fontWeight: "700", color: colors.black },
  planInterval: { fontSize: 15, fontWeight: "400", color: colors.gray500 },
  agbRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.xl,
    paddingRight: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
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
    fontSize: 14,
    color: colors.gray600,
    lineHeight: 20,
  },
  agbLink: {
    color: colors.black,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  paymentMethods: {
    alignItems: "center",
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  paymentLabel: {
    fontSize: 13,
    color: colors.gray400,
    fontWeight: "500",
  },
  paymentIcons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.gray100,
    borderRadius: radius.sm,
    borderCurve: "continuous",
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray600,
  },
  terms: {
    fontSize: 12,
    color: colors.gray400,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: 18,
  },
});
