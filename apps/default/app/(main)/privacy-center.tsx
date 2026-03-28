import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { SymbolView } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { AGB_SECTIONS } from "@/lib/legal-content";
import { PRIVACY_SECTIONS, IMPRESSUM_SECTIONS } from "@/lib/legal-content-extra";
import type { LegalSection } from "@/lib/legal-content";

/* ─── Tabs ─── */
const TABS = ["AGB", "Datenschutz", "Impressum"] as const;
type Tab = (typeof TABS)[number];

const CONTENT_MAP: Record<Tab, { title: string; sections: LegalSection[] }> = {
  AGB: { title: "Allgemeine Geschäftsbedingungen", sections: AGB_SECTIONS },
  Datenschutz: { title: "Datenschutzerklärung", sections: PRIVACY_SECTIONS },
  Impressum: { title: "Impressum", sections: IMPRESSUM_SECTIONS },
};

/* ─── Component ─── */
export default function PrivacyCenterScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("AGB");
  const scrollRef = useRef<ScrollView>(null);
  const page = CONTENT_MAP[activeTab];

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack("privacy-center")}
          style={styles.backBtn}
          hitSlop={12}
        >
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Center</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => switchTab(tab)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>{page.title}</Text>
        <Text style={styles.appLabel}>Z App – Regionale Community für MV</Text>

        {page.sections.map((section, i) => (
          <View key={`${activeTab}-${i}`} style={styles.section}>
            {section.heading && (
              <Text style={styles.sectionHeading}>{section.heading}</Text>
            )}
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <View style={styles.divider} />
          <Text style={styles.footerText}>
            Z App · {new Date().getFullYear()}
          </Text>
          <Text style={styles.footerText}>leif@z-social.com</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },

  /* Tab bar */
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  tabActive: {
    backgroundColor: colors.black,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray500,
  },
  tabTextActive: {
    color: colors.white,
  },

  /* Content */
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 80 },

  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.5,
    marginTop: spacing.xl,
  },
  appLabel: {
    fontSize: 13,
    color: colors.gray400,
    marginTop: 4,
    marginBottom: spacing.lg,
  },

  section: {
    marginTop: spacing.lg,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.black,
    marginBottom: spacing.xs,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14.5,
    color: colors.gray700,
    lineHeight: 23,
    letterSpacing: -0.1,
  },

  footer: {
    marginTop: 48,
    alignItems: "center",
    gap: 6,
    paddingBottom: 20,
  },
  divider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.gray200,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.gray400,
  },
});
