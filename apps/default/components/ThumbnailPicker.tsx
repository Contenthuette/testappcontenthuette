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
import Icon from "@/components/Icon";
import { colors, spacing } from "@/lib/theme";
import { pickImage } from "@/lib/media-picker";
import * as Haptics from "expo-haptics";

interface ThumbnailResult {
  uri: string;
  width: number;
  height: number;
}

interface ThumbnailOptions {
  time: number;
  quality?: number;
}

let VideoThumbnails: {
  getThumbnailAsync: (uri: string, opts: ThumbnailOptions) => Promise<ThumbnailResult>;
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  VideoThumbnails = require("expo-video-thumbnails") as typeof VideoThumbnails;
} catch {
  // not available
}

const THUMB_COUNT = 8;
const THUMB_SIZE = 60;

interface ThumbnailPickerProps {
  videoUri: string;
  videoDuration?: number;
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
  const currentVideoUri = useRef(videoUri);

  // Reset when video changes
  useEffect(() => {
    if (currentVideoUri.current !== videoUri) {
      currentVideoUri.current = videoUri;
      extractedRef.current = false;
      setFrames([]);
      setSelectedIndex(0);
      setIsCustomPhoto(false);
      setCustomPhotoUri(null);
      setLoading(true);
    }
  }, [videoUri]);

  const extractFrames = useCallback(async () => {
    if (extractedRef.current) return;
    if (!VideoThumbnails) {
      setLoading(false);
      return;
    }
    extractedRef.current = true;
    setLoading(true);

    const dur = videoDuration ?? 10;
    const interval = (dur * 1000) / (THUMB_COUNT + 1);
    const extracted: string[] = [];

    // Extract frames sequentially with error resilience
    for (let i = 1; i <= THUMB_COUNT; i++) {
      const timeMs = Math.round(interval * i);
      try {
        const result = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: timeMs,
          quality: 0.4,
        });
        if (result?.uri) extracted.push(result.uri);
      } catch {
        // Frame extraction can fail for certain timestamps, skip
      }
    }

    // Fallback: try very beginning
    if (extracted.length === 0) {
      try {
        const result = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: 100,
          quality: 0.4,
        });
        if (result?.uri) extracted.push(result.uri);
      } catch {
        // nothing we can do
      }
    }

    setFrames(extracted);
    setLoading(false);

    // Auto-select first frame as thumbnail
    if (extracted.length > 0 && !selectedThumbnailUri) {
      onThumbnailSelected(extracted[0], false);
    }
  }, [videoUri, videoDuration, onThumbnailSelected, selectedThumbnailUri]);

  useEffect(() => {
    extractFrames();
  }, [extractFrames]);

  const handleSelectFrame = useCallback(
    (index: number) => {
      if (index < 0 || index >= frames.length) return;
      setSelectedIndex(index);
      setIsCustomPhoto(false);
      onThumbnailSelected(frames[index], false);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [frames, onThumbnailSelected],
  );

  const handlePickCustomPhoto = useCallback(async () => {
    try {
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
    } catch (e) {
      console.warn("Custom thumbnail pick failed:", e);
    }
  }, [onThumbnailSelected]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={colors.gray400} />
        <Text style={styles.loadingText}>Thumbnails werden generiert...</Text>
      </View>
    );
  }

  if (frames.length === 0 && !VideoThumbnails) {
    return (
      <View style={styles.container}>
        <View style={styles.labelRow}>
          <Icon name="photo.on.rectangle" size={14} tintColor={colors.gray500} />
          <Text style={styles.label}>Thumbnail</Text>
        </View>
        <TouchableOpacity
          style={[styles.uploadBtnLarge]}
          onPress={handlePickCustomPhoto}
          activeOpacity={0.7}
        >
          <Icon name="photo.badge.plus" size={20} tintColor={colors.gray500} />
          <Text style={styles.uploadTextLarge}>Eigenes Foto als Thumbnail hochladen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Icon name="photo.on.rectangle" size={14} tintColor={colors.gray500} />
        <Text style={styles.label}>Thumbnail waehlen</Text>
      </View>

      {/* Active thumbnail preview */}
      {(selectedThumbnailUri || (frames.length > 0 && !isCustomPhoto)) && (
        <View style={styles.activePreview}>
          <Image
            source={{ uri: selectedThumbnailUri ?? frames[selectedIndex] ?? frames[0] }}
            style={styles.activeImage}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.activeLabel}>
            <Icon name="checkmark.circle.fill" size={14} tintColor={colors.black} />
            <Text style={styles.activeLabelText}>
              {isCustomPhoto ? "Eigenes Foto" : `Frame ${selectedIndex + 1}`}
            </Text>
          </View>
        </View>
      )}

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
          {isCustomPhoto && (
            <View style={styles.checkBadge}>
              <Icon name="checkmark" size={10} tintColor={colors.white} />
            </View>
          )}
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
    marginTop: 16,
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

  // Active thumbnail preview
  activePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: 8,
    borderCurve: "continuous",
  },
  activeImage: {
    width: 48,
    height: 36,
    borderRadius: 8,
    borderCurve: "continuous",
  },
  activeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeLabelText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.black,
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
  uploadBtnLarge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    borderCurve: "continuous",
  },
  uploadTextLarge: {
    fontSize: 14,
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
