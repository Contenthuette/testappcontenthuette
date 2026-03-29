import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import { EventVideoPlayer } from "@/components/EventVideoPlayer";
import { RedactedBar } from "@/components/RedactedBar";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

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

  if (!event) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><ActivityIndicator color={colors.gray300} /></View>
      </SafeAreaView>
    );
  }

  const isInfoHidden = !!(
    event.blurDate || event.blurTime || event.blurVenue ||
    event.blurCity || event.blurPrice || event.blurDescription
  );
  const hasTicketLink = !!event.ticketUrl;

  const handleTicket = async () => {
    if (!event.ticketUrl) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await WebBrowser.openBrowserAsync(event.ticketUrl);
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
        </View>

        <View style={styles.content}>
          <Text style={styles.eventName}>{event.name}</Text>

          {/* Hidden-info notice */}
          {isInfoHidden && (
            <View style={styles.hiddenBadge}>
              <SymbolView name="eye.slash" size={13} tintColor={colors.gray400} />
              <Text style={styles.hiddenBadgeText}>Details werden bald bekannt gegeben</Text>
            </View>
          )}

          {/* Info card */}
          <View style={styles.infoCard}>
            {/* Date / Time */}
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <SymbolView name="calendar" size={18} tintColor={colors.gray500} />
              </View>
              {isInfoHidden ? (
                <View style={styles.infoTextWrap}>
                  <RedactedBar width={110} height={14} />
                  <View style={{ height: 5 }} />
                  <RedactedBar width={170} height={11} />
                </View>
              ) : (
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>{event.date}</Text>
                  <Text style={styles.infoSub}>
                    Start: {event.startTime} Uhr · Ende: {calcEndTime(event.startTime, event.durationMinutes)} Uhr
                  </Text>
                </View>
              )}
            </View>

            {/* Venue / City */}
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <SymbolView name="mappin.and.ellipse" size={18} tintColor={colors.gray500} />
              </View>
              {isInfoHidden ? (
                <View style={styles.infoTextWrap}>
                  <RedactedBar width={130} height={14} />
                  <View style={{ height: 5 }} />
                  <RedactedBar width={80} height={11} />
                </View>
              ) : (
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>{event.venue}</Text>
                  <Text style={styles.infoSub}>{event.city}</Text>
                </View>
              )}
            </View>

            {/* Price */}
            {event.ticketPrice > 0 && (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <View style={styles.infoIcon}>
                  <SymbolView name="ticket" size={18} tintColor={colors.gray500} />
                </View>
                {isInfoHidden ? (
                  <View style={styles.infoTextWrap}>
                    <RedactedBar width={70} height={14} />
                    <View style={{ height: 5 }} />
                    <RedactedBar width={90} height={11} />
                  </View>
                ) : (
                  <View style={styles.infoTextWrap}>
                    <Text style={styles.infoLabel}>€{event.ticketPrice.toFixed(2)}</Text>
                    <Text style={styles.infoSub}>Ticketpreis</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Video player */}
          {event.videoUrl && (
            <EventVideoPlayer
              videoUrl={event.videoUrl}
              thumbnailUrl={event.videoThumbnailUrl}
            />
          )}

          {/* Description */}
          {event.description && !isInfoHidden && (
            <Text style={styles.desc}>{event.description}</Text>
          )}
          {isInfoHidden && (
            <View style={styles.redactedDesc}>
              <RedactedBar width="90%" height={13} />
              <RedactedBar width="72%" height={13} />
              <RedactedBar width="83%" height={13} />
              <RedactedBar width="55%" height={13} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      {hasTicketLink && (
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.priceLabel}>Preis</Text>
            {isInfoHidden ? (
              <View style={{ marginTop: 4 }}>
                <RedactedBar width={60} height={20} />
              </View>
            ) : (
              <Text style={styles.price}>€{event.ticketPrice.toFixed(2)}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.buyBtn}
            onPress={handleTicket}
            activeOpacity={0.7}
          >
            <SymbolView name="arrow.up.right" size={16} tintColor={colors.white} />
            <Text style={styles.buyBtnText}>Ticket sichern</Text>
          </TouchableOpacity>
        </View>
      )}
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

  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: 120 },
  eventName: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.4,
    marginBottom: spacing.md,
  },

  hiddenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.gray50,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderCurve: "continuous",
    alignSelf: "flex-start",
    marginBottom: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  hiddenBadgeText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.gray400,
    letterSpacing: -0.1,
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
  infoTextWrap: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    minWidth: 120,
  },
  infoLabel: { fontSize: 15, fontWeight: "600", color: colors.black },
  infoSub: { fontSize: 13, color: colors.gray500, marginTop: 1 },

  redactedDesc: {
    gap: 8,
    marginTop: spacing.sm,
  },

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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.black,
    justifyContent: "center",
  },
  buyBtnText: { fontSize: 16, fontWeight: "700", color: colors.white },
});
