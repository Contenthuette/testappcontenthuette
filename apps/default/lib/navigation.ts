import { router } from "expo-router";

/**
 * Fallback map: screen path segment → safe parent route.
 * When router.back() has nowhere to go, we navigate to this fallback.
 */
const FALLBACK_ROUTES: Record<string, string> = {
  // Groups
  "group-detail": "/(main)/(tabs)/groups",
  "group-chat": "/(main)/(tabs)/groups",
  "create-group": "/(main)/(tabs)/groups",
  "edit-group": "/(main)/(tabs)/groups",

  // Events
  "event-detail": "/(main)/(tabs)/events",
  "ticket": "/(main)/my-tickets",
  "my-tickets": "/(main)/(tabs)/events",

  // Messages
  "chat": "/(main)/conversations",
  "conversations": "/(main)/(tabs)/groups",

  // Profile & Settings
  "settings": "/(main)/(tabs)/profile",
  "edit-profile": "/(main)/(tabs)/profile",
  "saved-posts": "/(main)/(tabs)/profile",
  "blocked-users": "/(main)/settings",
  "subscription": "/(main)/settings",
  "legal": "/(main)/settings",

  // Feed
  "create-post": "/(main)/(tabs)/feed",
  "post-comments": "/(main)/(tabs)/feed",

  // Other
  "notifications": "/(main)/(tabs)/groups",
  "search": "/(main)/(tabs)/groups",
  "user-profile": "/(main)/(tabs)/groups",
  "partner-detail": "/(main)/(tabs)/groups",
  "filters": "/(main)/(tabs)/groups",

  // Admin
  "dashboard": "/(main)/(tabs)/profile",
  "users": "/(admin)/dashboard",
  "group-mgmt": "/(admin)/dashboard",
  "event-mgmt": "/(admin)/dashboard",
  "partner-mgmt": "/(admin)/dashboard",
  "analytics": "/(admin)/dashboard",
  "moderation": "/(admin)/dashboard",
  "announcements": "/(admin)/dashboard",

  // Auth
  "login": "/(auth)/welcome",
  "signup": "/(auth)/welcome",
  "forgot-password": "/(auth)/login",
};

/**
 * Navigate back safely. If the router has history, go back.
 * Otherwise use the fallback route for the given screen.
 */
export function safeBack(screenName?: string) {
  try {
    if (router.canGoBack()) {
      router.back();
      return;
    }
  } catch {
    // router.back() failed, fall through to fallback
  }

  // Use fallback route
  const key = screenName;
  const fallback = key ? FALLBACK_ROUTES[key] : undefined;
  const target = fallback ?? "/(main)/(tabs)/groups";

  try {
    router.navigate(target as "/");
  } catch {
    // Last resort: hard navigate to home
    router.replace("/(main)/(tabs)/groups" as "/");
  }
}
