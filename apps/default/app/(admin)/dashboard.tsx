import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { ZLogo } from "@/components/ZLogo";
import { SymbolView } from "expo-symbols";

const adminSections = [
  { icon: "person.2", label: "Nutzer verwalten", route: "/(admin)/users", color: colors.black },
  { icon: "person.3", label: "Gruppen verwalten", route: "/(admin)/group-mgmt", color: colors.black },
  { icon: "calendar", label: "Events verwalten", route: "/(admin)/event-mgmt", color: colors.black },
  { icon: "building.2", label: "Partner verwalten", route: "/(admin)/partner-mgmt", color: colors.black },
  { icon: "shield", label: "Moderation", route: "/(admin)/moderation", color: colors.danger },
  { icon: "megaphone", label: "Announcements", route: "/(admin)/announcements", color: colors.black },
  { icon: "chart.bar", label: "Analytics", route: "/(admin)/analytics", color: colors.black },
];

export default function AdminDashboard() {
  const stats = useQuery(api.admin.getDashboardStats, {});

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
          </TouchableOpacity>
          <ZLogo size={28} />
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {[
            { label: "Nutzer", value: stats?.totalUsers ?? "..." },
            { label: "Aktive Abos", value: stats?.activeSubscriptions ?? "..." },
            { label: "Gruppen", value: stats?.totalGroups ?? "..." },
            { label: "Events", value: stats?.totalEvents ?? "..." },
            { label: "Beitr\u00e4ge", value: stats?.totalPosts ?? "..." },
            { label: "Reports", value: stats?.pendingReports ?? "..." },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Sections */}
        <View style={styles.sections}>
          {adminSections.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.sectionCard}
              onPress={() => router.push(s.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.sectionIcon, { backgroundColor: s.color === colors.danger ? "#FEF2F2" : colors.gray100 }]}>
                <SymbolView name={s.icon as any} size={22} tintColor={s.color} />
              </View>
              <Text style={styles.sectionLabel}>{s.label}</Text>
              <SymbolView name="chevron.right" size={14} tintColor={colors.gray400} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.white },
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: 20, fontWeight: "700", color: colors.black, flex: 1 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  statCard: {
    width: "47%",
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  statValue: { fontSize: 28, fontWeight: "800", color: colors.black },
  statLabel: { fontSize: 13, color: colors.gray500, marginTop: spacing.xs },
  sections: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: 40,
    gap: spacing.sm,
  },
  sectionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
  },
  sectionIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  sectionLabel: { flex: 1, fontSize: 16, fontWeight: "500", color: colors.black },
});
