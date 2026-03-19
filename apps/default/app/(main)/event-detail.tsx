import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

function calcEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useQuery(api.events.getById, id ? { eventId: id as Id<"events"> } : "skip");
  const buyTicket = useMutation(api.events.buyTicket);
  const [buying, setBuying] = useState(false);

  if (!event) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><ActivityIndicator color={colors.gray300} /></View>
      </SafeAreaView>
    );
  }

  const isSoldOut = event.soldTickets >= event.totalTickets;
  const available = event.totalTickets - event.soldTickets;

  const handleBuy = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBuying(true);
    try {
      const result = await buyTicket({ eventId: event._id });
      router.push({ pathname: "/(main)/ticket", params: { id: result.ticketId } });
    } catch (_e) {
      if (Platform.OS !== "web") Alert.alert("Fehler", "Ticket konnte nicht gekauft werden.");
    } finally {
      setBuying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {event.thumbnailUrl ? (
            <Image source={{ uri: event.thumbnailUrl }} style={styles.heroImage} contentFit="cover" transition={300} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <SymbolView name="sparkles" size={40} tintColor={colors.gray300} />
            </View>
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => safeBack("event-detail")}>
            <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
          </TouchableOpacity>
          {isSoldOut && (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutLabel}>Ausverkauft</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.eventName}>{event.name}</Text>

          {/* Info rows */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <SymbolView name="calendar" size={18} tintColor={colors.gray500} />
              </View>
              <View>
                <Text style={styles.infoLabel}>{event.date}</Text>
                <Text style={styles.infoSub}>Start: {event.startTime} Uhr · Ende: {calcEndTime(event.startTime, event.durationMinutes)} Uhr</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <SymbolView name="mappin.and.ellipse" size={18} tintColor={colors.gray500} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{event.venue}</Text>
                <Text style={styles.infoSub}>{event.city}</Text>
              </View>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={styles.infoIcon}>
                <SymbolView name="ticket" size={18} tintColor={colors.gray500} />
              </View>
              <View>
                <Text style={styles.infoLabel}>
                  {isSoldOut ? "Ausverkauft" : `${available} Tickets verfügbar`}
                </Text>
                <Text style={styles.infoSub}>von {event.totalTickets} gesamt</Text>
              </View>
            </View>
          </View>

          {event.description && <Text style={styles.desc}>{event.description}</Text>}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.priceLabel}>Preis</Text>
          <Text style={styles.price}>€{event.ticketPrice.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.buyBtn, (isSoldOut || buying) && styles.buyBtnDisabled]}
          onPress={handleBuy}
          disabled={isSoldOut || buying}
          activeOpacity={0.7}
        >
          {buying ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.buyBtnText}>
              {isSoldOut ? "Ausverkauft" : "Ticket kaufen"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  hero: { height: 280, backgroundColor: colors.gray100, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.08)",
  },
  soldOutOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: colors.black,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  soldOutLabel: { fontSize: 12, fontWeight: "700", color: colors.white },

  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: 120 },
  eventName: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.4,
    marginBottom: spacing.lg,
  },

  infoCard: {
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    borderCurve: "continuous",
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontSize: 15, fontWeight: "600", color: colors.black },
  infoSub: { fontSize: 13, color: colors.gray500, marginTop: 1 },

  desc: { fontSize: 15, color: colors.gray600, lineHeight: 23, letterSpacing: -0.1 },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 40 : spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
  },
  priceLabel: { fontSize: 12, color: colors.gray500 },
  price: { fontSize: 24, fontWeight: "800", color: colors.black, fontVariant: ["tabular-nums"] },
  buyBtn: {
    paddingHorizontal: 28,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  buyBtnDisabled: { opacity: 0.35 },
  buyBtnText: { fontSize: 16, fontWeight: "700", color: colors.white },
});
