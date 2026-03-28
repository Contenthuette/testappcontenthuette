import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/Button";
import { SymbolView } from "@/components/Icon";

interface NotifOption {
  key: string;
  icon: string;
  label: string;
  description: string;
}

const NOTIFICATION_OPTIONS: NotifOption[] = [
  {
    key: "calls",
    icon: "phone.fill",
    label: "Anrufe",
    description: "Video- & Audioanrufe (1:1)",
  },
  {
    key: "groupCalls",
    icon: "person.3.fill",
    label: "Gruppenanrufe",
    description: "Video- & Audioanrufe in Gruppen",
  },
  {
    key: "directMessages",
    icon: "bubble.left.fill",
    label: "Direktnachrichten",
    description: "1:1 Nachrichten",
  },
  {
    key: "groupMessages",
    icon: "bubble.left.and.bubble.right.fill",
    label: "Gruppennachrichten",
    description: "Nachrichten in Gruppen",
  },
  {
    key: "announcements",
    icon: "megaphone.fill",
    label: "Z Announcements",
    description: "Offizielle Ankündigungen von Z",
  },
];

type Prefs = Record<string, boolean>;

export default function OnboardingNotificationsScreen() {
  const params = useLocalSearchParams<{
    county: string;
    city: string;
    interests: string;
  }>();
  const [prefs, setPrefs] = useState<Prefs>({
    calls: true,
    groupCalls: true,
    directMessages: true,
    groupMessages: true,
    announcements: true,
  });
  const [loading, setLoading] = useState(false);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const toggleAll = (on: boolean) => {
    setPrefs({
      calls: on,
      groupCalls: on,
      directMessages: on,
      groupMessages: on,
      announcements: on,
    });
  };

  const allOn = Object.values(prefs).every(Boolean);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const interests = params.interests ? params.interests.split(",") : undefined;
      await completeOnboarding({
        county: params.county || undefined,
        city: params.city || undefined,
        interests: interests && interests.length > 0 ? interests : undefined,
        notificationPreferences: {
          calls: prefs.calls,
          groupCalls: prefs.groupCalls,
          directMessages: prefs.directMessages,
          groupMessages: prefs.groupMessages,
          announcements: prefs.announcements,
        },
      });
      router.replace("/");
    } catch (_e) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.progress}>
          <View style={[styles.progressBar, { width: "100%" }]} />
        </View>
        <Text style={styles.step}>Letzter Schritt</Text>
        <Text style={styles.title}>Benachrichtigungen</Text>
        <Text style={styles.subtitle}>
          Wähle aus, worüber Z dich informieren darf
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Select all toggle */}
        <TouchableOpacity
          style={styles.selectAllRow}
          onPress={() => toggleAll(!allOn)}
          activeOpacity={0.7}
        >
          <View style={styles.selectAllLeft}>
            <SymbolView
              name={allOn ? "checkmark.circle.fill" : "circle"}
              size={20}
              tintColor={allOn ? colors.black : colors.gray300}
            />
            <Text style={styles.selectAllText}>Alle aktivieren</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.card}>
          {NOTIFICATION_OPTIONS.map((option, idx) => (
            <View
              key={option.key}
              style={[
                styles.row,
                idx < NOTIFICATION_OPTIONS.length - 1 && styles.rowBorder,
              ]}
            >
              <View style={styles.rowIcon}>
                <SymbolView name={option.icon} size={18} tintColor={prefs[option.key] ? colors.black : colors.gray400} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{option.label}</Text>
                <Text style={styles.rowDesc}>{option.description}</Text>
              </View>
              <Switch
                value={prefs[option.key]}
                onValueChange={(val) =>
                  setPrefs((prev) => ({ ...prev, [option.key]: val }))
                }
                trackColor={{ false: colors.gray200, true: colors.black }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.gray200}
              />
            </View>
          ))}
        </View>

        <Text style={styles.hint}>
          Du kannst diese Einstellungen jederzeit in den App-Einstellungen ändern.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Fertig"
          onPress={handleComplete}
          loading={loading}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  topBar: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
  progress: {
    height: 4,
    backgroundColor: colors.gray200,
    borderRadius: 2,
    marginBottom: spacing.lg,
  },
  progressBar: { height: 4, backgroundColor: colors.black, borderRadius: 2 },
  step: { fontSize: 14, color: colors.gray400, marginBottom: spacing.xs },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.gray500,
    marginBottom: spacing.md,
    lineHeight: 21,
  },
  scroll: { paddingHorizontal: spacing.xxl, paddingBottom: 140 },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  selectAllLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.black,
  },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.black,
    letterSpacing: -0.1,
  },
  rowDesc: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 1,
  },
  hint: {
    fontSize: 13,
    color: colors.gray400,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xxl,
    paddingBottom: 40,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
});
