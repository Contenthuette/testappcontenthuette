import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";

interface EventItem {
  _id: string;
  name: string;
  date: string;
  city: string;
  venue: string;
  totalTickets: number;
  soldTickets: number;
}

function EventCard({ event }: { event: EventItem }) {
  const soldPct = event.totalTickets > 0
    ? Math.round((event.soldTickets / event.totalTickets) * 100)
    : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: "/(main)/event-admin-checkin" as "/",
          params: { eventId: event._id },
        })
      }
    >
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <SymbolView name="ticket" size={18} tintColor={colors.white} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {event.name}
          </Text>
          <Text style={styles.cardMeta}>
            {event.date} \u00b7 {event.venue}, {event.city}
          </Text>
        </View>
        <SymbolView name="chevron.right" size={14} tintColor={colors.gray300} />
      </View>

      {/* Ticket progress */}
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(soldPct, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {event.soldTickets}/{event.totalTickets} Tickets
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function EventAdminHub() {
  const { isAuthenticated } = useConvexAuth();
  const hasAccess = useQuery(
    api.eventAdmin.hasAccess,
    isAuthenticated ? {} : "skip",
  );
  const events = useQuery(
    api.eventAdmin.listMyEvents,
    isAuthenticated && hasAccess ? {} : "skip",
  );

  if (hasAccess === undefined || events === undefined) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.gray400} />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Einlass</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <SymbolView name="lock" size={36} tintColor={colors.gray300} />
          <Text style={styles.noAccessText}>Kein Zugang</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Einlass</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {events.length === 0 ? (
          <View style={styles.empty}>
            <SymbolView name="calendar" size={36} tintColor={colors.gray300} />
            <Text style={styles.emptyText}>Keine Events</Text>
          </View>
        ) : (
          events.map((event: EventItem) => (
            <EventCard key={event._id} event={event} />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  noAccessText: {
    fontSize: 15,
    color: colors.gray400,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    borderCurve: "continuous",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.2,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gray100,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.black,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray500,
    fontVariant: ["tabular-nums"],
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: { fontSize: 15, color: colors.gray400, fontWeight: "500" },
});
