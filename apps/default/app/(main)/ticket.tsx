import React from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { ZLogo } from "@/components/ZLogo";
import { SymbolView } from "@/components/Icon";

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useConvexAuth();
  const tickets = useQuery(api.events.getMyTickets, isAuthenticated ? undefined : "skip");
  const ticket = tickets?.find((t: { _id: string }) => t._id === id);

  if (!ticket) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><ActivityIndicator color={colors.gray300} /></View>
      </SafeAreaView>
    );
  }

  const statusConfig: Record<string, { color: string; label: string }> = {
    active: { color: colors.success, label: "G\u00fcltig" },
    scanned: { color: colors.gray500, label: "Eingel\u00f6st" },
    canceled: { color: colors.danger, label: "Storniert" },
    expired: { color: colors.gray400, label: "Abgelaufen" },
  };
  const status = statusConfig[ticket.status] ?? statusConfig.expired;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Close */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => safeBack("ticket")} hitSlop={12}>
          <SymbolView name="xmark" size={18} tintColor={colors.gray500} />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          {/* Card top */}
          <View style={styles.cardTop}>
            <ZLogo size={24} />
            <View style={[styles.statusPill, { backgroundColor: status.color }]}>
              <Text style={styles.statusText}>{status.label}</Text>
            </View>
          </View>

          <Text style={styles.eventName}>{ticket.eventName}</Text>
          <Text style={styles.eventMeta}>{ticket.eventDate}</Text>
          <Text style={styles.eventMeta}>{ticket.eventVenue}, {ticket.eventCity}</Text>

          {/* Tear line */}
          <View style={styles.tearLine}>
            <View style={styles.tearCircle} />
            <View style={styles.tearDash} />
            <View style={styles.tearCircle} />
          </View>

          {/* Buyer info instead of QR */}
          <View style={styles.buyerSection}>
            <View style={styles.buyerIconCircle}>
              <SymbolView name="person.fill" size={28} tintColor={colors.black} />
            </View>

            <View style={styles.buyerField}>
              <Text style={styles.buyerLabel}>Name</Text>
              <Text style={styles.buyerValue}>{ticket.buyerName}</Text>
            </View>

            <View style={styles.buyerField}>
              <Text style={styles.buyerLabel}>E-Mail</Text>
              <Text style={styles.buyerValue} selectable>{ticket.buyerEmail}</Text>
            </View>
          </View>

          <Text style={styles.ticketId}>Ticket #{ticket._id.slice(-8).toUpperCase()}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray100 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },

  container: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.xxl },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderCurve: "continuous",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusText: { fontSize: 12, fontWeight: "700", color: colors.white, letterSpacing: 0.5 },

  eventName: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.3,
  },
  eventMeta: { fontSize: 14, color: colors.gray500, marginTop: 4 },

  tearLine: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xxl,
    marginHorizontal: -spacing.xxl,
  },
  tearCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gray100,
  },
  tearDash: {
    flex: 1,
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: colors.gray200,
  },

  buyerSection: { alignItems: "center", paddingVertical: spacing.md, gap: spacing.lg },
  buyerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  buyerField: { alignItems: "center" },
  buyerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  buyerValue: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.black,
  },

  ticketId: {
    fontSize: 12,
    color: colors.gray400,
    textAlign: "center",
    marginTop: spacing.lg,
    letterSpacing: 0.5,
  },
});
