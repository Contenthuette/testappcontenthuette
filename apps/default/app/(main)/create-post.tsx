import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors, spacing, radius, shadows, theme } from "@/lib/theme";
import { SymbolView } from "@/components/Icon";
import { safeBack } from "@/lib/navigation";
import { pickImage, pickVideo, uploadToConvex } from "@/lib/media-picker";
import type { MediaResult } from "@/lib/media-picker";

type PostType = "photo" | "video" | "reel";

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const postType: PostType = (params.type as PostType) || "photo";

  const [media, setMedia] = useState<MediaResult | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.create);

  const isVideo = postType === "video" || postType === "reel";
  const typeLabel = postType === "reel" ? "Reel" : isVideo ? "Video" : "Foto";

  useEffect(() => {
    if (!media && !isPickerOpen) {
      openPicker();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openPicker() {
    setIsPickerOpen(true);
    try {
      const result = isVideo ? await pickVideo() : await pickImage();
      if (result) {
        setMedia(result);
      }
    } finally {
      setIsPickerOpen(false);
    }
  }

  async function handlePublish() {
    if (!media) return;
    setIsUploading(true);
    try {
      const storageId = await uploadToConvex(
        () => generateUploadUrl(),
        media.uri,
        media.mimeType
      );
      await createPost({
        type: postType,
        caption: caption.trim() || undefined,
        mediaStorageId: storageId as ReturnType<typeof createPost> extends Promise<infer T> ? T extends string ? string : string : string,
      });
      router.replace("/(main)/(tabs)/feed");
    } catch {
      if (Platform.OS !== "web") {
        const { Alert } = require("react-native");
        Alert.alert("Fehler", "Beim Hochladen ist ein Fehler aufgetreten. Bitte versuche es erneut.");
      }
      setIsUploading(false);
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
        <Text style={s.headerTitle}>{typeLabel} posten</Text>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={!media || isUploading}
          style={[s.publishBtn, (!media || isUploading) && s.publishBtnDisabled]}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={s.publishText}>Posten</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent}>
        {/* Media preview / picker */}
        <TouchableOpacity
          style={s.mediaPicker}
          onPress={openPicker}
          activeOpacity={0.7}
        >
          {media ? (
            <Image source={{ uri: media.uri }} style={s.mediaPreview} contentFit="cover" />
          ) : (
            <View style={s.mediaPlaceholder}>
              <SymbolView
                name={isVideo ? "video" : "photo.fill"}
                size={40}
                tintColor={colors.gray400}
              />
              <Text style={s.mediaPlaceholderText}>
                {isVideo ? "Video auswählen" : "Foto auswählen"}
              </Text>
              <Text style={s.mediaPlaceholderHint}>Tippe zum Öffnen der Galerie</Text>
            </View>
          )}
          {media && (
            <View style={s.changeMediaOverlay}>
              <SymbolView name="camera.fill" size={16} tintColor={colors.white} />
              <Text style={s.changeMediaText}>Ändern</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Caption */}
        <View style={s.captionSection}>
          <Text style={s.captionLabel}>Beschreibung</Text>
          <TextInput
            style={s.captionInput}
            placeholder="Schreibe eine Beschreibung..."
            placeholderTextColor={colors.gray400}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{caption.length}/500</Text>
        </View>

        {/* Type info */}
        <View style={s.typeInfo}>
          <SymbolView
            name={isVideo ? "play.rectangle" : "photo"}
            size={16}
            tintColor={theme.textSecondary}
          />
          <Text style={s.typeInfoText}>
            Wird als {typeLabel} in deinem Feed veröffentlicht
          </Text>
        </View>
      </ScrollView>

      {/* Loading overlay */}
      {isUploading && (
        <View style={s.uploadOverlay}>
          <View style={s.uploadCard}>
            <ActivityIndicator size="large" color={colors.black} />
            <Text style={s.uploadText}>{typeLabel} wird hochgeladen...</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },
  publishBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    minWidth: 80, alignItems: "center",
  },
  publishBtnDisabled: { opacity: 0.4 },
  publishText: { color: colors.white, fontWeight: "600", fontSize: 15 },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, gap: spacing.lg },
  mediaPicker: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.sm,
  },
  mediaPreview: { width: "100%", height: "100%" },
  mediaPlaceholder: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm,
  },
  mediaPlaceholderText: {
    fontSize: 16, fontWeight: "600", color: colors.gray600, marginTop: spacing.xs,
  },
  mediaPlaceholderHint: { fontSize: 13, color: colors.gray400 },
  changeMediaOverlay: {
    position: "absolute", bottom: spacing.md, right: spacing.md,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.overlay, paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: radius.full,
  },
  changeMediaText: { color: colors.white, fontWeight: "600", fontSize: 13 },
  captionSection: { gap: spacing.xs },
  captionLabel: { fontSize: 13, fontWeight: "600", color: colors.gray500, textTransform: "uppercase", letterSpacing: 0.5 },
  captionInput: {
    backgroundColor: colors.gray50,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 100,
    fontSize: 16,
    color: colors.black,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  charCount: { fontSize: 12, color: colors.gray400, textAlign: "right" },
  typeInfo: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.gray50, padding: spacing.md,
    borderRadius: radius.md,
  },
  typeInfoText: { fontSize: 14, color: colors.gray500 },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: "center", justifyContent: "center",
  },
  uploadCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.lg,
    ...shadows.lg,
  },
  uploadText: { fontSize: 16, fontWeight: "600", color: colors.black },
});
