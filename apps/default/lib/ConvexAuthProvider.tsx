import { ConvexProviderWithAuth } from "convex/react";
import type { ConvexReactClient } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { authClient } from "./auth-client";

interface BetterAuthSession {
  session?: { id: string };
}

interface CrossDomainSessionToken {
  token: string;
}

interface CrossDomainVerifyResult {
  data?: {
    session?: CrossDomainSessionToken;
  };
}

interface CrossDomainAuthClient {
  crossDomain: {
    oneTimeToken: {
      verify(args: { token: string }): Promise<CrossDomainVerifyResult>;
    };
  };
  updateSession(): void;
}

/**
 * Module-level flag so sign-out can bypass debounce timers.
 * Set before calling authClient.signOut(), checked by the provider and layout.
 */
let _intentionalLogout = false;

export function signalIntentionalLogout() {
  _intentionalLogout = true;
}

export function isIntentionalLogout() {
  return _intentionalLogout;
}

/**
 * Module-level hook for Better Auth ↔ Convex integration.
 * Key design: once authenticated, isAuthenticated stays true during token
 * refreshes so the UI never flickers back to the loading/welcome screen.
 */
function useBetterAuth() {
  const [cachedToken, setCachedToken] = useState<string | null>(null);
  const cachedTokenRef = useRef<string | null>(null);
  const pendingTokenRef = useRef<Promise<string | null> | null>(null);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);
  const wasAuthenticatedRef = useRef(false);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const sessionData = session as BetterAuthSession | null;
  const sessionId = sessionData?.session?.id;
  const prevSessionIdRef = useRef<string | undefined>(undefined);

  // Keep ref in sync with state
  useEffect(() => {
    cachedTokenRef.current = cachedToken;
    if (cachedToken) {
      wasAuthenticatedRef.current = true;
    }
  }, [cachedToken]);

  // Timeout: if session stays pending too long, stop waiting
  useEffect(() => {
    if (!isSessionPending) {
      setSessionTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setSessionTimedOut(true), 6000);
    return () => clearTimeout(timer);
  }, [isSessionPending]);

  const effectivelyPending = isSessionPending && !sessionTimedOut;

  // When session ID changes (different user), clear cached token to force fresh fetch
  useEffect(() => {
    if (sessionId !== prevSessionIdRef.current) {
      if (sessionId && prevSessionIdRef.current !== undefined && prevSessionIdRef.current !== sessionId) {
        // Different session — new user or re-login
        setCachedToken(null);
        pendingTokenRef.current = null;
      }
      prevSessionIdRef.current = sessionId;
    }
  }, [sessionId]);

  // Debounced logout: only clear token if session stays gone for 3s.
  // This prevents flickering during background session refreshes.
  useEffect(() => {
    if (!sessionData?.session && !isSessionPending) {
      // Intentional logout — clear immediately, no debounce
      if (_intentionalLogout) {
        _intentionalLogout = false;
        setCachedToken(null);
        wasAuthenticatedRef.current = false;
        return;
      }
      // Session appears gone — but wait before clearing
      if (cachedTokenRef.current && wasAuthenticatedRef.current) {
        logoutTimerRef.current = setTimeout(() => {
          // Re-check: if session still gone, it's a real logout
          setCachedToken(null);
          wasAuthenticatedRef.current = false;
        }, 3000);
        return () => {
          if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        };
      }
      // Never had a token — nothing to clear
    } else {
      // Session is back or pending — cancel any pending logout
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    }
  }, [isSessionPending, sessionData?.session]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken = false }: { forceRefreshToken?: boolean } = {}) => {
      // Return cached token if not forced to refresh
      if (cachedTokenRef.current && !forceRefreshToken) {
        return cachedTokenRef.current;
      }
      // Deduplicate concurrent fetches
      if (!forceRefreshToken && pendingTokenRef.current) {
        return pendingTokenRef.current;
      }
      pendingTokenRef.current = (async () => {
        const hasSession = Boolean(sessionId) || wasAuthenticatedRef.current;
        const maxAttempts = hasSession ? 6 : 1;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const { data } = await authClient.convex.token({
              fetchOptions: { throw: false },
            });
            const token = data?.token ?? null;
            if (token) {
              setCachedToken(token);
              return token;
            }
            if (attempt < maxAttempts - 1) {
              await new Promise((r) => setTimeout(r, 400 + attempt * 300));
              continue;
            }
          } catch {
            if (attempt < maxAttempts - 1) {
              await new Promise((r) => setTimeout(r, 400 + attempt * 300));
              continue;
            }
          }
        }
        // All attempts failed — only clear if this wasn't a background refresh
        // (if we had a token before, keep it to avoid flicker; the debounced
        // logout effect will handle real logouts)
        if (!wasAuthenticatedRef.current) {
          setCachedToken(null);
        }
        return cachedTokenRef.current;
      })().finally(() => {
        pendingTokenRef.current = null;
      });
      return pendingTokenRef.current;
    },
    // Use sessionId only — NOT cachedToken, to avoid callback identity changes on every token update
    [sessionId],
  );

  // Trigger token fetch when session appears but we have no token yet
  useEffect(() => {
    if (sessionId && cachedTokenRef.current === null && !pendingTokenRef.current) {
      void fetchAccessToken({ forceRefreshToken: true });
    }
  }, [sessionId, fetchAccessToken]);

  return useMemo(
    () => ({
      isLoading: effectivelyPending || (Boolean(sessionId) && cachedToken === null && !wasAuthenticatedRef.current),
      isAuthenticated: cachedToken !== null,
      fetchAccessToken,
    }),
    [cachedToken, fetchAccessToken, effectivelyPending, sessionId],
  );
}

interface ConvexAuthProviderProps {
  client: ConvexReactClient;
  children: ReactNode;
}

export function ConvexAuthProvider({ client, children }: ConvexAuthProviderProps) {
  // Handle cross-domain OTT on web
  useEffect(() => {
    void (async () => {
      if (typeof window === "undefined" || !window.location?.href) {
        return;
      }

      const url = new URL(window.location.href);
      const token = url.searchParams.get("ott");
      if (!token) {
        return;
      }

      const authClientWithCrossDomain = authClient as typeof authClient & CrossDomainAuthClient;
      url.searchParams.delete("ott");
      window.history.replaceState({}, "", url);

      const result = await authClientWithCrossDomain.crossDomain.oneTimeToken.verify({ token });
      const session = result.data?.session;
      if (!session) {
        return;
      }

      await authClient.getSession({
        fetchOptions: {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        },
      });
      authClientWithCrossDomain.updateSession();
    })();
  }, []);

  return (
    <ConvexProviderWithAuth client={client} useAuth={useBetterAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
