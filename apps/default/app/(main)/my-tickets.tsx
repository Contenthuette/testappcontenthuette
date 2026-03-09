import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "expo-symbols";

export default function MyTicketsScreen() {
  const tickets = useQuery(api.events.getMyTickets, {});

  const statusColors: Record<string, string> = {
    active: colors.success,
    scanned: colors.gray500,
    canceled: colors.danger,
    expired: colors.gray400,
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Meine Tickets</Text>
      </View>
      <FlatList
        data={tickets}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: "/(main)/ticket", params: { id: item._id } })}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.eventName}>{item.eventName}</Text>
              <Text style={styles.eventInfo}>{item.eventDate} \u2022 {item.eventCity}</Text>
              <Text style={styles.eventInfo}>{item.eventVenue}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: statusColors[item.status] || colors.gray400 }]} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          tickets === undefined ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.gray400} /> : (
            <EmptyState icon="ticket" title="Keine Tickets" subtitle="Kaufe Tickets f\u00fcr Events" />
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
  card: {
    flexDirection: "row", alignItems: "center",
    padding: spacing.lg, backgroundColor: colors.white,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray100,
    marginBottom: spacing.md, ...shadows.sm,
  },
  cardLeft: { flex: 1 },
  eventName: { fontSize: 16, fontWeight: "600", color: colors.black },
  eventInfo: { fontSize: 13, color: colors.gray500, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
});
