import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { colors, spacing, radius } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import { ZLogo } from "@/components/ZLogo";
import type { Id } from "@/convex/_generated/dataModel";

/* ── Z Admin Badge ─────────────────────────────── */
export function ZAdminBadge() {
  return (
    <View style={styles.zBadge}>
      <ZLogo size={18} />
      <Text style={styles.zText}>Admin</Text>
    </View>
  );
}

/* ── Group Role Badges ─────────────────────────── */
interface GroupInfo {
  groupId: Id<"groups">;
  groupName: string;
  role: "admin" | "member";
}

export function GroupBadges({ groups }: { groups: GroupInfo[] }) {
  if (groups.length === 0) return null;

  const adminGroups = groups.filter((g) => g.role === "admin");
  const memberGroups = groups.filter((g) => g.role === "member");

  return (
    <View style={styles.container}>
      {adminGroups.map((g) => (
        <TouchableOpacity
          key={g.groupId}
          style={styles.groupChip}
          activeOpacity={0.7}
          onPress={() => router.push(`/(main)/group-detail?id=${g.groupId}` as "/")}
        >
          <View style={styles.crownCircle}>
            <SymbolView name="crown.fill" size={10} tintColor={colors.white} />
          </View>
          <Text style={styles.groupChipText} numberOfLines={1}>
            {g.groupName}
          </Text>
        </TouchableOpacity>
      ))}
      {memberGroups.map((g) => (
        <TouchableOpacity
          key={g.groupId}
          style={styles.groupChip}
          activeOpacity={0.7}
          onPress={() => router.push(`/(main)/group-detail?id=${g.groupId}` as "/")}
        >
          <View style={styles.memberDot} />
          <Text style={styles.groupChipText} numberOfLines={1}>
            {g.groupName}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ── Location Badge ────────────────────────────── */
export function LocationBadge({ city, county }: { city?: string; county?: string }) {
  const text = [city, county].filter(Boolean).join(", ");
  if (!text) return null;

  return (
    <View style={styles.locationChip}>
      <SymbolView name="mappin" size={11} tintColor={colors.gray500} />
      <Text style={styles.locationText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.sm,
  },

  /* Z Admin */
  zBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 4,
  },
  zText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    letterSpacing: -0.2,
  },

  /* Group chips — unified style */
  groupChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.gray50,
    paddingLeft: 5,
    paddingRight: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  crownCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  memberDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  groupChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.gray700,
    maxWidth: 140,
  },

  /* Location chip */
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: colors.gray50,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.gray200,
    marginTop: 6,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.gray600,
    maxWidth: 200,
  },
});
