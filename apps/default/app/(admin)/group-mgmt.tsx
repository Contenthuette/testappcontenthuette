import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "expo-symbols";

export default function AdminGroupMgmt() {
  const groups = useQuery(api.admin.listGroups, {});

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Gruppenverwaltung</Text>
      </View>
      <FlatList
        data={groups}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.memberCount} Mitglieder \u2022 {item.city || "MV"}</Text>
            </View>
            <Text style={styles.visibility}>{item.visibility === "public" ? "\u00d6ffentlich" : "Einladung"}</Text>
          </View>
        )}
        ListEmptyComponent={groups === undefined ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.gray400} /> : null}
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
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  name: { fontSize: 16, fontWeight: "600", color: colors.black },
  meta: { fontSize: 13, color: colors.gray500, marginTop: 2 },
  visibility: { fontSize: 12, color: colors.gray500 },
});
