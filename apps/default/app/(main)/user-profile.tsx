import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Platform, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import type { Id } from "@/convex/_generated/dataModel";
import { ZAdminBadge, GroupBadges } from "@/components/ProfileBadges";

const SCREEN_W = Dimensions.get("window").width;
const GRID_GAP = 2;
const GRID_COL = 3;
const THUMB_SIZE = (SCREEN_W - GRID_GAP * (GRID_COL - 1)) / GRID_COL;

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useQuery(api.users.getById, id ? { userId: id as Id<"users"> } : "skip");
  const userGroups = useQuery(api.users.getUserGroups, id ? { userId: id as Id<"users"> } : "skip");
  const friendStatus = useQuery(api.friends.getStatus, id ? { otherUserId: id as Id<"users"> } : "skip");
  const sendFriendRequest = useMutation(api.friends.sendRequest);
  const [sendingRequest, setSendingRequest] = useState(false);

  const handleSendFriendRequest = useCallback(async () => {
    if (!id) return;
    setSendingRequest(true);
    try {
      await sendFriendRequest({ receiverId: id as Id<"users"> });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler";
      if (Platform.OS !== "web") Alert.alert("Fehler", msg);
    } finally {
      setSendingRequest(false);
    }
  }, [id, sendFriendRequest]);

  const handleMessage = useCallback(() => {
    if (!id) return;
    router.push({ pathname: "/(main)/chat", params: { id: "new-" + id } });
  }, [id]);

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}><ActivityIndicator color={colors.gray400} /></View>
      </SafeAreaView>
    );
  }

  const friendLabel = friendStatus === "friends"
    ? "Befreundet \u2713"
    : friendStatus === "pending_sent"
      ? "Anfrage gesendet"
      : friendStatus === "pending_received"
        ? "Anfrage annehmen"
        : "Freundschaftsanfrage";

  const canSendRequest = friendStatus === "none" || friendStatus === "pending_received";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          {profile.bannerUrl ? (
            <Image source={{ uri: profile.bannerUrl }} style={styles.bannerImage} contentFit="cover" />
          ) : (
            <View style={styles.bannerPlaceholder} />
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => safeBack("user-profile")}>
            <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <Avatar uri={profile.avatarUrl} name={profile.name} size={80} />
          <Text style={styles.name}>{profile.name}</Text>
          {profile.role === "admin" && <ZAdminBadge />}
          {userGroups && userGroups.length > 0 && <GroupBadges groups={userGroups} />}
          {profile.city && (
            <Text style={styles.location}>
              {profile.city}{profile.county ? `, ${profile.county}` : ""}
            </Text>
          )}
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.friendBtn,
                friendStatus === "friends" && styles.friendBtnAccepted,
                friendStatus === "pending_sent" && styles.friendBtnPending,
              ]}
              onPress={canSendRequest ? handleSendFriendRequest : undefined}
              disabled={!canSendRequest || sendingRequest}
              activeOpacity={canSendRequest ? 0.7 : 1}
            >
              <SymbolView
                name={friendStatus === "friends" ? "person.crop.circle.badge.checkmark" : "person.badge.plus"}
                size={16}
                tintColor={friendStatus === "friends" ? colors.black : colors.white}
              />
              <Text style={[
                styles.actionBtnText,
                friendStatus === "friends" && styles.friendBtnTextAccepted,
              ]}>
                {sendingRequest ? "..." : friendLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.messageBtn]} onPress={handleMessage}>
              <SymbolView name="bubble.left.fill" size={16} tintColor={colors.black} />
              <Text style={[styles.actionBtnText, styles.messageBtnText]}>Nachricht</Text>
            </TouchableOpacity>
          </View>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionTitle}>Interessen</Text>
              <View style={styles.chipContainer}>
                {profile.interests.slice(0, 10).map((interest: string) => (
                  <View key={interest} style={styles.chip}>
                    <Text style={styles.chipText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Posts Grid */}
        {profile.posts.length > 0 && (
          <View style={styles.postsSection}>
            <Text style={styles.sectionTitlePosts}>
              Beiträge ({profile.posts.length})
            </Text>
            <View style={styles.postsGrid}>
              {profile.posts.map((post) => (
                <TouchableOpacity
                  key={post._id}
                  style={styles.postThumb}
                  activeOpacity={0.8}
                  onPress={() => router.push({
                    pathname: "/(main)/post-detail" as "/",
                    params: { id: post._id },
                  })}
                >
                  <Image
                    source={{ uri: post.thumbnailUrl ?? post.mediaUrl }}
                    style={styles.postThumbImage}
                    contentFit="cover"
                  />
                  {post.type === "video" && (
                    <View style={styles.videoIndicator}>
                      <SymbolView name="play.fill" size={12} tintColor={colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {profile.posts.length === 0 && (
          <View style={styles.emptyPosts}>
            <SymbolView name="photo.on.rectangle" size={40} tintColor={colors.gray300} />
            <Text style={styles.emptyPostsText}>Noch keine Beiträge</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  banner: { height: 180, position: "relative" },
  bannerImage: { width: "100%", height: "100%" },
  bannerPlaceholder: { flex: 1, backgroundColor: colors.gray200 },
  backBtn: {
    position: "absolute", top: spacing.md, left: spacing.md,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center", justifyContent: "center",
  },
  profileInfo: { paddingHorizontal: spacing.xl, marginTop: -40 },
  name: { fontSize: 24, fontWeight: "700", color: colors.black, marginTop: spacing.md },
  location: { fontSize: 15, color: colors.gray500, marginTop: spacing.xs },
  bio: { fontSize: 15, color: colors.gray700, marginTop: spacing.sm, lineHeight: 22 },

  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  friendBtn: {
    backgroundColor: colors.black,
  },
  friendBtnPending: {
    backgroundColor: colors.gray400,
  },
  friendBtnAccepted: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  messageBtn: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
  friendBtnTextAccepted: {
    color: colors.black,
  },
  messageBtnText: {
    color: colors.black,
  },

  interestsSection: { marginTop: spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.black, marginBottom: spacing.md },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, backgroundColor: colors.gray100,
  },
  chipText: { fontSize: 13, color: colors.gray700 },

  postsSection: { marginTop: spacing.xl },
  sectionTitlePosts: {
    fontSize: 16, fontWeight: "600", color: colors.black,
    paddingHorizontal: spacing.xl, marginBottom: spacing.md,
  },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  postThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    position: "relative",
  },
  postThumbImage: {
    width: "100%",
    height: "100%",
  },
  videoIndicator: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPosts: {
    alignItems: "center",
    paddingVertical: 48,
    gap: spacing.sm,
  },
  emptyPostsText: {
    fontSize: 15,
    color: colors.gray400,
  },
});
