import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { ZLogo } from "@/components/ZLogo";
import { SymbolView } from "expo-symbols";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const updateSubscription = useMutation(api.users.updateSubscription);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await updateSubscription({ plan: selectedPlan, status: "active" });
      router.replace("/");
    } catch (e) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <ZLogo size={48} />
          <Text style={styles.title}>Z Premium</Text>
          <Text style={styles.subtitle}>Unbegrenzter Zugang zu allen Funktionen</Text>
        </View>

        <View style={styles.features}>
          {["Unbegrenzte Gruppen & Chats", "Alle Events entdecken", "Direktnachrichten", "Medien teilen", "Exklusive Community"].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.black} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          {SUBSCRIPTION_PLANS.map(plan => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, selectedPlan === plan.id && styles.planCardSelected]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              <View style={styles.planHeader}>
                <View style={[styles.radio, selectedPlan === plan.id && styles.radioSelected]}>
                  {selectedPlan === plan.id && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.planName}>{plan.name}</Text>
                {"savings" in plan && plan.savings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>-{plan.savings}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.planPrice}>€{plan.price.toFixed(2)}<Text style={styles.planInterval}> / {plan.interval === "month" ? "Monat" : "Jahr"}</Text></Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title="Jetzt abonnieren" onPress={handleSubscribe} loading={loading} fullWidth size="lg" />

        <Text style={styles.terms}>
          Mit dem Abonnement stimmst du den Nutzungsbedingungen zu. Abonnement kann jederzeit gekündigt werden.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingHorizontal: spacing.xxl, paddingBottom: 40 },
  header: { alignItems: "center", paddingTop: 60, paddingBottom: spacing.xxxl, gap: spacing.md },
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
  planCardSelected: { borderColor: colors.black, backgroundColor: colors.gray50 },
  planHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.gray300, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: colors.black },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.black },
  planName: { fontSize: 17, fontWeight: "600", color: colors.black, flex: 1 },
  savingsBadge: { backgroundColor: colors.black, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  savingsText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  planPrice: { fontSize: 24, fontWeight: "700", color: colors.black },
  planInterval: { fontSize: 15, fontWeight: "400", color: colors.gray500 },
  terms: { fontSize: 12, color: colors.gray400, textAlign: "center", marginTop: spacing.xl, lineHeight: 18 },
});
