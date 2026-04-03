import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
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

const DEFAULT_PREFS: Prefs = {
  calls: true,
  groupCalls: true,
  directMessages: true,
  groupMessages: true,
  announcements: true,
};

export default function NotificationSettingsScreen() {
  const { isAuthenticated } = useConvexAuth();
  const serverPrefs = useQuery(
    api.pushNotifications.getPreferences,
    isAuthenticated ? {} : "skip"
  );
  const updatePreferences = useMutation(api.pushNotifications.updatePreferences);

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (serverPrefs && !initialized) {
      setPrefs(serverPrefs);
      setInitialized(true);
    }
  }, [serverPrefs, initialized]);

  const handleToggle = async (key: string, value: boolean) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    setSaving(true);
    try {
      await updatePreferences({
        calls: newPrefs.calls,
        groupCalls: newPrefs.groupCalls,
        directMessages: newPrefs.directMessages,
        groupMessages: newPrefs.groupMessages,
        announcements: newPrefs.announcements,
      });
    } catch (_e) {
      // Revert on error
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  };

  const allOn = Object.values(prefs).every(Boolean);

  const handleToggleAll = async () => {
    const newVal = !allOn;
    const newPrefs: Prefs = {
      calls: newVal,
      groupCalls: newVal,
      directMessages: newVal,
      groupMessages: newVal,
      announcements: newVal,
    };
    setPrefs(newPrefs);
    setSaving(true);
    try {
      await updatePreferences({
        calls: newPrefs.calls,
        groupCalls: newPrefs.groupCalls,
        directMessages: newPrefs.directMessages,
        groupMessages: newPrefs.groupMessages,
        announcements: newPrefs.announcements,
      });
    } catch (_e) {
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  };

  if (!initialized) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeBack("notification-settings")} style={styles.backBtn} hitSlop={12}>
            <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Benachrichtigungen</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.gray400} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("notification-settings")} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Benachrichtigungen</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Push-Benachrichtigungen</Text>
        <Text style={styles.sectionDesc}>
          Wähle aus, für welche Ereignisse du Push-Benachrichtigungen auf dein Gerät erhalten möchtest.
        </Text>

        {/* Select all */}
        <TouchableOpacity style={styles.selectAllRow} onPress={handleToggleAll} activeOpacity={0.7}>
          <View style={styles.selectAllLeft}>
            <SymbolView
              name={allOn ? "checkmark.circle.fill" : "circle"}
              size={20}
              tintColor={allOn ? colors.black : colors.gray300}
            />
            <Text style={styles.selectAllText}>Alle {allOn ? "deaktivieren" : "aktivieren"}</Text>
          </View>
          {saving && <ActivityIndicator size="small" color={colors.gray400} />}
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
                <SymbolView
                  name={option.icon}
                  size={18}
                  tintColor={prefs[option.key] ? colors.black : colors.gray400}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{option.label}</Text>
                <Text style={styles.rowDesc}>{option.description}</Text>
              </View>
              <Switch
                value={prefs[option.key]}
                onValueChange={(val) => handleToggle(option.key, val)}
                trackColor={{ false: colors.gray200, true: colors.black }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.gray200}
              />
            </View>
          ))}
        </View>

        <Text style={styles.footerNote}>
          Benachrichtigungen erscheinen als "Z MOVEMENT" auf deinem Gerät.
        </Text>
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
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 60 },
  sectionLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.black,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    fontSize: 14,
    color: colors.gray500,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
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
    backgroundColor: colors.white,
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
    borderBottomColor: colors.gray100,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray50,
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
  footerNote: {
    fontSize: 13,
    color: colors.gray400,
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: 18,
  },
});
