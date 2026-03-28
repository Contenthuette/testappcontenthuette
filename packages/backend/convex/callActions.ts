import { action } from "./_generated/server";
import { v } from "convex/values";

// Returns ICE server config (STUN + optional TURN from env vars)
export const getIceServers = action({
  args: {},
  returns: v.array(
    v.object({
      urls: v.string(),
      username: v.optional(v.string()),
      credential: v.optional(v.string()),
    }),
  ),
  handler: async () => {
    const servers: Array<{
      urls: string;
      username?: string;
      credential?: string;
    }> = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      // Free OpenRelay TURN servers for NAT traversal
      { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
      { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
    ];

    // Custom TURN server from environment variables
    const turnUrl = process.env.TURN_SERVER_URL;
    const turnUsername = process.env.TURN_SERVER_USERNAME;
    const turnCredential = process.env.TURN_SERVER_CREDENTIAL;

    if (turnUrl && turnUsername && turnCredential) {
      servers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential,
      });

      // Also add TCP variant for restrictive firewalls
      if (turnUrl.startsWith("turn:")) {
        servers.push({
          urls: `${turnUrl}?transport=tcp`,
          username: turnUsername,
          credential: turnCredential,
        });
      }
    }

    // Metered.ca TURN (free tier: 500 GB) — set METERED_TURN_API_KEY env var
    const meteredApiKey = process.env.METERED_TURN_API_KEY;
    if (meteredApiKey) {
      servers.push(
        {
          urls: "stun:a.relay.metered.ca:80",
        },
        {
          urls: "turn:a.relay.metered.ca:80",
          username: meteredApiKey,
          credential: meteredApiKey,
        },
        {
          urls: "turn:a.relay.metered.ca:80?transport=tcp",
          username: meteredApiKey,
          credential: meteredApiKey,
        },
        {
          urls: "turn:a.relay.metered.ca:443",
          username: meteredApiKey,
          credential: meteredApiKey,
        },
        {
          urls: "turns:a.relay.metered.ca:443?transport=tcp",
          username: meteredApiKey,
          credential: meteredApiKey,
        },
      );
    }

    return servers;
  },
});
