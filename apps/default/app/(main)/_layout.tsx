import { Stack } from "expo-router";

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="group-detail" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="group-chat" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="create-group" options={{ presentation: "modal" }} />
      <Stack.Screen name="event-detail" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="ticket" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="partner-detail" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="chat" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="conversations" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="edit-profile" options={{ presentation: "modal" }} />
      <Stack.Screen name="saved-posts" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="blocked-users" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="subscription" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="user-profile" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="create-post" options={{ presentation: "modal" }} />
      <Stack.Screen name="post-comments" options={{ presentation: "formSheet", sheetGrabberVisible: true, sheetAllowedDetents: [0.7, 1.0] }} />
      <Stack.Screen name="search" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="my-tickets" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="legal" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
