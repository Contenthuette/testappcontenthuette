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

let initialTokenUsed = false;

function useUseAuthFromBetterAuth(initialToken?: string | null) {
  const [cachedToken, setCachedToken] = useState<string | null>(
    initialTokenUsed ? null : (initialToken ?? null),
  );
  const pendingTokenRef = useRef<Promise<string | null> | null>(null);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);

  useEffect(() => {
    if (!initialTokenUsed) {
      initialTokenUsed = true;
    }
  }, []);

  return useMemo(
    () =>
      function useAuthFromBetterAuth() {
        const { data: session, isPending: isSessionPending } = authClient.useSession();
        const sessionData = session as BetterAuthSession | null;
        const sessionId = sessionData?.session?.id;
        const prevSessionIdRef = useRef<string | undefined>(undefined);

        // Timeout: if session stays pending for too long, stop waiting
        useEffect(() => {
          if (!isSessionPending) {
            // Session resolved — clear any timeout state
            setSessionTimedOut(false);
            return;
          }
          const timer = setTimeout(() => {
            setSessionTimedOut(true);
          }, 6000);
          return () => clearTimeout(timer);
        }, [isSessionPending]);

        // Effective pending: actually pending AND not timed out
        const effectivelyPending = isSessionPending && !sessionTimedOut;

        // When session appears or changes, clear cached token to force a fresh fetch
        useEffect(() => {
          if (sessionId !== prevSessionIdRef.current) {
            if (sessionId && prevSessionIdRef.current !== sessionId) {
              // New login detected — force token refresh
              setCachedToken(null);
              pendingTokenRef.current = null;
            }
            prevSessionIdRef.current = sessionId;
          }
        }, [sessionId]);

        // Clear token on logout
        useEffect(() => {
          if (!sessionData?.session && !isSessionPending && cachedToken) {
            setCachedToken(null);
          }
        }, [cachedToken, isSessionPending, sessionData?.session]);

        const fetchAccessToken = useCallback(
          async ({ forceRefreshToken = false }: { forceRefreshToken?: boolean } = {}) => {
            if (cachedToken && !forceRefreshToken) {
              return cachedToken;
            }
            if (!forceRefreshToken && pendingTokenRef.current) {
              return pendingTokenRef.current;
            }
            pendingTokenRef.current = (async () => {
              // More retries with progressive backoff for new sessions
              const maxAttempts = sessionId ? 6 : 1;
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
                  // Token null but we have a session — retry with backoff
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
              setCachedToken(null);
              return null;
            })().finally(() => {
              pendingTokenRef.current = null;
            });
            return pendingTokenRef.current;
          },
          [cachedToken, sessionId],
        );

        // Actively trigger token fetch when a session appears but we have no token
        useEffect(() => {
          if (sessionId && cachedToken === null && !pendingTokenRef.current) {
            void fetchAccessToken({ forceRefreshToken: true });
          }
        }, [sessionId, cachedToken, fetchAccessToken]);

        return useMemo(
          () => ({
            // Loading while session is pending (and not timed out) OR while we have a session but are still fetching token
            isLoading: effectivelyPending || (Boolean(sessionId) && cachedToken === null),
            // Only authenticated once we actually have a validated Convex token
            isAuthenticated: cachedToken !== null,
            fetchAccessToken,
          }),
          [cachedToken, fetchAccessToken, effectivelyPending, sessionId],
        );
      },
    [],
  );
}

interface ConvexAuthProviderProps {
  client: ConvexReactClient;
  children: ReactNode;
}

export function ConvexAuthProvider({ client, children }: ConvexAuthProviderProps) {
  const useBetterAuth = useUseAuthFromBetterAuth();

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
