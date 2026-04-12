import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

interface Attendee {
  _id: string;
  userId: string;
  name: string;
  avatarUrl: string | undefined;
  role: string;
}

function calcEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export default function MemberEventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useConvexAuth();
  const event = useQuery(api.memberEvents.getById, id ? { eventId: id as Id<"memberEvents"> } : "skip");
  const attendees = useQuery(
    api.memberEvents.getAttendees,
    id ? { eventId: id as Id<"memberEvents"> } : "skip",
  );
  const currentUser = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  const joinEvent = useMutation(api.memberEvents.join);
  const leaveEvent = useMutation(api.memberEvents.leave);
  const kickAttendee = useMutation(api.memberEvents.kickAttendee);
  const cancelEvent = useMutation(api.memberEvents.cancel);

  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);

  // Determine current user's membership
  const myAttendance = attendees?.find((a: Attendee) => currentUser && a.userId === currentUser._id);
  const isAttending = !!myAttendance;
  const iAmAdmin = myAttendance?.role === "admin";

  const handleJoin = useCallback(async () => {
    if (!id) return;
    setJoining(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await joinEvent({ eventId: id as Id<"memberEvents"> });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler";
      Alert.alert("Fehler", msg);
    } finally {
      setJoining(false);
    }
  }, [id, joinEvent]);

  const handleLeave = useCallback(async () => {
    if (!id) return;
    Alert.alert("Event verlassen?", "Möchtest du das Event wirklich verlassen?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Verlassen",
        style: "destructive",
        onPress: async () => {
          setLeaving(true);
          try {
            await leaveEvent({ eventId: id as Id<"memberEvents"> });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Fehler";
            Alert.alert("Fehler", msg);
          } finally {
            setLeaving(false);
          }
        },
      },
    ]);
  }, [id, leaveEvent]);

  const handleKick = useCallback(
    (userId: Id<"users">, name: string) => {
      if (!id) return;
      Alert.alert(`${name} entfernen?`, "Diese Person wird aus dem Event entfernt.", [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Entfernen",
          style: "destructive",
          onPress: async () => {
            try {
              await kickAttendee({
                eventId: id as Id<"memberEvents">,
                userId,
              });
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Fehler";
              Alert.alert("Fehler", msg);
            }
          },
        },
      ]);
    },
    [id, kickAttendee],
  );

  const handleCancel = useCallback(async () => {
    if (!id) return;
    Alert.alert("Event absagen?", "Alle Teilnehmer werden benachrichtigt.", [
      { text: "Nein", style: "cancel" },
      {
        text: "Absagen",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelEvent({ eventId: id as Id<"memberEvents"> });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Fehler";
            Alert.alert("Fehler", msg);
          }
        },
      },
    ]);
  }, [id, cancelEvent]);

  const handleOpenGroup = useCallback(() => {
    if (!event?.groupId) return;
    router.navigate({
      pathname: "/(main)/group-detail",
      params: { id: event.groupId },
    });
  }, [event?.groupId]);

  if (!event) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.gray300} />
        </View>
      </SafeAreaView>
    );
  }

  // Check if current user is attending
  const isCanceled = event.status === "canceled";
  const isFull = !!event.maxAttendees && event.attendeeCount >= event.maxAttendees;

  // Format date for display (YYYY-MM-DD → DD.MM.YYYY)
  const displayDate = (() => {
    const m = event.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    return event.date;
  })();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {event.thumbnailUrl ? (
            <Image
              source={{ uri: event.thumbnailUrl }}
              style={styles.heroImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <SymbolView name="party.popper" size={40} tintColor={colors.gray300} />
            </View>
          )}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => safeBack("member-event-detail")}
          >
            <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
          </TouchableOpacity>
          {isCanceled && (
            <View style={styles.canceledBadge}>
              <Text style={styles.canceledText}>Abgesagt</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Status badge */}
          <View style={styles.typeBadge}>
            <SymbolView name="person.2" size={12} tintColor={colors.gray500} />
            <Text style={styles.typeBadgeText}>Z MEMBER EVENT</Text>
          </View>

          <Text style={styles.eventName}>{event.name}</Text>

          {/* Creator */}
          <View style={styles.creatorRow}>
            {event.creatorAvatarUrl ? (
              <Image
                source={{ uri: event.creatorAvatarUrl }}
                style={styles.creatorAvatar}
              />
            ) : (
              <View style={[styles.creatorAvatar, styles.creatorAvatarPlaceholder]}>
                <SymbolView name="person.fill" size={14} tintColor={colors.gray400} />
              </View>
            )}
            <Text style={styles.creatorName}>von {event.creatorName}</Text>
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <SymbolView name="calendar" size={18} tintColor={colors.gray500} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>{displayDate}</Text>
                <Text style={styles.infoSub}>
                  {event.startTime} – {calcEndTime(event.startTime, event.durationMinutes)} Uhr
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <SymbolView name="mappin" size={18} tintColor={colors.gray500} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>{event.venue}</Text>
                <Text style={styles.infoSub}>{event.city}{event.county ? `, ${event.county}` : ""}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <SymbolView name="person.2" size={18} tintColor={colors.gray500} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>
                  {event.attendeeCount} Teilnehmer{event.attendeeCount !== 1 ? "" : ""}
                </Text>
                {event.maxAttendees ? (
                  <Text style={styles.infoSub}>max. {event.maxAttendees} Plätze</Text>
                ) : (
                  <Text style={styles.infoSub}>Unbegrenzte Plätze</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <SymbolView name="tag" size={18} tintColor={colors.gray500} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Kostenlos</Text>
                <Text style={styles.infoSub}>Kein Ticket nötig – einfach dabei sein</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          {event.description ? (
            <View style={styles.descSection}>
              <Text style={styles.sectionTitle}>Beschreibung</Text>
              <Text style={styles.descText}>{event.description}</Text>
            </View>
          ) : null}

          {/* Action buttons */}
          {!isCanceled && isAuthenticated && !isAttending && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.joinBtn, isFull && styles.joinBtnDisabled]}
                onPress={handleJoin}
                disabled={joining || isFull}
                activeOpacity={0.7}
              >
                {joining ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <SymbolView name="checkmark.circle.fill" size={18} tintColor={colors.white} />
                    <Text style={styles.joinBtnText}>
                      {isFull ? "Event ist voll" : "Dabei sein"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Event-Gruppe button for attendees */}
          {!isCanceled && isAuthenticated && isAttending && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.groupBtn}
                onPress={handleOpenGroup}
                activeOpacity={0.7}
              >
                <SymbolView name="bubble.left.and.bubble.right" size={18} tintColor={colors.black} />
                <Text style={styles.groupBtnText}>Event-Gruppe öffnen</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Leave / Cancel for attendees/creators */}
          {!isCanceled && isAuthenticated && isAttending && (
            <View style={styles.secondaryActions}>
              <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
                {leaving ? (
                  <ActivityIndicator color={colors.gray500} size="small" />
                ) : (
                  <Text style={styles.leaveBtnText}>Event verlassen</Text>
                )}
              </TouchableOpacity>

              {iAmAdmin && (
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                  <Text style={styles.cancelBtnText}>Event absagen</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Attendees */}
          <View style={styles.attendeesSection}>
            <TouchableOpacity
              style={styles.attendeesHeader}
              onPress={() => setShowAttendees(!showAttendees)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>
                Teilnehmer ({event.attendeeCount})
              </Text>
              <SymbolView
                name={showAttendees ? "chevron.up" : "chevron.down"}
                size={14}
                tintColor={colors.gray400}
              />
            </TouchableOpacity>

            {showAttendees && attendees && (
              <View style={styles.attendeesList}>
                {attendees.map((a: Attendee) => (
                  <View key={a._id} style={styles.attendeeRow}>
                    {a.avatarUrl ? (
                      <Image source={{ uri: a.avatarUrl }} style={styles.attendeeAvatar} />
                    ) : (
                      <View style={[styles.attendeeAvatar, styles.attendeeAvatarPlaceholder]}>
                        <SymbolView name="person.fill" size={14} tintColor={colors.gray400} />
                      </View>
                    )}
                    <View style={styles.attendeeInfo}>
                      <Text style={styles.attendeeName}>{a.name}</Text>
                      {a.role === "admin" && (
                        <Text style={styles.attendeeRole}>Organisator</Text>
                      )}
                    </View>
                    {iAmAdmin && a.role !== "admin" && (
                      <TouchableOpacity
                        style={styles.kickBtn}
                        onPress={() => handleKick(a.userId as Id<"users">, a.name)}
                      >
                        <SymbolView name="xmark" size={12} tintColor={colors.gray400} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { height: 240, backgroundColor: colors.gray100, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  canceledBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(220,38,38,0.9)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  canceledText: { fontSize: 13, fontWeight: "700", color: colors.white },
  content: { padding: spacing.xl },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.gray100,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray500,
    letterSpacing: 0.5,
  },
  eventName: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.xl,
  },
  creatorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  creatorAvatarPlaceholder: {
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  creatorName: {
    fontSize: 14,
    color: colors.gray500,
    fontWeight: "500",
  },
  infoCard: {
    backgroundColor: colors.gray100,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderCurve: "continuous",
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextWrap: { flex: 1 },
  infoLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
    letterSpacing: -0.2,
  },
  infoSub: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gray200,
    marginVertical: spacing.md,
  },
  descSection: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },
  descText: {
    fontSize: 15,
    color: colors.gray500,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.black,
    borderRadius: radius.full,
    paddingVertical: 16,
  },
  joinBtnDisabled: { opacity: 0.4 },
  joinBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: -0.2,
  },
  groupBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.gray100,
    borderRadius: radius.full,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  groupBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
    letterSpacing: -0.2,
  },
  secondaryActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  leaveBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  leaveBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray500,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: "rgba(220,38,38,0.08)",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
  },
  attendeesSection: { marginTop: spacing.md },
  attendeesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  attendeesList: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  attendeeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  attendeeAvatarPlaceholder: {
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  attendeeInfo: { flex: 1 },
  attendeeName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
    letterSpacing: -0.2,
  },
  attendeeRole: {
    fontSize: 12,
    color: colors.gray400,
    fontWeight: "500",
  },
  kickBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
});
