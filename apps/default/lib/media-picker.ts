import { Platform, Alert } from "react-native";

/**
 * Cross-platform media picker using expo-image-picker.
 * Handles permissions, selection, and error states.
 */

interface PickMediaOptions {
  /** "image" | "video" | "both" */
  type?: "image" | "video" | "both";
  /** Allow editing/cropping */
  allowsEditing?: boolean;
  /** Quality 0-1 */
  quality?: number;
  /** Aspect ratio for editing */
  aspect?: [number, number];
}

interface PickedMedia {
  uri: string;
  type: "image" | "video";
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  fileName?: string;
}

/**
 * Pick media from the device library.
 * Returns null if the user cancels.
 */
export async function pickMedia(
  options: PickMediaOptions = {}
): Promise<PickedMedia | null> {
  try {
    const ImagePicker = await import("expo-image-picker");

    // Request permission
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      if (Platform.OS !== "web") {
        Alert.alert(
          "Berechtigung benötigt",
          "Bitte erlaube den Zugriff auf deine Fotos in den Einstellungen."
        );
      }
      return null;
    }

    const mediaTypes =
      options.type === "video"
        ? ImagePicker.MediaTypeOptions.Videos
        : options.type === "both"
          ? ImagePicker.MediaTypeOptions.All
          : ImagePicker.MediaTypeOptions.Images;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: options.allowsEditing ?? true,
      quality: options.quality ?? 0.8,
      aspect: options.aspect,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const isVideo = asset.type === "video";

    return {
      uri: asset.uri,
      type: isVideo ? "video" : "image",
      mimeType: asset.mimeType ?? (isVideo ? "video/mp4" : "image/jpeg"),
      width: asset.width,
      height: asset.height,
      duration: asset.duration ?? undefined,
      fileName: asset.fileName ?? undefined,
    };
  } catch (error) {
    console.error("Media picker error:", error);
    if (Platform.OS !== "web") {
      Alert.alert("Fehler", "Medien konnten nicht geladen werden.");
    }
    return null;
  }
}

/**
 * Upload a picked media file to Convex file storage.
 * Returns the storageId on success, null on failure.
 */
export async function uploadMedia(
  uploadUrl: string,
  media: PickedMedia
): Promise<string | null> {
  try {
    const response = await fetch(media.uri);
    const blob = await response.blob();

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": media.mimeType },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const result = (await uploadResponse.json()) as { storageId: string };
    return result.storageId;
  } catch (error) {
    console.error("Upload error:", error);
    if (Platform.OS !== "web") {
      Alert.alert("Upload fehlgeschlagen", "Das Medium konnte nicht hochgeladen werden. Bitte versuche es erneut.");
    }
    return null;
  }
}
