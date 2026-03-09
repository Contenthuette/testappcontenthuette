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
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Image } from "expo-image";
import { colors, spacing, radius } from "@/lib/theme";
import Icon from "@/components/Icon";
import { safeBack } from "@/lib/navigation";
import { pickImage, uploadToConvex } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<{ uri: string; mimeType: string } | null>(null);
  const [pickingAvatar, setPickingAvatar] = useState(false);

  // Banner state
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<{ uri: string; mimeType: string } | null>(null);
  const [pickingBanner, setPickingBanner] = useState(false);

  const [saving, setSaving] = useState(false);

  // Populate with current user data
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

  const handlePickAvatar = async () => {
    setPickingAvatar(true);
    try {
      const result = await pickImage({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
      if (result) {
        setAvatarPreview(result.uri);
        setAvatarFile({ uri: result.uri, mimeType: result.mimeType });
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } finally {
      setPickingAvatar(false);
    }
  };

  const handlePickBanner = async () => {
    setPickingBanner(true);
    try {
      const result = await pickImage({ quality: 0.8, allowsEditing: true, aspect: [16, 9] });
      if (result) {
        setBannerPreview(result.uri);
        setBannerFile({ uri: result.uri, mimeType: result.mimeType });
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } finally {
      setPickingBanner(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let avatarStorageId: string | undefined;
      let bannerStorageId: string | undefined;

      if (avatarFile) {
        const url = await generateUploadUrl();
        avatarStorageId = await uploadToConvex(url, avatarFile.uri, avatarFile.mimeType);
      }

      if (bannerFile) {
        const url = await generateUploadUrl();
        bannerStorageId = await uploadToConvex(url, bannerFile.uri, bannerFile.mimeType);
      }

      await updateProfile({
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        county: county.trim() || undefined,
        city: city.trim() || undefined,
        ...(avatarStorageId ? { avatarStorageId: avatarStorageId as never } : {}),
        ...(bannerStorageId ? { bannerStorageId: bannerStorageId as never } : {}),
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      safeBack("edit-profile");
    } catch (error) {
      console.error("Profile update failed:", error);
      setSaving(false);
      if (Platform.OS !== "web") {
        const { Alert: RNAlert } = require("react-native");
        RNAlert.alert("Fehler", "Profil konnte nicht gespeichert werden.");
      }
    }
  };

  if (user === undefined) {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack("edit-profile")}
          style={styles.headerBtn}
        >
          <Icon name="chevron.left" size={20} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil bearbeiten</Text>
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
        {/* Banner */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Banner</Text>
          <TouchableOpacity
            style={styles.bannerArea}
            onPress={handlePickBanner}
            disabled={pickingBanner || saving}
            activeOpacity={0.7}
          >
            {bannerPreview ? (
              <View style={styles.bannerPreviewWrap}>
                <Image
                  source={{ uri: bannerPreview }}
                  style={styles.bannerImage}
                  contentFit="cover"
                />
                <View style={styles.bannerOverlay}>
                  {pickingBanner ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <View style={styles.editBadge}>
                      <Icon name="camera" size={14} color={colors.white} />
                      <Text style={styles.editBadgeText}>\u00c4ndern</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : pickingBanner ? (
              <View style={styles.bannerEmpty}>
                <ActivityIndicator size="large" color={colors.gray400} />
              </View>
            ) : (
              <View style={styles.bannerEmpty}>
                <Icon name="photo" size={28} color={colors.gray400} />
                <Text style={styles.bannerEmptyText}>Banner ausw\u00e4hlen</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Profilbild</Text>
          <View style={styles.avatarRow}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={handlePickAvatar}
              disabled={pickingAvatar || saving}
              activeOpacity={0.7}
            >
              {avatarPreview ? (
                <Image
                  source={{ uri: avatarPreview }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Icon name="person.fill" size={32} color={colors.gray400} />
                </View>
              )}
              <View style={styles.avatarBadge}>
                {pickingAvatar ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Icon name="camera" size={12} color={colors.white} />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tippe auf das Bild, um dein Profilbild zu \u00e4ndern</Text>
          </View>
        </View>

        {/* Form fields */}
        <View style={styles.section}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Dein Name"
              placeholderTextColor={colors.gray400}
              editable={!saving}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Erz\u00e4hle etwas \u00fcber dich"
              placeholderTextColor={colors.gray400}
              multiline
              maxLength={300}
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
              placeholder="z.B. Schwerin"
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
  // Banner
  bannerArea: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: "dashed",
    minHeight: 140,
  },
  bannerPreviewWrap: { position: "relative", minHeight: 140 },
  bannerImage: { width: "100%", height: 160, borderRadius: radius.md },
  bannerOverlay: {
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
  bannerEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  bannerEmptyText: { fontSize: 14, color: colors.gray500 },
  // Avatar
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  avatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: "hidden",
    position: "relative",
  },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarHint: {
    flex: 1,
    fontSize: 14,
    color: colors.gray500,
    lineHeight: 20,
  },
  // Fields
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
