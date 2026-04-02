import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as Haptics from "expo-haptics";
import Icon from "@/components/Icon";
import { colors } from "@/lib/theme";

interface ThumbnailPickerProps {
  videoUri: string;
  videoDuration?: number;
  onThumbnailSelected: (uri: string, isCustom: boolean) => void;
  selectedThumbnailUri: string | null;
}

interface FrameData {
  uri: string;
  time: number;
}

const FRAME_COUNT = 12;
const FRAME_SIZE = 56;

export function ThumbnailPicker({
  videoUri,
  videoDuration,
  onThumbnailSelected,
  selectedThumbnailUri,
}: ThumbnailPickerProps) {
  const [mode, setMode] = useState<"frames" | "upload">("frames");
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);

  // Extract frames from video
  useEffect(() => {
    if (!videoUri) return;
    let cancelled = false;

    const extractFrames = async () => {
      setLoadingFrames(true);
      setFrames([]);
      setSelectedFrameIndex(null);

      const duration = videoDuration ?? 10; // fallback 10s
      const interval = (duration * 1000) / (FRAME_COUNT + 1);
      const extracted: FrameData[] = [];

      for (let i = 1; i <= FRAME_COUNT; i++) {
        if (cancelled) return;
        const time = Math.round(interval * i);
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
            time,
            quality: 0.6,
          });
          extracted.push({ uri, time });
        } catch {
          // Skip failed frames
        }
      }

      if (!cancelled) {
        setFrames(extracted);
        setLoadingFrames(false);
      }
    };

    extractFrames();
    return () => {
      cancelled = true;
    };
  }, [videoUri, videoDuration]);

  const handleSelectFrame = useCallback(
    (index: number) => {
      const frame = frames[index];
      if (!frame) return;
      setSelectedFrameIndex(index);
      onThumbnailSelected(frame.uri, false);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [frames, onThumbnailSelected],
  );

  const handlePickFromGallery = useCallback(async () => {
    setPickingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]) {
        setSelectedFrameIndex(null);
        onThumbnailSelected(result.assets[0].uri, true);
        setMode("upload");
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (e) {
      console.warn("Thumbnail pick failed:", e);
    } finally {
      setPickingImage(false);
    }
  }, [onThumbnailSelected]);

  const handleRemove = useCallback(() => {
    setSelectedFrameIndex(null);
    onThumbnailSelected("", false);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [onThumbnailSelected]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.label}>Titelbild</Text>
        {selectedThumbnailUri ? (
          <TouchableOpacity onPress={handleRemove} hitSlop={12}>
            <Text style={styles.removeText}>Entfernen</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "frames" && styles.modeBtnActive]}
          onPress={() => setMode("frames")}
          activeOpacity={0.7}
        >
          <Icon
            name="video"
            size={14}
            tintColor={mode === "frames" ? colors.white : colors.gray500}
          />
          <Text
            style={[styles.modeBtnText, mode === "frames" && styles.modeBtnTextActive]}
          >
            Aus Video wählen
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "upload" && styles.modeBtnActive]}
          onPress={() => setMode("upload")}
          activeOpacity={0.7}
        >
          <Icon
            name="photo.badge.plus"
            size={14}
            tintColor={mode === "upload" ? colors.white : colors.gray500}
          />
          <Text
            style={[styles.modeBtnText, mode === "upload" && styles.modeBtnTextActive]}
          >
            Hochladen
          </Text>
        </TouchableOpacity>
      </View>

      {/* Frames Mode */}
      {mode === "frames" && (
        <View style={styles.framesSection}>
          {loadingFrames ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.gray400} />
              <Text style={styles.loadingText}>Frames werden extrahiert…</Text>
            </View>
          ) : frames.length === 0 ? (
            <Text style={styles.emptyText}>Keine Frames verfügbar</Text>
          ) : (
            <>
              <Text style={styles.hint}>Tippe auf einen Frame als Vorschaubild</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.framesStrip}
              >
                {frames.map((frame, index) => {
                  const isSelected = selectedFrameIndex === index;
                  return (
                    <TouchableOpacity
                      key={frame.time}
                      onPress={() => handleSelectFrame(index)}
                      activeOpacity={0.7}
                      style={[
                        styles.frameThumb,
                        isSelected && styles.frameThumbSelected,
                      ]}
                    >
                      <Image
                        source={{ uri: frame.uri }}
                        style={styles.frameImage}
                        contentFit="cover"
                        transition={100}
                      />
                      {isSelected && (
                        <View style={styles.frameCheck}>
                          <Icon
                            name="checkmark.circle.fill"
                            size={18}
                            tintColor={colors.white}
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      )}

      {/* Upload Mode */}
      {mode === "upload" && (
        <View style={styles.uploadSection}>
          {selectedThumbnailUri ? (
            <View style={styles.uploadPreviewWrap}>
              <Image
                source={{ uri: selectedThumbnailUri }}
                style={styles.uploadPreview}
                contentFit="cover"
                transition={150}
              />
              <TouchableOpacity
                style={styles.uploadOverlayBtn}
                onPress={handlePickFromGallery}
                disabled={pickingImage}
                activeOpacity={0.7}
              >
                <Icon name="arrow.triangle.2.circlepath" size={14} tintColor={colors.white} />
                <Text style={styles.uploadOverlayText}>Ändern</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handlePickFromGallery}
              disabled={pickingImage}
              activeOpacity={0.7}
            >
              {pickingImage ? (
                <ActivityIndicator size="small" color={colors.gray400} />
              ) : (
                <>
                  <Icon name="photo.badge.plus" size={24} tintColor={colors.gray400} />
                  <Text style={styles.uploadBtnText}>Bild aus Galerie wählen</Text>
                  <Text style={styles.uploadBtnHint}>9:16 Format empfohlen</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  removeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E53935",
  },
  // Mode toggle
  modeRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    borderCurve: "continuous",
  },
  modeBtnActive: {
    backgroundColor: colors.black,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
  },
  modeBtnTextActive: {
    color: colors.white,
  },
  // Frames
  framesSection: {
    gap: 8,
  },
  hint: {
    fontSize: 12,
    color: colors.gray400,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 13,
    color: colors.gray400,
  },
  emptyText: {
    fontSize: 13,
    color: colors.gray400,
    textAlign: "center",
    paddingVertical: 16,
  },
  framesStrip: {
    gap: 6,
    paddingVertical: 4,
  },
  frameThumb: {
    width: FRAME_SIZE,
    height: FRAME_SIZE * (16 / 9),
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    borderCurve: "continuous",
  },
  frameThumbSelected: {
    borderColor: colors.black,
  },
  frameImage: {
    width: "100%",
    height: "100%",
  },
  frameCheck: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Upload
  uploadSection: {
    gap: 8,
  },
  uploadBtn: {
    borderRadius: 12,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 28,
    borderCurve: "continuous",
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray500,
  },
  uploadBtnHint: {
    fontSize: 12,
    color: colors.gray400,
  },
  uploadPreviewWrap: {
    borderRadius: 12,
    overflow: "hidden",
    borderCurve: "continuous",
    position: "relative",
  },
  uploadPreview: {
    width: "100%",
    height: 180,
    borderRadius: 12,
  },
  uploadOverlayBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  uploadOverlayText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
  },
});
