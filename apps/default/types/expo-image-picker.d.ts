declare module "expo-image-picker" {
  export type MediaType = "images" | "videos";
  export interface ImagePickerResult {
    canceled: boolean;
    assets?: Array<{
      uri: string;
      mimeType?: string;
      fileName?: string;
      width: number;
      height: number;
      duration?: number;
    }>;
  }
  export interface ImagePickerOptions {
    mediaTypes?: MediaType[];
    allowsEditing?: boolean;
    quality?: number;
    aspect?: [number, number];
  }
  export function launchImageLibraryAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
  export function requestMediaLibraryPermissionsAsync(): Promise<{ status: string }>;
}
