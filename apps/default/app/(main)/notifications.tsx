import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "expo-symbols";

export default function NotificationsScreen() {
  const notifications = useQuery(api.notifications.list, {});
  const markRead = useMutation(api.notifications.markRead);

  const iconMap: Record<string, string> = {
    message: "bubble.left.fill",
    like: "heart.fill",
    comment: "text.bubble.fill",
    event: "calendar",
    ticket: "ticket.fill",
    announcement: "megaphone.fill",
    group: "person.3.fill",
    call: "phone.fill",
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Benachrichtigungen</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notifRow, !item.isRead && styles.notifUnread]}
            onPress={() => markRead({ notificationId: item._id })}
          >
            <View style={styles.notifIcon}>
              <SymbolView name={(iconMap[item.type] || "bell.fill") as any} size={18} tintColor={colors.gray600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifText}>{item.body}</Text>
              <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          notifications === undefined ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.gray400} /> : (
            <EmptyState icon="bell" title="Keine Benachrichtigungen" subtitle="Hier erscheinen deine Benachrichtigungen" />
          )
        }
      />
    </SafeAreaView>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  return `vor ${Math.floor(hrs / 24)} T.`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { fontSize: 22, fontWeight: "700", color: colors.black },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  notifRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100, gap: spacing.md },
  notifUnread: { backgroundColor: colors.gray50 },
  notifIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  notifText: { fontSize: 14, color: colors.black, lineHeight: 20 },
  notifTime: { fontSize: 12, color: colors.gray400, marginTop: 2 },
});
