import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import { EmptyState } from "@/components/EmptyState";

export default function ModerationScreen() {
  const reports = useQuery(api.admin.listReports, {});
  const resolveReport = useMutation(api.admin.resolveReport);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Moderation</Text>
      </View>
      <FlatList
        data={reports}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeBadge, { backgroundColor: item.status === "pending" ? colors.danger : colors.success }]}>
                <Text style={styles.typeText}>{item.type}</Text>
              </View>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString("de-DE")}</Text>
            </View>
            <Text style={styles.reason}>{item.reason}</Text>
            {item.status === "pending" && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.resolveBtn} onPress={() => resolveReport({ reportId: item._id, status: "reviewed" })}>
                  <Text style={styles.resolveText}>Abweisen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.resolveBtn, styles.actionBtn]} onPress={() => resolveReport({ reportId: item._id, status: "resolved" })}>
                  <Text style={[styles.resolveText, styles.actionText]}>Ma\u00dfnahme ergreifen</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          reports === undefined ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.gray400} /> : (
            <EmptyState icon="shield.checkered" title="Keine Reports" subtitle="Alle Reports wurden bearbeitet" />
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
  card: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  typeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  typeText: { fontSize: 11, fontWeight: "700", color: colors.white, textTransform: "uppercase" },
  date: { fontSize: 12, color: colors.gray400 },
  reason: { fontSize: 15, color: colors.gray700, lineHeight: 22 },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  resolveBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray300 },
  actionBtn: { backgroundColor: colors.black, borderColor: colors.black },
  resolveText: { fontSize: 13, fontWeight: "600", color: colors.gray600 },
  actionText: { color: colors.white },
});
