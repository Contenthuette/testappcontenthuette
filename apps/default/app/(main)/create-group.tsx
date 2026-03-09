import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows, theme } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import { safeBack } from "@/lib/navigation";
import { pickImage, uploadToConvex } from "@/lib/media-picker";
import type { MediaResult } from "@/lib/media-picker";

export default function CreateGroupScreen() {
  const router = useRouter();
  const generateUploadUrl = useMutation(api.groups.generateUploadUrl);
  const createGroup = useMutation(api.groups.create);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [topic, setTopic] = useState("");

  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [thumbMedia, setThumbMedia] = useState<MediaResult | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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

  async function handleCreate() {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      let thumbnailStorageId: string | undefined;
      if (thumbMedia) {
        thumbnailStorageId = await uploadToConvex(
          () => generateUploadUrl(),
          thumbMedia.uri,
          thumbMedia.mimeType
        );
      }

      await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        county: county.trim() || undefined,
        city: city.trim() || undefined,
        topic: topic.trim() || undefined,
        ...(thumbnailStorageId ? { thumbnailStorageId: thumbnailStorageId as unknown as ReturnType<typeof createGroup> extends Promise<unknown> ? string : string } : {}),
      });

      router.replace("/(main)/(tabs)/groups");
    } catch {
      if (Platform.OS !== "web") {
        const { Alert } = require("react-native");
        Alert.alert("Fehler", "Gruppe konnte nicht erstellt werden.");
      }
      setIsCreating(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, "/(main)/(tabs)/create")}
          style={s.headerBtn}
        >
          <SymbolView name="xmark" size={20} tintColor={theme.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Gruppe erstellen</Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={isCreating || !name.trim()}
          style={[s.createBtn, (isCreating || !name.trim()) && s.createBtnDisabled]}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={s.createText}>Erstellen</Text>
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
              <Text style={s.thumbTitle}>Gruppenbild hinzufügen</Text>
              <Text style={s.thumbHint}>Tippe zum Auswählen</Text>
            </View>
          )}
          {thumbPreview && (
            <View style={s.thumbOverlay}>
              <SymbolView name="camera.fill" size={16} tintColor={colors.white} />
              <Text style={s.thumbOverlayText}>Ändern</Text>
            </View>
          )}
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

      {isCreating && (
        <View style={s.overlay}>
          <View style={s.overlayCard}>
            <ActivityIndicator size="large" color={colors.black} />
            <Text style={s.overlayText}>Gruppe wird erstellt...</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
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
  createBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, minWidth: 90, alignItems: "center",
  },
  createBtnDisabled: { opacity: 0.4 },
  createText: { color: colors.white, fontWeight: "600", fontSize: 15 },
  bodyContent: { paddingBottom: 40 },
  thumbArea: {
    width: "100%", height: 200, backgroundColor: colors.gray100,
    overflow: "hidden",
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs,
  },
  thumbTitle: { fontSize: 16, fontWeight: "600", color: colors.gray600, marginTop: spacing.xs },
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
