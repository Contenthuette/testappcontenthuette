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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Image } from "expo-image";
import { colors, spacing, radius } from "@/lib/theme";
import { Icon } from "@/components/Icon";
import { safeBack } from "@/lib/navigation";
import { pickImage, pickVideo, uploadToConvex } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";

type PostType = "photo" | "video" | "reel";

const typeConfig: Record<PostType, { title: string; pickLabel: string; icon: string }> = {
  photo: { title: "Foto posten", pickLabel: "Foto ausw\u00e4hlen", icon: "photo" },
  video: { title: "Video posten", pickLabel: "Video ausw\u00e4hlen", icon: "video" },
  reel: { title: "Reel posten", pickLabel: "Reel ausw\u00e4hlen", icon: "play.rectangle" },
};

export default function CreatePostScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const postType: PostType = (type === "video" || type === "reel") ? type : "photo";
  const config = typeConfig[postType];
  const router = useRouter();

  const createPost = useMutation(api.posts.create);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);

  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<{ uri: string; mimeType: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [picking, setPicking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  // Auto-open picker on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      handlePick();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePick = async () => {
    setPicking(true);
    try {
      const isVideo = postType === "video" || postType === "reel";
      const result = isVideo
        ? await pickVideo({ quality: 0.8 })
        : await pickImage({ quality: 0.8, allowsEditing: true });

      if (result) {
        setMediaPreview(result.uri);
        setMediaFile({ uri: result.uri, mimeType: result.mimeType });
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } finally {
      setPicking(false);
    }
  };

  const handlePublish = async () => {
    if (!mediaFile) return;
    setPublishing(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const storageId = await uploadToConvex(uploadUrl, mediaFile.uri, mediaFile.mimeType);

      await createPost({
        type: postType,
        caption: caption.trim() || undefined,
        mediaStorageId: storageId as never,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setPublished(true);
      setTimeout(() => {
        router.replace("/(main)/(tabs)");
      }, 600);
    } catch (error) {
      console.error("Post creation failed:", error);
      setPublishing(false);
      if (Platform.OS !== "web") {
        const { Alert: RNAlert } = require("react-native");
        RNAlert.alert("Fehler", "Beitrag konnte nicht ver\u00f6ffentlicht werden.");
      }
    }
  };

  if (published) {
    return (
      <View style={styles.successWrap}>
        <View style={styles.successBadge}>
          <Icon name="checkmark.circle.fill" size={48} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>Ver\u00f6ffentlicht!</Text>
        <Text style={styles.successSub}>Dein Beitrag ist jetzt im Feed sichtbar.</Text>
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
          onPress={() => safeBack(router, "/(main)/(tabs)/create")}
          style={styles.headerBtn}
        >
          <Icon name="chevron.left" size={20} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{config.title}</Text>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={publishing || !mediaFile}
          style={[
            styles.publishBtn,
            (publishing || !mediaFile) && styles.publishBtnDisabled,
          ]}
        >
          {publishing ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.publishBtnText}>Posten</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Media area */}
        <TouchableOpacity
          style={styles.mediaArea}
          onPress={handlePick}
          disabled={picking || publishing}
          activeOpacity={0.7}
        >
          {mediaPreview ? (
            <View style={styles.previewWrap}>
              <Image
                source={{ uri: mediaPreview }}
                style={styles.previewImage}
                contentFit="cover"
              />
              <View style={styles.previewOverlay}>
                {picking ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <View style={styles.changeBadge}>
                    <Icon name="camera" size={14} color={colors.white} />
                    <Text style={styles.changeBadgeText}>\u00c4ndern</Text>
                  </View>
                )}
              </View>
            </View>
          ) : picking ? (
            <View style={styles.emptyMedia}>
              <ActivityIndicator size="large" color={colors.gray400} />
              <Text style={styles.emptyLabel}>\u00d6ffne Galerie...</Text>
            </View>
          ) : (
            <View style={styles.emptyMedia}>
              <Icon name={config.icon} size={40} color={colors.gray400} />
              <Text style={styles.emptyLabel}>{config.pickLabel}</Text>
              <Text style={styles.emptyHint}>Tippe hier, um Medien auszuw\u00e4hlen</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Caption */}
        <View style={styles.captionSection}>
          <Text style={styles.sectionLabel}>Beschreibung</Text>
          <TextInput
            style={styles.captionInput}
            value={caption}
            onChangeText={setCaption}
            placeholder="Schreibe etwas zu deinem Beitrag..."
            placeholderTextColor={colors.gray400}
            multiline
            maxLength={500}
            editable={!publishing}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
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
  publishBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
  },
  publishBtnDisabled: {
    backgroundColor: colors.gray300,
  },
  publishBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.lg },
  mediaArea: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: "dashed",
    minHeight: 260,
  },
  previewWrap: {
    position: "relative",
    minHeight: 260,
  },
  previewImage: {
    width: "100%",
    height: 300,
    borderRadius: radius.md,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: radius.md,
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  changeBadgeText: {
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
  emptyLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray500,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.gray400,
  },
  captionSection: { gap: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  captionInput: {
    backgroundColor: colors.gray100,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.black,
    minHeight: 100,
    textAlignVertical: "top",
  },
  successWrap: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  successBadge: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.black,
  },
  successSub: {
    fontSize: 15,
    color: colors.gray500,
  },
});
