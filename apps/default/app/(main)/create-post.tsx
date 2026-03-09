import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Alert,
  useWindowDimensions,
  PanResponder,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Image } from "expo-image";
import Icon from "@/components/Icon";
import { VideoPlayer } from "@/components/VideoPlayer";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { pickImage, pickVideo, uploadToConvex } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";

type PostType = "photo" | "video";
type AspectMode = "original" | "cropped";

const typeConfig: Record<PostType, { title: string; pickLabel: string; icon: string }> = {
  photo: { title: "Foto posten", pickLabel: "Foto auswaehlen", icon: "photo" },
  video: { title: "Video posten", pickLabel: "Video auswaehlen", icon: "video" },
};

const FEED_ASPECT = 3 / 4; // 3:4 portrait

export default function CreatePostScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const postType: PostType = type === "video" ? "video" : "photo";
  const config = typeConfig[postType];
  const router = useRouter();
  const { width } = useWindowDimensions();

  const createPost = useMutation(api.posts.create);
  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);

  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<{ uri: string; mimeType: string } | null>(null);
  const [mediaDims, setMediaDims] = useState<{ width: number; height: number } | null>(null);
  const [caption, setCaption] = useState("");
  const [picking, setPicking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [aspectMode, setAspectMode] = useState<AspectMode>("cropped");
  const [cropOffsetY, setCropOffsetY] = useState(0.5);

  const cropOffsetRef = useRef(0.5);

  const previewWidth = width - spacing.lg * 2;
  const cropContainerHeight = previewWidth / FEED_ASPECT; // 3:4 → taller than wide

  // Scaled media dimensions at preview width
  const scaledMediaHeight = mediaDims
    ? previewWidth * (mediaDims.height / mediaDims.width)
    : cropContainerHeight;
  const overflowY = Math.max(0, scaledMediaHeight - cropContainerHeight);
  const canCrop = overflowY > 0;

  const overflowRef = useRef(overflowY);
  useEffect(() => {
    overflowRef.current = overflowY;
  }, [overflowY]);

  // Pan gesture for crop positioning
  const startOffsetRef = useRef(0.5);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 3,
        onPanResponderGrant: () => {
          startOffsetRef.current = cropOffsetRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const overflow = overflowRef.current;
          if (overflow <= 0) return;
          const delta = gesture.dy / overflow;
          const newVal = Math.max(0, Math.min(1, startOffsetRef.current - delta));
          cropOffsetRef.current = newVal;
          setCropOffsetY(newVal);
        },
      }),
    [],
  );

  const translateY = -cropOffsetY * overflowY;

  useEffect(() => {
    const timeout = setTimeout(() => handlePick(), 400);
    return () => clearTimeout(timeout);
  }, []);

  const handlePick = async () => {
    setPicking(true);
    try {
      const result = postType === "video"
        ? await pickVideo({ quality: 0.8 })
        : await pickImage({ quality: 0.8, allowsEditing: false });

      if (result) {
        setMediaPreview(result.uri);
        setMediaFile({ uri: result.uri, mimeType: result.mimeType });
        setMediaDims({ width: result.width, height: result.height });
        setCropOffsetY(0.5);
        cropOffsetRef.current = 0.5;
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } finally {
      setPicking(false);
    }
  };

  const handleAspectToggle = (mode: AspectMode) => {
    setAspectMode(mode);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePublish = async () => {
    if (!mediaFile) return;
    setPublishing(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const storageId = await uploadToConvex(uploadUrl, mediaFile.uri, mediaFile.mimeType);

      const mediaAspectRatio = mediaDims
        ? mediaDims.width / mediaDims.height
        : undefined;

      await createPost({
        type: postType,
        caption: caption.trim() || undefined,
        mediaStorageId: storageId as never,
        aspectMode,
        cropOffsetY: aspectMode === "cropped" ? cropOffsetY : undefined,
        mediaAspectRatio,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setPublished(true);
      setTimeout(() => {
        router.replace("/(main)/(tabs)/feed" as never);
      }, 600);
    } catch (error) {
      console.error("Post creation failed:", error);
      setPublishing(false);
      if (Platform.OS !== "web") {
        Alert.alert("Fehler", "Beitrag konnte nicht veroeffentlicht werden.");
      }
    }
  };

  if (published) {
    return (
      <View style={styles.successWrap}>
        <View style={styles.successBadge}>
          <Icon name="checkmark.circle.fill" size={48} tintColor={colors.success} />
        </View>
        <Text style={styles.successTitle}>Veroeffentlicht!</Text>
        <Text style={styles.successSub}>Dein Beitrag ist jetzt im Feed sichtbar.</Text>
      </View>
    );
  }

  const isCropped = aspectMode === "cropped";

  const renderCropPreview = () => {
    if (!mediaPreview || !mediaDims) return null;

    return (
      <View>
        {/* Aspect mode toggle */}
        <View style={styles.aspectToggleRow}>
          <Text style={styles.aspectLabel}>Format</Text>
          <View style={styles.aspectToggle}>
            <TouchableOpacity
              style={[styles.aspectBtn, isCropped && styles.aspectBtnActive]}
              onPress={() => handleAspectToggle("cropped")}
              activeOpacity={0.7}
            >
              <Icon name="crop" size={14} tintColor={isCropped ? colors.white : colors.gray600} />
              <Text style={[styles.aspectBtnText, isCropped && styles.aspectBtnTextActive]}>
                3:4 anpassen
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.aspectBtn, !isCropped && styles.aspectBtnActive]}
              onPress={() => handleAspectToggle("original")}
              activeOpacity={0.7}
            >
              <Icon
                name="arrow.up.left.and.arrow.down.right"
                size={14}
                tintColor={!isCropped ? colors.white : colors.gray600}
              />
              <Text style={[styles.aspectBtnText, !isCropped && styles.aspectBtnTextActive]}>
                Original
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {isCropped ? (
          /* ── Cropped preview with drag ── */
          <View>
            <View
              style={[
                styles.cropContainer,
                { width: previewWidth, height: cropContainerHeight },
              ]}
              {...panResponder.panHandlers}
            >
              {postType === "video" ? (
                <View style={{ transform: [{ translateY }] }}>
                  <VideoPlayer
                    uri={mediaPreview}
                    height={scaledMediaHeight}
                    width={previewWidth}
                    autoPlay={false}
                    muted
                    hideControls
                  />
                </View>
              ) : (
                <Image
                  source={{ uri: mediaPreview }}
                  style={[
                    styles.cropImage,
                    {
                      width: previewWidth,
                      height: scaledMediaHeight,
                      transform: [{ translateY }],
                    },
                  ]}
                  contentFit="cover"
                />
              )}

              {/* Drag indicators */}
              {canCrop && (
                <View style={styles.dragOverlay} pointerEvents="none">
                  <View style={styles.dragHandle}>
                    <Icon name="chevron.up" size={14} tintColor="rgba(255,255,255,0.9)" />
                  </View>
                  <View style={{ flex: 1 }} />
                  <View style={styles.dragHandle}>
                    <Icon name="chevron.down" size={14} tintColor="rgba(255,255,255,0.9)" />
                  </View>
                </View>
              )}
            </View>

            {canCrop && (
              <Text style={styles.cropHint}>Ziehe um den Ausschnitt zu waehlen</Text>
            )}
          </View>
        ) : (
          /* ── Original preview ── */
          <View style={[styles.originalContainer, { width: previewWidth }]}>
            {postType === "video" ? (
              <VideoPlayer
                uri={mediaPreview}
                height={Math.min(scaledMediaHeight, cropContainerHeight)}
                width={previewWidth}
                autoPlay={false}
                muted
                contentFit="contain"
                borderRadius={16}
              />
            ) : (
              <Image
                source={{ uri: mediaPreview }}
                style={[
                  styles.originalImage,
                  {
                    width: previewWidth,
                    height: Math.min(scaledMediaHeight, cropContainerHeight),
                  },
                ]}
                contentFit="contain"
              />
            )}
          </View>
        )}

        <Text style={styles.aspectHint}>
          {isCropped
            ? "Das Medium wird auf 3:4 zugeschnitten und fuellt den Feed."
            : "Das Medium wird im Originalformat mit Raendern angezeigt."}
        </Text>

        {/* Change media button */}
        <TouchableOpacity
          style={styles.changeBtn}
          onPress={handlePick}
          disabled={picking || publishing}
          activeOpacity={0.7}
        >
          {picking ? (
            <ActivityIndicator size="small" color={colors.black} />
          ) : (
            <>
              <Icon name="arrow.triangle.2.circlepath" size={16} tintColor={colors.black} />
              <Text style={styles.changeBtnText}>
                {postType === "video" ? "Anderes Video" : "Anderes Foto"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("create-post")} style={styles.headerBtn}>
          <Icon name="chevron.left" size={20} tintColor={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{config.title}</Text>
        <TouchableOpacity
          onPress={handlePublish}
          disabled={publishing || !mediaFile}
          style={[styles.publishBtn, (publishing || !mediaFile) && styles.publishBtnDisabled]}
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
        {mediaPreview && mediaDims ? (
          renderCropPreview()
        ) : (
          <TouchableOpacity
            style={styles.mediaArea}
            onPress={handlePick}
            disabled={picking || publishing}
            activeOpacity={0.7}
          >
            {picking ? (
              <View style={styles.emptyMedia}>
                <ActivityIndicator size="large" color={colors.gray400} />
                <Text style={styles.emptyLabel}>Oeffne Galerie...</Text>
              </View>
            ) : (
              <View style={styles.emptyMedia}>
                <Icon name={config.icon} size={40} tintColor={colors.gray400} />
                <Text style={styles.emptyLabel}>{config.pickLabel}</Text>
                <Text style={styles.emptyHint}>Tippe hier, um Medien auszuwaehlen</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

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
  headerTitle: { fontSize: 17, fontWeight: "600", color: colors.black },
  publishBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
  },
  publishBtnDisabled: { backgroundColor: colors.gray300 },
  publishBtnText: { color: colors.white, fontSize: 15, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.lg },

  // Empty state
  mediaArea: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: "dashed",
    minHeight: 260,
  },
  emptyMedia: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyLabel: { fontSize: 16, fontWeight: "600", color: colors.gray500 },
  emptyHint: { fontSize: 13, color: colors.gray400 },

  // Aspect toggle
  aspectToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  aspectLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  aspectToggle: {
    flexDirection: "row",
    backgroundColor: colors.gray100,
    borderRadius: 10,
    padding: 3,
  },
  aspectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  aspectBtnActive: { backgroundColor: colors.black },
  aspectBtnText: { fontSize: 13, fontWeight: "600", color: colors.gray600 },
  aspectBtnTextActive: { color: colors.white },

  // Crop preview
  cropContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    borderCurve: "continuous",
  },
  cropImage: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  dragHandle: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  cropHint: {
    fontSize: 12,
    color: colors.gray400,
    textAlign: "center",
    marginTop: 8,
  },

  // Original preview
  originalContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  originalImage: {
    borderRadius: 16,
  },

  aspectHint: {
    fontSize: 12,
    color: colors.gray400,
    textAlign: "center",
    marginTop: 8,
  },

  // Change button
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: colors.gray100,
    borderRadius: radius.sm,
  },
  changeBtnText: { fontSize: 14, fontWeight: "600", color: colors.black },

  // Caption
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

  // Success
  successWrap: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  successBadge: { marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: "700", color: colors.black },
  successSub: { fontSize: 15, color: colors.gray500 },
});
