import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { getAuthBaseUrl } from "@/lib/convex-urls";

const configuredScheme = Constants.expoConfig?.scheme;
const appScheme =
  typeof configuredScheme === "string"
    ? configuredScheme
    : configuredScheme?.[0] ?? "z";

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  plugins: [
    anonymousClient(),
    ...(Platform.OS === "web"
      ? []
      : [
          expoClient({
            scheme: appScheme,
            storagePrefix: appScheme,
            storage: SecureStore,
          }),
        ]),
    convexClient(),
  ],
});
