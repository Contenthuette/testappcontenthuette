import { router } from "expo-router";

/**
 * Fallback map: screen path segment → target route.
 * Only used when there is no navigation history to go back to.
 */
const FALLBACK_ROUTES: Record<string, string> = {
  "feed-loop": "/(main)/(tabs)/feed",
  "group-detail": "/(main)/(tabs)/groups",
  "group-chat": "/(main)/(tabs)/groups",
  "create-group": "/(main)/(tabs)/groups",
  "edit-group": "/(main)/(tabs)/groups",
  "event-detail": "/(main)/(tabs)/events",
  "ticket": "/(main)/(tabs)/events",
  "my-tickets": "/(main)/(tabs)/events",
  "member-event-detail": "/(main)/(tabs)/events",
  "chat": "/(main)/(tabs)/groups",
  "conversations": "/(main)/(tabs)/groups",
  "settings": "/(main)/(tabs)/profile",
  "edit-profile": "/(main)/(tabs)/profile",
  "change-password": "/(main)/(tabs)/profile",
  "saved-posts": "/(main)/(tabs)/profile",
  "blocked-users": "/(main)/(tabs)/profile",
  "subscription": "/(main)/(tabs)/profile",
  "notification-settings": "/(main)/(tabs)/profile",
  "legal": "/(main)/(tabs)/profile",
  "privacy-center": "/(main)/(tabs)/profile",
  "create-post": "/(main)/(tabs)/feed",
  "create-poll": "/(main)/(tabs)/feed",
  "post-comments": "/(main)/(tabs)/feed",
  "post-detail": "/(main)/(tabs)/feed",
  "notifications": "/(main)/(tabs)/groups",
  "search": "/(main)/(tabs)/groups",
  "user-profile": "/(main)/(tabs)/groups",
  "partner-detail": "/(main)/(tabs)/events",
  "filters": "/(main)/(tabs)/groups",
  "go-live": "/(main)/(tabs)/groups",
  "watch-stream": "/(main)/(tabs)/groups",
  "friends-list": "/(main)/(tabs)/profile",
  "groups-list": "/(main)/(tabs)/profile",
  "admin": "/(main)/(tabs)/profile",
  "admin-login": "/(main)/(tabs)/profile",
  "admin-event-form": "/(main)/admin",
  "admin-partner-form": "/(main)/admin",
  "create-member-event": "/(main)/(tabs)/events",
  "edit-member-event": "/(main)/(tabs)/events",
  "call": "/(main)/(tabs)/groups",

  // Auth
  "login": "/(auth)/welcome",
  "signup": "/(auth)/welcome",
  "forgot-password": "/(auth)/login",
};

/**
 * Navigate back using the real navigation history.
 * Falls back to a sensible default route only when there is no history.
 */
export function safeBack(screenName?: string) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  // No history — use fallback
  const fallback = screenName ? FALLBACK_ROUTES[screenName] : undefined;
  const target = fallback ?? "/(main)/(tabs)/groups";

  try {
    router.navigate(target as "/");
  } catch {
    router.replace("/(main)/(tabs)/groups" as "/");
  }
}
