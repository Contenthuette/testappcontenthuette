import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "@/components/Icon";

export default function MyTicketsScreen() {
  const { isAuthenticated } = useConvexAuth();
  const tickets = useQuery(api.events.getMyTickets, isAuthenticated ? {} : "skip");

  const statusConfig: Record<string, { color: string; label: string }> = {
    active: { color: colors.success, label: "Gültig" },
    scanned: { color: colors.gray500, label: "Eingelöst" },
    canceled: { color: colors.danger, label: "Storniert" },
    expired: { color: colors.gray400, label: "Abgelaufen" },
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("my-tickets")} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Meine Tickets</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={tickets}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const s = statusConfig[item.status] ?? statusConfig.expired;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: "/(main)/ticket", params: { id: item._id } })}
              activeOpacity={0.65}
            >
              <View style={styles.cardBody}>
                <Text style={styles.eventName} numberOfLines={1}>{item.eventName}</Text>
                <View style={styles.infoRow}>
                  <SymbolView name="calendar" size={12} tintColor={colors.gray400} />
                  <Text style={styles.infoText}>{item.eventDate}</Text>
                </View>
                <View style={styles.infoRow}>
                  <SymbolView name="mappin" size={12} tintColor={colors.gray400} />
                  <Text style={styles.infoText}>{item.eventVenue}, {item.eventCity}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <View style={[styles.statusPill, { backgroundColor: s.color }]}>
                  <Text style={styles.statusText}>{s.label}</Text>
                </View>
                <SymbolView name="chevron.right" size={13} tintColor={colors.gray300} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          tickets === undefined ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={colors.gray300} /></View>
          ) : (
            <EmptyState
              icon="ticket"
              title="Keine Tickets"
              subtitle="Tickets für Events in MV erscheinen hier."
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

  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    marginBottom: spacing.sm,
    borderCurve: "continuous",
  },
  cardBody: { flex: 1, gap: 4 },
  eventName: { fontSize: 16, fontWeight: "600", color: colors.black, letterSpacing: -0.2 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 13, color: colors.gray500 },
  cardRight: { alignItems: "flex-end", gap: spacing.sm },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: { fontSize: 11, fontWeight: "700", color: colors.white, letterSpacing: 0.3 },
});
