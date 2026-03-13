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
      {/* Admin badges */}
      {adminGroups.map((g) => (
        <TouchableOpacity
          key={g.groupId}
          style={styles.adminChip}
          activeOpacity={0.7}
          onPress={() => router.push(`/(main)/group-detail?id=${g.groupId}` as "/")}
        >
          <View style={styles.crownCircle}>
            <SymbolView name="crown.fill" size={10} tintColor={colors.white} />
          </View>
          <Text style={styles.adminChipText} numberOfLines={1}>
            Admin: {g.groupName}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Member chips */}
      {memberGroups.length > 0 && (
        <View style={styles.memberRow}>
          <Text style={styles.memberLabel}>Member in</Text>
          <View style={styles.memberChips}>
            {memberGroups.map((g) => (
              <TouchableOpacity
                key={g.groupId}
                style={styles.memberChip}
                activeOpacity={0.7}
                onPress={() => router.push(`/(main)/group-detail?id=${g.groupId}` as "/")}
              >
                <Text style={styles.memberChipText} numberOfLines={1}>
                  {g.groupName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, marginTop: spacing.sm },

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

  /* Admin group chip */
  adminChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: colors.gray100,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  crownCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  adminChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.black,
    maxWidth: 180,
  },

  /* Member */
  memberRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    flexWrap: "wrap",
  },
  memberLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.gray400,
    marginTop: 6,
  },
  memberChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
  },
  memberChip: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderCurve: "continuous",
  },
  memberChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.gray700,
    maxWidth: 140,
  },
});
