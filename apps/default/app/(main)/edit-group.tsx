import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Image } from "expo-image";
import { colors, spacing, radius } from "@/lib/theme";
import Icon from "@/components/Icon";
import { safeBack } from "@/lib/navigation";
import { pickImage, uploadToConvex } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";
import type { Id } from "@/convex/_generated/dataModel";

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const group = useQuery(api.groups.getById, id ? { groupId: id as Id<"groups"> } : "skip");
  const updateGroup = useMutation(api.groups.update);
  const generateUploadUrl = useMutation(api.groups.generateUploadUrl);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [topic, setTopic] = useState("");

  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<{ uri: string; mimeType: string } | null>(null);
  const [pickingThumbnail, setPickingThumbnail] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name ?? "");
      setDescription(group.description ?? "");
      setCounty(group.county ?? "");
      setCity(group.city ?? "");
      setTopic(group.topic ?? "");
      if (group.thumbnailUrl) setThumbnailPreview(group.thumbnailUrl);
    }
  }, [group]);

  const handlePickThumbnail = async () => {
    setPickingThumbnail(true);
    try {
      const result = await pickImage({ quality: 0.8, allowsEditing: true });
      if (result) {
        setThumbnailPreview(result.uri);
        setThumbnailFile({ uri: result.uri, mimeType: result.mimeType });
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } finally {
      setPickingThumbnail(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      let thumbnailStorageId: string | undefined;

      if (thumbnailFile) {
        const url = await generateUploadUrl();
        thumbnailStorageId = await uploadToConvex(url, thumbnailFile.uri, thumbnailFile.mimeType);
      }

      await updateGroup({
        groupId: id as Id<"groups">,
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        county: county.trim() || undefined,
        city: city.trim() || undefined,
        topic: topic.trim() || undefined,
        ...(thumbnailStorageId ? { thumbnailStorageId: thumbnailStorageId as never } : {}),
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      safeBack("edit-group");
    } catch (error) {
      console.error("Group update failed:", error);
      setSaving(false);
      if (Platform.OS !== "web") {
        const { Alert: RNAlert } = require("react-native");
        RNAlert.alert("Fehler", "Gruppe konnte nicht gespeichert werden.");
      }
    }
  };

  if (group === undefined) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.gray400} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack("edit-group")}
          style={styles.headerBtn}
        >
          <Icon name="chevron.left" size={20} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gruppe bearbeiten</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Speichern</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Thumbnail */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Gruppenbild</Text>
          <TouchableOpacity
            style={styles.thumbnailArea}
            onPress={handlePickThumbnail}
            disabled={pickingThumbnail || saving}
            activeOpacity={0.7}
          >
            {thumbnailPreview ? (
              <View style={styles.thumbPreviewWrap}>
                <Image
                  source={{ uri: thumbnailPreview }}
                  style={styles.thumbImage}
                  contentFit="cover"
                />
                <View style={styles.thumbOverlay}>
                  {pickingThumbnail ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <View style={styles.editBadge}>
                      <Icon name="camera" size={14} color={colors.white} />
                      <Text style={styles.editBadgeText}>Bild \u00e4ndern</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : pickingThumbnail ? (
              <View style={styles.thumbEmpty}>
                <ActivityIndicator size="large" color={colors.gray400} />
              </View>
            ) : (
              <View style={styles.thumbEmpty}>
                <Icon name="photo" size={36} color={colors.gray400} />
                <Text style={styles.thumbEmptyText}>Tippe hier, um ein Gruppenbild auszuw\u00e4hlen</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Fields */}
        <View style={styles.section}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Gruppenname"
              placeholderTextColor={colors.gray400}
              editable={!saving}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Beschreibung</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Worum geht es in der Gruppe?"
              placeholderTextColor={colors.gray400}
              multiline
              maxLength={300}
              editable={!saving}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Thema</Text>
            <TextInput
              style={styles.fieldInput}
              value={topic}
              onChangeText={setTopic}
              placeholder="z.B. Sport, Kultur, Technik"
              placeholderTextColor={colors.gray400}
              editable={!saving}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Landkreis</Text>
            <TextInput
              style={styles.fieldInput}
              value={county}
              onChangeText={setCounty}
              placeholder="z.B. Rostock"
              placeholderTextColor={colors.gray400}
              editable={!saving}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Stadt</Text>
            <TextInput
              style={styles.fieldInput}
              value={city}
              onChangeText={setCity}
              placeholder="z.B. Stralsund"
              placeholderTextColor={colors.gray400}
              editable={!saving}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.black,
  },
  saveBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: "center",
  },
  saveBtnDisabled: {
    backgroundColor: colors.gray300,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  thumbnailArea: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: "dashed",
    minHeight: 180,
  },
  thumbPreviewWrap: { position: "relative", minHeight: 180 },
  thumbImage: { width: "100%", height: 200, borderRadius: radius.md },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: radius.md,
  },
  editBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  editBadgeText: { color: colors.white, fontSize: 13, fontWeight: "600" },
  thumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    gap: 10,
  },
  thumbEmptyText: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: colors.gray100,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.black,
  },
  fieldInputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
});
