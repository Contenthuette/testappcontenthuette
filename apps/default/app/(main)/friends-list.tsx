import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ArrowLeft } from "lucide-react-native";
import { colors, spacing } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import type { Id } from "@/convex/_generated/dataModel";

interface FriendItem {
  _id: Id<"users">;
  name: string;
  avatarUrl?: string;
  city?: string;
}

export default function FriendsListScreen() {
  const { userId, title } = useLocalSearchParams<{ userId: string; title?: string }>();
  const insets = useSafeAreaInsets();

  const friends = useQuery(
    api.friends.getFriendsOfUser,
    userId ? { userId: userId as Id<"users"> } : "skip",
  );

  const renderItem = ({ item }: { item: FriendItem }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.6}
      onPress={() =>
        router.navigate({ pathname: "/(main)/user-profile", params: { id: item._id } })
      }
    >
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" transition={0} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>{(item.name || "?")[0].toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        {item.city ? <Text style={styles.city} numberOfLines={1}>{item.city}</Text> : null}
      </View>
      <SymbolView name="chevron.right" size={14} tintColor={colors.gray300} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title || "Freunde"}</Text>
        <View style={styles.backBtn} />
      </View>

      {friends === undefined ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gray300} />
        </View>
      ) : friends.length === 0 ? (
        <View style={styles.center}>
          <SymbolView name="person.2" size={36} tintColor={colors.gray300} />
          <Text style={styles.emptyText}>Noch keine Freunde</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: colors.black,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  emptyText: { fontSize: 14, color: colors.gray400 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.gray400,
  },
  info: { flex: 1 },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.black,
  },
  city: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 2,
  },
});
