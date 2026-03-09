import * as ImagePicker from "expo-image-picker";
import { Platform, Alert } from "react-native";

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
