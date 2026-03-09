import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Icon } from "@/components/Icon";
import { colors, spacing, shadows } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { pickImage, pickVideo, type MediaResult } from "@/lib/media-picker";

type PostType = "photo" | "video" | "reel";

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const postType: PostType = (params.type as PostType) || "photo";

  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState<MediaResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pickingMedia, setPickingMedia] = useState(false);

  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const createPost = useMutation(api.posts.create);

  const isVideo = postType === "video" || postType === "reel";
  const title = postType === "photo" ? "Foto posten" : postType === "video" ? "Video posten" : "Reel posten";
  const mediaLabel = isVideo ? "Video" : "Foto";

  const handlePickMedia = async () => {
    setPickingMedia(true);
    try {
      const result = isVideo ? await pickVideo() : await pickImage();
      if (result) {
        setMedia(result);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Medienauswahl fehlgeschlagen";
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", msg);
      }
    } finally {
      setPickingMedia(false);
    }
  };

  const handleRemoveMedia = () => {
    setMedia(null);
  };

  const handlePublish = async () => {
    if (!media) {
      if (Platform.OS !== "web") {
        Alert.alert("Hinweis", `Bitte wähle ein ${mediaLabel} aus.`);
      }
      return;
    }
    setUploading(true);
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const response = await fetch(media.uri);
      const blob = await response.blob();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": media.mimeType || (isVideo ? "video/mp4" : "image/jpeg") },
        body: blob,
      });
      if (!uploadResult.ok) throw new Error("Upload fehlgeschlagen");
      const { storageId } = await uploadResult.json();

      // Create post
      await createPost({
        type: postType,
        caption: caption.trim() || undefined,
        mediaStorageId: storageId,
      });

      // Navigate to feed
      router.replace("/(main)/(tabs)/feed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Veröffentlichung fehlgeschlagen";
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", msg);
      }
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => safeBack(router, "/(main)/(tabs)/create")}
            style={styles.headerBtn}
            hitSlop={12}
          >
            <Icon name="chevron.left" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            onPress={handlePublish}
            style={[
              styles.publishBtn,
              (!media || uploading) && styles.publishBtnDisabled,
            ]}
            disabled={!media || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.publishBtnText}>Posten</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Media Picker Area */}
          {media ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: media.uri }}
                style={styles.preview}
                contentFit="cover"
              />
              {isVideo && (
                <View style={styles.videoOverlay}>
                  <Icon name="play.fill" size={32} color="#fff" />
                </View>
              )}
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={handleRemoveMedia}
                hitSlop={8}
              >
                <Icon name="xmark.circle.fill" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.pickerArea}
              onPress={handlePickMedia}
              activeOpacity={0.7}
              disabled={pickingMedia}
            >
              {pickingMedia ? (
                <ActivityIndicator size="large" color={colors.textSecondary} />
              ) : (
                <>
                  <View style={styles.pickerIcon}>
                    <Icon
                      name={isVideo ? "video.fill" : "photo.fill"}
                      size={36}
                      color={colors.textSecondary}
                    />
                  </View>
                  <Text style={styles.pickerTitle}>
                    {mediaLabel} auswählen
                  </Text>
                  <Text style={styles.pickerSubtitle}>
                    Tippe hier um ein {mediaLabel} aus deiner Galerie zu wählen
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Caption Input */}
          <View style={styles.captionContainer}>
            <TextInput
              style={styles.captionInput}
              placeholder="Beschreibung hinzufügen..."
              placeholderTextColor={colors.textTertiary}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{caption.length}/500</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  publishBtn: {
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 72,
    alignItems: "center",
  },
  publishBtnDisabled: {
    opacity: 0.35,
  },
  publishBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  content: {
    padding: spacing.md,
    paddingBottom: 60,
  },
  pickerArea: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  pickerIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  pickerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  previewContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  preview: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  removeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  captionContainer: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    ...shadows.sm,
  },
  captionInput: {
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 100,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: "right",
    marginTop: 8,
  },
});
