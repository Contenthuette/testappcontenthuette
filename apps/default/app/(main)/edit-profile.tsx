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
import { colors, spacing, shadows } from "@/lib/theme";
import { Icon } from "@/components/Icon";
import { safeBack } from "@/lib/navigation";
import { pickImage, uploadToConvex } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";

export default function EditProfileScreen() {
  const router = useRouter();
  const me = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<{ uri: string; mimeType: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Banner
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<{ uri: string; mimeType: string } | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (me) {
      setName(me.name ?? "");
      setBio(me.bio ?? "");
      setCounty(me.county ?? "");
      setCity(me.city ?? "");
      if (me.avatarUrl) setAvatarPreview(me.avatarUrl);
      if (me.bannerUrl) setBannerPreview(me.bannerUrl);
    }
  }, [me]);

  const handlePickAvatar = async () => {
    setUploadingAvatar(true);
    try {
      const result = await pickImage({ quality: 0.8, allowsEditing: true });
      if (result) {
        setAvatarPreview(result.uri);
        setAvatarFile({ uri: result.uri, mimeType: result.mimeType });
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePickBanner = async () => {
    setUploadingBanner(true);
    try {
      const result = await pickImage({ quality: 0.8, allowsEditing: false });
      if (result) {
        setBannerPreview(result.uri);
        setBannerFile({ uri: result.uri, mimeType: result.mimeType });
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } finally {
      setUploadingBanner(false);
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
      safeBack(router, "/(main)/(tabs)/profile");
    } catch (error) {
      console.error("Profile update failed:", error);
      if (Platform.OS !== "web") {
        const { Alert } = require("react-native");
        Alert.alert("Fehler", "Profil konnte nicht gespeichert werden.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (me === undefined) {
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
          onPress={() => safeBack(router, "/(main)/(tabs)/profile")}
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
        <TouchableOpacity
          style={styles.bannerArea}
          onPress={handlePickBanner}
          disabled={uploadingBanner || saving}
          activeOpacity={0.7}
        >
          {bannerPreview ? (
            <Image
              source={{ uri: bannerPreview }}
              style={styles.bannerImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Icon name="photo" size={28} color={colors.grey400} />
            </View>
          )}
          <View style={styles.bannerOverlay}>
            {uploadingBanner ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <View style={styles.editBadge}>
                <Icon name="camera" size={14} color={colors.white} />
                <Text style={styles.editBadgeText}>Banner \u00e4ndern</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Avatar */}
        <View style={styles.avatarRow}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickAvatar}
            disabled={uploadingAvatar || saving}
            activeOpacity={0.7}
          >
            {avatarPreview ? (
              <Image
                source={{ uri: avatarPreview }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="person" size={32} color={colors.grey400} />
              </View>
            )}
            <View style={styles.avatarBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Icon name="camera" size={14} color={colors.white} />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Profilbild \u00e4ndern</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Dein Name"
              placeholderTextColor={colors.grey400}
              editable={!saving}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Erz\u00e4hl etwas \u00fcber dich..."
              placeholderTextColor={colors.grey400}
              multiline
              maxLength={200}
              editable={!saving}
            />
            <Text style={styles.charCount}>{bio.length}/200</Text>
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
              placeholder="z.B. Warnem\u00fcnde"
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
    paddingBottom: 40,
  },
  /* Banner */
  bannerArea: {
    height: 160,
    backgroundColor: colors.grey100,
    position: "relative",
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
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
  /* Avatar */
  avatarRow: {
    alignItems: "center",
    marginTop: -40,
    gap: 8,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.grey200,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarHint: {
    fontSize: 13,
    color: colors.grey500,
  },
  /* Form */
  formSection: {
    paddingHorizontal: spacing.lg,
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
  charCount: {
    fontSize: 12,
    color: colors.grey400,
    textAlign: "right",
    marginTop: 2,
  },
});
