import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { Button } from "@/components/Button";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useQuery(api.events.get, id ? { id: id as Id<"events"> } : "skip");
  const purchaseTicket = useMutation(api.events.purchaseTicket);

  if (!event) {
    return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator color={colors.gray400} /></View></SafeAreaView>;
  }

  const isSoldOut = event.soldTickets >= event.totalTickets;
  const availableTickets = event.totalTickets - event.soldTickets;

  const handleBuy = async () => {
    try {
      const ticketId = await purchaseTicket({ eventId: event._id });
      router.push({ pathname: "/(main)/ticket", params: { id: ticketId } });
    } catch (e) {
      // handle
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageHeader}>
          {event.thumbnailUrl ? (
            <Image source={{ uri: event.thumbnailUrl }} style={styles.headerImage} contentFit="cover" />
          ) : (
            <View style={styles.headerPlaceholder}>
              <SymbolView name="calendar" size={40} tintColor={colors.gray300} />
            </View>
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.eventName}>{event.name}</Text>
          <View style={styles.detailRow}>
            <SymbolView name="calendar" size={18} tintColor={colors.gray500} />
            <Text style={styles.detailText}>{event.date} • {event.startTime} Uhr</Text>
          </View>
          {event.duration && (
            <View style={styles.detailRow}>
              <SymbolView name="clock" size={18} tintColor={colors.gray500} />
              <Text style={styles.detailText}>{event.duration}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <SymbolView name="mappin.and.ellipse" size={18} tintColor={colors.gray500} />
            <Text style={styles.detailText}>{event.venue}, {event.city}</Text>
          </View>
          <View style={styles.detailRow}>
            <SymbolView name="ticket" size={18} tintColor={colors.gray500} />
            <Text style={styles.detailText}>{availableTickets} von {event.totalTickets} Tickets verfügbar</Text>
          </View>

          {event.description && <Text style={styles.desc}>{event.description}</Text>}

          <View style={styles.priceBox}>
            <View>
              <Text style={styles.priceLabel}>Ticketpreis</Text>
              <Text style={styles.price}>€{event.ticketPrice.toFixed(2)}</Text>
            </View>
            <Button
              title={isSoldOut ? "Ausverkauft" : "Ticket kaufen"}
              onPress={handleBuy}
              disabled={isSoldOut}
              size="lg"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  imageHeader: { height: 260, backgroundColor: colors.gray100, position: "relative" },
  headerImage: { width: "100%", height: "100%" },
  headerPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: {
    position: "absolute", top: spacing.md, left: spacing.md,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center",
  },
  content: { padding: spacing.xl },
  eventName: { fontSize: 26, fontWeight: "700", color: colors.black, marginBottom: spacing.lg },
  detailRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  detailText: { fontSize: 15, color: colors.gray600 },
  desc: { fontSize: 15, color: colors.gray700, lineHeight: 22, marginTop: spacing.lg },
  priceBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xxl,
    padding: spacing.lg,
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  priceLabel: { fontSize: 13, color: colors.gray500 },
  price: { fontSize: 28, fontWeight: "800", color: colors.black },
});
