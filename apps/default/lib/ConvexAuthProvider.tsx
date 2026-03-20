/**
 * Local implementation of the Better Auth provider for Convex.
 *
 * This replaces `ConvexBetterAuthProvider` from `@convex-dev/better-auth/react`
 * to fix the dual-instance issue in bun monorepos. The package's version imports
 * `ConvexProviderWithAuth` from its own copy of `convex/react`, creating a
 * separate React context that the app can't read.
 *
 * By importing `ConvexProviderWithAuth` directly here, we guarantee a single
 * React context for the entire app.
 */
import { ConvexProviderWithAuth } from "convex/react";
import type { ConvexReactClient } from "convex/react";
import { authClient } from "./auth-client";
import { useState, useCallback, useMemo, useRef, type ReactNode } from "react";

const convexSiteUrl =
  process.env.EXPO_PUBLIC_CONVEX_SITE_URL ??
  process.env.EXPO_PUBLIC_CONVEX_URL ??
  "https://glad-canary-992.convex.cloud";

// Better Auth session shape from useSession().data
interface BetterAuthSession {
  session?: { id: string };
  user?: { id: string; name?: string; email?: string };
  token?: string;
}

/**
 * Fetches a Convex JWT from the Better Auth token endpoint.
 * The endpoint is served by the Better Auth HTTP routes on the Convex site URL.
 */
async function fetchConvexJWT(sessionToken: string): Promise<string | null> {
  const res = await fetch(`${convexSiteUrl}/api/auth/convex/token`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });

  if (!res.ok) return null;
  const data: unknown = await res.json();
  if (typeof data === "object" && data !== null && "token" in data) {
    const token = (data as { token: unknown }).token;
    return typeof token === "string" ? token : null;
  }
  return null;
}

/**
 * Custom useAuth hook that bridges Better Auth with Convex.
 * Mirrors the logic from `@convex-dev/better-auth/react`'s internal
 * `useUseAuthFromBetterAuth` hook, but imports everything from the
 * app's own module instances.
 */
function useBetterAuth() {
  const { data: session, isPending } = authClient.useSession();
  const [cachedToken, setCachedToken] = useState<string | null>(null);
  const pendingRef = useRef<Promise<string | null> | null>(null);

  const sessionData = session as BetterAuthSession | null;
  const sessionId = sessionData?.session?.id;
  const sessionToken = sessionData?.token;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      // Reuse in-flight request
      if (!forceRefreshToken && pendingRef.current) {
        return pendingRef.current;
      }

      // Signed out — clear cached token
      if (!session && !isPending && cachedToken) {
        setCachedToken(null);
        return null;
      }

      // Return cached token when not forcing refresh
      if (cachedToken && !forceRefreshToken) {
        return cachedToken;
      }

      // No session token available yet
      if (!sessionToken) {
        return null;
      }

      // Fetch a fresh Convex JWT
      const promise = fetchConvexJWT(sessionToken);
      pendingRef.current = promise;

      try {
        const token = await promise;
        setCachedToken(token);
        return token;
      } catch {
        setCachedToken(null);
        return null;
      } finally {
        pendingRef.current = null;
      }
    },
    // Re-create when the session changes (sign in / out)
    [sessionId, session, isPending, cachedToken, sessionToken],
  );

  return useMemo(
    () => ({
      isLoading: isPending && !cachedToken,
      isAuthenticated: Boolean(sessionData?.session) || cachedToken !== null,
      fetchAccessToken,
    }),
    [isPending, sessionId, fetchAccessToken, cachedToken, sessionData?.session],
  );
}

interface ConvexAuthProviderProps {
  client: ConvexReactClient;
  children: ReactNode;
}

export function ConvexAuthProvider({ client, children }: ConvexAuthProviderProps) {
  return (
    <ConvexProviderWithAuth client={client} useAuth={useBetterAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
