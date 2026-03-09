import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image } from "expo-image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { pickImage, type MediaResult } from "@/lib/media-picker";

export default function EditProfileScreen() {
  const me = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Media states
  const [avatarLocal, setAvatarLocal] = useState<MediaResult | null>(null);
  const [bannerLocal, setBannerLocal] = useState<MediaResult | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    if (me) {
      setName(me.name ?? "");
      setBio(me.bio ?? "");
      setCity(me.city ?? "");
    }
  }, [me?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePickAvatar = async () => {
    try {
      const result = await pickImage({ aspect: [1, 1] });
      if (result) setAvatarLocal(result);
    } catch (e) {
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Bild konnte nicht ausgewählt werden.");
      }
    }
  };

  const handlePickBanner = async () => {
    try {
      const result = await pickImage({ aspect: [16, 5] });
      if (result) setBannerLocal(result);
    } catch (e) {
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Bannerbild konnte nicht ausgewählt werden.");
      }
    }
  };

  const uploadFile = async (media: MediaResult): Promise<string> => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(media.uri);
    const blob = await response.blob();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": media.mimeType || "image/jpeg" },
      body: blob,
    });
    if (!result.ok) throw new Error("Upload fehlgeschlagen");
    const { storageId } = await result.json();
    return storageId;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates: Record<string, unknown> = {
        name: name.trim() || undefined,
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
      };

      // Upload avatar if changed
      if (avatarLocal) {
        setUploadingAvatar(true);
        const storageId = await uploadFile(avatarLocal);
        updates.avatarStorageId = storageId;
        setUploadingAvatar(false);
      }

      // Upload banner if changed
      if (bannerLocal) {
        setUploadingBanner(true);
        const storageId = await uploadFile(bannerLocal);
        updates.bannerStorageId = storageId;
        setUploadingBanner(false);
      }

      await updateProfile(updates as Parameters<typeof updateProfile>[0]);
      setSaved(true);
      setTimeout(() => safeBack("edit-profile"), 600);
    } catch (e) {
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Profil konnte nicht gespeichert werden.");
      }
    } finally {
      setLoading(false);
      setUploadingAvatar(false);
      setUploadingBanner(false);
    }
  };

  const avatarUri = avatarLocal?.uri ?? me?.avatarUrl;
  const bannerUri = bannerLocal?.uri ?? me?.bannerUrl;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeBack("edit-profile")} hitSlop={12}>
            <Text style={styles.cancelText}>Abbrechen</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profil bearbeiten</Text>
          <View style={{ width: 70 }} />
        </View>

        {/* Banner */}
        <TouchableOpacity
          style={styles.bannerContainer}
          onPress={handlePickBanner}
          activeOpacity={0.7}
        >
          {bannerUri ? (
            <Image source={{ uri: bannerUri }} style={styles.bannerImage} contentFit="cover" />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Icon name="panorama" size={28} color={colors.textTertiary} />
            </View>
          )}
          <View style={styles.bannerOverlay}>
            {uploadingBanner ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="camera.fill" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handlePickAvatar}
            activeOpacity={0.7}
            style={styles.avatarTouchable}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Avatar uri={undefined} name={me?.name} size={90} />
            )}
            <View style={styles.avatarBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="camera.fill" size={14} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoHint}>Tippe zum Ändern</Text>
        </View>

        <Input label="Name" value={name} onChangeText={setName} placeholder="Dein Name" />
        <Input
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Erzähle etwas über dich"
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: "top" }}
        />
        <Input label="Stadt" value={city} onChangeText={setCity} placeholder="z.B. Schwerin" />

        <Button
          title={saved ? "✓ Gespeichert" : "Speichern"}
          onPress={handleSave}
          loading={loading}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
  },
  cancelText: { fontSize: 16, color: colors.textSecondary },
  title: { fontSize: 17, fontWeight: "600", color: colors.textPrimary },

  // Banner
  bannerContainer: {
    width: "100%",
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.surface,
    marginBottom: -40,
    ...shadows.sm,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  bannerOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xxl,
    zIndex: 2,
  },
  avatarTouchable: {
    position: "relative",
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: colors.background,
  },
  avatarBadge: {
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
  changePhotoHint: {
    fontSize: 13,
    color: colors.textTertiary,
  },
});
