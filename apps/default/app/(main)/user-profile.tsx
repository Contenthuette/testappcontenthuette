import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import type { Id } from "@/convex/_generated/dataModel";
import { ZAdminBadge, GroupBadges } from "@/components/ProfileBadges";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useQuery(api.users.getById, id ? { userId: id as Id<"users"> } : "skip");
  const userGroups = useQuery(api.users.getUserGroups, id ? { userId: id as Id<"users"> } : "skip");

  if (!profile) {
    return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator color={colors.gray400} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <View style={styles.bannerPlaceholder} />
          <TouchableOpacity style={styles.backBtn} onPress={() => safeBack("user-profile")}>
            <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          <Avatar uri={profile.avatarUrl} name={profile.name} size={80} />
          <Text style={styles.name}>{profile.name}</Text>
          {profile.role === "admin" && <ZAdminBadge />}
          {userGroups && userGroups.length > 0 && <GroupBadges groups={userGroups} />}
          {profile.city && <Text style={styles.location}>{profile.city}{profile.county ? `, ${profile.county}` : ""}</Text>}
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          <View style={styles.actions}>
            <Button title="Nachricht" onPress={() => router.push({ pathname: "/(main)/chat", params: { id: "new-" + id } })} fullWidth />
          </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  banner: { height: 160, backgroundColor: colors.gray200, position: "relative" },
  bannerImage: { width: "100%", height: "100%" },
  bannerPlaceholder: { flex: 1, backgroundColor: colors.gray200 },
  backBtn: {
    position: "absolute", top: spacing.md, left: spacing.md,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center",
  },
  profileInfo: { paddingHorizontal: spacing.xl, marginTop: -40 },
  name: { fontSize: 24, fontWeight: "700", color: colors.black, marginTop: spacing.md },
  location: { fontSize: 15, color: colors.gray500, marginTop: spacing.xs },
  bio: { fontSize: 15, color: colors.gray700, marginTop: spacing.sm, lineHeight: 22 },
  actions: { marginTop: spacing.lg },
  interestsSection: { marginTop: spacing.xl },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.black, marginBottom: spacing.md },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.gray100 },
  chipText: { fontSize: 13, color: colors.gray700 },
});
