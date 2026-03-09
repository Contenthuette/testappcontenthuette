declare module "expo-image-picker" {
  export const MediaTypeOptions: {
    Images: string;
    Videos: string;
    All: string;
  };

  export interface ImagePickerResult {
    canceled: boolean;
    assets?: Array<{
      uri: string;
      mimeType?: string;
      fileName?: string;
      fileSize?: number;
      width?: number;
      height?: number;
    }>;
  }

  export interface ImagePickerOptions {
    mediaTypes?: string;
    allowsEditing?: boolean;
    quality?: number;
    aspect?: [number, number];
  }

  export function launchImageLibraryAsync(
    options?: ImagePickerOptions
  ): Promise<ImagePickerResult>;

  export function requestMediaLibraryPermissionsAsync(): Promise<{
    status: string;
    granted: boolean;
  }>;
}
