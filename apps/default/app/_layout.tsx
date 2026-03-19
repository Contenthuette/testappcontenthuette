import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { ConvexAuthProvider } from "@/lib/ConvexAuthProvider";
import { StatusBar } from "expo-status-bar";
import { CallProvider } from "@/components/CallProvider";
import { SoundProvider } from "@/lib/sounds";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  return (
    <ConvexAuthProvider client={convex}>
      <StatusBar style="dark" />
      <SoundProvider>
        <CallProvider>
          <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)" />
            <Stack.Screen name="(admin)" />
          </Stack>
        </CallProvider>
      </SoundProvider>
    </ConvexAuthProvider>
  );
}
