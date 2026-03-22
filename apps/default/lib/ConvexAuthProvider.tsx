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
            pendingTokenRef.current = authClient.convex
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
                pendingTokenRef.current = null;
              });
            return pendingTokenRef.current;
          },
          [cachedToken, sessionId],
        );

        return useMemo(
          () => ({
            isLoading: isSessionPending && !cachedToken,
            isAuthenticated: Boolean(sessionData?.session) || cachedToken !== null,
            fetchAccessToken,
          }),
          [cachedToken, fetchAccessToken, isSessionPending, sessionData?.session],
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
