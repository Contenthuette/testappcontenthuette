"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

const ICE_SERVER_SCHEMA = v.object({
  urls: v.string(),
  username: v.optional(v.string()),
  credential: v.optional(v.string()),
});

function isValidTurnUrl(url: string): boolean {
  return /^(stun|turn|turns):/.test(url);
}

function isPlaceholder(val: string): boolean {
  return val.startsWith("BLOOM_PROVISIONED") || val.length < 4;
}

// Returns ICE server config (STUN + TURN from Metered REST API or env vars)
export const getIceServers = action({
  args: {},
  returns: v.array(ICE_SERVER_SCHEMA),
  handler: async () => {
    const servers: Array<{
      urls: string;
      username?: string;
      credential?: string;
    }> = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ];

    // ── 1. Metered.ca REST API: fetch temporary TURN credentials ──────────
    const meteredApiKey = process.env.METERED_TURN_API_KEY;
    if (meteredApiKey && !isPlaceholder(meteredApiKey)) {
      try {
        // Create a temporary TURN credential using the secretKey
        const createRes = await fetch(
          `https://zsocial.metered.live/api/v1/turn/credential?secretKey=${meteredApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expiryInSeconds: 86400, label: "z-social-auto" }),
            signal: AbortSignal.timeout(5000),
          },
        );

        if (createRes.ok) {
          const cred = (await createRes.json()) as {
            username: string;
            password: string;
            apiKey: string;
          };
          // Use the returned credential with Metered global relay endpoints
          const turnUrls = [
            "stun:stun.relay.metered.ca:80",
            "turn:global.relay.metered.ca:80",
            "turn:global.relay.metered.ca:80?transport=tcp",
            "turn:global.relay.metered.ca:443",
            "turns:global.relay.metered.ca:443?transport=tcp",
          ];
          for (const url of turnUrls) {
            servers.push({
              urls: url,
              username: cred.username,
              credential: cred.password,
            });
          }
          console.log(`[ICE] Created Metered TURN credential: ${cred.username}`);
        } else {
          // Fallback: try GET with apiKey (per-credential key)
          const getRes = await fetch(
            `https://zsocial.metered.live/api/v1/turn/credentials?apiKey=${meteredApiKey}`,
            { signal: AbortSignal.timeout(5000) },
          );
          if (getRes.ok) {
            const creds = (await getRes.json()) as Array<{
              urls: string | Array<string>;
              username?: string;
              credential?: string;
            }>;
            for (const c of creds) {
              const urlList = Array.isArray(c.urls) ? c.urls : [c.urls];
              for (const u of urlList) {
                if (isValidTurnUrl(u)) {
                  servers.push({ urls: u, username: c.username, credential: c.credential });
                }
              }
            }
            console.log(`[ICE] Fetched ${creds.length} Metered TURN credentials via apiKey`);
          } else {
            const errorBody = await getRes.text().catch(() => "(no body)");
            console.warn(`[ICE] Metered API returned ${getRes.status}: ${errorBody}`);
          }
        }
      } catch (err) {
        console.warn("[ICE] Failed to fetch Metered TURN creds:", err);
      }
    }

    // ── 2. Custom TURN server from environment variables ──────────────────
    const turnUrl = process.env.TURN_SERVER_URL;
    const turnUsername = process.env.TURN_SERVER_USERNAME;
    const turnCredential = process.env.TURN_SERVER_CREDENTIAL;

    if (
      turnUrl &&
      turnUsername &&
      turnCredential &&
      isValidTurnUrl(turnUrl) &&
      !isPlaceholder(turnUrl) &&
      !isPlaceholder(turnUsername) &&
      !isPlaceholder(turnCredential)
    ) {
      servers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
      if (turnUrl.startsWith("turn:") && !turnUrl.includes("?transport=")) {
        servers.push({
          urls: `${turnUrl}?transport=tcp`,
          username: turnUsername,
          credential: turnCredential,
        });
      }
    }

    // ── 3. Fallback: free OpenRelay TURN (unreliable, last resort) ────────
    // Only add if we got NO other TURN servers
    const hasTurn = servers.some((s) => s.urls.startsWith("turn:") || s.urls.startsWith("turns:"));
    if (!hasTurn) {
      console.warn("[ICE] No TURN servers configured — using unreliable openrelay fallback");
      servers.push(
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
      );
    }

    return servers;
  },
});
