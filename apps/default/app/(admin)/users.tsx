import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "expo-symbols";

export default function AdminUsersScreen() {
  const users = useQuery(api.admin.listUsers, {});

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Nutzerverwaltung</Text>
      </View>
      <FlatList
        data={users}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.avatarUrl} name={item.name} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: item.subscriptionStatus === "active" ? colors.success : colors.gray400 }]}>
              <Text style={styles.badgeText}>{item.subscriptionStatus}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={users === undefined ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.gray400} /> : null}
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
  name: { fontSize: 16, fontWeight: "600", color: colors.black },
  email: { fontSize: 13, color: colors.gray500, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: "600", color: colors.white, textTransform: "capitalize" },
});
