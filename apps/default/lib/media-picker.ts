import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

interface ManipulateResult {
  uri: string;
  width: number;
  height: number;
}

let ImageManipulator: {
  manipulateAsync: (
    uri: string,
    actions: Array<{ resize?: { width?: number; height?: number } }>,
    opts: { compress?: number; format?: string },
  ) => Promise<ManipulateResult>;
  SaveFormat: { JPEG: string };
} | null = null;

try {
  ImageManipulator = require("expo-image-manipulator") as typeof ImageManipulator;
} catch {
  // not available
}

export type MediaType = "images" | "videos" | "all";

interface PickerOptions {
  mediaType?: MediaType;
  quality?: number;
  allowsEditing?: boolean;
  aspect?: [number, number];
}

export interface PickerResult {
  uri: string;
  mimeType: string;
  fileName: string;
  width: number;
  height: number;
  duration?: number;
  fileSize?: number;
}

export const MEDIA_UPLOAD_LIMITS = {
  maxImageDimension: 1_920,
  maxVideoDurationMs: 90_000,
} as const;

function getMediaType(mediaType: MediaType): ImagePicker.MediaType[] {
  switch (mediaType) {
    case "images":
      return ["images"];
    case "videos":
      return ["videos"];
    default:
      return ["images", "videos"];
  }
}

interface PickerAssetWithFileSize {
  uri: string;
  mimeType?: string;
  fileName?: string | null;
  width: number;
  height: number;
  duration?: number | null;
  fileSize?: number;
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === "web") return true;

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Zugriff verweigert",
      "Bitte erlaube den Zugriff auf deine Mediathek in den Einstellungen.",
    );
    return false;
  }

  return true;
}

async function compressImage(
  uri: string,
  maxDimension = MEDIA_UPLOAD_LIMITS.maxImageDimension,
): Promise<{ uri: string; width: number; height: number }> {
  if (!ImageManipulator) return { uri, width: 0, height: 0 };

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxDimension } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  } catch {
    return { uri, width: 0, height: 0 };
  }
}

function getVideoValidationError(asset: {
  duration?: number | null;
}): string | null {
  if (
    asset.duration !== undefined &&
    asset.duration !== null &&
    asset.duration > MEDIA_UPLOAD_LIMITS.maxVideoDurationMs
  ) {
    return "Videos dürfen aktuell maximal 90 Sekunden lang sein.";
  }

  return null;
}

export async function pickImage(opts?: PickerOptions): Promise<PickerResult | null> {
  const hasPermission = await ensurePermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: getMediaType(opts?.mediaType ?? "images"),
    allowsEditing: opts?.allowsEditing ?? false,
    quality: opts?.quality ?? 0.8,
    ...(opts?.aspect ? { aspect: opts.aspect } : {}),
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0] as PickerAssetWithFileSize;
  const fileSize = asset.fileSize;
  const needsCompression =
    asset.width > MEDIA_UPLOAD_LIMITS.maxImageDimension ||
    asset.height > MEDIA_UPLOAD_LIMITS.maxImageDimension;

  if (needsCompression) {
    const compressed = await compressImage(asset.uri);
    if (compressed.width > 0) {
      return {
        uri: compressed.uri,
        mimeType: "image/jpeg",
        fileName: asset.fileName ?? "photo.jpg",
        width: compressed.width,
        height: compressed.height,
        fileSize,
      };
    }
  }

  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? "image/jpeg",
    fileName: asset.fileName ?? "photo.jpg",
    width: asset.width,
    height: asset.height,
    fileSize,
  };
}

export async function pickVideo(opts?: PickerOptions): Promise<PickerResult | null> {
  const hasPermission = await ensurePermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    allowsEditing: opts?.allowsEditing ?? false,
    quality: opts?.quality ?? 0.5,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0] as PickerAssetWithFileSize;
  const validationError = getVideoValidationError({
    duration: asset.duration,
  });
  if (validationError) {
    Alert.alert("Video zu lang", validationError);
    return null;
  }

  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? "video/mp4",
    fileName: asset.fileName ?? "video.mp4",
    width: asset.width,
    height: asset.height,
    duration: asset.duration ?? undefined,
    fileSize: asset.fileSize,
  };
}

export async function uploadToConvex(
  uploadUrl: string,
  fileUri: string,
  mimeType: string,
): Promise<string> {
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error("Upload fehlgeschlagen");
  }

  const json = (await uploadResponse.json()) as { storageId: string };
  return json.storageId;
}
