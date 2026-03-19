import * as ImagePicker from "expo-image-picker";
import { Platform, Alert } from "react-native";

// expo-image-manipulator types
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

interface PickerResult {
  uri: string;
  mimeType: string;
  fileName: string;
  width: number;
  height: number;
  duration?: number; // milliseconds for videos
}

function getMediaType(t: MediaType): ImagePicker.MediaType[] {
  switch (t) {
    case "images":
      return ["images"];
    case "videos":
      return ["videos"];
    default:
      return ["images", "videos"];
  }
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === "web") return true;
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Zugriff verweigert",
      "Bitte erlaube den Zugriff auf deine Mediathek in den Einstellungen."
    );
    return false;
  }
  return true;
}

/** Compress image: resize down to max 1920px on longest side, quality 0.8 */
async function compressImage(uri: string, maxDimension = 1920): Promise<{ uri: string; width: number; height: number }> {
  if (!ImageManipulator) return { uri, width: 0, height: 0 };
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxDimension } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );
    return { uri: result.uri, width: result.width, height: result.height };
  } catch {
    return { uri, width: 0, height: 0 };
  }
}

export async function pickImage(opts?: PickerOptions): Promise<PickerResult | null> {
  const ok = await ensurePermission();
  if (!ok) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: getMediaType(opts?.mediaType ?? "images"),
    allowsEditing: opts?.allowsEditing ?? false,
    quality: opts?.quality ?? 0.8,
    ...(opts?.aspect ? { aspect: opts.aspect } : {}),
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];

  // Compress large images
  const needsCompress = asset.width > 1920 || asset.height > 1920;
  if (needsCompress) {
    const compressed = await compressImage(asset.uri, 1920);
    if (compressed.width > 0) {
      return {
        uri: compressed.uri,
        mimeType: "image/jpeg",
        fileName: asset.fileName ?? "photo.jpg",
        width: compressed.width,
        height: compressed.height,
      };
    }
  }

  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? "image/jpeg",
    fileName: asset.fileName ?? "photo.jpg",
    width: asset.width,
    height: asset.height,
  };
}

export async function pickVideo(opts?: PickerOptions): Promise<PickerResult | null> {
  const ok = await ensurePermission();
  if (!ok) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    allowsEditing: opts?.allowsEditing ?? false,
    quality: opts?.quality ?? 0.7,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? "video/mp4",
    fileName: asset.fileName ?? "video.mp4",
    width: asset.width,
    height: asset.height,
    duration: asset.duration ?? undefined,
  };
}

export async function uploadToConvex(
  uploadUrl: string,
  fileUri: string,
  mimeType: string
): Promise<string> {
  const resp = await fetch(fileUri);
  const blob = await resp.blob();
  const uploadResp = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: blob,
  });
  if (!uploadResp.ok) {
    throw new Error("Upload fehlgeschlagen");
  }
  const json = (await uploadResp.json()) as { storageId: string };
  return json.storageId;
}
