import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "expo-symbols";

const sections = [
  {
    title: "Konto",
    items: [
      { icon: "bookmark" as const, label: "Gespeicherte Beiträge", route: "/(main)/saved-posts" },
      { icon: "pencil" as const, label: "Profil bearbeiten", route: "/(main)/edit-profile" },
      { icon: "creditcard" as const, label: "Abonnement verwalten", route: "/(main)/subscription" },
      { icon: "ticket" as const, label: "Meine Tickets", route: "/(main)/my-tickets" },
    ],
  },
  {
    title: "Einstellungen",
    items: [
      { icon: "bell" as const, label: "Benachrichtigungen", route: "/(main)/notifications" },
      { icon: "hand.raised" as const, label: "Blockierte Nutzer", route: "/(main)/blocked-users" },
    ],
  },
  {
    title: "Rechtliches",
    items: [
      { icon: "doc.text" as const, label: "Impressum", route: "/(main)/legal?type=imprint" },
      { icon: "lock.shield" as const, label: "Datenschutzerklärung", route: "/(main)/legal?type=privacy" },
      { icon: "doc.plaintext" as const, label: "AGB", route: "/(main)/legal?type=terms" },
    ],
  },
];

export default function SettingsScreen() {
  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.replace("/");
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Einstellungen</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[styles.row, ii < section.items.length - 1 && styles.rowBorder]}
                  onPress={() => router.push(item.route as "/")}
                  activeOpacity={0.6}
                >
                  <View style={styles.rowIcon}>
                    <SymbolView name={item.icon} size={18} tintColor={colors.gray500} />
                  </View>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <SymbolView name="chevron.right" size={13} tintColor={colors.gray300} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.6}>
          <SymbolView name="rectangle.portrait.and.arrow.right" size={18} tintColor={colors.danger} />
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Z · Version 1.0.0</Text>
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
  title: { fontSize: 17, fontWeight: "600", color: colors.black },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 60 },

  section: { marginTop: spacing.xl },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.gray50,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 16, color: colors.black, letterSpacing: -0.1 },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  logoutText: { fontSize: 16, fontWeight: "600", color: colors.danger },
  version: {
    fontSize: 12,
    color: colors.gray400,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
