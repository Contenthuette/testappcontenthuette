import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="users" />
      <Stack.Screen name="group-mgmt" />
      <Stack.Screen name="event-mgmt" />
      <Stack.Screen name="partner-mgmt" />
      <Stack.Screen name="moderation" />
      <Stack.Screen name="announcements" />
      <Stack.Screen name="analytics" />
    </Stack>
  );
}
