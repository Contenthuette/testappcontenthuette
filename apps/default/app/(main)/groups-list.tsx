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
import { ArrowLeft } from "lucide-react-native";
import { colors, spacing } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import type { Id } from "@/convex/_generated/dataModel";

interface GroupItem {
  groupId: Id<"groups">;
  groupName: string;
  role: "admin" | "member";
}

export default function GroupsListScreen() {
  const { userId, title } = useLocalSearchParams<{ userId: string; title?: string }>();
  const insets = useSafeAreaInsets();

  const groups = useQuery(
    api.users.getUserGroups,
    userId ? { userId: userId as Id<"users"> } : "skip",
  );

  const renderItem = ({ item }: { item: GroupItem }) => (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.6}
      onPress={() =>
        router.navigate(`/(main)/group-detail?id=${item.groupId}` as "/")
      }
    >
      <View style={styles.groupIcon}>
        <SymbolView name="person.3.fill" size={16} tintColor={colors.gray500} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.groupName}</Text>
        <Text style={styles.role}>
          {item.role === "admin" ? "Gruppenadmin" : "Mitglied"}
        </Text>
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
        <Text style={styles.headerTitle}>{title || "Gruppen"}</Text>
        <View style={styles.backBtn} />
      </View>

      {groups === undefined ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gray300} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <SymbolView name="person.3" size={36} tintColor={colors.gray300} />
          <Text style={styles.emptyText}>Keine Gruppen</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.groupId}
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
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: colors.gray50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  info: { flex: 1 },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.black,
  },
  role: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 2,
  },
});
