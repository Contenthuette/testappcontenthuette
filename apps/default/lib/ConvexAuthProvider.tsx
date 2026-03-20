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
import { useState, useCallback, useMemo, useRef, type ReactNode } from "react";
import { authClient } from "./auth-client";

// Better Auth session shape from useSession().data
interface BetterAuthSession {
  session?: { id: string };
  user?: { id: string; name?: string; email?: string };
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

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (cachedToken && !forceRefreshToken) {
        return cachedToken;
      }

      if (!forceRefreshToken && pendingRef.current) {
        return pendingRef.current;
      }

      if (!sessionData?.session) {
        if (!isPending && cachedToken) {
          setCachedToken(null);
        }
        return null;
      }

      const promise = authClient.convex
        .token({ fetchOptions: { throw: false } })
        .then(({ data }) => {
          const token = data?.token ?? null;
          setCachedToken(token);
          return token;
        })
        .catch(() => {
          setCachedToken(null);
          return null;
        })
        .finally(() => {
          pendingRef.current = null;
        });

      pendingRef.current = promise;
      return promise;
    },
    [cachedToken, isPending, sessionData?.session, sessionId],
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
