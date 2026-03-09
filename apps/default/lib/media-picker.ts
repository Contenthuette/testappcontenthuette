import { Platform, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

export interface MediaResult {
  uri: string;
  type: "image" | "video";
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
}

async function ensurePermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    if (Platform.OS !== "web") {
      Alert.alert(
        "Zugriff benötigt",
        "Bitte erlaube den Zugriff auf deine Fotos in den Einstellungen."
      );
    }
    return false;
  }
  return true;
}

export async function pickImage(): Promise<MediaResult | null> {
  const ok = await ensurePermission();
  if (!ok) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    type: "image",
    mimeType: asset.mimeType ?? "image/jpeg",
    width: asset.width,
    height: asset.height,
  };
}

export async function pickVideo(): Promise<MediaResult | null> {
  const ok = await ensurePermission();
  if (!ok) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    allowsEditing: true,
    quality: 0.7,
    videoMaxDuration: 120,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    type: "video",
    mimeType: asset.mimeType ?? "video/mp4",
    width: asset.width,
    height: asset.height,
    duration: asset.duration ?? undefined,
  };
}

export async function uploadToConvex(
  generateUrl: () => Promise<string>,
  uri: string,
  mimeType: string
): Promise<string> {
  const uploadUrl = await generateUrl();
  const response = await fetch(uri);
  const blob = await response.blob();
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": mimeType },
    body: blob,
  });
  if (!uploadResponse.ok) {
    throw new Error("Upload fehlgeschlagen");
  }
  const { storageId } = (await uploadResponse.json()) as { storageId: string };
  return storageId;
}
