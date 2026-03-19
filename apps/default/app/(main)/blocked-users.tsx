import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "@/components/Icon";

export default function BlockedUsersScreen() {
  const blocked = useQuery(api.users.getBlockedUsers);
  const unblockUser = useMutation(api.users.unblockUser);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("blocked-users")} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Blockierte Nutzer</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={blocked}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={undefined} name={item.blockedName} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.blockedName}</Text>
            </View>
            <TouchableOpacity
              style={styles.unblockBtn}
              onPress={() => unblockUser({ blockId: item._id })}
              activeOpacity={0.6}
            >
              <Text style={styles.unblockText}>Entsperren</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          blocked === undefined ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={colors.gray300} /></View>
          ) : (
            <EmptyState
              icon="hand.raised"
              title="Niemand blockiert"
              subtitle="Blockierte Nutzer werden hier angezeigt."
            />
          )
        }
      />
    </SafeAreaView>
  );
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
  list: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  name: { fontSize: 16, fontWeight: "500", color: colors.black, letterSpacing: -0.2 },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  unblockText: { fontSize: 13, fontWeight: "600", color: colors.gray600 },
});
