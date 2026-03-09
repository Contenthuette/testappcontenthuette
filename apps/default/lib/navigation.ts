import { router, usePathname } from "expo-router";

/**
 * Fallback map: screen path segment → safe parent route.
 * When router.back() has nowhere to go, we push to this fallback.
 */
const FALLBACK_ROUTES: Record<string, string> = {
  // Groups
  "group-detail": "/(main)/(tabs)/groups",
  "group-chat": "/(main)/group-detail",
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
 * Otherwise use the fallback route for the given (or auto-detected) screen.
 */
export function safeBack(screenName?: string) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  // Auto-detect screen name from the current URL path
  const key = screenName ?? extractScreenName();
  if (key && FALLBACK_ROUTES[key]) {
    router.replace(FALLBACK_ROUTES[key] as "/");
    return;
  }

  // Absolute fallback
  router.replace("/(main)/(tabs)/groups" as "/");
}

/** Extract the last path segment from window.location or a best-effort guess */
function extractScreenName(): string | null {
  try {
    // In Expo Router, we can read the global navigation state
    // but the simplest cross-platform way is to inspect the pathname
    if (typeof window !== "undefined" && window.location?.pathname) {
      const segments = window.location.pathname.split("/").filter(Boolean);
      return segments[segments.length - 1] ?? null;
    }
  } catch {
    // Ignore on native where window may not exist
  }
  return null;
}
