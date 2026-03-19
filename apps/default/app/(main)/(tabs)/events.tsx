import React from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { EmptyState } from "@/components/EmptyState";
import { SymbolView } from "@/components/Icon";
import { ZLogo } from "@/components/ZLogo";
import { Image } from "expo-image";

function calcEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export default function EventsScreen() {
  const events = useQuery(api.events.list, {});

  const renderEvent = ({ item }: { item: NonNullable<typeof events>[number] }) => {
    const isSoldOut = item.soldTickets >= item.totalTickets;
    const available = item.totalTickets - item.soldTickets;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: "/(main)/event-detail", params: { id: item._id } })}
        activeOpacity={0.65}
      >
        <View style={styles.cardImageWrap}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.cardImage} contentFit="cover" transition={200} />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <SymbolView name="sparkles" size={32} tintColor={colors.gray300} />
            </View>
          )}
          {isSoldOut && (
            <View style={styles.soldOutBadge}>
              <Text style={styles.soldOutText}>Ausverkauft</Text>
            </View>
          )}
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>€{item.ticketPrice.toFixed(0)}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.infoRow}>
            <SymbolView name="mappin" size={13} tintColor={colors.gray400} />
            <Text style={styles.infoText}>{item.venue}, {item.city}</Text>
          </View>
          <View style={styles.infoRow}>
            <SymbolView name="calendar" size={13} tintColor={colors.gray400} />
            <Text style={styles.infoText}>{item.date} · {item.startTime} - {calcEndTime(item.startTime, item.durationMinutes)} Uhr</Text>
          </View>
          <View style={styles.cardFooter}>
            <Text style={[styles.ticketCount, isSoldOut && styles.ticketCountDim]}>
              {isSoldOut ? "Ausverkauft" : `${available} Ticket${available !== 1 ? "s" : ""} verfügbar`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <ZLogo size={47} />
        <Text style={styles.headerTitle}>Events</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => router.push("/(main)/my-tickets")} style={styles.ticketBtn} activeOpacity={0.7}>
          <SymbolView name="ticket" size={18} tintColor={colors.black} />
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
          events === undefined ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.gray300} />
            </View>
          ) : (
            <EmptyState
              icon="sparkles"
              title="Keine Events gerade"
              subtitle="Neue Events in Schwerin, Rostock und ganz MV erscheinen hier."
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: colors.black, letterSpacing: -0.5 },
  ticketBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  ticketBtnText: { fontSize: 14, fontWeight: "600", color: colors.black },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  cardImageWrap: { height: 180, backgroundColor: colors.gray100, position: "relative" },
  cardImage: { width: "100%", height: "100%" },
  cardImagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  soldOutBadge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.black,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  soldOutText: { fontSize: 11, fontWeight: "700", color: colors.white, letterSpacing: 0.5 },
  priceBadge: {
    position: "absolute",
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priceText: { fontSize: 16, fontWeight: "800", color: colors.white },
  cardBody: { padding: spacing.lg },
  cardName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  infoText: { fontSize: 14, color: colors.gray500, letterSpacing: -0.1, flex: 1 },
  cardFooter: { marginTop: spacing.sm },
  ticketCount: { fontSize: 13, fontWeight: "600", color: colors.black },
  ticketCountDim: { color: colors.gray400 },
});
