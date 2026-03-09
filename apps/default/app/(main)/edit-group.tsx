import React, { useState, useEffect, useCallback } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Image } from "expo-image";
import { colors, spacing, shadows } from "@/lib/theme";
import { Icon } from "@/components/Icon";
import { safeBack } from "@/lib/navigation";
import { pickImage, uploadToConvex } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";
import type { Id } from "@/convex/_generated/dataModel";

export default function EditGroupScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useQuery(api.groups.getById, id ? { id: id as Id<"groups"> } : "skip");
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

  const handlePickThumbnail = useCallback(async () => {
    setPickingThumbnail(true);
    try {
      const result = await pickImage({ quality: 0.8, allowsEditing: true });
      if (result) {
        setThumbnailPreview(result.uri);
        setThumbnailFile({ uri: result.uri, mimeType: result.mimeType });
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } finally {
      setPickingThumbnail(false);
    }
  }, []);

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
        id: id as Id<"groups">,
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
      safeBack(router, `/(main)/groups/${id}`);
    } catch (error) {
      console.error("Group update failed:", error);
      if (Platform.OS !== "web") {
        const { Alert } = require("react-native");
        Alert.alert("Fehler", "Gruppe konnte nicht aktualisiert werden.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!id || group === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.black} />
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
          onPress={() => safeBack(router, `/(main)/groups/${id}`)}
          style={styles.headerBtn}
        >
          <Icon name="chevron.left" size={20} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gruppe bearbeiten</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !name.trim()}
          style={[
            styles.saveBtn,
            (saving || !name.trim()) && styles.saveBtnDisabled,
          ]}
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
        <Text style={styles.sectionLabel}>Gruppenbild</Text>
        <TouchableOpacity
          style={styles.thumbnailArea}
          onPress={handlePickThumbnail}
          disabled={pickingThumbnail || saving}
          activeOpacity={0.7}
        >
          {thumbnailPreview ? (
            <View style={styles.thumbnailPreviewWrap}>
              <Image
                source={{ uri: thumbnailPreview }}
                style={styles.thumbnailImage}
                contentFit="cover"
              />
              <View style={styles.thumbnailOverlay}>
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
            <View style={styles.thumbnailEmpty}>
              <ActivityIndicator size="large" color={colors.grey400} />
            </View>
          ) : (
            <View style={styles.thumbnailEmpty}>
              <Icon name="photo" size={36} color={colors.grey400} />
              <Text style={styles.thumbnailEmptyText}>Tippe hier, um ein Gruppenbild auszuw\u00e4hlen</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Fields */}
        <View style={styles.formSection}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Gruppenname"
              placeholderTextColor={colors.grey400}
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
              placeholderTextColor={colors.grey400}
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
              placeholderTextColor={colors.grey400}
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
              placeholderTextColor={colors.grey400}
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
              placeholderTextColor={colors.grey400}
              editable={!saving}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey200,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.grey100,
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
    backgroundColor: colors.grey300,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.grey500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  /* Thumbnail */
  thumbnailArea: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.grey200,
    borderStyle: "dashed",
    minHeight: 180,
  },
  thumbnailPreviewWrap: {
    position: "relative",
    minHeight: 180,
  },
  thumbnailImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 16,
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
  editBadgeText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  thumbnailEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    gap: 10,
  },
  thumbnailEmptyText: {
    fontSize: 14,
    color: colors.grey500,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  /* Form */
  formSection: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.grey500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: colors.grey100,
    borderRadius: 12,
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
