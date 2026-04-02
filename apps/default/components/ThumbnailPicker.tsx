import React, { useState, useCallback, useEffect, useRef } from "react";
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

const FRAME_COUNT = 8;
const FRAME_SIZE = 52;

// Simple helper: try to get a thumbnail, return null on failure
async function tryGetThumbnail(
  uri: string,
  timeMs: number,
): Promise<string | null> {
  try {
    // Dynamic import to handle potential native module issues
    const VideoThumbnails = await import("expo-video-thumbnails");
    const result = await VideoThumbnails.getThumbnailAsync(uri, {
      time: timeMs,
      quality: 0.6,
    });
    return result?.uri ?? null;
  } catch {
    return null;
  }
}

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
  const [extractError, setExtractError] = useState(false);
  const attemptRef = useRef(0);

  // Extract frames from video
  useEffect(() => {
    if (!videoUri) return;
    const attempt = ++attemptRef.current;

    const extractFrames = async () => {
      setLoadingFrames(true);
      setFrames([]);
      setSelectedFrameIndex(null);
      setExtractError(false);

      // Wait a bit for the video to be ready on disk
      await new Promise((r) => setTimeout(r, 800));
      if (attempt !== attemptRef.current) return;

      const duration = videoDuration && videoDuration > 0 ? videoDuration : 10;
      const totalMs = duration * 1000;
      const extracted: FrameData[] = [];

      // Try a quick test frame first at time 0
      const testUri = await tryGetThumbnail(videoUri, 0);
      if (attempt !== attemptRef.current) return;

      if (!testUri) {
        // Can't extract thumbnails from this video at all
        setLoadingFrames(false);
        setExtractError(true);
        return;
      }

      extracted.push({ uri: testUri, time: 0 });

      // Now extract more frames
      for (let i = 1; i < FRAME_COUNT; i++) {
        if (attempt !== attemptRef.current) return;
        const fraction = (i) / (FRAME_COUNT - 1);
        const timeMs = Math.min(Math.round(totalMs * fraction), totalMs - 100);

        const uri = await tryGetThumbnail(videoUri, timeMs);
        if (uri && attempt === attemptRef.current) {
          extracted.push({ uri, time: timeMs });
        }
      }

      if (attempt === attemptRef.current) {
        setFrames(extracted);
        setLoadingFrames(false);
        if (extracted.length === 0) {
          setExtractError(true);
        }
      }
    };

    extractFrames();
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
        <Text style={styles.label}>TITELBILD</Text>
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
            name="film"
            size={14}
            tintColor={mode === "frames" ? colors.white : colors.gray500}
          />
          <Text
            style={[styles.modeBtnText, mode === "frames" && styles.modeBtnTextActive]}
          >
            Aus Video
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "upload" && styles.modeBtnActive]}
          onPress={() => {
            setMode("upload");
            if (!selectedThumbnailUri) {
              handlePickFromGallery();
            }
          }}
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
          ) : extractError || frames.length === 0 ? (
            <View style={styles.emptyFrames}>
              <Icon name="film" size={24} tintColor={colors.gray300} />
              <Text style={styles.emptyText}>Frames konnten nicht geladen werden</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setExtractError(false);
                  setLoadingFrames(true);
                  // Trigger re-extract by toggling
                  setFrames([]);
                }}
              >
                <Text style={styles.retryText}>Nochmal versuchen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.framesStrip}
            >
              {frames.map((frame, index) => {
                const isSelected = selectedFrameIndex === index;
                return (
                  <TouchableOpacity
                    key={`frame-${frame.time}`}
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
                <Text style={styles.uploadOverlayText}>{"\u00c4ndern"}</Text>
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
                  <Text style={styles.uploadBtnText}>{"Bild aus Galerie w\u00e4hlen"}</Text>
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
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.gray400,
    letterSpacing: 0.8,
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
    minHeight: 80,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 13,
    color: colors.gray400,
  },
  emptyFrames: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.gray400,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.gray100,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.black,
  },
  framesStrip: {
    gap: 6,
    paddingVertical: 4,
  },
  frameThumb: {
    width: FRAME_SIZE,
    height: Math.round(FRAME_SIZE * (16 / 9)),
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
    bottom: 3,
    right: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
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
    paddingVertical: 24,
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
    height: 160,
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
