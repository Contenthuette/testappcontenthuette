import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import * as VideoThumbnails from "expo-video-thumbnails";
import Icon from "@/components/Icon";
import { colors, spacing, radius } from "@/lib/theme";
import { pickImage } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";

const THUMB_COUNT = 8;
const THUMB_SIZE = 56;

interface ThumbnailPickerProps {
  videoUri: string;
  videoDuration?: number; // seconds
  onThumbnailSelected: (uri: string, isCustom: boolean) => void;
  selectedThumbnailUri?: string | null;
}

export function ThumbnailPicker({
  videoUri,
  videoDuration,
  onThumbnailSelected,
  selectedThumbnailUri,
}: ThumbnailPickerProps) {
  const [frames, setFrames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCustomPhoto, setIsCustomPhoto] = useState(false);
  const [customPhotoUri, setCustomPhotoUri] = useState<string | null>(null);
  const extractedRef = useRef(false);

  // Extract frames at evenly spaced intervals
  const extractFrames = useCallback(async () => {
    if (extractedRef.current) return;
    extractedRef.current = true;
    setLoading(true);

    const dur = videoDuration ?? 10; // default guess 10s
    const interval = (dur * 1000) / (THUMB_COUNT + 1);
    const extracted: string[] = [];

    for (let i = 1; i <= THUMB_COUNT; i++) {
      const timeMs = Math.round(interval * i);
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: timeMs,
          quality: 0.5,
        });
        extracted.push(uri);
      } catch {
        // Some frames may fail, skip
      }
    }

    // Fallback: at least get frame at 0
    if (extracted.length === 0) {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: 100,
          quality: 0.5,
        });
        extracted.push(uri);
      } catch {
        // nothing we can do
      }
    }

    setFrames(extracted);
    setLoading(false);

    // Auto-select first frame
    if (extracted.length > 0 && !selectedThumbnailUri) {
      onThumbnailSelected(extracted[0], false);
    }
  }, [videoUri, videoDuration, onThumbnailSelected, selectedThumbnailUri]);

  useEffect(() => {
    extractFrames();
  }, [extractFrames]);

  const handleSelectFrame = (index: number) => {
    setSelectedIndex(index);
    setIsCustomPhoto(false);
    setCustomPhotoUri(null);
    onThumbnailSelected(frames[index], false);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePickCustomPhoto = async () => {
    const result = await pickImage({ quality: 0.8, allowsEditing: true });
    if (result) {
      setIsCustomPhoto(true);
      setCustomPhotoUri(result.uri);
      setSelectedIndex(-1);
      onThumbnailSelected(result.uri, true);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={colors.gray400} />
        <Text style={styles.loadingText}>Thumbnails werden generiert...</Text>
      </View>
    );
  }

  if (frames.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingText}>Keine Vorschau verfügbar</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Icon name="photo.on.rectangle" size={14} tintColor={colors.gray500} />
        <Text style={styles.label}>Thumbnail wählen</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Custom photo upload button */}
        <TouchableOpacity
          style={[
            styles.thumbBtn,
            styles.uploadBtn,
            isCustomPhoto && styles.thumbSelected,
          ]}
          onPress={handlePickCustomPhoto}
          activeOpacity={0.7}
        >
          {customPhotoUri ? (
            <Image
              source={{ uri: customPhotoUri }}
              style={styles.thumbImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.uploadInner}>
              <Icon name="photo.badge.plus" size={18} tintColor={colors.gray500} />
              <Text style={styles.uploadText}>Foto</Text>
            </View>
          )}
          {isCustomPhoto && <View style={styles.checkBadge}>
            <Icon name="checkmark" size={10} tintColor={colors.white} />
          </View>}
        </TouchableOpacity>

        {/* Frame thumbnails */}
        {frames.map((uri, index) => (
          <TouchableOpacity
            key={`frame-${index}`}
            style={[
              styles.thumbBtn,
              !isCustomPhoto && selectedIndex === index && styles.thumbSelected,
            ]}
            onPress={() => handleSelectFrame(index)}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri }}
              style={styles.thumbImage}
              contentFit="cover"
              transition={150}
            />
            {!isCustomPhoto && selectedIndex === index && (
              <View style={styles.checkBadge}>
                <Icon name="checkmark" size={10} tintColor={colors.white} />
              </View>
            )}
            <View style={styles.timeStamp}>
              <Text style={styles.timeText}>
                {formatFrameTime(index, frames.length, videoDuration ?? 10)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function formatFrameTime(index: number, total: number, duration: number): string {
  const time = ((index + 1) / (total + 1)) * duration;
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 13,
    color: colors.gray400,
  },
  scrollContent: {
    gap: 8,
    paddingRight: 4,
  },
  thumbBtn: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    borderCurve: "continuous",
  },
  thumbSelected: {
    borderColor: colors.black,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  uploadBtn: {
    backgroundColor: colors.gray100,
  },
  uploadInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  uploadText: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.gray500,
  },
  checkBadge: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  timeStamp: {
    position: "absolute",
    bottom: 2,
    left: 2,
    right: 2,
    alignItems: "center",
  },
  timeText: {
    fontSize: 8,
    fontWeight: "700",
    color: colors.white,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
