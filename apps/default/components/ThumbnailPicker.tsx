import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
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

export function ThumbnailPicker({
  videoUri,
  onThumbnailSelected,
  selectedThumbnailUri,
}: ThumbnailPickerProps) {
  const [defaultThumb, setDefaultThumb] = useState<string | null>(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const attemptRef = useRef(0);

  // Auto-extract first frame as default thumbnail
  useEffect(() => {
    if (!videoUri) return;
    const attempt = ++attemptRef.current;

    const extract = async () => {
      await new Promise((r) => setTimeout(r, 600));
      if (attempt !== attemptRef.current) return;

      try {
        const VideoThumbnails = await import("expo-video-thumbnails");
        const result = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: 0,
          quality: 0.7,
        });
        if (result?.uri && attempt === attemptRef.current) {
          setDefaultThumb(result.uri);
          // Only auto-select if user hasn't picked a custom one
          if (!isCustom) {
            onThumbnailSelected(result.uri, false);
          }
        }
      } catch (e) {
        console.warn("Auto-thumbnail extraction failed:", e);
      }
    };

    extract();
  }, [videoUri]);

  const handlePickFromGallery = useCallback(async () => {
    setPickingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]) {
        setIsCustom(true);
        onThumbnailSelected(result.assets[0].uri, true);
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

  const handleReset = useCallback(() => {
    setIsCustom(false);
    if (defaultThumb) {
      onThumbnailSelected(defaultThumb, false);
    } else {
      onThumbnailSelected("", false);
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [defaultThumb, onThumbnailSelected]);

  const displayUri = isCustom ? selectedThumbnailUri : defaultThumb;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>TITELBILD</Text>
        {isCustom && (
          <TouchableOpacity onPress={handleReset} hitSlop={12}>
            <Text style={styles.resetText}>Zurücksetzen</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.row}>
        {/* Preview */}
        <View style={styles.previewWrap}>
          {displayUri ? (
            <Image
              source={{ uri: displayUri }}
              style={styles.previewImage}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={styles.previewPlaceholder}>
              <ActivityIndicator size="small" color={colors.gray300} />
            </View>
          )}
          {isCustom && (
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>Eigenes</Text>
            </View>
          )}
        </View>

        {/* Upload button */}
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
              <Icon name="photo.badge.plus" size={20} tintColor={colors.gray500} />
              <Text style={styles.uploadBtnText}>Eigenes Titelbild</Text>
              <Text style={styles.uploadBtnHint}>9:16 empfohlen</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  resetText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  previewWrap: {
    width: 56,
    height: Math.round(56 * (16 / 9)),
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.gray100,
    borderCurve: "continuous",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  customBadge: {
    position: "absolute",
    bottom: 3,
    left: 3,
    right: 3,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 4,
    paddingVertical: 1,
    alignItems: "center",
  },
  customBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.3,
  },
  uploadBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 18,
    borderCurve: "continuous",
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
  },
  uploadBtnHint: {
    fontSize: 11,
    color: colors.gray400,
  },
});
