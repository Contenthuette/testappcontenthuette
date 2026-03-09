import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { ZLogo } from "@/components/ZLogo";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";

export default function GroupsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const groups = useQuery(api.groups.list, { searchQuery: searchQuery || undefined });

  const renderGroup = ({ item }: { item: NonNullable<typeof groups>[number] }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: "/(main)/group-detail", params: { id: item._id } })}
      activeOpacity={0.7}
    >
      <View style={styles.cardThumb}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbImage} contentFit="cover" />
        ) : (
          <SymbolView name="person.3.fill" size={24} tintColor={colors.gray400} />
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {item.city || item.county || "MV"} {item.topic ? `• ${item.topic}` : ""}
        </Text>
        <Text style={styles.cardMembers}>{item.memberCount} Mitglieder</Text>
      </View>
      {item.isMember ? (
        <View style={styles.joinedBadge}>
          <Text style={styles.joinedText}>Beigetreten</Text>
        </View>
      ) : (
        <View style={styles.joinBtn}>
          <Text style={styles.joinBtnText}>Beitreten</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <ZLogo size={32} />
        <Text style={styles.headerTitle}>Gruppen</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => router.push("/(main)/conversations")} style={styles.iconBtn}>
            <SymbolView name="bubble.left.and.bubble.right" size={22} tintColor={colors.black} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(main)/notifications")} style={styles.iconBtn}>
            <SymbolView name="bell" size={22} tintColor={colors.black} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <SymbolView name="magnifyingglass" size={16} tintColor={colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Gruppen suchen..."
            placeholderTextColor={colors.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity onPress={() => router.push("/(main)/search")} style={styles.filterBtn}>
          <SymbolView name="slider.horizontal.3" size={18} tintColor={colors.black} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          groups === undefined ? null : (
            <EmptyState icon="person.3" title="Keine Gruppen" subtitle="Erstelle die erste Gruppe für deine Community" />
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(main)/create-group")}
        activeOpacity={0.8}
      >
        <SymbolView name="plus" size={24} tintColor={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: colors.black, flex: 1 },
  headerIcons: { flexDirection: "row", gap: spacing.xs },
  iconBtn: { padding: spacing.sm },
  searchRow: {
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
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 40,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.black },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray100,
    borderCurve: "continuous",
    ...shadows.sm,
  },
  cardThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: { width: 56, height: 56 },
  cardContent: { flex: 1, marginLeft: spacing.md },
  cardName: { fontSize: 16, fontWeight: "600", color: colors.black },
  cardMeta: { fontSize: 13, color: colors.gray500, marginTop: 2 },
  cardMembers: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  joinedBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  joinedText: { fontSize: 12, fontWeight: "600", color: colors.gray500 },
  joinBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.black,
  },
  joinBtnText: { fontSize: 12, fontWeight: "600", color: colors.white },
  fab: {
    position: "absolute",
    bottom: 100,
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
