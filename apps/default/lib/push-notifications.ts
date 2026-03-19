import { Platform } from "react-native";
import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Dynamic imports for expo-notifications (native only)
interface PushTokenData {
  data: string;
}

interface PermissionResponse {
  status: string;
}

interface NotificationsModule {
  getPermissionsAsync: () => Promise<PermissionResponse>;
  requestPermissionsAsync: () => Promise<PermissionResponse>;
  getExpoPushTokenAsync: (opts?: { projectId?: string }) => Promise<PushTokenData>;
}

interface ConstantsModule {
  expoConfig?: { extra?: { eas?: { projectId?: string } } };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    const Notifications = require("expo-notifications") as NotificationsModule;
    const Constants = require("expo-constants") as { default: ConstantsModule };

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const projectId = Constants.default?.expoConfig?.extra?.eas?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined,
    });

    return tokenData.data;
  } catch (error) {
    console.warn("Push notification registration failed:", error);
    return null;
  }
}

export function usePushNotifications() {
  const recordToken = useMutation(api.pushNotifications.recordToken);
  const hasRegistered = useRef(false);

  useEffect(() => {
    if (hasRegistered.current) return;
    if (Platform.OS === "web") return;

    hasRegistered.current = true;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        recordToken({ pushToken: token }).catch(console.warn);
      }
    });
  }, [recordToken]);
}
