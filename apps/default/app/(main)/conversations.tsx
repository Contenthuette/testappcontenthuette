import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "expo-symbols";

export default function ConversationsScreen() {
  const conversations = useQuery(api.messaging.listConversations, {});

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Nachrichten</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.conversationRow}
            onPress={() => router.push({ pathname: "/(main)/chat", params: { id: item._id } })}
          >
            <Avatar uri={item.otherUserAvatarUrl} name={item.otherUserName} size={50} />
            <View style={styles.convInfo}>
              <View style={styles.convTop}>
                <Text style={styles.convName} numberOfLines={1}>{item.otherUserName}</Text>
                <Text style={styles.convTime}>{formatTime(item.lastMessageAt)}</Text>
              </View>
              <Text style={styles.convPreview} numberOfLines={1}>{item.lastMessageText || "Neue Unterhaltung"}</Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          conversations === undefined ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.gray400} /> : (
            <EmptyState icon="bubble.left.and.bubble.right" title="Keine Nachrichten" subtitle="Starte eine Unterhaltung" />
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
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { fontSize: 22, fontWeight: "700", color: colors.black },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  conversationRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100, gap: spacing.md },
  convInfo: { flex: 1 },
  convTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  convName: { fontSize: 16, fontWeight: "600", color: colors.black, flex: 1 },
  convTime: { fontSize: 12, color: colors.gray400 },
  convPreview: { fontSize: 14, color: colors.gray500, marginTop: 2 },
  unreadBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.black, alignItems: "center", justifyContent: "center" },
  unreadText: { fontSize: 11, fontWeight: "700", color: colors.white },
});
