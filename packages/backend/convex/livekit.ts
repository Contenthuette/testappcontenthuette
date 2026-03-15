"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import crypto from "crypto";

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export const generateToken = internalAction({
  args: {
    identity: v.string(),
    name: v.string(),
    roomName: v.string(),
  },
  returns: v.object({
    token: v.string(),
    wsUrl: v.string(),
  }),
  handler: async (_ctx, args) => {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      throw new Error(
        "LiveKit environment variables (LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL) are not configured"
      );
    }

    const header = { alg: "HS256" as const, typ: "JWT" as const };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      exp: now + 3600,
      iss: apiKey,
      sub: args.identity,
      name: args.name,
      nbf: now,
      video: {
        roomJoin: true,
        room: args.roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
      },
    };

    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(payload));
    const data = `${headerB64}.${payloadB64}`;

    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(data)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    return { token: `${data}.${signature}`, wsUrl };
  },
});
