import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "expo-symbols";

const sections = [
  {
    title: "Konto",
    items: [
      { icon: "bookmark", label: "Gespeicherte Beiträge", route: "/(main)/saved-posts" },
      { icon: "pencil", label: "Profil bearbeiten", route: "/(main)/edit-profile" },
      { icon: "creditcard", label: "Abonnement", route: "/(main)/subscription" },
    ],
  },
  {
    title: "Einstellungen",
    items: [
      { icon: "bell", label: "Benachrichtigungen", route: "/(main)/notifications" },
      { icon: "hand.raised", label: "Blockierte Nutzer", route: "/(main)/blocked-users" },
    ],
  },
  {
    title: "Rechtliches",
    items: [
      { icon: "doc.text", label: "Impressum", route: "/(main)/legal?type=imprint" },
      { icon: "lock.shield", label: "Datenschutz", route: "/(main)/legal?type=privacy" },
      { icon: "doc.plaintext", label: "AGB", route: "/(main)/legal?type=terms" },
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Einstellungen</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[styles.row, ii < section.items.length - 1 && styles.rowBorder]}
                  onPress={() => router.push(item.route as any)}
                >
                  <SymbolView name={item.icon as any} size={20} tintColor={colors.gray600} />
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <SymbolView name="chevron.right" size={14} tintColor={colors.gray400} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <SymbolView name="rectangle.portrait.and.arrow.right" size={20} tintColor={colors.danger} />
          <Text style={styles.logoutText}>Abmelden</Text>
        </TouchableOpacity>
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
  sectionTitle: { fontSize: 13, fontWeight: "600", color: colors.gray500, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm, marginLeft: spacing.sm },
  sectionCard: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  rowLabel: { flex: 1, fontSize: 16, color: colors.black },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.xxl, padding: spacing.lg },
  logoutText: { fontSize: 16, fontWeight: "600", color: colors.danger },
});
