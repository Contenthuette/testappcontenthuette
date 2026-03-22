import { Stack, Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useConvexAuth } from "convex/react";
import { colors } from "@/lib/theme";

export default function MainLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.gray400} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="group-detail" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="group-chat" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="create-group" options={{ presentation: "modal" }} />
      <Stack.Screen name="edit-group" options={{ animation: "slide_from_right" }} />
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
      <Stack.Screen name="post-comments" options={{ animation: "slide_from_bottom", headerShown: false }} />
      <Stack.Screen name="search" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="my-tickets" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="legal" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin-login" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="admin-event-form" options={{ presentation: "modal" }} />
      <Stack.Screen name="call" options={{ animation: "fade", headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
