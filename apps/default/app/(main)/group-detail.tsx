import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { SymbolView } from "expo-symbols";
import { Image } from "expo-image";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useQuery(api.groups.get, id ? { id: id as Id<"groups"> } : "skip");
  const members = useQuery(api.groups.getMembers, id ? { groupId: id as Id<"groups"> } : "skip");
  const joinGroup = useMutation(api.groups.join);
  const leaveGroup = useMutation(api.groups.leave);

  if (!group) {
    return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator color={colors.gray400} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.imageHeader}>
          {group.thumbnailUrl ? (
            <Image source={{ uri: group.thumbnailUrl }} style={styles.headerImage} contentFit="cover" />
          ) : (
            <View style={styles.headerPlaceholder}>
              <SymbolView name="person.3.fill" size={40} tintColor={colors.gray300} />
            </View>
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <SymbolView name="chevron.left" size={20} tintColor={colors.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.meta}>{group.city || group.county || "MV"} {group.topic ? `• ${group.topic}` : ""}</Text>
          <Text style={styles.meta}>{group.memberCount} Mitglieder • {group.visibility === "public" ? "Öffentlich" : "Nur auf Einladung"}</Text>

          {group.description && <Text style={styles.desc}>{group.description}</Text>}

          <View style={styles.actionRow}>
            {group.isMember ? (
              <>
                <Button title="Chat" onPress={() => router.push({ pathname: "/(main)/group-chat", params: { id: id! } })} fullWidth />
                <Button title="Verlassen" onPress={() => leaveGroup({ groupId: id as Id<"groups"> })} variant="outline" size="sm" />
              </>
            ) : (
              <Button title="Beitreten" onPress={() => joinGroup({ groupId: id as Id<"groups"> })} fullWidth />
            )}
          </View>

          {/* Members */}
          <Text style={styles.sectionTitle}>Mitglieder</Text>
          <View style={styles.membersList}>
            {members?.map(m => (
              <TouchableOpacity
                key={m._id}
                style={styles.memberRow}
                onPress={() => router.push({ pathname: "/(main)/user-profile", params: { id: m.userId } })}
              >
                <Avatar uri={m.avatarUrl} name={m.name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberRole}>{m.role}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  imageHeader: { height: 220, backgroundColor: colors.gray100, position: "relative" },
  headerImage: { width: "100%", height: "100%" },
  headerPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: {
    position: "absolute", top: spacing.md, left: spacing.md,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center",
  },
  content: { padding: spacing.xl },
  groupName: { fontSize: 24, fontWeight: "700", color: colors.black },
  meta: { fontSize: 14, color: colors.gray500, marginTop: spacing.xs },
  desc: { fontSize: 15, color: colors.gray700, lineHeight: 22, marginTop: spacing.lg },
  actionRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: colors.black, marginTop: spacing.xxl, marginBottom: spacing.md },
  membersList: { gap: spacing.md },
  memberRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  memberName: { fontSize: 15, fontWeight: "500", color: colors.black },
  memberRole: { fontSize: 13, color: colors.gray500, textTransform: "capitalize" },
});
