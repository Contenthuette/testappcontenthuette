import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { colors, spacing, radius, shadows, theme } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import { safeBack } from "@/lib/navigation";
import { pickImage, uploadToConvex } from "@/lib/media-picker";
import type { MediaResult } from "@/lib/media-picker";

export default function EditGroupScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = id as Id<"groups">;

  const group = useQuery(api.groups.getById, id ? { groupId } : "skip");
  const generateUploadUrl = useMutation(api.groups.generateUploadUrl);
  const updateGroup = useMutation(api.groups.update);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [topic, setTopic] = useState("");

  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [thumbMedia, setThumbMedia] = useState<MediaResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name ?? "");
      setDescription(group.description ?? "");
      setCounty(group.county ?? "");
      setCity(group.city ?? "");
      setTopic(group.topic ?? "");
      if (group.thumbnailUrl) setThumbPreview(group.thumbnailUrl);
    }
  }, [group]);

  async function handlePickThumbnail() {
    try {
      const result = await pickImage();
      if (result) {
        setThumbMedia(result);
        setThumbPreview(result.uri);
      }
    } catch {
      // cancelled
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      let thumbnailStorageId: string | undefined;
      if (thumbMedia) {
        thumbnailStorageId = await uploadToConvex(
          () => generateUploadUrl(),
          thumbMedia.uri,
          thumbMedia.mimeType
        );
      }

      await updateGroup({
        groupId,
        name: name.trim(),
        description: description.trim() || undefined,
        county: county.trim() || undefined,
        city: city.trim() || undefined,
        topic: topic.trim() || undefined,
        ...(thumbnailStorageId ? { thumbnailStorageId: thumbnailStorageId as unknown as Id<"_storage"> } : {}),
      });

      safeBack(router, `/(main)/groups/${id}`);
    } catch {
      if (Platform.OS !== "web") {
        const { Alert } = require("react-native");
        Alert.alert("Fehler", "Gruppe konnte nicht gespeichert werden.");
      }
      setIsSaving(false);
    }
  }

  if (!group) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={colors.black} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, `/(main)/groups/${id}`)}
          style={s.headerBtn}
        >
          <SymbolView name="xmark" size={20} tintColor={theme.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Gruppe bearbeiten</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving || !name.trim()}
          style={[s.saveBtn, (isSaving || !name.trim()) && s.saveBtnDisabled]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={s.saveText}>Speichern</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.bodyContent}>
        {/* Thumbnail */}
        <TouchableOpacity
          style={s.thumbArea}
          onPress={handlePickThumbnail}
          activeOpacity={0.7}
        >
          {thumbPreview ? (
            <Image source={{ uri: thumbPreview }} style={s.thumbImage} contentFit="cover" />
          ) : (
            <View style={s.thumbPlaceholder}>
              <SymbolView name="photo.fill" size={36} tintColor={colors.gray400} />
              <Text style={s.thumbHint}>Gruppenbild antippen zum Ändern</Text>
            </View>
          )}
          <View style={s.thumbOverlay}>
            <SymbolView name="camera.fill" size={16} tintColor={colors.white} />
            <Text style={s.thumbOverlayText}>Ändern</Text>
          </View>
        </TouchableOpacity>

        {/* Form */}
        <View style={s.formSection}>
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Gruppenname *</Text>
            <TextInput
              style={s.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Name der Gruppe"
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Beschreibung</Text>
            <TextInput
              style={[s.fieldInput, s.fieldInputMulti]}
              value={description}
              onChangeText={setDescription}
              placeholder="Worum geht es in dieser Gruppe?"
              placeholderTextColor={colors.gray400}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Thema</Text>
            <TextInput
              style={s.fieldInput}
              value={topic}
              onChangeText={setTopic}
              placeholder="z.B. Sport, Kultur, Natur"
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={s.row}>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.fieldLabel}>Landkreis</Text>
              <TextInput
                style={s.fieldInput}
                value={county}
                onChangeText={setCounty}
                placeholder="Landkreis"
                placeholderTextColor={colors.gray400}
              />
            </View>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <Text style={s.fieldLabel}>Stadt</Text>
              <TextInput
                style={s.fieldInput}
                value={city}
                onChangeText={setCity}
                placeholder="Stadt"
                placeholderTextColor={colors.gray400}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {isSaving && (
        <View style={s.overlay}>
          <View style={s.overlayCard}>
            <ActivityIndicator size="large" color={colors.black} />
            <Text style={s.overlayText}>Wird gespeichert...</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.white },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: 60, paddingBottom: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },
  saveBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, minWidth: 90, alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: colors.white, fontWeight: "600", fontSize: 15 },
  bodyContent: { paddingBottom: 40 },
  thumbArea: {
    width: "100%", height: 200, backgroundColor: colors.gray100,
    overflow: "hidden",
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs,
  },
  thumbHint: { fontSize: 13, color: colors.gray400 },
  thumbOverlay: {
    position: "absolute", bottom: spacing.md, right: spacing.md,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.overlay, paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: radius.full,
  },
  thumbOverlayText: { color: colors.white, fontWeight: "600", fontSize: 13 },
  formSection: { padding: spacing.lg, gap: spacing.lg },
  fieldGroup: { gap: spacing.xs },
  fieldLabel: {
    fontSize: 13, fontWeight: "600", color: colors.gray500,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  fieldInput: {
    backgroundColor: colors.gray50, borderRadius: radius.md,
    padding: spacing.md, fontSize: 16, color: colors.black,
    borderWidth: 1, borderColor: colors.gray200,
  },
  fieldInputMulti: { minHeight: 100 },
  row: { flexDirection: "row", gap: spacing.md },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: "center", justifyContent: "center",
  },
  overlayCard: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    padding: spacing.xxl, alignItems: "center", gap: spacing.lg,
    ...shadows.lg,
  },
  overlayText: { fontSize: 16, fontWeight: "600", color: colors.black },
});
