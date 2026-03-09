import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Image } from "expo-image";
import { Icon } from "@/components/Icon";
import { safeBack } from "@/lib/navigation";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { COUNTIES } from "@/lib/constants";
import { pickImage, type MediaResult } from "@/lib/media-picker";

const TOPICS = [
  "Sport & Fitness", "Kunst & Kultur", "Musik", "Natur & Outdoor",
  "Technologie", "Gaming", "Essen & Trinken", "Bildung",
  "Soziales", "Business", "Reisen", "Sonstiges",
];

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useQuery(api.groups.getById, id ? { groupId: id as Id<"groups"> } : "skip");
  const updateGroup = useMutation(api.groups.update);
  const generateUploadUrl = useMutation(api.groups.generateUploadUrl);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [topic, setTopic] = useState("");
  const [visibility, setVisibility] = useState<"public" | "invite_only">("public");
  const [saving, setSaving] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [showCounties, setShowCounties] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Thumbnail media
  const [thumbnailLocal, setThumbnailLocal] = useState<MediaResult | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name || "");
      setDescription(group.description || "");
      setCounty(group.county || "");
      setCity(group.city || "");
      setTopic(group.topic || "");
      setVisibility(group.visibility === "invite_only" ? "invite_only" : "public");
    }
  }, [group?._id]);

  const handlePickThumbnail = async () => {
    try {
      const result = await pickImage({ aspect: [1, 1] });
      if (result) setThumbnailLocal(result);
    } catch (e) {
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Bild konnte nicht ausgewählt werden.");
      }
    }
  };

  const handleSave = useCallback(async () => {
    if (!id || !name.trim()) {
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Gruppenname darf nicht leer sein.");
      }
      return;
    }
    setSaving(true);
    try {
      let thumbnailStorageId: Id<"_storage"> | undefined;

      // Upload thumbnail if changed
      if (thumbnailLocal) {
        setUploadingThumb(true);
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(thumbnailLocal.uri);
        const blob = await response.blob();
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": thumbnailLocal.mimeType || "image/jpeg" },
          body: blob,
        });
        if (!uploadResult.ok) throw new Error("Thumbnail-Upload fehlgeschlagen");
        const json = await uploadResult.json();
        thumbnailStorageId = json.storageId;
        setUploadingThumb(false);
      }

      await updateGroup({
        groupId: id as Id<"groups">,
        name: name.trim(),
        description: description.trim() || undefined,
        county: county || undefined,
        city: city.trim() || undefined,
        topic: topic || undefined,
        visibility,
        thumbnailStorageId,
      });
      setThumbnailLocal(null);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen";
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", msg);
      }
    } finally {
      setSaving(false);
      setUploadingThumb(false);
    }
  }, [id, name, description, county, city, topic, visibility, thumbnailLocal, updateGroup, generateUploadUrl]);

  const thumbUri = thumbnailLocal?.uri ?? group?.thumbnailUrl;

  if (!group) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack()} style={styles.backBtn}>
          <Icon name="chevron.left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gruppe bearbeiten</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Speichern</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Banner */}
      {successMsg && (
        <View style={styles.successBanner}>
          <Icon name="checkmark.circle.fill" size={18} color="#fff" />
          <Text style={styles.successText}>Gruppe erfolgreich aktualisiert</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Thumbnail - tappable */}
        <View style={styles.thumbnailSection}>
          <TouchableOpacity
            style={styles.thumbnailContainer}
            onPress={handlePickThumbnail}
            activeOpacity={0.7}
          >
            {thumbUri ? (
              <Image source={{ uri: thumbUri }} style={styles.thumbnail} contentFit="cover" />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Icon name="camera" size={32} color={colors.textTertiary} />
              </View>
            )}
            <View style={styles.thumbnailBadge}>
              {uploadingThumb ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="camera.fill" size={14} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.thumbnailHint}>Tippe zum Ändern des Thumbnails</Text>
        </View>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Gruppenname</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Name der Gruppe"
            placeholderTextColor={colors.textTertiary}
            maxLength={60}
          />
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Beschreibung</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Beschreibe deine Gruppe..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* County */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Landkreis</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => setShowCounties(!showCounties)}
          >
            <Text style={[styles.selectBtnText, !county && { color: colors.textTertiary }]}>
              {county || "Landkreis w\u00e4hlen"}
            </Text>
            <Icon
              name={showCounties ? "chevron.up" : "chevron.down"}
              size={16}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
          {showCounties && (
            <View style={styles.chipGrid}>
              {COUNTIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.chip,
                    county === c && styles.chipActive,
                  ]}
                  onPress={() => {
                    setCounty(c);
                    setShowCounties(false);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      county === c && styles.chipTextActive,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* City */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Stadt / Ort</Text>
          <TextInput
            style={styles.textInput}
            value={city}
            onChangeText={setCity}
            placeholder="z.B. Rostock, Schwerin..."
            placeholderTextColor={colors.textTertiary}
            maxLength={100}
          />
        </View>

        {/* Topic */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Thema</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => setShowTopics(!showTopics)}
          >
            <Text style={[styles.selectBtnText, !topic && { color: colors.textTertiary }]}>
              {topic || "Thema w\u00e4hlen"}
            </Text>
            <Icon
              name={showTopics ? "chevron.up" : "chevron.down"}
              size={16}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
          {showTopics && (
            <View style={styles.chipGrid}>
              {TOPICS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.chip,
                    topic === t && styles.chipActive,
                  ]}
                  onPress={() => {
                    setTopic(t);
                    setShowTopics(false);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      topic === t && styles.chipTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Visibility */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Sichtbarkeit</Text>
          <View style={styles.visibilityRow}>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                visibility === "public" && styles.visibilityOptionActive,
              ]}
              onPress={() => setVisibility("public")}
            >
              <Icon
                name="globe"
                size={20}
                color={visibility === "public" ? "#fff" : colors.textPrimary}
              />
              <Text
                style={[
                  styles.visibilityText,
                  visibility === "public" && styles.visibilityTextActive,
                ]}
              >
                Öffentlich
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.visibilityOption,
                visibility === "invite_only" && styles.visibilityOptionActive,
              ]}
              onPress={() => setVisibility("invite_only")}
            >
              <Icon
                name="lock"
                size={20}
                color={visibility === "invite_only" ? "#fff" : colors.textPrimary}
              />
              <Text
                style={[
                  styles.visibilityText,
                  visibility === "invite_only" && styles.visibilityTextActive,
                ]}
              >
                Nur auf Einladung
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.textPrimary },
  saveBtn: {
    backgroundColor: colors.textPrimary, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20, minWidth: 90, alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  successBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#22c55e", paddingVertical: 10, gap: spacing.sm,
  },
  successText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.xl },

  // Thumbnail
  thumbnailSection: { alignItems: "center", marginBottom: spacing.xxl },
  thumbnailContainer: {
    width: 100, height: 100, borderRadius: 50, overflow: "hidden",
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
    ...shadows.sm,
  },
  thumbnail: { width: "100%", height: "100%" },
  thumbnailPlaceholder: {
    width: "100%", height: "100%", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface,
  },
  thumbnailBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  thumbnailHint: { marginTop: spacing.sm, fontSize: 13, color: colors.textTertiary },

  fieldGroup: { marginBottom: spacing.xl },
  fieldLabel: {
    fontSize: 13, fontWeight: "600", color: colors.textSecondary,
    marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: spacing.lg,
    paddingVertical: 14, fontSize: 16, color: colors.textPrimary,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  textArea: { minHeight: 100, paddingTop: 14 },
  charCount: { fontSize: 12, color: colors.textTertiary, textAlign: "right", marginTop: spacing.xs },
  selectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: spacing.lg,
    paddingVertical: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  selectBtnText: { fontSize: 16, color: colors.textPrimary },
  chipGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 10,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: spacing.sm, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  chipText: { fontSize: 14, color: colors.textPrimary },
  chipTextActive: { color: "#fff" },
  visibilityRow: { flexDirection: "row", gap: spacing.md },
  visibilityOption: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, paddingVertical: 14, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  visibilityOptionActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  visibilityText: { fontSize: 15, fontWeight: "500", color: colors.textPrimary },
  visibilityTextActive: { color: "#fff" },
});
