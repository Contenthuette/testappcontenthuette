import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Icon from "@/components/Icon";
import { colors, spacing, radius } from "@/lib/theme";

interface ThumbnailPickerProps {
  videoUri: string;
  videoDuration?: number;
  onThumbnailSelected: (uri: string, isCustom: boolean) => void;
  selectedThumbnailUri: string | null;
}

export function ThumbnailPicker({
  onThumbnailSelected,
  selectedThumbnailUri,
}: ThumbnailPickerProps) {
  const [picking, setPicking] = useState(false);
  const { width } = useWindowDimensions();
  const thumbWidth = width - spacing.lg * 2;
  const thumbHeight = thumbWidth / (3 / 4); // 3:4 aspect ratio

  const handlePickThumbnail = useCallback(async () => {
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [3, 4], // 3:4 crop
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        onThumbnailSelected(result.assets[0].uri, true);
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (e) {
      console.warn("Thumbnail pick failed:", e);
    } finally {
      setPicking(false);
    }
  }, [onThumbnailSelected]);

  const handleRemoveThumbnail = useCallback(() => {
    onThumbnailSelected("", false);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [onThumbnailSelected]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Thumbnail</Text>
      <Text style={styles.hint}>Lade ein Foto als Vorschaubild hoch (3:4 Format)</Text>

      {selectedThumbnailUri ? (
        <View style={styles.previewWrap}>
          <Image
            source={{ uri: selectedThumbnailUri }}
            style={[styles.preview, { width: thumbWidth, height: thumbHeight }]}
            contentFit="cover"
            transition={150}
          />
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={handleRemoveThumbnail}
            activeOpacity={0.7}
          >
            <Icon name="xmark.circle.fill" size={24} tintColor="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.pickBtn, { height: 80 }]}
          onPress={handlePickThumbnail}
          disabled={picking}
          activeOpacity={0.7}
        >
          {picking ? (
            <ActivityIndicator size="small" color={colors.gray400} />
          ) : (
            <>
              <Icon name="photo.badge.plus" size={24} tintColor={colors.gray400} />
              <Text style={styles.pickBtnText}>Thumbnail hochladen</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 12,
    color: colors.gray400,
  },
  previewWrap: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    borderCurve: "continuous",
  },
  preview: {
    borderRadius: 12,
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickBtn: {
    borderRadius: 12,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pickBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.gray500,
  },
});
