import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { SymbolView } from "expo-symbols";

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticket = useQuery(api.events.getTicket, id ? { id: id as Id<"tickets"> } : "skip");

  if (!ticket) {
    return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator color={colors.gray400} /></View></SafeAreaView>;
  }

  const statusColors: Record<string, string> = {
    active: colors.success,
    scanned: colors.gray500,
    canceled: colors.danger,
    expired: colors.gray400,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <SymbolView name="xmark" size={20} tintColor={colors.black} />
      </TouchableOpacity>

      <View style={styles.container}>
        <View style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketLabel}>DIGITAL TICKET</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[ticket.status] || colors.gray400 }]}>
              <Text style={styles.statusText}>{ticket.status.toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.eventName}>{ticket.eventName}</Text>
          <Text style={styles.eventInfo}>{ticket.eventDate} • {ticket.eventTime}</Text>
          <Text style={styles.eventInfo}>{ticket.eventVenue}, {ticket.eventCity}</Text>

          <View style={styles.divider} />

          {/* QR Code Placeholder */}
          <View style={styles.qrContainer}>
            <View style={styles.qrBox}>
              <SymbolView name="qrcode" size={120} tintColor={colors.black} />
            </View>
            <Text style={styles.qrCode}>{ticket.qrCode}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.ticketFooter}>
            <Text style={styles.ticketId}>Ticket #{ticket._id.slice(-8)}</Text>
            <Text style={styles.holderName}>{ticket.holderName}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  closeBtn: { padding: spacing.xl },
  container: { flex: 1, paddingHorizontal: spacing.xxl, justifyContent: "center" },
  ticketCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    ...shadows.md,
    borderCurve: "continuous",
  },
  ticketHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  ticketLabel: { fontSize: 12, fontWeight: "700", color: colors.gray400, letterSpacing: 2 },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: "700", color: colors.white, letterSpacing: 1 },
  eventName: { fontSize: 22, fontWeight: "700", color: colors.black },
  eventInfo: { fontSize: 14, color: colors.gray500, marginTop: spacing.xs },
  divider: { height: 1, backgroundColor: colors.gray200, marginVertical: spacing.xl },
  qrContainer: { alignItems: "center", paddingVertical: spacing.lg },
  qrBox: { width: 160, height: 160, alignItems: "center", justifyContent: "center", backgroundColor: colors.gray50, borderRadius: radius.lg },
  qrCode: { fontSize: 12, color: colors.gray400, marginTop: spacing.md, fontFamily: "monospace" },
  ticketFooter: { flexDirection: "row", justifyContent: "space-between" },
  ticketId: { fontSize: 13, color: colors.gray400 },
  holderName: { fontSize: 13, fontWeight: "500", color: colors.gray600 },
});
