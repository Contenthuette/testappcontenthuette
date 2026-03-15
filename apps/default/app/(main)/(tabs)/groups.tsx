import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { ZLogo } from "@/components/ZLogo";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

type Tab = "groups" | "people";

/* ─── Announcement Banner ─── */
function AnnouncementBanner() {
  const announcement = useQuery(api.admin.getActiveAnnouncement);
  if (!announcement) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.announceBanner}
    >
      <SymbolView name="exclamationmark.circle.fill" size={22} tintColor={colors.white} />
      <Text style={styles.announceText} numberOfLines={2}>
        {announcement.text}
      </Text>
    </Animated.View>
  );
}

export default function GroupsScreen() {
  const { isAuthenticated } = useConvexAuth();
  const [tab, setTab] = useState<Tab>("groups");
  const [searchQuery, setSearchQuery] = useState("");

  const groups = useQuery(api.groups.list, isAuthenticated && tab === "groups" ? { searchQuery: searchQuery || undefined } : "skip");
  const people = useQuery(api.users.listAll, isAuthenticated && tab === "people" ? { searchQuery: searchQuery || undefined } : "skip");
  const joinGroup = useMutation(api.groups.join);

  const handleJoin = async (groupId: Id<"groups">) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await joinGroup({ groupId });
    } catch { /* already member */ }
  };

  const switchTab = (t: Tab) => {
    if (t !== tab) {
      if (Platform.OS !== "web") Haptics.selectionAsync();
      setTab(t);
      setSearchQuery("");
    }
  };

  const renderGroup = ({ item }: { item: NonNullable<typeof groups>[number] }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: "/(main)/group-detail", params: { id: item._id } })}
      activeOpacity={0.65}
    >
      <View style={styles.cardThumb}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbImage} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <SymbolView name="person.3.fill" size={22} tintColor={colors.gray300} />
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {[item.city || item.county, item.topic].filter(Boolean).join(" · ")}
        </Text>
        <Text style={styles.cardMembers}>
          {item.memberCount} {item.memberCount === 1 ? "Mitglied" : "Mitglieder"}
        </Text>
      </View>
      {item.isMember ? (
        <View style={styles.joinedPill}>
          <SymbolView name="checkmark" size={12} tintColor={colors.gray500} />
          <Text style={styles.joinedText}>Dabei</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.joinPill}
          onPress={() => handleJoin(item._id)}
          activeOpacity={0.7}
        >
          <Text style={styles.joinText}>Beitreten</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderPerson = ({ item }: { item: NonNullable<typeof people>[number] }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: "/(main)/user-profile", params: { id: item._id } })}
      activeOpacity={0.65}
    >
      <View style={styles.avatarWrap}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} contentFit="cover" transition={200} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <SymbolView name="person.fill" size={20} tintColor={colors.gray300} />
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        {item.city ? <Text style={styles.cardMeta} numberOfLines={1}>{item.city}</Text> : null}
        {item.interests && item.interests.length > 0 ? (
          <Text style={styles.cardInterests} numberOfLines={1}>
            {item.interests.slice(0, 3).join(" · ")}
          </Text>
        ) : null}
      </View>
      <View style={styles.arrowWrap}>
        <SymbolView name="chevron.right" size={14} tintColor={colors.gray300} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <ZLogo size={47} />
        <Text style={styles.headerTitle}>Community</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => router.push("/(main)/conversations")} style={styles.iconBtn}>
          <SymbolView name="bubble.left.and.bubble.right" size={22} tintColor={colors.black} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/(main)/notifications")} style={styles.iconBtn}>
          <SymbolView name="bell" size={22} tintColor={colors.black} />
        </TouchableOpacity>
      </View>

      {/* Announcement Banner */}
      <AnnouncementBanner />

      {/* Tab Toggle */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "groups" && styles.tabBtnActive]}
          onPress={() => switchTab("groups")}
          activeOpacity={0.7}
        >
          <SymbolView name="person.3" size={16} tintColor={tab === "groups" ? colors.white : colors.gray500} />
          <Text style={[styles.tabText, tab === "groups" && styles.tabTextActive]}>Gruppen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "people" && styles.tabBtnActive]}
          onPress={() => switchTab("people")}
          activeOpacity={0.7}
        >
          <SymbolView name="person" size={16} tintColor={tab === "people" ? colors.white : colors.gray500} />
          <Text style={[styles.tabText, tab === "people" && styles.tabTextActive]}>Personen</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <SymbolView name="magnifyingglass" size={16} tintColor={colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder={tab === "groups" ? "Name oder Interesse suchen…" : "Name oder Interesse suchen…"}
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <SymbolView name="xmark.circle.fill" size={16} tintColor={colors.gray300} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {tab === "groups" ? (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            groups === undefined ? (
              <View style={styles.loadingWrap}><ActivityIndicator color={colors.gray300} /></View>
            ) : (
              <EmptyState
                icon="person.3"
                title="Keine Gruppen gefunden"
                subtitle="Erstelle die erste Gruppe und vernetze deine Community in MV."
              />
            )
          }
        />
      ) : (
        <FlatList
          data={people}
          renderItem={renderPerson}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            people === undefined ? (
              <View style={styles.loadingWrap}><ActivityIndicator color={colors.gray300} /></View>
            ) : (
              <EmptyState
                icon="person"
                title="Keine Personen gefunden"
                subtitle="Alle Z-Mitglieder werden hier angezeigt."
              />
            )
          }
        />
      )}

      {/* FAB for groups */}
      {tab === "groups" && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/(main)/create-group")}
          activeOpacity={0.8}
        >
          <SymbolView name="plus" size={22} tintColor={colors.white} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },

  /* Announcement Banner */
  announceBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.black,
    borderRadius: radius.full,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    borderCurve: "continuous",
  },
  announceIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  announceText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.white,
    letterSpacing: -0.1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Tab Toggle */
  tabRow: {
    flexDirection: "row",
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.gray100,
    borderRadius: radius.full,
    padding: 3,
    gap: 0,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: radius.full,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: colors.black,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray500,
    letterSpacing: -0.2,
  },
  tabTextActive: {
    color: colors.white,
  },

  /* Search */
  searchWrap: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray100,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 42,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.black, letterSpacing: -0.2 },

  /* List */
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    borderCurve: "continuous",
    gap: spacing.md,
  },
  cardThumb: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.gray100,
  },
  thumbImage: { width: 54, height: 54 },
  thumbPlaceholder: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: colors.gray100,
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 2 },
  cardName: { fontSize: 16, fontWeight: "600", color: colors.black, letterSpacing: -0.2 },
  cardMeta: { fontSize: 13, color: colors.gray500, letterSpacing: -0.1 },
  cardInterests: { fontSize: 12, color: colors.gray400, marginTop: 1, letterSpacing: -0.1 },
  cardMembers: { fontSize: 12, color: colors.gray400, marginTop: 1 },
  joinedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  joinedText: { fontSize: 13, fontWeight: "600", color: colors.gray500 },
  joinPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.black,
  },
  joinText: { fontSize: 13, fontWeight: "600", color: colors.white },
  arrowWrap: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    bottom: 110,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.lg,
  },
});
