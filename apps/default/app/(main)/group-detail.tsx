import React from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useQuery(api.groups.getById, id ? { groupId: id as Id<"groups"> } : "skip");
  const membership = useQuery(api.groups.getMyMembership, id ? { groupId: id as Id<"groups"> } : "skip");
  const members = useQuery(api.groups.getMembers, id ? { groupId: id as Id<"groups"> } : "skip");
  const joinGroup = useMutation(api.groups.join);

  if (!group) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><ActivityIndicator color={colors.gray300} /></View>
      </SafeAreaView>
    );
  }

  const isMember = membership?.status === "active";

  const handleJoin = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try { await joinGroup({ groupId: id as Id<"groups"> }); } catch (e) { /* already member */ }
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
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.groupName}>{group.name}</Text>
          <View style={styles.metaRow}>
            <SymbolView name="mappin" size={13} tintColor={colors.gray400} />
            <Text style={styles.metaText}>
              {[group.city || group.county || "MV", group.topic].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <SymbolView name="person.2" size={13} tintColor={colors.gray400} />
            <Text style={styles.metaText}>
              {group.memberCount} {group.memberCount === 1 ? "Mitglied" : "Mitglieder"} ·{" "}
              {group.visibility === "public" ? "Öffentlich" : "Nur auf Einladung"}
            </Text>
          </View>

          {group.description && (
            <Text style={styles.desc}>{group.description}</Text>
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
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleJoin} activeOpacity={0.7}>
                <SymbolView name="plus" size={16} tintColor={colors.white} />
                <Text style={styles.primaryBtnText}>Beitreten</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.7}>
              <SymbolView name="square.and.arrow.up" size={16} tintColor={colors.black} />
            </TouchableOpacity>
          </View>

          {/* Members */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mitglieder</Text>
            {members && members.length > 0 ? (
              members.map(m => (
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

  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  groupName: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.black,
    letterSpacing: -0.4,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  metaText: { fontSize: 14, color: colors.gray500, flex: 1 },
  desc: {
    fontSize: 15,
    color: colors.gray600,
    lineHeight: 22,
    marginTop: spacing.lg,
    letterSpacing: -0.1,
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
  secondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
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
