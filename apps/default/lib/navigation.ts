import { router } from "expo-router";

/**
 * Fallback map: screen path segment → target route.
 * Back buttons always navigate to the mapped route.
 */
const FALLBACK_ROUTES: Record<string, string> = {
  // All main sub-pages → Groups home
  "feed-loop": "/(main)/(tabs)/feed",
  "group-detail": "/(main)/(tabs)/groups",
  "group-chat": "/(main)/(tabs)/groups",
  "create-group": "/(main)/(tabs)/groups",
  "edit-group": "/(main)/(tabs)/groups",
  "event-detail": "/(main)/(tabs)/groups",
  "ticket": "/(main)/(tabs)/groups",
  "my-tickets": "/(main)/(tabs)/groups",
  "chat": "/(main)/(tabs)/groups",
  "conversations": "/(main)/(tabs)/groups",
  "settings": "/(main)/(tabs)/groups",
  "edit-profile": "/(main)/(tabs)/groups",
  "saved-posts": "/(main)/(tabs)/groups",
  "blocked-users": "/(main)/(tabs)/groups",
  "subscription": "/(main)/(tabs)/groups",
  "legal": "/(main)/(tabs)/groups",
  "create-post": "/(main)/(tabs)/groups",
  "post-comments": "/(main)/(tabs)/groups",
  "notifications": "/(main)/(tabs)/groups",
  "search": "/(main)/(tabs)/groups",
  "user-profile": "/(main)/(tabs)/groups",
  "partner-detail": "/(main)/(tabs)/groups",
  "filters": "/(main)/(tabs)/groups",
  "go-live": "/(main)/(tabs)/groups",
  "watch-stream": "/(main)/(tabs)/groups",

  // Admin → Dashboard
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
 * Navigate to the mapped parent route for the given screen.
 * Always goes directly to the target (never router.back).
 */
export function safeBack(screenName?: string) {
  const fallback = screenName ? FALLBACK_ROUTES[screenName] : undefined;
  const target = fallback ?? "/(main)/(tabs)/groups";

  try {
    router.navigate(target as "/");
  } catch {
    router.replace("/(main)/(tabs)/groups" as "/");
  }
}
