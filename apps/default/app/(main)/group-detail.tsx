import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import { safeBack } from "@/lib/navigation";
import * as Haptics from "expo-haptics";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useQuery(api.groups.getById, id ? { groupId: id as Id<"groups"> } : "skip");
  const membership = useQuery(api.groups.getMyMembership, id ? { groupId: id as Id<"groups"> } : "skip");
  const members = useQuery(api.groups.getMembers, id ? { groupId: id as Id<"groups"> } : "skip");
  const pendingRequests = useQuery(api.groups.getPendingRequests, id ? { groupId: id as Id<"groups"> } : "skip");
  const joinGroup = useMutation(api.groups.join);
  const acceptRequest = useMutation(api.groups.acceptRequest);
  const rejectRequest = useMutation(api.groups.rejectRequest);

  if (!group) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><ActivityIndicator color={colors.gray300} /></View>
      </SafeAreaView>
    );
  }

  const isMember = membership?.status === "active";
  const isPending = membership?.status === "pending";
  const isAdmin = membership?.role === "admin";
  const isRequestGroup = group.visibility === "request" || group.visibility === "invite_only";

  const handleJoin = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try { await joinGroup({ groupId: id as Id<"groups"> }); } catch { /* already member */ }
  };

  const handleAccept = async (userId: Id<"users">) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { await acceptRequest({ groupId: id as Id<"groups">, userId }); } catch { /* error */ }
  };

  const handleReject = async (userId: Id<"users">) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { await rejectRequest({ groupId: id as Id<"groups">, userId }); } catch { /* error */ }
  };

  const getVisibilityLabel = () => {
    if (group.visibility === "public") return "Öffentlich";
    return "Auf Anfrage";
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View style={styles.hero}>
          {group.thumbnailUrl ? (
            <Image source={{ uri: group.thumbnailUrl }} style={styles.heroImage} contentFit="cover" transition={300} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <SymbolView name="person.3.fill" size={40} tintColor={colors.gray300} />
            </View>
          )}
          <View style={styles.heroOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => safeBack("group-detail")}>
            <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push({ pathname: "/(main)/edit-group", params: { id: id! } })}
            >
              <SymbolView name="pencil" size={16} tintColor={colors.black} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.groupName}>{group.name}</Text>

          {/* Info Widgets */}
          <View style={styles.widgetRow}>
            {(group.city || group.county) && (
              <View style={styles.widget}>
                <SymbolView name="mappin" size={12} tintColor={colors.gray500} />
                <Text style={styles.widgetText}>{group.city || group.county}</Text>
              </View>
            )}
            {group.topic && (
              <View style={styles.widget}>
                <SymbolView name="tag" size={12} tintColor={colors.gray500} />
                <Text style={styles.widgetText}>{group.topic}</Text>
              </View>
            )}
            <View style={styles.widget}>
              <SymbolView name="person.2" size={12} tintColor={colors.gray500} />
              <Text style={styles.widgetText}>
                {group.memberCount} {group.memberCount === 1 ? "Mitglied" : "Mitglieder"}
              </Text>
            </View>
            <View style={[styles.widget, group.visibility === "public" ? styles.widgetPublic : styles.widgetPrivate]}>
              <SymbolView
                name={group.visibility === "public" ? "globe" : "lock"}
                size={12}
                tintColor={group.visibility === "public" ? "#1a8d1a" : colors.gray500}
              />
              <Text style={[styles.widgetText, group.visibility === "public" && styles.widgetTextPublic]}>
                {getVisibilityLabel()}
              </Text>
            </View>
          </View>

          {group.description && (
            <Text style={styles.desc}>{group.description}</Text>
          )}

          {/* Interests tags */}
          {group.interests && group.interests.length > 0 && (
            <View style={styles.interestTags}>
              {group.interests.map(i => (
                <View key={i} style={styles.interestTag}>
                  <Text style={styles.interestTagText}>{i}</Text>
                </View>
              ))}
            </View>
          )}

          {isAdmin && (
            <TouchableOpacity
              style={styles.adminEditRow}
              onPress={() => router.push({ pathname: "/(main)/edit-group", params: { id: id! } })}
              activeOpacity={0.7}
            >
              <SymbolView name="pencil" size={16} tintColor={colors.black} />
              <Text style={styles.adminEditText}>Gruppe bearbeiten</Text>
              <SymbolView name="chevron.right" size={13} tintColor={colors.gray300} />
            </TouchableOpacity>
          )}

          {/* Actions */}
          <View style={styles.actionRow}>
            {isMember ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push({ pathname: "/(main)/group-chat", params: { id: id! } })}
                activeOpacity={0.7}
              >
                <SymbolView name="bubble.left.and.bubble.right" size={16} tintColor={colors.white} />
                <Text style={styles.primaryBtnText}>Chat öffnen</Text>
              </TouchableOpacity>
            ) : isPending ? (
              <View style={styles.pendingBtn}>
                <SymbolView name="clock" size={16} tintColor={colors.gray600} />
                <Text style={styles.pendingBtnText}>Anfrage gesendet</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleJoin} activeOpacity={0.7}>
                <SymbolView name={isRequestGroup ? "envelope" : "plus"} size={16} tintColor={colors.white} />
                <Text style={styles.primaryBtnText}>
                  {isRequestGroup ? "Anfrage senden" : "Beitreten"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7}>
              <SymbolView name="square.and.arrow.up" size={16} tintColor={colors.black} />
            </TouchableOpacity>
          </View>

          {/* Pending Requests (Admin only) */}
          {isAdmin && pendingRequests && pendingRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Beitrittsanfragen ({pendingRequests.length})
              </Text>
              {pendingRequests.map(req => (
                <View key={req._id} style={styles.requestRow}>
                  <Avatar uri={req.avatarUrl} name={req.name} size={44} />
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{req.name}</Text>
                    <Text style={styles.requestTime}>
                      {formatTimeAgo(req.requestedAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAccept(req.userId)}
                    activeOpacity={0.7}
                  >
                    <SymbolView name="checkmark" size={14} tintColor={colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleReject(req.userId)}
                    activeOpacity={0.7}
                  >
                    <SymbolView name="xmark" size={14} tintColor={colors.gray600} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Members */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mitglieder</Text>
            {members && members.length > 0 ? (
              members.filter(m => m.status === "active").map(m => (
                <TouchableOpacity
                  key={m._id}
                  style={styles.memberRow}
                  onPress={() => router.push({ pathname: "/(main)/user-profile", params: { id: m.userId } })}
                  activeOpacity={0.65}
                >
                  <Avatar uri={m.avatarUrl} name={m.name} size={44} />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberRole}>
                      {m.role === "admin" ? "Admin" : "Mitglied"}
                    </Text>
                  </View>
                  <SymbolView name="chevron.right" size={13} tintColor={colors.gray300} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>Noch keine Mitglieder</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.floor(hrs / 24);
  return `vor ${days} T.`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  hero: { height: 240, backgroundColor: colors.gray100, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
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
  editBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.08)",
  },

  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  groupName: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.4,
  },
  widgetRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 12 },
  widget: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderCurve: "continuous",
  },
  widgetPublic: {
    backgroundColor: "rgba(34,170,34,0.08)",
    borderColor: "rgba(34,170,34,0.2)",
  },
  widgetPrivate: {},
  widgetText: { fontSize: 13, color: colors.gray600, fontWeight: "500" },
  widgetTextPublic: { color: "#1a8d1a" },

  desc: {
    fontSize: 15,
    color: colors.gray600,
    lineHeight: 22,
    marginTop: spacing.lg,
    letterSpacing: -0.1,
  },

  interestTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.md,
  },
  interestTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  interestTagText: {
    fontSize: 12,
    color: colors.gray600,
    fontWeight: "500",
  },

  adminEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.gray100,
    borderRadius: radius.md,
    borderCurve: "continuous",
  },
  adminEditText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
  },

  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.black,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "600", color: colors.white },
  pendingBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  pendingBtnText: { fontSize: 15, fontWeight: "600", color: colors.gray600 },
  secondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },

  // Pending requests
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 15, fontWeight: "600", color: colors.black },
  requestTime: { fontSize: 12, color: colors.gray400, marginTop: 1 },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.gray200,
  },

  section: { marginTop: spacing.xxl },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.2,
    marginBottom: spacing.md,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: "600", color: colors.black },
  memberRole: { fontSize: 13, color: colors.gray400, marginTop: 1 },
  emptyText: { fontSize: 14, color: colors.gray400, paddingVertical: spacing.lg },
});
