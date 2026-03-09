import { router } from "expo-router";

/**
 * Fallback map: screen path → safe parent route
 * Used when router.back() has nowhere to go.
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
 * Navigate back safely. If we can go back, do it.
 * Otherwise use the fallback route for this screen.
 */
export function safeBack(screenName?: string) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  // Try to find fallback by screen name
  if (screenName && FALLBACK_ROUTES[screenName]) {
    router.replace(FALLBACK_ROUTES[screenName] as "/");
    return;
  }

  // Last resort — go to home
  router.replace("/(main)/(tabs)/groups" as "/");
}
