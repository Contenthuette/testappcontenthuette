import React, { useState, useEffect, useCallback } from "react";
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
  Pressable,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Image } from "expo-image";
import Icon from "@/components/Icon";
import { ThumbnailPicker } from "@/components/ThumbnailPicker";
import { colors, spacing, radius } from "@/lib/theme";
import { safeBack } from "@/lib/navigation";
import { pickImage, pickVideo, uploadToConvex } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useVideoPlayer, VideoView } from "expo-video";

type PostType = "photo" | "video";

const typeConfig: Record<PostType, { title: string; pickLabel: string; icon: string }> = {
  photo: { title: "Foto posten", pickLabel: "Foto auswählen", icon: "photo" },
  video: { title: "Video posten", pickLabel: "Video auswählen", icon: "video" },
};

// 9:16 portrait container (Reels-style)
const FEED_ASPECT_RATIO = 9 / 16;

export default function CreatePostScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const postType: PostType = type === "video" ? "video" : "photo";
  const config = typeConfig[postType];
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const [videoDuration, setVideoDuration] = useState<number | undefined>(undefined);

  // Thumbnail state
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [thumbnailIsCustom, setThumbnailIsCustom] = useState(false);

  // Location state
  const [location, setLocation] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  // MV Locations
  const MV_LOCATIONS = [
    "Rostock", "Schwerin", "Neubrandenburg", "Stralsund", "Greifswald",
    "Wismar", "Guestrow", "Waren (Mueritz)", "Anklam", "Bergen auf Ruegen",
    "Bad Doberan", "Parchim", "Demmin", "Ribnitz-Damgarten", "Pasewalk",
    "Wolgast", "Sassnitz", "Barth", "Teterow", "Malchin",
    "Ludwigslust", "Hagenow", "Boizenburg", "Ueckermuende",
    "Landkreis Rostock", "Landkreis Vorpommern-Ruegen",
    "Landkreis Nordwestmecklenburg", "Landkreis Mecklenburgische Seenplatte",
    "Landkreis Vorpommern-Greifswald", "Landkreis Ludwigslust-Parchim",
  ];

  const filteredLocations = locationSearch.trim()
    ? MV_LOCATIONS.filter((l) => l.toLowerCase().includes(locationSearch.toLowerCase()))
    : MV_LOCATIONS;

  // Crop state (stored as JS values for saving)
  const [cropState, setCropState] = useState({ x: 0, y: 0, zoom: 1 });

  // For videos, we extract a frame to use as the crop preview
  const [_videoFrameUri, setVideoFrameUri] = useState<string | null>(null);

  // Video player for live preview
  const videoPlayer = useVideoPlayer(postType === "video" && mediaPreview ? mediaPreview : null, (player) => {
    player.loop = true;
    player.muted = true;
  });

  // Sync video player when media changes
  useEffect(() => {
    if (postType === "video" && mediaPreview && videoPlayer) {
      videoPlayer.replace(mediaPreview);
      videoPlayer.play();
    }
  }, [mediaPreview, postType, videoPlayer]);

  const previewWidth = width - spacing.lg * 2;
  const containerHeight = previewWidth / FEED_ASPECT_RATIO; // 4:3 landscape

  // Media dimensions at base scale (fitting width)
  const mediaAspectRatio = mediaDims ? mediaDims.width / mediaDims.height : 1;
  const baseMediaHeight = previewWidth / mediaAspectRatio;
  const baseMediaWidth = previewWidth;

  // --- Gesture values ---
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const syncCropState = useCallback(
    (tx: number, ty: number, s: number) => {
      const scaledW = baseMediaWidth * s;
      const scaledH = baseMediaHeight * s;
      const overflowX = Math.max(0, scaledW - previewWidth);
      const overflowY = Math.max(0, scaledH - containerHeight);

      // Convert pixel offset to normalized 0..1 (0.5 = centered)
      const normX = overflowX > 0 ? 0.5 - tx / overflowX : 0.5;
      const normY = overflowY > 0 ? 0.5 - ty / overflowY : 0.5;

      setCropState({
        x: Math.max(0, Math.min(1, normX)),
        y: Math.max(0, Math.min(1, normY)),
        zoom: s,
      });
    },
    [baseMediaWidth, baseMediaHeight, previewWidth, containerHeight],
  );

  // Pan gesture - direct drag, no long-press needed
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      const newX = savedTranslateX.value + e.translationX;
      const newY = savedTranslateY.value + e.translationY;

      const scaledW = baseMediaWidth * scale.value;
      const scaledH = baseMediaHeight * scale.value;
      const overflowX = Math.max(0, scaledW - previewWidth);
      const overflowY = Math.max(0, scaledH - containerHeight);

      translateX.value = Math.max(-overflowX / 2, Math.min(overflowX / 2, newX));
      translateY.value = Math.max(-overflowY / 2, Math.min(overflowY / 2, newY));
    })
    .onEnd(() => {
      runOnJS(syncCropState)(translateX.value, translateY.value, scale.value);
    });

  // Pinch gesture - 2-finger zoom
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const newScale = Math.max(1, Math.min(4, savedScale.value * e.scale));
      scale.value = newScale;

      // Re-clamp translation during zoom
      const scaledW = baseMediaWidth * newScale;
      const scaledH = baseMediaHeight * newScale;
      const overflowX = Math.max(0, scaledW - previewWidth);
      const overflowY = Math.max(0, scaledH - containerHeight);
      translateX.value = Math.max(-overflowX / 2, Math.min(overflowX / 2, translateX.value));
      translateY.value = Math.max(-overflowY / 2, Math.min(overflowY / 2, translateY.value));
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withSpring(1, { damping: 15 });
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        runOnJS(syncCropState)(0, 0, 1);
      } else {
        runOnJS(syncCropState)(translateX.value, translateY.value, scale.value);
      }
    });

  // Compose: pan + pinch simultaneously
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Animated style for media inside the 4:3 container
  const animatedMediaStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  useEffect(() => {
    const timeout = setTimeout(() => handlePick(), 400);
    return () => clearTimeout(timeout);
  }, []);

  const resetCrop = () => {
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    scale.value = 1;
    savedScale.value = 1;
    setCropState({ x: 0.5, y: 0.5, zoom: 1 });
  };

  const handlePick = async () => {
    setPicking(true);
    try {
      const result =
        postType === "video"
          ? await pickVideo({ quality: 0.8 })
          : await pickImage({ quality: 0.8, allowsEditing: false });

      if (result) {
        setMediaPreview(result.uri);
        setMediaFile({ uri: result.uri, mimeType: result.mimeType });
        setMediaDims({ width: result.width, height: result.height });
        resetCrop();
        setThumbnailUri(null);
        setThumbnailIsCustom(false);
        setVideoFrameUri(null);

        // Extract a frame for video crop preview
        if (postType === "video") {
          try {
            const { uri: frameUri } = await VideoThumbnails.getThumbnailAsync(result.uri, {
              time: 0,
              quality: 0.8,
            });
            setVideoFrameUri(frameUri);
          } catch (e) {
            console.warn("Failed to extract video frame:", e);
          }
        }

        if (result.duration !== undefined && result.duration > 0) {
          setVideoDuration(result.duration / 1000);
        } else {
          setVideoDuration(undefined);
        }

        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } finally {
      setPicking(false);
    }
  };

  const handleThumbnailSelected = useCallback((uri: string, isCustom: boolean) => {
    setThumbnailUri(uri);
    setThumbnailIsCustom(isCustom);
  }, []);

  const handlePublish = async () => {
    if (!mediaFile) return;
    setPublishing(true);
    try {
      // Upload main media
      const uploadUrl = await generateUploadUrl();
      const storageId = await uploadToConvex(uploadUrl, mediaFile.uri, mediaFile.mimeType);

      // Upload thumbnail if selected
      let thumbStorageId: string | undefined;
      if (thumbnailUri && postType === "video") {
        try {
          const thumbUploadUrl = await generateUploadUrl();
          thumbStorageId = await uploadToConvex(
            thumbUploadUrl,
            thumbnailUri,
            thumbnailIsCustom ? "image/jpeg" : "image/png",
          );
        } catch (e) {
          console.warn("Thumbnail upload failed, continuing without:", e);
        }
      }

      await createPost({
        type: postType,
        caption: caption.trim() || undefined,
        mediaStorageId: storageId as never,
        thumbnailStorageId: thumbStorageId as never,
        aspectMode: "cropped",
        cropOffsetX: cropState.x,
        cropOffsetY: cropState.y,
        cropZoom: cropState.zoom,
        mediaAspectRatio: mediaDims ? mediaDims.width / mediaDims.height : undefined,
        location: location ?? undefined,
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
        Alert.alert("Fehler", "Beitrag konnte nicht veröffenlicht werden.");
      }
    }
  };

  if (published) {
    return (
      <View style={styles.successWrap}>
        <View style={styles.successBadge}>
          <Icon name="checkmark.circle.fill" size={48} tintColor={colors.success} />
        </View>
        <Text style={styles.successTitle}>Veröffenlicht!</Text>
        <Text style={styles.successSub}>Dein Beitrag ist jetzt im Feed sichtbar.</Text>
      </View>
    );
  }

  const _isCropped = true;
  const needsCrop = mediaDims
    ? baseMediaHeight > containerHeight || baseMediaWidth > previewWidth
    : false;

  const renderCropPreview = () => {
    if (!mediaPreview || !mediaDims) return null;

    // Video: show live video player
    if (postType === "video") {
      return (
        <View>
          <View
            style={[
              styles.cropContainer,
              {
                width: previewWidth,
                height: containerHeight,
              },
            ]}
          >
            <VideoView
              player={videoPlayer}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls={false}
            />
            {/* 9:16 label badge */}
            <View style={styles.aspectBadge} pointerEvents="none">
              <Text style={styles.aspectBadgeText}>9:16</Text>
            </View>
          </View>

          <Text style={styles.cropHint}>
            So wird dein Video im Feed angezeigt
          </Text>

          {/* Thumbnail picker for videos */}
          <ThumbnailPicker
            videoUri={mediaPreview}
            videoDuration={videoDuration}
            onThumbnailSelected={handleThumbnailSelected}
            selectedThumbnailUri={thumbnailUri}
          />

          {/* Change video button */}
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
                <Text style={styles.changeBtnText}>Anderes Video</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    // Photo: show crop preview with gestures
    return (
      <View>
        {/* Fixed 9:16 crop container */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            style={[
              styles.cropContainer,
              {
                width: previewWidth,
                height: containerHeight,
              },
            ]}
          >
            <Animated.View
              style={[
                {
                  width: baseMediaWidth,
                  height: baseMediaHeight,
                  position: "absolute",
                  left: (previewWidth - baseMediaWidth) / 2,
                  top: (containerHeight - baseMediaHeight) / 2,
                },
                animatedMediaStyle,
              ]}
            >
              <Image
                source={{ uri: mediaPreview }}
                style={{ width: baseMediaWidth, height: baseMediaHeight }}
                contentFit="cover"
              />
            </Animated.View>

            {/* Drag hint overlay */}
            {needsCrop && (
              <View style={styles.dragOverlay} pointerEvents="none">
                <View style={styles.dragHandleTop}>
                  <Icon name="hand.draw" size={16} tintColor="rgba(255,255,255,0.9)" />
                  <Text style={styles.dragHintText}>Verschieben & Zoomen</Text>
                </View>
              </View>
            )}

            {/* 9:16 label badge */}
            <View style={styles.aspectBadge} pointerEvents="none">
              <Text style={styles.aspectBadgeText}>9:16</Text>
            </View>
          </Animated.View>
        </GestureDetector>

        <Text style={styles.cropHint}>
          {needsCrop
            ? "Verschiebe das Bild mit 1 Finger, zoome mit 2 Fingern"
            : "Dein Medium passt perfekt ins 9:16 Format"}
        </Text>

        {/* Change photo button */}
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
              <Text style={styles.changeBtnText}>Anderes Foto</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => {
            if (mediaPreview && mediaDims) {
              // If media is selected, go back to picker instead of leaving
              setMediaPreview(null);
              setMediaFile(null);
              setMediaDims(null);
              setThumbnailUri(null);
              setVideoFrameUri(null);
              setTimeout(() => handlePick(), 300);
            } else {
              safeBack("create-post");
            }
          }} style={styles.headerBtn}>
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
                  <Text style={styles.emptyLabel}>Öffne Galerie...</Text>
                </View>
              ) : (
                <View style={styles.emptyMedia}>
                  <Icon name={config.icon} size={40} tintColor={colors.gray400} />
                  <Text style={styles.emptyLabel}>{config.pickLabel}</Text>
                  <Text style={styles.emptyHint}>Tippe hier, um Medien auszuwählen</Text>
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

          {/* Location Picker */}
          <View style={styles.captionSection}>
            <Text style={styles.sectionLabel}>Standort</Text>
            <Pressable
              style={styles.locationButton}
              onPress={() => setShowLocationPicker(true)}
            >
              <Icon name="mappin.circle.fill" size={20} tintColor={location ? colors.black : colors.gray400} />
              <Text style={[styles.locationButtonText, !location && { color: colors.gray400 }]}>
                {location ?? "Standort hinzuf\u00fcgen"}
              </Text>
              {location && (
                <Pressable
                  onPress={() => setLocation(null)}
                  hitSlop={12}
                  style={styles.locationClear}
                >
                  <Icon name="xmark.circle.fill" size={16} tintColor={colors.gray400} />
                </Pressable>
              )}
            </Pressable>
          </View>

          {/* Location Picker Modal */}
          <Modal
            visible={showLocationPicker}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <View style={styles.locationModal}>
              <View style={styles.locationModalHeader}>
                <Text style={styles.locationModalTitle}>Standort w\u00e4hlen</Text>
                <Pressable onPress={() => { setShowLocationPicker(false); setLocationSearch(""); }}>
                  <Icon name="xmark.circle.fill" size={28} tintColor={colors.gray400} />
                </Pressable>
              </View>
              <TextInput
                style={styles.locationSearchInput}
                placeholder="Suchen oder eigenen Ort eingeben..."
                placeholderTextColor={colors.gray400}
                value={locationSearch}
                onChangeText={setLocationSearch}
                autoFocus
              />
              {locationSearch.trim().length > 0 && !MV_LOCATIONS.some((l) => l.toLowerCase() === locationSearch.toLowerCase()) && (
                <Pressable
                  style={styles.locationCustomRow}
                  onPress={() => {
                    setLocation(locationSearch.trim());
                    setShowLocationPicker(false);
                    setLocationSearch("");
                  }}
                >
                  <Icon name="plus.circle.fill" size={20} tintColor={colors.black} />
                  <Text style={styles.locationCustomText}>"{locationSearch.trim()}" verwenden</Text>
                </Pressable>
              )}
              <ScrollView style={{ flex: 1 }}>
                {filteredLocations.map((loc) => (
                  <Pressable
                    key={loc}
                    style={[styles.locationRow, location === loc && styles.locationRowActive]}
                    onPress={() => {
                      setLocation(loc);
                      setShowLocationPicker(false);
                      setLocationSearch("");
                    }}
                  >
                    <Icon name="mappin" size={16} tintColor={location === loc ? colors.black : colors.gray400} />
                    <Text style={[styles.locationRowText, location === loc && { fontWeight: "700" }]}>{loc}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Modal>

        </ScrollView>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
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

  // Crop container - fixed 4:3
  cropContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    borderCurve: "continuous",
  },
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  dragHandleTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  dragHintText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  aspectBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aspectBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
  },
  cropHint: {
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

  // Location picker
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray100,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: 10,
  },
  locationButtonText: {
    flex: 1,
    fontSize: 15,
    color: colors.black,
    fontWeight: "500",
  },
  locationClear: {
    padding: 4,
  },
  locationModal: {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: 16,
  },
  locationModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.black,
  },
  locationSearchInput: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.gray100,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.black,
    marginBottom: spacing.md,
  },
  locationCustomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: colors.gray100,
    marginHorizontal: spacing.lg,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  locationCustomText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.black,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  locationRowActive: {
    backgroundColor: colors.gray100,
  },
  locationRowText: {
    fontSize: 15,
    color: colors.black,
  },
});
