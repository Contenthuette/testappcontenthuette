import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "expo-symbols";

export default function ConversationsScreen() {
  const conversations = useQuery(api.messaging.listConversations, {});

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Nachrichten</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={conversations}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push({ pathname: "/(main)/chat", params: { id: item._id } })}
            activeOpacity={0.6}
          >
            <Avatar uri={item.otherUserAvatarUrl} name={item.otherUserName} size={52} />
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={styles.rowName} numberOfLines={1}>{item.otherUserName}</Text>
                {item.lastMessageAt ? (
                  <Text style={styles.rowTime}>{formatTime(item.lastMessageAt)}</Text>
                ) : null}
              </View>
              <Text style={[styles.rowPreview, item.unreadCount > 0 && styles.rowPreviewBold]} numberOfLines={1}>
                {item.lastMessage || "Neue Unterhaltung"}
              </Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          conversations === undefined ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={colors.gray300} /></View>
          ) : (
            <EmptyState
              icon="bubble.left.and.bubble.right"
              title="Keine Nachrichten"
              subtitle="Starte eine Unterhaltung mit jemandem."
            />
          )
        }
      />
    </SafeAreaView>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "600", color: colors.black },
  list: { paddingBottom: 40 },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    gap: spacing.md,
  },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowName: { fontSize: 16, fontWeight: "600", color: colors.black, flex: 1, letterSpacing: -0.2 },
  rowTime: { fontSize: 13, color: colors.gray400 },
  rowPreview: { fontSize: 14, color: colors.gray500, marginTop: 2, letterSpacing: -0.1 },
  rowPreviewBold: { color: colors.black, fontWeight: "500" },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: { fontSize: 11, fontWeight: "700", color: colors.white, fontVariant: ["tabular-nums"] },
});
