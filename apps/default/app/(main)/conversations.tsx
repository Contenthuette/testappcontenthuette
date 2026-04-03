import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  ScrollView, LayoutAnimation, UIManager, Platform as RNPlatform,
  Modal, Pressable, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "@/components/Icon";
import { PollCard } from "@/components/PollCard";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { Id } from "@/convex/_generated/dataModel";

// Enable LayoutAnimation on Android
if (RNPlatform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ─── Community Polls ─── */
function CommunityPolls() {
  const { isAuthenticated } = useConvexAuth();
  const polls = useQuery(api.polls.listCommunity, isAuthenticated ? {} : "skip");
  const [expanded, setExpanded] = useState(false);
  if (!polls || polls.length === 0) return null;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={pollStyles.section}>
      <TouchableOpacity onPress={toggleExpand} activeOpacity={0.7} style={pollStyles.header}>
        <SymbolView name="chart.bar.fill" size={16} tintColor={colors.black} />
        <Text style={pollStyles.title}>Umfragen</Text>
        <SymbolView
          name={expanded ? "chevron.up" : "chevron.down"}
          size={12}
          tintColor={colors.gray400}
        />
      </TouchableOpacity>
      <ScrollView
        horizontal={!expanded}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={expanded ? pollStyles.expandedScroll : pollStyles.scroll}
        decelerationRate="fast"
        snapToInterval={expanded ? undefined : 220 + spacing.sm}
      >
        {polls.map((p: { _id: string }) => (
          <View key={p._id} style={expanded ? pollStyles.cardWrapExpanded : pollStyles.cardWrap}>
            <PollCard {...(p as React.ComponentProps<typeof PollCard>)} compact={!expanded} />
          </View>
        ))}
      </ScrollView>
      <View style={pollStyles.separator} />
    </Animated.View>
  );
}

interface ConversationItem {
  _id: string;
  type: string;
  otherUserId?: string;
  otherUserName?: string;
  otherUserAvatarUrl?: string;
  lastMessage?: string;
  lastMessageAt?: number;
  unreadCount: number;
  isPinned: boolean;
}

export default function ConversationsScreen() {
  const { isAuthenticated } = useConvexAuth();
  const markAllConversationsAsRead = useMutation(api.messaging.markAllConversationsAsRead);
  const conversations = useQuery(api.messaging.listConversations, isAuthenticated ? {} : "skip");
  const pinConversation = useMutation(api.messaging.pinConversation);
  const unpinConversation = useMutation(api.messaging.unpinConversation);
  const deleteConversation = useMutation(api.messaging.deleteConversation);

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    conversation: ConversationItem | null;
  }>({ visible: false, conversation: null });

  // Mark all conversations as read when opening this screen
  useEffect(() => {
    if (isAuthenticated) {
      markAllConversationsAsRead().catch(() => {});
    }
  }, [isAuthenticated, markAllConversationsAsRead]);

  const handleLongPress = useCallback((item: ConversationItem) => {
    if (RNPlatform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setContextMenu({ visible: true, conversation: item });
  }, []);

  const handlePin = useCallback(async () => {
    const conv = contextMenu.conversation;
    if (!conv) return;
    setContextMenu({ visible: false, conversation: null });
    try {
      if (conv.isPinned) {
        await unpinConversation({ conversationId: conv._id as Id<"conversations"> });
      } else {
        await pinConversation({ conversationId: conv._id as Id<"conversations"> });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler";
      if (RNPlatform.OS !== "web") Alert.alert("Fehler", msg);
    }
  }, [contextMenu.conversation, pinConversation, unpinConversation]);

  const handleDelete = useCallback(() => {
    const conv = contextMenu.conversation;
    if (!conv) return;
    setContextMenu({ visible: false, conversation: null });

    if (RNPlatform.OS === "web") {
      deleteConversation({ conversationId: conv._id as Id<"conversations"> }).catch(() => {});
      return;
    }

    Alert.alert(
      "Chat löschen",
      `Chat mit ${conv.otherUserName ?? "diesem Nutzer"} löschen? Die andere Person hat den Chat noch.`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: () => {
            deleteConversation({ conversationId: conv._id as Id<"conversations"> }).catch(() => {});
          },
        },
      ],
    );
  }, [contextMenu.conversation, deleteConversation]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("conversations")} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Nachrichten</Text>
        {/* Empty spacer to keep title centered */}
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={conversations}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<CommunityPolls />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.navigate({ pathname: "/(main)/chat", params: { id: item._id } })}
            onLongPress={() => handleLongPress(item as ConversationItem)}
            activeOpacity={0.6}
            delayLongPress={400}
          >
            <Avatar uri={item.otherUserAvatarUrl} name={item.otherUserName} size={52} />
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <View style={styles.nameRow}>
                  {item.isPinned && (
                    <SymbolView name="pin.fill" size={11} tintColor={colors.gray400} />
                  )}
                  <Text style={styles.rowName} numberOfLines={1}>{item.otherUserName}</Text>
                </View>
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

      {/* Context Menu Modal */}
      <Modal
        visible={contextMenu.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setContextMenu({ visible: false, conversation: null })}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setContextMenu({ visible: false, conversation: null })}
        >
          <View style={styles.menuSheet}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              {contextMenu.conversation?.otherUserName ?? "Chat"}
            </Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handlePin}
              activeOpacity={0.6}
            >
              <SymbolView
                name={contextMenu.conversation?.isPinned ? "pin.slash.fill" : "pin.fill"}
                size={18}
                tintColor={colors.black}
              />
              <Text style={styles.menuItemText}>
                {contextMenu.conversation?.isPinned ? "Nicht mehr anpinnen" : "Anpinnen"}
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDelete}
              activeOpacity={0.6}
            >
              <SymbolView name="trash.fill" size={18} tintColor="#EF4444" />
              <Text style={styles.menuItemTextDanger}>Chat löschen</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuCancel}
              onPress={() => setContextMenu({ visible: false, conversation: null })}
              activeOpacity={0.6}
            >
              <Text style={styles.menuCancelText}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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

const pollStyles = StyleSheet.create({
  section: {
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.2,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  expandedScroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    flexDirection: "column",
  },
  cardWrap: {
    width: 220,
  },
  cardWrapExpanded: {
    width: "100%",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gray200,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
});

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
  title: { flex: 1, fontSize: 17, fontWeight: "600", color: colors.black, textAlign: "center" },
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
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
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

  // Context menu
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 34,
    paddingHorizontal: spacing.xl,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.black,
    textAlign: "center",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.black,
  },
  menuItemTextDanger: {
    fontSize: 16,
    fontWeight: "500",
    color: "#EF4444",
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gray200,
  },
  menuCancel: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  menuCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray500,
  },
});
