import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  ScrollView, LayoutAnimation, UIManager, Platform as RNPlatform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "@/components/Icon";
import { PollCard } from "@/components/PollCard";
import Animated, { FadeIn } from "react-native-reanimated";
import { useMutation } from "convex/react";

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
      {/* Separator line */}
      <View style={pollStyles.separator} />
    </Animated.View>
  );
}

export default function ConversationsScreen() {
  const { isAuthenticated } = useConvexAuth();
  const markAllConversationsAsRead = useMutation(api.messaging.markAllConversationsAsRead);
  const conversations = useQuery(api.messaging.listConversations, isAuthenticated ? {} : "skip");

  // Mark all conversations as read when opening this screen
  useEffect(() => {
    if (isAuthenticated) {
      markAllConversationsAsRead().catch(() => {});
    }
  }, [isAuthenticated, markAllConversationsAsRead]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("conversations")} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Nachrichten</Text>
        <TouchableOpacity style={styles.composeBtn} hitSlop={12}>
          <SymbolView name="square.and.pencil" size={20} tintColor={colors.black} />
        </TouchableOpacity>
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
  composeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
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
