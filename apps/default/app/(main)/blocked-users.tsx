import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "expo-symbols";

export default function BlockedUsersScreen() {
  const blocked = useQuery(api.users.getBlockedUsers);
  const unblockUser = useMutation(api.users.unblockUser);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Blockierte Nutzer</Text>
      </View>
      <FlatList
        data={blocked}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={undefined} name={item.blockedName} size={44} />
            <Text style={styles.name}>{item.blockedName}</Text>
            <TouchableOpacity style={styles.unblockBtn} onPress={() => unblockUser({ blockId: item._id })}>
              <Text style={styles.unblockText}>Entsperren</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          blocked === undefined ? null : (
            <EmptyState icon="hand.raised" title="Niemand blockiert" subtitle="Blockierte Nutzer erscheinen hier" />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { fontSize: 22, fontWeight: "700", color: colors.black },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  name: { flex: 1, fontSize: 16, fontWeight: "500", color: colors.black },
  unblockBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: colors.gray300 },
  unblockText: { fontSize: 13, fontWeight: "600", color: colors.gray600 },
});
