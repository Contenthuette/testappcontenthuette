import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { ZLogo } from "@/components/ZLogo";
import { SymbolView } from "expo-symbols";

export default function SubscriptionScreen() {
  const me = useQuery(api.users.me);
  const updateSubscription = useMutation(api.users.updateSubscription);
  const [showCancel, setShowCancel] = useState(false);
  const [loading, setLoading] = useState(false);

  const isActive = me?.subscriptionStatus === "active";

  const handleCancel = async () => {
    setLoading(true);
    try {
      await updateSubscription({ status: "canceled", plan: me?.subscriptionPlan ?? "monthly" });
      router.back();
    } catch (e) {
      // handle
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
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
            Z {me?.subscriptionPlan === "yearly" ? "Jährlich" : "Monatlich"}
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

        {/* Cancel area */}
        {isActive && !showCancel && (
          <TouchableOpacity
            style={styles.cancelTrigger}
            onPress={() => setShowCancel(true)}
            activeOpacity={0.6}
          >
            <Text style={styles.cancelTriggerText}>Abonnement kündigen</Text>
          </TouchableOpacity>
        )}

        {showCancel && (
          <View style={styles.cancelBox}>
            <SymbolView name="exclamationmark.triangle.fill" size={28} tintColor={colors.danger} />
            <Text style={styles.cancelTitle}>Möchtest du wirklich kündigen?</Text>
            <Text style={styles.cancelDesc}>
              Du verlierst den Zugang zu allen Gruppen, Chats und Events.
              Deine Daten werden nach 30 Tagen gelöscht.
            </Text>
            <Button
              title="Endgültig kündigen"
              onPress={handleCancel}
              loading={loading}
              variant="danger"
              fullWidth
            />
            <Button
              title="Abbrechen"
              onPress={() => setShowCancel(false)}
              variant="ghost"
              fullWidth
            />
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

  cancelTrigger: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    marginTop: spacing.lg,
  },
  cancelTriggerText: { fontSize: 15, color: colors.danger, fontWeight: "600" },

  cancelBox: {
    marginTop: spacing.xl,
    padding: spacing.xxl,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    alignItems: "center",
    gap: spacing.md,
  },
  cancelTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.danger,
    textAlign: "center",
  },
  cancelDesc: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
});
