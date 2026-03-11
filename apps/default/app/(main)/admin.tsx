import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import type { Id } from "@/convex/_generated/dataModel";

/* ─── stat card ───────────────────────────────────────────────── */
function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ─── section header ──────────────────────────────────────────── */
function Section({ title, children, action }: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

/* ─── event row ───────────────────────────────────────────────── */
function EventRow({
  event,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  event: {
    _id: Id<"events">;
    name: string;
    date: string;
    city: string;
    totalTickets: number;
    soldTickets: number;
    ticketPrice: number;
    currency: string;
    status: string;
  };
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const detail = useQuery(
    api.admin.getEventDetail,
    expanded ? { eventId: event._id } : "skip",
  );

  return (
    <View style={styles.eventCard}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.eventHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventName}>{event.name}</Text>
          <Text style={styles.eventMeta}>
            {event.date} · {event.city}
          </Text>
        </View>
        <View style={styles.eventBadge}>
          <Text style={styles.eventBadgeText}>
            {event.soldTickets}/{event.totalTickets}
          </Text>
        </View>
        <SymbolView
          name={expanded ? "chevron.up" : "chevron.down"}
          size={13}
          tintColor={colors.gray400}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.eventExpanded}>
          <View style={styles.eventActions}>
            <TouchableOpacity onPress={onEdit} style={styles.eventActionBtn}>
              <SymbolView name="pencil" size={13} tintColor={colors.gray600} />
              <Text style={styles.eventActionText}>Bearbeiten</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={[styles.eventActionBtn, styles.eventDeleteBtn]}>
              <SymbolView name="trash" size={13} tintColor={colors.danger} />
              <Text style={[styles.eventActionText, { color: colors.danger }]}>Löschen</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.eventInfoRow}>
            Preis: {event.ticketPrice.toFixed(2)} {event.currency}
          </Text>

          <Text style={styles.buyersTitle}>Käufer ({detail?.buyers?.length ?? 0})</Text>
          {!detail ? (
            <ActivityIndicator size="small" color={colors.gray400} style={{ marginTop: 8 }} />
          ) : detail.buyers.length === 0 ? (
            <Text style={styles.noBuyers}>Noch keine Tickets verkauft</Text>
          ) : (
            detail.buyers.map((b) => (
              <View key={b.ticketId} style={styles.buyerRow}>
                <View style={styles.buyerAvatar}>
                  <Text style={styles.buyerInitial}>
                    {b.userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.buyerName}>{b.userName}</Text>
                  <Text style={styles.buyerEmail}>{b.userEmail}</Text>
                </View>
                <View
                  style={[
                    styles.ticketStatus,
                    b.status === "active" && styles.ticketActive,
                    b.status === "scanned" && styles.ticketScanned,
                    b.status === "canceled" && styles.ticketCanceled,
                  ]}
                >
                  <Text
                    style={[
                      styles.ticketStatusText,
                      b.status === "active" && { color: colors.success },
                      b.status === "scanned" && { color: "#3B82F6" },
                      b.status === "canceled" && { color: colors.danger },
                    ]}
                  >
                    {b.status === "active"
                      ? "Aktiv"
                      : b.status === "scanned"
                        ? "Gescannt"
                        : b.status === "canceled"
                          ? "Storniert"
                          : "Abgelaufen"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

/* ─── main dashboard ──────────────────────────────────────────── */
export default function AdminDashboard() {
  const stats = useQuery(api.admin.getAdminDashboard);
  const events = useQuery(api.admin.listEventsAdmin);
  const deleteEvent = useMutation(api.admin.deleteEvent);
  const [expandedId, setExpandedId] = useState<Id<"events"> | null>(null);

  const handleDelete = useCallback(
    (eventId: Id<"events">, name: string) => {
      const doDelete = async () => {
        try {
          await deleteEvent({ eventId });
        } catch {
          if (Platform.OS !== "web") Alert.alert("Fehler", "Event konnte nicht gelöscht werden");
        }
      };
      if (Platform.OS !== "web") {
        Alert.alert("Event löschen", `"${name}" wirklich löschen? Alle Tickets werden ebenfalls gelöscht.`, [
          { text: "Abbrechen", style: "cancel" },
          { text: "Löschen", style: "destructive", onPress: doDelete },
        ]);
      } else {
        doDelete();
      }
    },
    [deleteEvent],
  );

  if (!stats) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.black} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerLogo}>
            <Text style={styles.headerLogoText}>Z</Text>
          </View>
          <Text style={styles.headerTitle}>Admin</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Mitglieder ─────────────────────────────────────── */}
        <Section title="Mitglieder">
          <View style={styles.statGrid}>
            <Stat label="Gesamt" value={stats.totalMembers} accent />
            <Stat label="Neue (7 Tage)" value={stats.newMembersWeek} />
            <Stat label="Neue (30 Tage)" value={stats.newMembersMonth} />
            <Stat label="Aktive Abos" value={stats.activeSubscriptions} />
            <Stat label="Gekündigt" value={stats.canceledSubscriptions} />
          </View>
        </Section>

        {/* ── Cashflow ────────────────────────────────────────── */}
        <Section title="Cashflow">
          <View style={styles.statGrid}>
            <Stat
              label="Ticketeinnahmen (gesamt)"
              value={`${stats.ticketRevenueTotal.toFixed(2)} \u20AC`}
              accent
            />
            <Stat
              label="Ticketeinnahmen (30 Tage)"
              value={`${stats.ticketRevenueMonth.toFixed(2)} \u20AC`}
            />
          </View>
        </Section>

        {/* ── Aktivität ───────────────────────────────────────── */}
        <Section title="Nutzeraktivität">
          <View style={styles.statGrid}>
            <Stat label="Aktiv heute" value={stats.activeToday} accent />
            <Stat label="Aktiv (7 Tage)" value={stats.activeWeek} />
          </View>
        </Section>

        {/* ── Beiträge ────────────────────────────────────────── */}
        <Section title="Beiträge">
          <View style={styles.postsTable}>
            <View style={styles.postsHeaderRow}>
              <Text style={[styles.postsCell, styles.postsCellHeader, { flex: 1 }]} />
              <Text style={[styles.postsCell, styles.postsCellHeader]}>Heute</Text>
              <Text style={[styles.postsCell, styles.postsCellHeader]}>Woche</Text>
              <Text style={[styles.postsCell, styles.postsCellHeader]}>Monat</Text>
            </View>
            <View style={styles.postsRow}>
              <Text style={[styles.postsCell, { flex: 1 }]}>Fotos</Text>
              <Text style={styles.postsCell}>{stats.photosToday}</Text>
              <Text style={styles.postsCell}>{stats.photosWeek}</Text>
              <Text style={styles.postsCell}>{stats.photosMonth}</Text>
            </View>
            <View style={styles.postsRow}>
              <Text style={[styles.postsCell, { flex: 1 }]}>Videos</Text>
              <Text style={styles.postsCell}>{stats.videosToday}</Text>
              <Text style={styles.postsCell}>{stats.videosWeek}</Text>
              <Text style={styles.postsCell}>{stats.videosMonth}</Text>
            </View>
            <View style={[styles.postsRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.postsCell, { flex: 1, fontWeight: "600" }]}>Gesamt</Text>
              <Text style={[styles.postsCell, { fontWeight: "600" }]}>
                {stats.photosToday + stats.videosToday}
              </Text>
              <Text style={[styles.postsCell, { fontWeight: "600" }]}>
                {stats.photosWeek + stats.videosWeek}
              </Text>
              <Text style={[styles.postsCell, { fontWeight: "600" }]}>
                {stats.photosMonth + stats.videosMonth}
              </Text>
            </View>
          </View>
          <View style={styles.statGrid}>
            <Stat label="Beiträge insgesamt" value={stats.totalPosts} />
          </View>
        </Section>

        {/* ── Gruppen ─────────────────────────────────────────── */}
        <Section title="Gruppen">
          <View style={styles.statGrid}>
            <Stat label="Gruppen gesamt" value={stats.totalGroups} accent />
          </View>
        </Section>

        {/* ── Events ──────────────────────────────────────────── */}
        <Section
          title="Events"
          action={
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push("/(main)/admin-event-form" as "/")}
              activeOpacity={0.7}
            >
              <SymbolView name="plus" size={14} tintColor={colors.white} />
            </TouchableOpacity>
          }
        >
          {!events ? (
            <ActivityIndicator size="small" color={colors.gray400} />
          ) : events.length === 0 ? (
            <View style={styles.emptyEvents}>
              <SymbolView name="calendar" size={28} tintColor={colors.gray300} />
              <Text style={styles.emptyText}>Noch keine Events</Text>
            </View>
          ) : (
            events.map((ev) => (
              <EventRow
                key={ev._id}
                event={ev}
                expanded={expandedId === ev._id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === ev._id ? null : ev._id))
                }
                onEdit={() =>
                  router.push(
                    `/(main)/admin-event-form?eventId=${ev._id}` as "/",
                  )
                }
                onDelete={() => handleDelete(ev._id, ev.name)}
              />
            ))
          )}
        </Section>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── styles ──────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.gray50 },

  /* header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerLogo: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  headerLogoText: { fontSize: 14, fontWeight: "800", color: colors.white },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },

  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },

  /* section */
  section: { marginBottom: spacing.xxl },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  /* stat cards */
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.lg,
    minWidth: "47%" as unknown as number,
    flex: 1,
    borderCurve: "continuous",
    ...shadows.sm,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.black,
    fontVariant: ["tabular-nums"],
    marginBottom: 4,
  },
  statValueAccent: { color: colors.black },
  statLabel: { fontSize: 12, color: colors.gray500, fontWeight: "500" },

  /* posts table */
  postsTable: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing.sm,
    borderCurve: "continuous",
    ...shadows.sm,
  },
  postsHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray50,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  postsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  postsCell: { width: 60, fontSize: 14, color: colors.black, textAlign: "center", fontVariant: ["tabular-nums"] },
  postsCellHeader: { fontSize: 11, fontWeight: "600", color: colors.gray400, textTransform: "uppercase" },

  /* events */
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  eventCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: "hidden",
    borderCurve: "continuous",
    ...shadows.sm,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  eventName: { fontSize: 15, fontWeight: "600", color: colors.black },
  eventMeta: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  eventBadge: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray700,
    fontVariant: ["tabular-nums"],
  },
  eventExpanded: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray100,
    padding: spacing.lg,
  },
  eventActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  eventActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.gray50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  eventDeleteBtn: { backgroundColor: "rgba(239,68,68,0.06)" },
  eventActionText: { fontSize: 13, fontWeight: "500", color: colors.gray600 },
  eventInfoRow: { fontSize: 13, color: colors.gray600, marginBottom: spacing.md },

  buyersTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  noBuyers: { fontSize: 13, color: colors.gray400, fontStyle: "italic" },
  buyerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  buyerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  buyerInitial: { fontSize: 13, fontWeight: "600", color: colors.gray600 },
  buyerName: { fontSize: 14, fontWeight: "500", color: colors.black },
  buyerEmail: { fontSize: 12, color: colors.gray500 },
  ticketStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.gray100,
  },
  ticketActive: { backgroundColor: "rgba(34,197,94,0.1)" },
  ticketScanned: { backgroundColor: "rgba(59,130,246,0.1)" },
  ticketCanceled: { backgroundColor: "rgba(239,68,68,0.08)" },
  ticketStatusText: { fontSize: 11, fontWeight: "600", color: colors.gray500 },

  emptyEvents: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: { fontSize: 14, color: colors.gray400 },
});
