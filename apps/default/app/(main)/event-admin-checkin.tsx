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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

interface TicketRow {
  ticketId: Id<"tickets">;
  userName: string;
  userEmail: string;
  status: string;
  checkedIn: boolean;
  checkedInAt?: number;
  purchasedAt: number;
}

/* -- Stat pill -- */
function StatPill({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <View style={[styles.statPill, accent ? { backgroundColor: accent } : undefined]}>
      <Text style={[styles.statValue, accent ? { color: colors.white } : undefined]}>{value}</Text>
      <Text style={[styles.statLabel, accent ? { color: "rgba(255,255,255,0.8)" } : undefined]}>{label}</Text>
    </View>
  );
}

/* -- Ticket Row -- */
function TicketItem({ ticket, onToggle }: { ticket: TicketRow; onToggle: (id: Id<"tickets">, v: boolean) => void }) {
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
        <View style={styles.paidBadge}>
          <SymbolView name="checkmark.circle.fill" size={12} tintColor={colors.success} />
          <Text style={styles.paidText}>Bezahlt</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.checkInBtn, ticket.checkedIn && styles.checkInBtnActive]}
        onPress={() => onToggle(ticket.ticketId, !ticket.checkedIn)}
        activeOpacity={0.7}
      >
        <SymbolView
          name={ticket.checkedIn ? "person.fill.checkmark" : "person.fill.xmark"}
          size={15}
          tintColor={ticket.checkedIn ? "#3B82F6" : colors.gray500}
        />
        <Text style={[styles.checkInText, ticket.checkedIn && { color: "#3B82F6" }]}>
          {ticket.checkedIn ? "Eingecheckt" : "Nicht eingecheckt"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* -- PDF generation -- */
function buildPdfHtml(eventName: string, eventDate: string, eventVenue: string, eventCity: string, guests: TicketRow[]): string {
  const rows = guests.map((g, i) =>
    `<tr>
      <td style="text-align:center;padding:10px 6px;border-bottom:1px solid #eee;font-size:13px;">${i + 1}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;font-weight:500;">${g.userName}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#666;">${g.userEmail}</td>
      <td style="text-align:center;padding:10px 6px;border-bottom:1px solid #eee;">
        <div style="width:22px;height:22px;border:2px solid #ccc;border-radius:4px;margin:0 auto;"></div>
      </td>
    </tr>`
  ).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  @page { margin: 40px; }
  body { font-family: -apple-system, 'Helvetica Neue', sans-serif; color: #111; }
  .header { margin-bottom: 24px; border-bottom: 2px solid #111; padding-bottom: 16px; }
  .header h1 { font-size: 22px; margin: 0 0 4px; }
  .header p { font-size: 13px; color: #666; margin: 2px 0; }
  .stats { display: flex; gap: 24px; margin-bottom: 20px; }
  .stat { text-align: center; }
  .stat-val { font-size: 24px; font-weight: 800; }
  .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { text-align: left; padding: 8px; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ddd; }
  thead th:first-child, thead th:last-child { text-align: center; }
  .footer { margin-top: 24px; font-size: 11px; color: #aaa; text-align: center; }
</style></head><body>
<div class="header">
  <h1>${eventName}</h1>
  <p>${eventDate} &middot; ${eventVenue}, ${eventCity}</p>
  <p>G\u00e4steliste &middot; ${guests.length} G\u00e4ste</p>
</div>
<div class="stats">
  <div class="stat"><div class="stat-val">${guests.length}</div><div class="stat-label">Gesamt</div></div>
  <div class="stat"><div class="stat-val">${guests.filter(g => g.checkedIn).length}</div><div class="stat-label">Eingecheckt</div></div>
  <div class="stat"><div class="stat-val">${guests.filter(g => !g.checkedIn).length}</div><div class="stat-label">Offen</div></div>
</div>
<table>
  <thead><tr><th>Nr.</th><th>Name</th><th>E-Mail</th><th>\u2713</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">Erstellt am ${new Date().toLocaleDateString("de-DE")} &middot; Z Social</div>
</body></html>`;
}

/* -- Main Screen -- */
export default function EventAdminCheckin() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { isAuthenticated } = useConvexAuth();
  const typedEventId = eventId as Id<"events"> | undefined;

  const eventDetail = useQuery(api.eventAdmin.getEventDetail, isAuthenticated && typedEventId ? { eventId: typedEventId } : "skip");
  const stats = useQuery(api.eventAdmin.getCheckInStats, isAuthenticated && typedEventId ? { eventId: typedEventId } : "skip");
  const { results: allGuests, status: guestsStatus, loadMore } = usePaginatedQuery(
    api.eventAdmin.listGuests,
    isAuthenticated && typedEventId ? { eventId: typedEventId } : "skip",
    { initialNumItems: 100 },
  );
  const isAdminQ = useQuery(api.eventAdmin.isAdmin, isAuthenticated ? {} : "skip");
  const eventAdmins = useQuery(api.eventAdmin.listEventAdmins, isAuthenticated && typedEventId && isAdminQ ? { eventId: typedEventId } : "skip");

  const toggleCheckIn = useMutation(api.eventAdmin.toggleCheckIn);
  const inviteAdmin = useMutation(api.eventAdmin.inviteEventAdmin);
  const removeAdmin = useMutation(api.eventAdmin.removeEventAdmin);

  const [search, setSearch] = useState("");
  const [inviteSearch, setInviteSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  const searchResults = useQuery(api.eventAdmin.searchUsersForInvite, isAuthenticated && typedEventId && inviteSearch.length >= 2 ? { searchText: inviteSearch, eventId: typedEventId } : "skip");

  const handleToggle = useCallback(async (ticketId: Id<"tickets">, checkedIn: boolean) => {
    try { await toggleCheckIn({ ticketId, checkedIn }); } catch { /* ignore */ }
  }, [toggleCheckIn]);

  const handleInvite = useCallback(async (userId: Id<"users">) => {
    if (!typedEventId) return;
    try {
      await inviteAdmin({ eventId: typedEventId, userId });
      if (Platform.OS !== "web") Alert.alert("Eingeladen", "Einladung wurde gesendet.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler";
      if (Platform.OS !== "web") Alert.alert("Fehler", msg);
    }
  }, [inviteAdmin, typedEventId]);

  const handleRemoveAdmin = useCallback(async (id: Id<"eventAdmins">) => {
    try { await removeAdmin({ eventAdminId: id }); } catch { /* ignore */ }
  }, [removeAdmin]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allGuests;
    const q = search.toLowerCase();
    return allGuests.filter((b: TicketRow) => b.userName.toLowerCase().includes(q) || b.userEmail.toLowerCase().includes(q));
  }, [allGuests, search]);

  const handleExportPDF = useCallback(async () => {
    if (!eventDetail || allGuests.length === 0) return;
    try {
      const html = buildPdfHtml(eventDetail.name, eventDetail.date, eventDetail.venue, eventDetail.city, allGuests as TicketRow[]);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      }
    } catch {
      if (Platform.OS !== "web") Alert.alert("Fehler", "PDF konnte nicht erstellt werden.");
    }
  }, [eventDetail, allGuests]);

  if (!typedEventId) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.emptyText}>Kein Event</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{eventDetail?.name ?? "Einlass"}</Text>
        <TouchableOpacity onPress={handleExportPDF} style={styles.exportBtn} hitSlop={12}>
          <SymbolView name="square.and.arrow.up" size={18} tintColor={colors.black} />
        </TouchableOpacity>
      </View>

      {/* Event info */}
      {eventDetail && (
        <View style={styles.eventInfoBar}>
          <Text style={styles.eventInfoText}>{eventDetail.date} \u00b7 {eventDetail.venue}, {eventDetail.city}</Text>
        </View>
      )}

      {/* Stats */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow} contentContainerStyle={styles.statsContent}>
          <StatPill label="Gesamt" value={stats.totalTickets} />
          <StatPill label="Drin" value={stats.checkedIn} accent="#3B82F6" />
          <StatPill label={"Drau\u00dfen"} value={stats.notCheckedIn} accent={colors.black} />
        </ScrollView>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <SymbolView name="magnifyingglass" size={16} tintColor={colors.gray400} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Name oder E-Mail suchen..." placeholderTextColor={colors.gray300} autoCorrect={false} autoCapitalize="none" clearButtonMode="while-editing" />
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {/* Invite section (global admin only) */}
        {isAdminQ && (
          <View style={styles.inviteSection}>
            <TouchableOpacity style={styles.inviteToggle} onPress={() => setShowInvite(!showInvite)} activeOpacity={0.7}>
              <SymbolView name="person.badge.plus" size={15} tintColor={colors.black} />
              <Text style={styles.inviteToggleText}>Einlass-Helfer verwalten</Text>
              <SymbolView name={showInvite ? "chevron.up" : "chevron.down"} size={12} tintColor={colors.gray400} />
            </TouchableOpacity>

            {showInvite && (
              <View style={styles.inviteBody}>
                {/* Current admins */}
                {eventAdmins && eventAdmins.length > 0 && (
                  <View style={styles.currentAdmins}>
                    <Text style={styles.sectionLabel}>Aktuelle Helfer</Text>
                    {eventAdmins.map((a: { _id: Id<"eventAdmins">; userName: string; status: string }) => (
                      <View key={a._id} style={styles.adminRow}>
                        <View style={styles.adminAvatar}><Text style={styles.adminInitial}>{a.userName.charAt(0).toUpperCase()}</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.adminName}>{a.userName}</Text>
                          <Text style={styles.adminStatus}>{a.status === "pending" ? "Ausstehend" : a.status === "accepted" ? "Aktiv" : "Abgelehnt"}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveAdmin(a._id)} hitSlop={8}>
                          <SymbolView name="xmark.circle.fill" size={18} tintColor={colors.gray400} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Search to invite */}
                <Text style={styles.sectionLabel}>Nutzer einladen</Text>
                <View style={styles.inviteSearchWrap}>
                  <SymbolView name="magnifyingglass" size={14} tintColor={colors.gray400} />
                  <TextInput style={styles.inviteSearchInput} value={inviteSearch} onChangeText={setInviteSearch} placeholder="Name suchen..." placeholderTextColor={colors.gray300} autoCorrect={false} autoCapitalize="none" />
                </View>
                {searchResults && searchResults.map((u: { _id: Id<"users">; name: string; email: string; alreadyInvited: boolean }) => (
                  <View key={u._id} style={styles.searchResultRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchResultName}>{u.name}</Text>
                      <Text style={styles.searchResultEmail}>{u.email}</Text>
                    </View>
                    {u.alreadyInvited ? (
                      <Text style={styles.alreadyInvited}>Eingeladen</Text>
                    ) : (
                      <TouchableOpacity style={styles.inviteBtn} onPress={() => handleInvite(u._id)} activeOpacity={0.7}>
                        <Text style={styles.inviteBtnText}>Einladen</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Guest list */}
        {guestsStatus === "LoadingFirstPage" ? (
          <ActivityIndicator size="large" color={colors.black} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <SymbolView name="ticket" size={32} tintColor={colors.gray300} />
            <Text style={styles.emptyText}>{search ? "Kein Ergebnis" : "Noch keine Tickets"}</Text>
          </View>
        ) : (
          <>
            {filtered.map((ticket: TicketRow) => (
              <TicketItem key={ticket.ticketId} ticket={ticket} onToggle={handleToggle} />
            ))}
            {guestsStatus === "CanLoadMore" && (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={() => loadMore(100)}>
                <Text style={styles.loadMoreText}>Mehr laden</Text>
              </TouchableOpacity>
            )}
            {guestsStatus === "LoadingMore" && <ActivityIndicator size="small" color={colors.gray400} style={{ marginTop: 12 }} />}
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.black, letterSpacing: -0.3 },
  exportBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  eventInfoBar: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  eventInfoText: { fontSize: 13, color: colors.gray500 },
  statsRow: { maxHeight: 72, marginBottom: spacing.sm },
  statsContent: { paddingHorizontal: spacing.lg, gap: 8 },
  statPill: { backgroundColor: colors.gray100, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", minWidth: 72, borderCurve: "continuous" },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.black, fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 11, fontWeight: "600", color: colors.gray500, marginTop: 2 },
  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, marginHorizontal: spacing.lg, marginVertical: spacing.sm, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.gray200, borderCurve: "continuous" },
  searchInput: { flex: 1, fontSize: 15, color: colors.black, padding: 0 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  ticketCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.gray200, borderCurve: "continuous" },
  ticketCheckedIn: { borderColor: "rgba(59,130,246,0.3)", backgroundColor: "rgba(59,130,246,0.03)" },
  ticketTop: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  ticketAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  ticketInitial: { fontSize: 16, fontWeight: "700", color: colors.gray600 },
  ticketInfo: { flex: 1 },
  ticketName: { fontSize: 15, fontWeight: "600", color: colors.black },
  ticketEmail: { fontSize: 13, color: colors.gray500, marginTop: 1 },
  paidBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(34,197,94,0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  paidText: { fontSize: 11, fontWeight: "600", color: colors.success },
  checkInBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.gray100, borderCurve: "continuous" },
  checkInBtnActive: { backgroundColor: "rgba(59,130,246,0.1)" },
  checkInText: { fontSize: 13, fontWeight: "600", color: colors.gray500 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: colors.gray400 },
  loadMoreBtn: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.sm },
  loadMoreText: { fontSize: 14, fontWeight: "600", color: colors.gray500 },

  /* invite section */
  inviteSection: { backgroundColor: colors.white, borderRadius: radius.md, marginBottom: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.gray200, borderCurve: "continuous", overflow: "hidden" },
  inviteToggle: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.lg },
  inviteToggleText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.black },
  inviteBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.gray100 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.gray400, textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm },
  currentAdmins: { marginBottom: spacing.sm },
  adminRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.gray100 },
  adminAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.gray100, alignItems: "center", justifyContent: "center" },
  adminInitial: { fontSize: 12, fontWeight: "700", color: colors.gray600 },
  adminName: { fontSize: 13, fontWeight: "600", color: colors.black },
  adminStatus: { fontSize: 11, color: colors.gray400 },
  inviteSearchWrap: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.gray50, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.gray100, marginBottom: spacing.sm },
  inviteSearchInput: { flex: 1, fontSize: 14, color: colors.black, padding: 0 },
  searchResultRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.gray100 },
  searchResultName: { fontSize: 13, fontWeight: "600", color: colors.black },
  searchResultEmail: { fontSize: 12, color: colors.gray400 },
  alreadyInvited: { fontSize: 12, fontWeight: "600", color: colors.gray400 },
  inviteBtn: { backgroundColor: colors.black, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderCurve: "continuous" },
  inviteBtnText: { fontSize: 12, fontWeight: "600", color: colors.white },
});
