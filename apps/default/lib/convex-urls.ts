const fallbackConvexUrl = "https://glad-canary-992.convex.cloud";

function deriveConvexSiteUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith(".convex.cloud")) {
      parsed.hostname = parsed.hostname.replace(/\.convex\.cloud$/, ".convex.site");
    }
    return parsed.origin;
  } catch {
    return url.replace(/\.convex\.cloud$/, ".convex.site");
  }
}

export const convexUrl =
  process.env.EXPO_PUBLIC_CONVEX_URL ?? fallbackConvexUrl;

export const convexSiteUrl =
  process.env.EXPO_PUBLIC_CONVEX_SITE_URL ?? deriveConvexSiteUrl(convexUrl);

export function getAuthBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return convexSiteUrl;
}
