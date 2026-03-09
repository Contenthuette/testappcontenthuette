import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { SymbolView } from "expo-symbols";

export default function AdminAnalyticsScreen() {
  const stats = useQuery(api.admin.getDashboardStats, {});
  const analytics = useQuery(api.admin.getAnalytics, {});

  const sections = [
    {
      title: "Nutzer",
      metrics: [
        { label: "Gesamt", value: stats?.totalUsers ?? 0 },
        { label: "Aktive heute", value: analytics?.activeToday ?? 0 },
        { label: "Aktive 7 Tage", value: analytics?.active7Days ?? 0 },
        { label: "Aktive 30 Tage", value: analytics?.active30Days ?? 0 },
        { label: "Neue Registrierungen", value: analytics?.newRegistrations ?? 0 },
      ],
    },
    {
      title: "Abonnements",
      metrics: [
        { label: "Aktive Abos", value: stats?.activeSubscriptions ?? 0 },
        { label: "K\u00fcndigungen", value: analytics?.cancellations ?? 0 },
      ],
    },
    {
      title: "Engagement",
      metrics: [
        { label: "Beitr\u00e4ge", value: stats?.totalPosts ?? 0 },
        { label: "Nachrichten", value: analytics?.totalMessages ?? 0 },
        { label: "Gruppen", value: stats?.totalGroups ?? 0 },
        { label: "Events", value: stats?.totalEvents ?? 0 },
        { label: "Tickets verkauft", value: analytics?.ticketsSold ?? 0 },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.metricsGrid}>
              {section.metrics.map((m, mi) => (
                <View key={mi} style={styles.metricCard}>
                  <Text style={styles.metricValue}>{m.value}</Text>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.white },
  backBtn: { padding: spacing.xs },
  title: { fontSize: 22, fontWeight: "700", color: colors.black },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  section: { marginTop: spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.black, marginBottom: spacing.md },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metricCard: { width: "47%", padding: spacing.lg, backgroundColor: colors.white, borderRadius: radius.lg, ...shadows.sm },
  metricValue: { fontSize: 24, fontWeight: "800", color: colors.black },
  metricLabel: { fontSize: 13, color: colors.gray500, marginTop: spacing.xs },
});
