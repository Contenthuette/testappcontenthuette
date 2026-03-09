import React, { useState } from "react";
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
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Image } from "expo-image";
import { colors, spacing, shadows } from "@/lib/theme";
import { Icon } from "@/components/Icon";
import { safeBack } from "@/lib/navigation";
import { pickImage, pickVideo, uploadToConvex } from "@/lib/media-picker";
import type { MediaPickerResult } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";

type PostType = "photo" | "video" | "reel";

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const postType: PostType =
    params.type === "video" || params.type === "reel"
      ? (params.type as PostType)
      : "photo";

  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState<MediaPickerResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pickingMedia, setPickingMedia] = useState(false);

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.create);

  const isVideo = postType === "video" || postType === "reel";
  const titleMap: Record<PostType, string> = {
    photo: "Foto posten",
    video: "Video posten",
    reel: "Reel posten",
  };

  const handlePickMedia = async () => {
    setPickingMedia(true);
    try {
      const result = isVideo
        ? await pickVideo({ quality: 0.8 })
        : await pickImage({ quality: 0.8, allowsEditing: true });
      if (result) {
        setMedia(result);
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } finally {
      setPickingMedia(false);
    }
  };

  const handlePublish = async () => {
    if (!media) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const storageId = await uploadToConvex(uploadUrl, media.uri, media.mimeType);
      await createPost({
        type: postType,
        caption: caption.trim() || undefined,
        mediaStorageId: storageId as never,
      });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace("/(main)/(tabs)");
    } catch (error) {
      console.error("Post upload failed:", error);
      if (Platform.OS !== "web") {
        const { Alert } = require("react-native");
        Alert.alert("Fehler", "Post konnte nicht ver\u00f6ffentlicht werden. Bitte versuche es erneut.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMedia = () => {
    setMedia(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack(router, "/(main)/(tabs)/create")}
          style={styles.headerBtn}
        >
          <Icon name="chevron.left" size={20} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{titleMap[postType]}</Text>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={!media || uploading}
          style={[
            styles.publishBtn,
            (!media || uploading) && styles.publishBtnDisabled,
          ]}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text
              style={[
                styles.publishText,
                (!media || uploading) && styles.publishTextDisabled,
              ]}
            >
              Posten
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Media Picker Area */}
        <TouchableOpacity
          style={styles.mediaArea}
          onPress={handlePickMedia}
          disabled={pickingMedia || uploading}
          activeOpacity={0.7}
        >
          {media ? (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: media.uri }}
                style={styles.preview}
                contentFit="cover"
              />
              {isVideo && (
                <View style={styles.videoOverlay}>
                  <Icon name="play.fill" size={40} color={colors.white} />
                </View>
              )}
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={handleRemoveMedia}
              >
                <Icon name="xmark.circle.fill" size={24} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={handlePickMedia}
              >
                <Text style={styles.changeBtnText}>
                  {isVideo ? "Video \u00e4ndern" : "Bild \u00e4ndern"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : pickingMedia ? (
            <View style={styles.emptyMedia}>
              <ActivityIndicator size="large" color={colors.grey400} />
              <Text style={styles.emptyMediaText}>Mediathek wird ge\u00f6ffnet...</Text>
            </View>
          ) : (
            <View style={styles.emptyMedia}>
              <Icon
                name={isVideo ? "video" : "photo"}
                size={48}
                color={colors.grey400}
              />
              <Text style={styles.emptyMediaTitle}>
                {isVideo ? "Video ausw\u00e4hlen" : "Foto ausw\u00e4hlen"}
              </Text>
              <Text style={styles.emptyMediaText}>
                Tippe hier, um {isVideo ? "ein Video" : "ein Bild"} aus deiner Mediathek zu w\u00e4hlen
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Caption */}
        <View style={styles.captionContainer}>
          <TextInput
            style={styles.captionInput}
            placeholder="Beschreibung hinzuf\u00fcgen..."
            placeholderTextColor={colors.grey400}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={500}
            editable={!uploading}
          />
          <Text style={styles.charCount}>{caption.length}/500</Text>
        </View>

        {uploading && (
          <View style={styles.uploadingBanner}>
            <ActivityIndicator size="small" color={colors.black} />
            <Text style={styles.uploadingText}>Wird hochgeladen...</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  publishBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
  },
  publishBtnDisabled: {
    backgroundColor: colors.grey300,
  },
  publishText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  publishTextDisabled: {
    color: colors.grey500,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  mediaArea: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.grey200,
    borderStyle: "dashed",
    minHeight: 280,
  },
  previewContainer: {
    position: "relative",
    minHeight: 280,
  },
  preview: {
    width: "100%",
    height: 320,
    borderRadius: 16,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 16,
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
  changeBtn: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  changeBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  emptyMedia: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyMediaTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.black,
  },
  emptyMediaText: {
    fontSize: 14,
    color: colors.grey500,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  captionContainer: {
    backgroundColor: colors.grey100,
    borderRadius: 14,
    padding: spacing.md,
  },
  captionInput: {
    fontSize: 16,
    color: colors.black,
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: colors.grey400,
    textAlign: "right",
    marginTop: 4,
  },
  uploadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.md,
    backgroundColor: colors.grey100,
    borderRadius: 12,
  },
  uploadingText: {
    fontSize: 14,
    color: colors.black,
    fontWeight: "500",
  },
});
