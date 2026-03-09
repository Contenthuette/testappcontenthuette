import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { SymbolView } from "expo-symbols";

export default function SubscriptionScreen() {
  const me = useQuery(api.users.me);
  const updateSubscription = useMutation(api.users.updateSubscription);
  const [showCancel, setShowCancel] = useState(false);
  const [loading, setLoading] = useState(false);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Abonnement</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusCard}>
          <Text style={styles.planLabel}>Aktueller Plan</Text>
          <Text style={styles.planName}>{me?.subscriptionPlan === "yearly" ? "J\u00e4hrlich" : "Monatlich"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: me?.subscriptionStatus === "active" ? colors.success : colors.danger }]}>
            <Text style={styles.statusText}>{me?.subscriptionStatus === "active" ? "Aktiv" : "Inaktiv"}</Text>
          </View>
        </View>

        {!showCancel ? (
          <Button title="Abonnement k\u00fcndigen" onPress={() => setShowCancel(true)} variant="danger" fullWidth style={{ marginTop: spacing.xxl }} />
        ) : (
          <View style={styles.cancelBox}>
            <SymbolView name="exclamationmark.triangle.fill" size={32} tintColor={colors.danger} />
            <Text style={styles.cancelTitle}>Bist du sicher?</Text>
            <Text style={styles.cancelText}>
              Wenn du k\u00fcndigst, verlierst du den Zugang zu allen Gruppen, Chats, Events und deinem Profil.
              Deine Daten werden nach 30 Tagen gel\u00f6scht.
            </Text>
            <Button title="Endg\u00fcltig k\u00fcndigen" onPress={handleCancel} loading={loading} variant="danger" fullWidth />
            <Button title="Abbrechen" onPress={() => setShowCancel(false)} variant="ghost" fullWidth />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { fontSize: 22, fontWeight: "700", color: colors.black },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  statusCard: {
    padding: spacing.xxl,
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  planLabel: { fontSize: 13, color: colors.gray500, textTransform: "uppercase", letterSpacing: 1 },
  planName: { fontSize: 28, fontWeight: "800", color: colors.black },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 13, fontWeight: "600", color: colors.white },
  cancelBox: {
    marginTop: spacing.xxl,
    padding: spacing.xxl,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.lg,
    alignItems: "center",
    gap: spacing.md,
  },
  cancelTitle: { fontSize: 20, fontWeight: "700", color: colors.danger },
  cancelText: { fontSize: 15, color: colors.gray700, textAlign: "center", lineHeight: 22 },
});
