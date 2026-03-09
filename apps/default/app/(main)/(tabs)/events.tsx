import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";

export default function EventsScreen() {
  const events = useQuery(api.events.list, {});

  const renderEvent = ({ item }: { item: NonNullable<typeof events>[number] }) => {
    const isSoldOut = item.soldTickets >= item.totalTickets;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: "/(main)/event-detail", params: { id: item._id } })}
        activeOpacity={0.7}
      >
        <View style={styles.cardImage}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <SymbolView name="calendar" size={32} tintColor={colors.gray300} />
            </View>
          )}
          {isSoldOut && (
            <View style={styles.soldOutBadge}><Text style={styles.soldOutText}>Ausverkauft</Text></View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cardInfo}>{item.date} • {item.startTime} Uhr</Text>
          <Text style={styles.cardInfo}>{item.venue}, {item.city}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.ticketInfo}>
              {item.totalTickets - item.soldTickets} Tickets verfügbar
            </Text>
            <Text style={styles.price}>€{item.ticketPrice.toFixed(2)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity onPress={() => router.push("/(main)/my-tickets")} style={styles.ticketBtn}>
          <SymbolView name="ticket" size={20} tintColor={colors.black} />
          <Text style={styles.ticketBtnText}>Meine Tickets</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          events === undefined ? null : (
            <EmptyState icon="calendar" title="Keine Events" subtitle="Events in MV werden hier angezeigt" />
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
  headerTitle: { fontSize: 22, fontWeight: "700", color: colors.black },
  ticketBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, padding: spacing.sm },
  ticketBtnText: { fontSize: 14, fontWeight: "500", color: colors.black },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray100,
    overflow: "hidden",
    borderCurve: "continuous",
    ...shadows.sm,
  },
  cardImage: { height: 180, backgroundColor: colors.gray100 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  soldOutBadge: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  soldOutText: { fontSize: 12, fontWeight: "700", color: colors.white },
  cardBody: { padding: spacing.lg },
  cardName: { fontSize: 18, fontWeight: "700", color: colors.black, marginBottom: spacing.xs },
  cardInfo: { fontSize: 14, color: colors.gray500, marginTop: 2 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md },
  ticketInfo: { fontSize: 13, color: colors.gray500 },
  price: { fontSize: 18, fontWeight: "700", color: colors.black },
});
