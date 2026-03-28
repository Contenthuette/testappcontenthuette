import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useAction } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { ZLogo } from "@/components/ZLogo";
import { SymbolView } from "@/components/Icon";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";

function getConvexSiteUrl(): string {
  const url = Constants.expoConfig?.extra?.convexUrl as string | undefined;
  if (url) return url.replace(".convex.cloud", ".convex.site");
  return "";
}

export default function SubscriptionScreen() {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.me, isAuthenticated ? undefined : "skip");
  const createPortalSession = useAction(api.stripeActions.createBillingPortalSession);
  const [portalLoading, setPortalLoading] = useState(false);

  const isActive = me?.subscriptionStatus === "active";
  const hasStripeCustomer = !!me?.stripeCustomerId;

  const handleManageSubscription = async () => {
    if (!me?.stripeCustomerId) return;
    setPortalLoading(true);
    try {
      const returnUrl = getConvexSiteUrl() + "/stripe/success";
      const { url } = await createPortalSession({
        stripeCustomerId: me.stripeCustomerId,
        returnUrl,
      });
      if (Platform.OS === "web") {
        window.open(url, "_blank");
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (e) {
      console.error("Portal session error:", e);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("subscription")} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonnement</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status card */}
        <View style={styles.statusCard}>
          <ZLogo size={28} />
          <Text style={styles.planLabel}>AKTUELLER PLAN</Text>
          <Text style={styles.planName}>
            Z Member
          </Text>
          <View style={[styles.statusPill, { backgroundColor: isActive ? colors.success : colors.danger }]}>
            <Text style={styles.statusText}>{isActive ? "Aktiv" : "Inaktiv"}</Text>
          </View>
          {me?.subscriptionExpiresAt && (
            <Text style={styles.expiresText}>
              Bis {new Date(me.subscriptionExpiresAt).toLocaleDateString("de-DE")}
            </Text>
          )}
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Dein Abo beinhaltet</Text>
          {[
            { icon: "person.3", text: "Unbegrenzte Gruppen" },
            { icon: "bubble.left.and.bubble.right", text: "Unbegrenzte Nachrichten" },
            { icon: "ticket", text: "Event-Tickets" },
            { icon: "sparkles", text: "Premium-Profil" },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <SymbolView name={f.icon as Parameters<typeof SymbolView>[0]["name"]} size={16} tintColor={colors.black} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Stripe Portal Button */}
        {hasStripeCustomer && (
          <TouchableOpacity
            style={styles.portalButton}
            onPress={handleManageSubscription}
            activeOpacity={0.7}
            disabled={portalLoading}
          >
            {portalLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <SymbolView name="creditcard" size={18} tintColor={colors.white} />
                <Text style={styles.portalButtonText}>Abonnement verwalten</Text>
                <SymbolView name="arrow.up.right" size={14} tintColor={colors.white} />
              </>
            )}
          </TouchableOpacity>
        )}

        {hasStripeCustomer && (
          <Text style={styles.portalHint}>
            Über Stripe kannst du dein Abo kündigen, Zahlungsmethode ändern oder Rechnungen einsehen.
          </Text>
        )}

        {!hasStripeCustomer && isActive && (
          <View style={styles.noStripeBox}>
            <SymbolView name="info.circle" size={20} tintColor={colors.gray400} />
            <Text style={styles.noStripeText}>
              Abo-Verwaltung ist für dein Konto nicht verfügbar.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.gray50,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 60 },

  statusCard: {
    alignItems: "center",
    padding: spacing.xxl,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  planLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray400,
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
  planName: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.5,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  statusText: { fontSize: 13, fontWeight: "700", color: colors.white },
  expiresText: { fontSize: 13, color: colors.gray400, marginTop: 2 },

  featuresCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 10,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.gray50,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontSize: 15, color: colors.gray700, letterSpacing: -0.1 },

  portalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.black,
    borderRadius: radius.full,
    paddingVertical: 16,
    marginTop: spacing.xl,
  },
  portalButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
  },
  portalHint: {
    fontSize: 13,
    color: colors.gray400,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 19,
    paddingHorizontal: spacing.md,
  },
  noStripeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  noStripeText: {
    flex: 1,
    fontSize: 14,
    color: colors.gray500,
    lineHeight: 20,
  },
});
