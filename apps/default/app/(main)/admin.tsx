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
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import { MiniLineChart, MiniBarChart, RevenueRow } from "@/components/admin/MiniChart";
import type { Id } from "@/convex/_generated/dataModel";

const ABO_PRICE = "5,99";

/* ─── Local types for dashboard data ─────────────────────── */
interface Buyer { ticketId: string; userName: string; userEmail: string; status: string }
interface DayStats { label: string; photos: number; videos: number }
interface GrowthDay { label: string; count: number }
interface EventRevenue { eventName: string; soldTickets: number; totalTickets: number; revenue: number; currency: string }
interface AdminEvent { _id: Id<"events">; name: string; date: string; city: string; totalTickets: number; soldTickets: number; ticketPrice: number; currency: string; status: string }

/* ─── KPI Card ───────────────────────────────────────────── */
function KPI({
  label,
  value,
  sub,
  icon,
  iconBg,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  iconBg?: string;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: iconBg ?? colors.gray100 }]}> 
        <SymbolView name={icon} size={16} tintColor={iconBg ? colors.white : colors.gray600} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub && <Text style={styles.kpiSub}>{sub}</Text>}
    </View>
  );
}

/* ─── Section Card ─────────────────────────────────────── */
function Card({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <SymbolView name={icon} size={14} tintColor={colors.gray400} />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

/* ─── Event Row ────────────────────────────────────────── */
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
            detail.buyers.map((b: Buyer) => (
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

/* ─── Main Dashboard ───────────────────────────────────── */
export default function AdminDashboard() {
  const stats = useQuery(api.admin.getAdminDashboard);
  const events = useQuery(api.admin.listEventsAdmin);
  const deleteEvent = useMutation(api.admin.deleteEvent);
  const [expandedId, setExpandedId] = useState<Id<"events"> | null>(null);

  /* ── Announcements ── */
  const currentAnnouncement = useQuery(api.admin.getActiveAnnouncement);
  const createAnnouncement = useMutation(api.admin.createAnnouncement);
  const updateAnnouncement = useMutation(api.admin.updateAnnouncement);
  const deleteAnnouncement = useMutation(api.admin.deleteAnnouncement);
  const [announceDraft, setAnnounceDraft] = useState("");
  const [announceEditing, setAnnounceEditing] = useState(false);
  const [announceSaving, setAnnounceSaving] = useState(false);

  const handleAnnounceSave = useCallback(async () => {
    const text = announceDraft.trim();
    if (!text) return;
    setAnnounceSaving(true);
    try {
      if (currentAnnouncement && announceEditing) {
        await updateAnnouncement({ id: currentAnnouncement._id, text });
      } else {
        await createAnnouncement({ text });
      }
      setAnnounceDraft("");
      setAnnounceEditing(false);
    } catch {
      if (Platform.OS !== "web") Alert.alert("Fehler", "Announcement konnte nicht gespeichert werden");
    } finally {
      setAnnounceSaving(false);
    }
  }, [announceDraft, currentAnnouncement, announceEditing, createAnnouncement, updateAnnouncement]);

  const handleAnnounceDelete = useCallback(() => {
    if (!currentAnnouncement) return;
    const doDelete = async () => {
      try {
        await deleteAnnouncement({ id: currentAnnouncement._id });
        setAnnounceDraft("");
        setAnnounceEditing(false);
      } catch {
        if (Platform.OS !== "web") Alert.alert("Fehler", "Konnte nicht gelöscht werden");
      }
    };
    if (Platform.OS !== "web") {
      Alert.alert("Announcement löschen", "Wirklich löschen? Die Leiste verschwindet sofort.", [
        { text: "Abbrechen", style: "cancel" },
        { text: "Löschen", style: "destructive", onPress: doDelete },
      ]);
    } else {
      doDelete();
    }
  }, [currentAnnouncement, deleteAnnouncement]);

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

  /* chart data */
  const postChartData = stats.postsByDay.map((d: DayStats) => d.photos + d.videos);
  const postChartLabels = stats.postsByDay.map((d: DayStats) => d.label);
  const userChartData = stats.userGrowthByDay.map((d: GrowthDay) => d.count);
  const userChartLabels = stats.userGrowthByDay.map((d: GrowthDay) => d.label);

  const barData = stats.postsByDay.map((d: DayStats) => ({
    label: d.label,
    value: d.photos + d.videos,
  }));

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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Announcement Manager ────────────────── */}
        <Card title="Announcement" icon="exclamationmark.circle.fill">
          {currentAnnouncement ? (
            <View>
              <View style={styles.annLiveBanner}>
                <View style={styles.annLiveDot} />
                <Text style={styles.annLiveLabel}>LIVE</Text>
              </View>
              <Text style={styles.annCurrentText}>{currentAnnouncement.text}</Text>
              <View style={styles.annActions}>
                <TouchableOpacity
                  style={styles.annEditBtn}
                  onPress={() => {
                    setAnnounceDraft(currentAnnouncement.text);
                    setAnnounceEditing(true);
                  }}
                  activeOpacity={0.7}
                >
                  <SymbolView name="pencil" size={13} tintColor={colors.gray600} />
                  <Text style={styles.annEditText}>Bearbeiten</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.annEditBtn, styles.annDeleteBtn]}
                  onPress={handleAnnounceDelete}
                  activeOpacity={0.7}
                >
                  <SymbolView name="trash" size={13} tintColor={colors.danger} />
                  <Text style={[styles.annEditText, { color: colors.danger }]}>Löschen</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.annEmpty}>
              <SymbolView name="exclamationmark.circle" size={28} tintColor={colors.gray300} />
              <Text style={styles.annEmptyText}>Kein aktives Announcement</Text>
            </View>
          )}

          {(announceEditing || !currentAnnouncement) && (
            <View style={styles.annInputWrap}>
              <TextInput
                style={styles.annInput}
                value={announceDraft}
                onChangeText={setAnnounceDraft}
                placeholder="z.B. NEUES EVENT STEHT BEVOR!"
                placeholderTextColor={colors.gray300}
                multiline
                maxLength={120}
              />
              <View style={styles.annInputActions}>
                <Text style={styles.annCharCount}>{announceDraft.length}/120</Text>
                <TouchableOpacity
                  style={[
                    styles.annPostBtn,
                    (!announceDraft.trim() || announceSaving) && { opacity: 0.4 },
                  ]}
                  onPress={handleAnnounceSave}
                  disabled={!announceDraft.trim() || announceSaving}
                  activeOpacity={0.7}
                >
                  {announceSaving ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.annPostBtnText}>
                      {announceEditing ? "Aktualisieren" : "Posten"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Card>

        {/* ── KPI Row ─────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kpiScroll}>
          <KPI
            icon="person.2.fill"
            label="Mitglieder"
            value={stats.totalMembers}
            sub={`+${stats.newMembersWeek} diese Woche`}
            iconBg={colors.black}
          />
          <KPI
            icon="creditcard.fill"
            label="Aktive Abos"
            value={stats.activeSubscriptions}
            sub={`${stats.canceledSubscriptions} gekündigt`}
            iconBg="#6366F1"
          />
          <KPI
            icon="bolt.fill"
            label="Aktiv heute"
            value={stats.activeToday}
            sub={`${stats.activeWeek} diese Woche`}
            iconBg={colors.success}
          />
          <KPI
            icon="doc.text.fill"
            label="Beiträge"
            value={stats.totalPosts}
            iconBg="#F59E0B"
          />
          <KPI
            icon="person.3.fill"
            label="Gruppen"
            value={stats.totalGroups}
            iconBg="#EC4899"
          />
        </ScrollView>

        {/* ── Abo-Einnahmen ───────────────────────── */}
        <Card title="Abo-Einnahmen" icon="creditcard">
          <View style={styles.revenueHighlight}>
            <Text style={styles.revenueAmount}>
              {stats.subscriptionRevenueMonthly.toFixed(2).replace(".", ",")} €
            </Text>
            <Text style={styles.revenuePeriod}>monatlich</Text>
          </View>
          <RevenueRow
            label="Abo-Preis"
            amount={`${ABO_PRICE} € / Monat`}
          />
          <RevenueRow
            label="Aktive Abonnenten"
            amount={`${stats.activeSubscriptions}`}
          />
          <RevenueRow
            label="Geschätzt gesamt"
            amount={`${stats.subscriptionRevenueTotal.toFixed(2).replace(".", ",")} €`}
            accent
          />
        </Card>

        {/* ── Ticketeinnahmen ─────────────────────── */}
        <Card title="Ticketeinnahmen" icon="ticket">
          <View style={styles.revenueHighlight}>
            <Text style={styles.revenueAmount}>
              {stats.ticketRevenueTotal.toFixed(2).replace(".", ",")} €
            </Text>
            <Text style={styles.revenuePeriod}>gesamt</Text>
          </View>
          <RevenueRow
            label="Letzten 30 Tage"
            amount={`${stats.ticketRevenueMonth.toFixed(2).replace(".", ",")} €`}
          />
          {stats.ticketRevenuePerEvent.length > 0 && (
            <View style={styles.eventRevenueSection}>
              <Text style={styles.eventRevenueTitle}>Pro Event</Text>
              {stats.ticketRevenuePerEvent.map((ev: EventRevenue, i: number) => (
                <RevenueRow
                  key={i}
                  label={ev.eventName}
                  subtitle={`${ev.soldTickets}/${ev.totalTickets} Tickets`}
                  amount={`${ev.revenue.toFixed(2).replace(".", ",")} ${ev.currency}`}
                />
              ))}
            </View>
          )}
        </Card>

        {/* ── Nutzeraktivität Chart ───────────────── */}
        <Card title="Neue Nutzer (7 Tage)" icon="person.badge.plus">
          <MiniLineChart
            data={userChartData}
            labels={userChartLabels}
            color="#6366F1"
            height={140}
          />
          <View style={styles.chartLegend}>
            <Text style={styles.chartLegendText}>
              +{stats.newMembersWeek} diese Woche · +{stats.newMembersMonth} diesen Monat
            </Text>
          </View>
        </Card>

        {/* ── Beiträge Chart ─────────────────────── */}
        <Card title="Beiträge (7 Tage)" icon="chart.bar">
          <MiniBarChart data={barData} height={120} barColor={colors.black} />
          <View style={styles.chartLegend}>
            <View style={styles.legendDot} />
            <Text style={styles.chartLegendText}>
              Fotos + Videos pro Tag
            </Text>
          </View>
        </Card>

        {/* ── Aktivität Detail ───────────────────── */}
        <Card title="Content Übersicht" icon="photo.on.rectangle">
          <View style={styles.contentGrid}>
            <View style={styles.contentCell}>
              <Text style={styles.contentCellTitle}>Fotos</Text>
              <View style={styles.contentRow}>
                <Text style={styles.contentNum}>{stats.photosToday}</Text>
                <Text style={styles.contentPeriod}>heute</Text>
              </View>
              <View style={styles.contentRow}>
                <Text style={styles.contentNum}>{stats.photosWeek}</Text>
                <Text style={styles.contentPeriod}>Woche</Text>
              </View>
              <View style={styles.contentRow}>
                <Text style={styles.contentNum}>{stats.photosMonth}</Text>
                <Text style={styles.contentPeriod}>Monat</Text>
              </View>
            </View>
            <View style={styles.contentDivider} />
            <View style={styles.contentCell}>
              <Text style={styles.contentCellTitle}>Videos</Text>
              <View style={styles.contentRow}>
                <Text style={styles.contentNum}>{stats.videosToday}</Text>
                <Text style={styles.contentPeriod}>heute</Text>
              </View>
              <View style={styles.contentRow}>
                <Text style={styles.contentNum}>{stats.videosWeek}</Text>
                <Text style={styles.contentPeriod}>Woche</Text>
              </View>
              <View style={styles.contentRow}>
                <Text style={styles.contentNum}>{stats.videosMonth}</Text>
                <Text style={styles.contentPeriod}>Monat</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* ── Posts Trend Line ──────────────────── */}
        <Card title="Post-Trend (7 Tage)" icon="chart.xyaxis.line">
          <MiniLineChart
            data={postChartData}
            labels={postChartLabels}
            color={colors.black}
            height={140}
          />
        </Card>

        {/* ── Events ─────────────────────────────── */}
        <Card
          title="Events"
          icon="calendar"
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
            events.map((ev: AdminEvent) => (
              <EventRow
                key={ev._id}
                event={ev}
                expanded={expandedId === ev._id}
                onToggle={() => setExpandedId((prev) => (prev === ev._id ? null : ev._id))}
                onEdit={() => router.push(`/(main)/admin-event-form?eventId=${ev._id}` as "/")}
                onDelete={() => handleDelete(ev._id, ev.name)}
              />
            ))
          )}
        </Card>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Styles ───────────────────────────────────────────── */
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

  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  /* KPI horizontal row */
  kpiScroll: { marginBottom: spacing.lg },
  kpiCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginRight: spacing.sm,
    width: 140,
    borderCurve: "continuous",
    ...shadows.sm,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    borderCurve: "continuous",
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.black,
    fontVariant: ["tabular-nums"],
  },
  kpiLabel: {
    fontSize: 12,
    color: colors.gray500,
    fontWeight: "500",
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: colors.gray400,
    marginTop: 4,
  },

  /* card */
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderCurve: "continuous",
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
  },

  /* revenue highlight */
  revenueHighlight: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  revenueAmount: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.black,
    fontVariant: ["tabular-nums"],
  },
  revenuePeriod: {
    fontSize: 13,
    color: colors.gray400,
    fontWeight: "500",
    marginTop: 4,
  },

  /* event revenue */
  eventRevenueSection: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: spacing.sm,
  },
  eventRevenueTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 4,
  },

  /* chart legend */
  chartLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.black,
  },
  chartLegendText: {
    fontSize: 12,
    color: colors.gray400,
    fontWeight: "500",
  },

  /* content grid */
  contentGrid: {
    flexDirection: "row",
    gap: 0,
  },
  contentCell: {
    flex: 1,
    paddingHorizontal: 8,
  },
  contentDivider: {
    width: 1,
    backgroundColor: colors.gray100,
  },
  contentCellTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  contentNum: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.black,
    fontVariant: ["tabular-nums"],
  },
  contentPeriod: {
    fontSize: 12,
    color: colors.gray400,
    fontWeight: "500",
  },

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
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: "hidden",
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  eventName: { fontSize: 14, fontWeight: "600", color: colors.black },
  eventMeta: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  eventBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray700,
    fontVariant: ["tabular-nums"],
  },
  eventExpanded: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray200,
    padding: spacing.md,
    backgroundColor: colors.white,
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
    fontSize: 12,
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

  /* announcement manager */
  annLiveBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.sm,
  },
  annLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  annLiveLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.success,
    letterSpacing: 0.5,
  },
  annCurrentText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  annActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  annEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.gray50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  annDeleteBtn: {
    backgroundColor: "rgba(239,68,68,0.06)",
  },
  annEditText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.gray600,
  },
  annEmpty: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  annEmptyText: {
    fontSize: 14,
    color: colors.gray400,
  },
  annInputWrap: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray100,
    paddingTop: spacing.md,
  },
  annInput: {
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.black,
    minHeight: 60,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: colors.gray100,
    borderCurve: "continuous",
  },
  annInputActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  annCharCount: {
    fontSize: 12,
    color: colors.gray400,
    fontVariant: ["tabular-nums"],
  },
  annPostBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderCurve: "continuous",
  },
  annPostBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.white,
  },
});
