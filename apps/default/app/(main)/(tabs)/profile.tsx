import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";

export default function ProfileScreen() {
  const me = useQuery(api.users.me);
  const myPosts = useQuery(api.posts.getUserPosts, me ? { userId: me._id } : "skip");

  if (!me) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.banner}>
          {me.bannerUrl ? (
            <Image source={{ uri: me.bannerUrl }} style={styles.bannerImage} contentFit="cover" />
          ) : (
            <View style={styles.bannerPlaceholder} />
          )}
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push("/(main)/settings")}>
            <SymbolView name="gearshape" size={22} tintColor={colors.black} />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <View style={styles.avatarRow}>
            <Avatar uri={me.avatarUrl} name={me.name} size={80} />
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push("/(main)/edit-profile")}>
              <Text style={styles.editBtnText}>Bearbeiten</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{me.name}</Text>
          {me.city && <Text style={styles.location}>{me.city}{me.county ? `, ${me.county}` : ""}</Text>}
          {me.bio && <Text style={styles.bio}>{me.bio}</Text>}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{myPosts?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Beiträge</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Freunde</Text>
            </View>
          </View>

          {/* Interests */}
          {me.interests && me.interests.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionTitle}>Interessen</Text>
              <View style={styles.chipContainer}>
                {me.interests.slice(0, 10).map((interest: string) => (
                  <View key={interest} style={styles.chip}>
                    <Text style={styles.chipText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Media Grid */}
        {myPosts && myPosts.length > 0 && (
          <View style={styles.mediaGrid}>
            {myPosts.map(post => (
              <View key={post._id} style={styles.mediaItem}>
                {post.mediaUrl ? (
                  <Image source={{ uri: post.mediaUrl }} style={styles.mediaImage} contentFit="cover" />
                ) : (
                  <View style={styles.mediaPlaceholder} />
                )}
              </View>
            ))}
          </View>
        )}

        {/* Admin shortcut */}
        {me.role === "admin" && (
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => router.push("/(admin)/dashboard")}
          >
            <SymbolView name="shield.checkered" size={20} tintColor={colors.white} />
            <Text style={styles.adminBtnText}>Admin Dashboard</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  banner: { height: 160, backgroundColor: colors.gray200, position: "relative" },
  bannerImage: { width: "100%", height: "100%" },
  bannerPlaceholder: { flex: 1, backgroundColor: colors.gray200 },
  settingsBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { paddingHorizontal: spacing.xl, marginTop: -40 },
  avatarRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  editBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
  },
  editBtnText: { fontSize: 14, fontWeight: "600", color: colors.black },
  name: { fontSize: 24, fontWeight: "700", color: colors.black, marginTop: spacing.md },
  location: { fontSize: 15, color: colors.gray500, marginTop: spacing.xs },
  bio: { fontSize: 15, color: colors.gray700, marginTop: spacing.sm, lineHeight: 22 },
  statsRow: { flexDirection: "row", gap: spacing.xxl, marginTop: spacing.lg },
  stat: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.black },
  statLabel: { fontSize: 13, color: colors.gray500 },
  interestsSection: { marginTop: spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.black, marginBottom: spacing.md },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.gray100 },
  chipText: { fontSize: 13, color: colors.gray700 },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", paddingTop: spacing.xl },
  mediaItem: { width: "33.33%", aspectRatio: 1, padding: 1 },
  mediaImage: { flex: 1, backgroundColor: colors.gray100 },
  mediaPlaceholder: { flex: 1, backgroundColor: colors.gray100 },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginVertical: spacing.xxl,
    padding: spacing.lg,
    backgroundColor: colors.black,
    borderRadius: radius.lg,
  },
  adminBtnText: { fontSize: 16, fontWeight: "600", color: colors.white },
});
