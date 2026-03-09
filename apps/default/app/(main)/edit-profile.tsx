import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows, theme } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import { Avatar } from "@/components/Avatar";
import { safeBack } from "@/lib/navigation";
import { pickImage, uploadToConvex } from "@/lib/media-picker";
import type { MediaResult } from "@/lib/media-picker";

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useQuery(api.users.me);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateProfile = useMutation(api.users.updateProfile);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarMedia, setAvatarMedia] = useState<MediaResult | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerMedia, setBannerMedia] = useState<MediaResult | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setBio(user.bio ?? "");
      setCounty(user.county ?? "");
      setCity(user.city ?? "");
      if (user.avatarUrl) setAvatarPreview(user.avatarUrl);
      if (user.bannerUrl) setBannerPreview(user.bannerUrl);
    }
  }, [user]);

  async function handlePickAvatar() {
    try {
      const result = await pickImage();
      if (result) {
        setAvatarMedia(result);
        setAvatarPreview(result.uri);
      }
    } catch {
      // user cancelled
    }
  }

  async function handlePickBanner() {
    try {
      const result = await pickImage();
      if (result) {
        setBannerMedia(result);
        setBannerPreview(result.uri);
      }
    } catch {
      // user cancelled
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      let avatarStorageId: string | undefined;
      let bannerStorageId: string | undefined;

      if (avatarMedia) {
        avatarStorageId = await uploadToConvex(
          () => generateUploadUrl(),
          avatarMedia.uri,
          avatarMedia.mimeType
        );
      }
      if (bannerMedia) {
        bannerStorageId = await uploadToConvex(
          () => generateUploadUrl(),
          bannerMedia.uri,
          bannerMedia.mimeType
        );
      }

      await updateProfile({
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        county: county.trim() || undefined,
        city: city.trim() || undefined,
        ...(avatarStorageId ? { avatarStorageId: avatarStorageId as unknown as ReturnType<typeof updateProfile> extends Promise<unknown> ? string : string } : {}),
        ...(bannerStorageId ? { bannerStorageId: bannerStorageId as unknown as ReturnType<typeof updateProfile> extends Promise<unknown> ? string : string } : {}),
      });

      safeBack(router, "/(main)/(tabs)/profile");
    } catch {
      if (Platform.OS !== "web") {
        const { Alert } = require("react-native");
        Alert.alert("Fehler", "Profil konnte nicht gespeichert werden.");
      }
      setIsSaving(false);
    }
  }

  if (user === undefined) {
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
          onPress={() => safeBack(router, "/(main)/(tabs)/profile")}
          style={s.headerBtn}
        >
          <SymbolView name="xmark" size={20} tintColor={theme.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profil bearbeiten</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[s.saveBtn, isSaving && s.saveBtnDisabled]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={s.saveText}>Speichern</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.bodyContent}>
        {/* Banner */}
        <TouchableOpacity style={s.bannerArea} onPress={handlePickBanner} activeOpacity={0.7}>
          {bannerPreview ? (
            <Image source={{ uri: bannerPreview }} style={s.bannerImage} contentFit="cover" />
          ) : (
            <View style={s.bannerPlaceholder}>
              <SymbolView name="photo.fill" size={28} tintColor={colors.gray400} />
              <Text style={s.bannerHint}>Banner antippen zum Ändern</Text>
            </View>
          )}
          <View style={s.bannerOverlay}>
            <SymbolView name="camera.fill" size={16} tintColor={colors.white} />
          </View>
        </TouchableOpacity>

        {/* Avatar */}
        <View style={s.avatarSection}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.7}>
            <View style={s.avatarWrapper}>
              {avatarPreview ? (
                <Image
                  source={{ uri: avatarPreview }}
                  style={s.avatar}
                  contentFit="cover"
                />
              ) : (
                <Avatar name={name || "?"} size={90} />
              )}
              <View style={s.avatarBadge}>
                <SymbolView name="camera.fill" size={14} tintColor={colors.white} />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={s.avatarHint}>Tippe zum Ändern</Text>
        </View>

        {/* Form fields */}
        <View style={s.formSection}>
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Name</Text>
            <TextInput
              style={s.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Dein Name"
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Bio</Text>
            <TextInput
              style={[s.fieldInput, s.fieldInputMulti]}
              value={bio}
              onChangeText={setBio}
              placeholder="Erzähle etwas über dich..."
              placeholderTextColor={colors.gray400}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Landkreis</Text>
            <TextInput
              style={s.fieldInput}
              value={county}
              onChangeText={setCounty}
              placeholder="z.B. Rostock"
              placeholderTextColor={colors.gray400}
            />
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Stadt</Text>
            <TextInput
              style={s.fieldInput}
              value={city}
              onChangeText={setCity}
              placeholder="z.B. Warnemünde"
              placeholderTextColor={colors.gray400}
            />
          </View>
        </View>
      </ScrollView>

      {isSaving && (
        <View style={s.overlay}>
          <View style={s.overlayCard}>
            <ActivityIndicator size="large" color={colors.black} />
            <Text style={s.overlayText}>Profil wird gespeichert...</Text>
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
  bannerArea: {
    width: "100%", height: 160, backgroundColor: colors.gray100,
    overflow: "hidden",
  },
  bannerImage: { width: "100%", height: "100%" },
  bannerPlaceholder: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs,
  },
  bannerHint: { fontSize: 13, color: colors.gray400 },
  bannerOverlay: {
    position: "absolute", bottom: spacing.sm, right: spacing.sm,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center",
  },
  avatarSection: { alignItems: "center", marginTop: -45, gap: spacing.xs },
  avatarWrapper: { position: "relative" },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: colors.white },
  avatarBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.black, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.white,
  },
  avatarHint: { fontSize: 12, color: colors.gray400 },
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
  fieldInputMulti: { minHeight: 80 },
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
