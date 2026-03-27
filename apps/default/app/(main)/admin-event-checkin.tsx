import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";

interface TicketRow {
  ticketId: Id<"tickets">;
  userName: string;
  userEmail: string;
  status: string;
  paid: boolean;
  checkedIn: boolean;
  checkedInAt?: number;
  purchasedAt: number;
}

/* ── Stat pill ─── */
function StatPill({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <View style={[styles.statPill, accent ? { backgroundColor: accent } : undefined]}>
      <Text style={[styles.statValue, accent ? { color: colors.white } : undefined]}>{value}</Text>
      <Text style={[styles.statLabel, accent ? { color: "rgba(255,255,255,0.8)" } : undefined]}>{label}</Text>
    </View>
  );
}

/* ── Ticket Row ── */
function TicketItem({
  ticket,
  onToggleCheckIn,
  onTogglePaid,
}: {
  ticket: TicketRow;
  onToggleCheckIn: (id: Id<"tickets">, checkedIn: boolean) => void;
  onTogglePaid: (id: Id<"tickets">, paid: boolean) => void;
}) {
  return (
    <View style={[styles.ticketCard, ticket.checkedIn && styles.ticketCheckedIn]}>
      <View style={styles.ticketTop}>
        <View style={styles.ticketAvatar}>
          <Text style={styles.ticketInitial}>{ticket.userName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketName}>{ticket.userName}</Text>
          <Text style={styles.ticketEmail} selectable>{ticket.userEmail}</Text>
        </View>
      </View>

      <View style={styles.ticketActions}>
        {/* Paid toggle */}
        <TouchableOpacity
          style={[
            styles.actionChip,
            ticket.paid ? styles.chipPaid : styles.chipUnpaid,
          ]}
          onPress={() => onTogglePaid(ticket.ticketId, !ticket.paid)}
          activeOpacity={0.7}
        >
          <SymbolView
            name={ticket.paid ? "checkmark.circle.fill" : "xmark.circle"}
            size={14}
            tintColor={ticket.paid ? colors.success : "#F59E0B"}
          />
          <Text
            style={[
              styles.chipText,
              { color: ticket.paid ? colors.success : "#F59E0B" },
            ]}
          >
            {ticket.paid ? "Bezahlt" : "Nicht bezahlt"}
          </Text>
        </TouchableOpacity>

        {/* Check-in toggle */}
        <TouchableOpacity
          style={[
            styles.actionChip,
            ticket.checkedIn ? styles.chipCheckedIn : styles.chipNotCheckedIn,
          ]}
          onPress={() => onToggleCheckIn(ticket.ticketId, !ticket.checkedIn)}
          activeOpacity={0.7}
        >
          <SymbolView
            name={ticket.checkedIn ? "person.fill.checkmark" : "person.fill.xmark"}
            size={14}
            tintColor={ticket.checkedIn ? "#3B82F6" : colors.gray500}
          />
          <Text
            style={[
              styles.chipText,
              { color: ticket.checkedIn ? "#3B82F6" : colors.gray500 },
            ]}
          >
            {ticket.checkedIn ? "Eingecheckt" : "Nicht drin"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ── Main Screen ── */
export default function AdminEventCheckIn() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { isAuthenticated } = useConvexAuth();
  const typedEventId = eventId as Id<"events"> | undefined;

  const eventDetail = useQuery(
    api.admin.getEventDetail,
    isAuthenticated && typedEventId ? { eventId: typedEventId } : "skip",
  );
  const stats = useQuery(
    api.admin.getEventCheckInStats,
    isAuthenticated && typedEventId ? { eventId: typedEventId } : "skip",
  );
  const {
    results: allBuyers,
    status: buyersStatus,
    loadMore,
  } = usePaginatedQuery(
    api.admin.listEventBuyers,
    isAuthenticated && typedEventId ? { eventId: typedEventId } : "skip",
    { initialNumItems: 100 },
  );

  const toggleCheckIn = useMutation(api.admin.toggleCheckIn);
  const togglePaid = useMutation(api.admin.togglePaid);

  const [search, setSearch] = useState("");

  const handleToggleCheckIn = useCallback(
    async (ticketId: Id<"tickets">, checkedIn: boolean) => {
      try {
        await toggleCheckIn({ ticketId, checkedIn });
      } catch {
        // ignore
      }
    },
    [toggleCheckIn],
  );

  const handleTogglePaid = useCallback(
    async (ticketId: Id<"tickets">, paid: boolean) => {
      try {
        await togglePaid({ ticketId, paid });
      } catch {
        // ignore
      }
    },
    [togglePaid],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return allBuyers;
    const q = search.toLowerCase();
    return allBuyers.filter(
      (b: TicketRow) =>
        b.userName.toLowerCase().includes(q) ||
        b.userEmail.toLowerCase().includes(q),
    );
  }, [allBuyers, search]);

  /* ── PDF generation (share as text/csv) ── */
  const handleExportPDF = useCallback(async () => {
    if (!eventDetail || allBuyers.length === 0) return;

    const header = "Nr;Name;E-Mail;Bezahlt;Eingecheckt";
    const rows = allBuyers.map(
      (b: TicketRow, i: number) =>
        `${i + 1};${b.userName};${b.userEmail};${b.paid ? "Ja" : "Nein"};${b.checkedIn ? "Ja" : "Nein"}`,
    );
    const csv = [header, ...rows].join("\n");

    const summary = [
      `\n--- ${eventDetail.name} ---`,
      `Datum: ${eventDetail.date}`,
      `Ort: ${eventDetail.venue}, ${eventDetail.city}`,
      `Gesamt: ${stats?.totalTickets ?? 0} Tickets`,
      `Eingecheckt: ${stats?.checkedIn ?? 0}`,
      `Nicht eingecheckt: ${stats?.notCheckedIn ?? 0}`,
      `Bezahlt: ${stats?.paid ?? 0}`,
      `Nicht bezahlt: ${stats?.unpaid ?? 0}`,
      "",
      csv,
    ].join("\n");

    if (Platform.OS !== "web") {
      await Share.share({ message: summary, title: `Ticketliste ${eventDetail.name}` });
    } else {
      // Web: download CSV
      const blob = new Blob([summary], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tickets-${eventDetail.name.replace(/\s+/g, "-")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [eventDetail, allBuyers, stats]);

  if (!typedEventId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Kein Event ausgew\u00e4hlt</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {eventDetail?.name ?? "Einlass"}
        </Text>
        <TouchableOpacity onPress={handleExportPDF} style={styles.exportBtn} hitSlop={12}>
          <SymbolView name="square.and.arrow.up" size={18} tintColor={colors.black} />
        </TouchableOpacity>
      </View>

      {/* Event info bar */}
      {eventDetail && (
        <View style={styles.eventInfoBar}>
          <Text style={styles.eventInfoText}>
            {eventDetail.date} \u00b7 {eventDetail.venue}, {eventDetail.city}
          </Text>
        </View>
      )}

      {/* Live stats */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow} contentContainerStyle={styles.statsContent}>
          <StatPill label="Gesamt" value={stats.totalTickets} />
          <StatPill label="Drin" value={stats.checkedIn} accent="#3B82F6" />
          <StatPill label={"Drau\u00dfen"} value={stats.notCheckedIn} accent={colors.black} />
          <StatPill label="Bezahlt" value={stats.paid} accent={colors.success} />
          <StatPill label="Offen" value={stats.unpaid} accent="#F59E0B" />
        </ScrollView>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <SymbolView name="magnifyingglass" size={16} tintColor={colors.gray400} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Name oder E-Mail suchen..."
          placeholderTextColor={colors.gray300}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Ticket list */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {buyersStatus === "LoadingFirstPage" ? (
          <ActivityIndicator size="large" color={colors.black} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <SymbolView name="ticket" size={32} tintColor={colors.gray300} />
            <Text style={styles.emptyText}>
              {search ? "Kein Ergebnis" : "Noch keine Tickets"}
            </Text>
          </View>
        ) : (
          <>
            {filtered.map((ticket: TicketRow) => (
              <TicketItem
                key={ticket.ticketId}
                ticket={ticket}
                onToggleCheckIn={handleToggleCheckIn}
                onTogglePaid={handleTogglePaid}
              />
            ))}
            {buyersStatus === "CanLoadMore" && (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={() => loadMore(100)}>
                <Text style={styles.loadMoreText}>Mehr laden</Text>
              </TouchableOpacity>
            )}
            {buyersStatus === "LoadingMore" && (
              <ActivityIndicator size="small" color={colors.gray400} style={{ marginTop: 12 }} />
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  },
  exportBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  eventInfoBar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  eventInfoText: {
    fontSize: 13,
    color: colors.gray500,
  },
  statsRow: {
    maxHeight: 72,
    marginBottom: spacing.sm,
  },
  statsContent: {
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  statPill: {
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 72,
    borderCurve: "continuous",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.black,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray500,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    borderCurve: "continuous",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.black,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  ticketCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
    borderCurve: "continuous",
  },
  ticketCheckedIn: {
    borderColor: "rgba(59,130,246,0.3)",
    backgroundColor: "rgba(59,130,246,0.03)",
  },
  ticketTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  ticketAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketInitial: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.gray600,
  },
  ticketInfo: { flex: 1 },
  ticketName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
  },
  ticketEmail: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 1,
  },
  ticketActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  chipText: { fontSize: 12, fontWeight: "600" },
  chipPaid: { backgroundColor: "rgba(34,197,94,0.1)" },
  chipUnpaid: { backgroundColor: "rgba(245,158,11,0.1)" },
  chipCheckedIn: { backgroundColor: "rgba(59,130,246,0.1)" },
  chipNotCheckedIn: { backgroundColor: colors.gray100 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: colors.gray400 },
  loadMoreBtn: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray500,
  },
});
