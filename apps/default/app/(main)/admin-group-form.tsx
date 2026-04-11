import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexAuth } from "convex/react";

type Visibility = "public" | "invite_only" | "request";
const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "public", label: "Öffentlich" },
  { value: "invite_only", label: "Nur auf Einladung" },
  { value: "request", label: "Anfrage" },
];

export default function AdminGroupForm() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const isEdit = Boolean(groupId);
  const { isAuthenticated } = useConvexAuth();

  const group = useQuery(
    api.admin.getGroupDetailAdmin,
    isAuthenticated && groupId ? { groupId: groupId as Id<"groups"> } : "skip",
  );
  const members = useQuery(
    api.admin.listGroupMembersAdmin,
    isAuthenticated && groupId ? { groupId: groupId as Id<"groups"> } : "skip",
  );

  const updateGroup = useMutation(api.admin.updateGroupAdmin);
  const deleteGroup = useMutation(api.admin.deleteGroupAdmin);
  const removeMember = useMutation(api.admin.removeGroupMemberAdmin);
  const generateUploadUrl = useMutation(api.admin.generateUploadUrl);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [saving, setSaving] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | undefined>();
  const [newThumbnailStorageId, setNewThumbnailStorageId] = useState<Id<"_storage"> | undefined>();
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description ?? "");
      setCity(group.city ?? "");
      setCounty(group.county ?? "");
      setVisibility(group.visibility);
      setThumbnailPreview(group.thumbnailUrl);
    }
  }, [group]);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setThumbnailPreview(asset.uri);

    try {
      const uploadUrl = await generateUploadUrl({});
      const resp = await fetch(asset.uri);
      const blob = await resp.blob();
      const uploadResp = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
        body: blob,
      });
      const { storageId } = await uploadResp.json();
      setNewThumbnailStorageId(storageId as Id<"_storage">);
    } catch {
      if (Platform.OS !== "web") Alert.alert("Fehler", "Bild konnte nicht hochgeladen werden");
    }
  }, [generateUploadUrl]);

  const handleSave = useCallback(async () => {
    if (!groupId || !name.trim()) return;
    setSaving(true);
    try {
      await updateGroup({
        groupId: groupId as Id<"groups">,
        name: name.trim(),
        description: description.trim() || undefined,
        city: city.trim() || undefined,
        county: county.trim() || undefined,
        visibility,
        ...(newThumbnailStorageId ? { thumbnailStorageId: newThumbnailStorageId } : {}),
      });
      router.back();
    } catch {
      if (Platform.OS !== "web") Alert.alert("Fehler", "Änderungen konnten nicht gespeichert werden");
    } finally {
      setSaving(false);
    }
  }, [groupId, name, description, city, county, visibility, newThumbnailStorageId, updateGroup]);

  const handleDelete = useCallback(() => {
    if (!groupId) return;
    const doDelete = async () => {
      try {
        await deleteGroup({ groupId: groupId as Id<"groups"> });
        router.back();
      } catch {
        if (Platform.OS !== "web") Alert.alert("Fehler", "Gruppe konnte nicht gelöscht werden");
      }
    };
    if (Platform.OS !== "web") {
      Alert.alert(
        "Gruppe löschen",
        `"${name}" wirklich löschen? Alle Mitglieder, Nachrichten und Medien werden gelöscht.`,
        [
          { text: "Abbrechen", style: "cancel" },
          { text: "Löschen", style: "destructive", onPress: doDelete },
        ],
      );
    } else {
      doDelete();
    }
  }, [groupId, name, deleteGroup]);

  const handleRemoveMember = useCallback(
    (userId: Id<"users">, memberName: string) => {
      if (!groupId) return;
      const doRemove = async () => {
        try {
          await removeMember({ groupId: groupId as Id<"groups">, userId });
        } catch {
          if (Platform.OS !== "web") Alert.alert("Fehler", "Mitglied konnte nicht entfernt werden");
        }
      };
      if (Platform.OS !== "web") {
        Alert.alert(
          "Mitglied entfernen",
          `"${memberName}" aus der Gruppe entfernen?`,
          [
            { text: "Abbrechen", style: "cancel" },
            { text: "Entfernen", style: "destructive", onPress: doRemove },
          ],
        );
      } else {
        doRemove();
      }
    },
    [groupId, removeMember],
  );

  if (isEdit && group === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.black} />
      </View>
    );
  }

  if (isEdit && group === null) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gruppe nicht gefunden</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? "Gruppe bearbeiten" : "Gruppe"}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Thumbnail */}
        <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7} style={styles.thumbnailWrap}>
          {thumbnailPreview ? (
            <Image source={{ uri: thumbnailPreview }} style={styles.thumbnail} contentFit="cover" />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <SymbolView name="photo" size={28} tintColor={colors.gray300} />
              <Text style={styles.thumbnailPlaceholderText}>Titelbild wählen</Text>
            </View>
          )}
          <View style={styles.thumbnailOverlay}>
            <SymbolView name="camera.fill" size={14} tintColor={colors.white} />
          </View>
        </TouchableOpacity>

        {/* Name */}
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Gruppenname"
          placeholderTextColor={colors.gray300}
        />

        {/* Description */}
        <Text style={styles.label}>Beschreibung</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Beschreibung der Gruppe"
          placeholderTextColor={colors.gray300}
          multiline
          textAlignVertical="top"
        />

        {/* City / County */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Stadt</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Stadt"
              placeholderTextColor={colors.gray300}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Landkreis</Text>
            <TextInput
              style={styles.input}
              value={county}
              onChangeText={setCounty}
              placeholder="Landkreis"
              placeholderTextColor={colors.gray300}
            />
          </View>
        </View>

        {/* Visibility */}
        <Text style={styles.label}>Sichtbarkeit</Text>
        <View style={styles.visibilityRow}>
          {VISIBILITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.visibilityBtn,
                visibility === opt.value && styles.visibilityBtnActive,
              ]}
              onPress={() => setVisibility(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.visibilityText,
                  visibility === opt.value && styles.visibilityTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Creator info */}
        {group && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <SymbolView name="person.fill" size={13} tintColor={colors.gray400} />
              <Text style={styles.infoLabel}>Erstellt von</Text>
              <Text style={styles.infoValue}>{group.creatorName}</Text>
            </View>
            <View style={styles.infoRow}>
              <SymbolView name="person.2.fill" size={13} tintColor={colors.gray400} />
              <Text style={styles.infoLabel}>Mitglieder</Text>
              <Text style={styles.infoValue}>{group.memberCount}</Text>
            </View>
            <View style={styles.infoRow}>
              <SymbolView name="calendar" size={13} tintColor={colors.gray400} />
              <Text style={styles.infoLabel}>Erstellt am</Text>
              <Text style={styles.infoValue}>
                {new Date(group.createdAt).toLocaleDateString("de-DE")}
              </Text>
            </View>
          </View>
        )}

        {/* Members section */}
        {isEdit && (
          <View style={styles.membersSection}>
            <TouchableOpacity
              style={styles.membersSectionHeader}
              onPress={() => setShowMembers((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={styles.membersSectionTitleRow}>
                <SymbolView name="person.2" size={14} tintColor={colors.gray500} />
                <Text style={styles.membersSectionTitle}>
                  Mitglieder ({members?.length ?? "..."})
                </Text>
              </View>
              <SymbolView
                name={showMembers ? "chevron.up" : "chevron.down"}
                size={13}
                tintColor={colors.gray400}
              />
            </TouchableOpacity>

            {showMembers && (
              <View style={styles.membersList}>
                {members === undefined ? (
                  <ActivityIndicator size="small" color={colors.gray300} style={{ padding: 16 }} />
                ) : members.length === 0 ? (
                  <Text style={styles.emptyMembers}>Keine Mitglieder</Text>
                ) : (
                  members.map((m: { _id: string; userId: string; name: string; email?: string; avatarUrl: string | undefined; role: string; status: string }) => (
                    <View key={m._id} style={styles.memberRow}>
                      {m.avatarUrl ? (
                        <Image source={{ uri: m.avatarUrl }} style={styles.memberAvatar} />
                      ) : (
                        <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder]}>
                          <Text style={styles.memberAvatarText}>
                            {m.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        <Text style={styles.memberEmail}>{m.email}</Text>
                      </View>
                      <View style={styles.memberBadge}>
                        <Text style={styles.memberBadgeText}>
                          {m.role === "admin" ? "Admin" : m.status === "pending" ? "Angefragt" : "Mitglied"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(m.userId, m.name)}
                        style={styles.removeMemberBtn}
                        hitSlop={8}
                      >
                        <SymbolView name="xmark" size={12} tintColor={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}

        {/* Save button */}
        {isEdit && (
          <TouchableOpacity
            style={[styles.saveBtn, (!name.trim() || saving) && { opacity: 0.4 }]}
            onPress={handleSave}
            disabled={!name.trim() || saving}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Speichern</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Delete button */}
        {isEdit && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <SymbolView name="trash" size={14} tintColor={colors.danger} />
            <Text style={styles.deleteBtnText}>Gruppe löschen</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.gray50 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },

  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  thumbnailWrap: {
    width: "100%",
    height: 180,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.gray100,
    marginBottom: spacing.lg,
    borderCurve: "continuous",
  },
  thumbnail: { width: "100%", height: "100%" },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  thumbnailPlaceholderText: { fontSize: 13, color: colors.gray400 },
  thumbnailOverlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    marginBottom: 6,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.black,
    borderWidth: 1,
    borderColor: colors.gray100,
    borderCurve: "continuous",
    ...shadows.sm,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  row: { flexDirection: "row", gap: spacing.sm },
  halfField: { flex: 1 },

  visibilityRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  visibilityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.gray100,
    borderCurve: "continuous",
  },
  visibilityBtnActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  visibilityText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
  },
  visibilityTextActive: {
    color: colors.white,
  },

  infoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderCurve: "continuous",
    ...shadows.sm,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.gray500,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.black,
  },

  membersSection: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
    borderCurve: "continuous",
    overflow: "hidden",
    ...shadows.sm,
  },
  membersSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  membersSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  membersSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
  },
  membersList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.gray100,
  },
  emptyMembers: {
    fontSize: 14,
    color: colors.gray400,
    padding: spacing.lg,
    textAlign: "center",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  memberAvatarPlaceholder: {
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray500,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "600", color: colors.black },
  memberEmail: { fontSize: 12, color: colors.gray400, marginTop: 1 },
  memberBadge: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray500,
  },
  removeMemberBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  saveBtn: {
    backgroundColor: colors.black,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.xl,
    borderCurve: "continuous",
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: spacing.md,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.danger,
  },
});
