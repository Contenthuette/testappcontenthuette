/**
 * Cross-platform media picker using react-native-webview for gallery
 * and native browser for file selection.
 * Falls back gracefully when expo-image-picker is not available.
 */
import { Platform, Alert } from "react-native";

export interface MediaPickerResult {
  uri: string;
  mimeType: string;
  fileName: string;
  fileSize?: number;
}

export type MediaType = "images" | "videos" | "all";

interface PickerOptions {
  mediaType?: MediaType;
  quality?: number;
  allowsEditing?: boolean;
}

let ImagePicker: typeof import("expo-image-picker") | null = null;

try {
  ImagePicker = require("expo-image-picker");
} catch {
  ImagePicker = null;
}

function getMimeAccept(mediaType: MediaType): string {
  switch (mediaType) {
    case "images":
      return "image/*";
    case "videos":
      return "video/*";
    case "all":
      return "image/*,video/*";
  }
}

function getMediaTypeFilter(mediaType: MediaType) {
  if (!ImagePicker) return undefined;
  switch (mediaType) {
    case "images":
      return ImagePicker.MediaTypeOptions.Images;
    case "videos":
      return ImagePicker.MediaTypeOptions.Videos;
    case "all":
      return ImagePicker.MediaTypeOptions.All;
  }
}

async function requestPermission(): Promise<boolean> {
  if (!ImagePicker) return true;
  if (Platform.OS === "web") return true;

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Berechtigung erforderlich",
      "Bitte erlaube den Zugriff auf deine Mediathek in den Einstellungen."
    );
    return false;
  }
  return true;
}

async function pickWithExpoImagePicker(
  options: PickerOptions
): Promise<MediaPickerResult | null> {
  if (!ImagePicker) return null;

  const hasPermission = await requestPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: getMediaTypeFilter(options.mediaType ?? "all"),
    allowsEditing: options.allowsEditing ?? false,
    quality: options.quality ?? 0.8,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const uri = asset.uri;
  const mimeType = asset.mimeType ?? (options.mediaType === "videos" ? "video/mp4" : "image/jpeg");
  const fileName = asset.fileName ?? `media_${Date.now()}.${mimeType.split("/")[1] ?? "jpg"}`;

  return {
    uri,
    mimeType,
    fileName,
    fileSize: asset.fileSize,
  };
}

async function pickWithWebInput(
  options: PickerOptions
): Promise<MediaPickerResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = getMimeAccept(options.mediaType ?? "all");
    input.style.display = "none";

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const uri = URL.createObjectURL(file);
      resolve({
        uri,
        mimeType: file.type || "application/octet-stream",
        fileName: file.name,
        fileSize: file.size,
      });
    };

    input.oncancel = () => resolve(null);
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

export async function pickMedia(
  options: PickerOptions = {}
): Promise<MediaPickerResult | null> {
  try {
    if (Platform.OS === "web") {
      return await pickWithWebInput(options);
    }

    if (ImagePicker) {
      return await pickWithExpoImagePicker(options);
    }

    // Fallback: web input on all platforms
    return await pickWithWebInput(options);
  } catch (error) {
    console.error("Media picker error:", error);
    Alert.alert("Fehler", "Medienauswahl fehlgeschlagen. Bitte versuche es erneut.");
    return null;
  }
}

export async function pickImage(
  options: Omit<PickerOptions, "mediaType"> = {}
): Promise<MediaPickerResult | null> {
  return pickMedia({ ...options, mediaType: "images" });
}

export async function pickVideo(
  options: Omit<PickerOptions, "mediaType"> = {}
): Promise<MediaPickerResult | null> {
  return pickMedia({ ...options, mediaType: "videos" });
}

/**
 * Upload a picked file to Convex storage.
 * @param uploadUrl - The signed upload URL from generateUploadUrl mutation
 * @param fileUri - The local file URI
 * @param mimeType - The MIME type of the file
 * @returns The storage ID string
 */
export async function uploadToConvex(
  uploadUrl: string,
  fileUri: string,
  mimeType: string
): Promise<string> {
  let body: Blob | FormData;

  if (Platform.OS === "web") {
    const response = await fetch(fileUri);
    body = await response.blob();
  } else {
    // React Native: use FormData approach
    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      type: mimeType,
      name: `upload.${mimeType.split("/")[1] ?? "bin"}`,
    } as unknown as Blob);
    body = formData;
  }

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers:
      Platform.OS === "web" ? { "Content-Type": mimeType } : undefined,
    body,
  });

  if (!response.ok) {
    throw new Error(`Upload fehlgeschlagen (${response.status})`);
  }

  const result = await response.json();
  return result.storageId;
}
