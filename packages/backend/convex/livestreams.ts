import { v } from "convex/values";
import { query } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { rateLimiter } from "./rateLimit";

const MAX_VIEWERS_PER_STREAM = 50;
const COMMENTS_PAGE_SIZE = 40;
const SIGNAL_FETCH_LIMIT = 100;

type DbReader = QueryCtx["db"] | MutationCtx["db"];

async function resolveUserId(
  ctx: { db: DbReader; user: { _id: string } },
): Promise<Id<"users"> | null> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", ctx.user._id))
    .unique();
  return user?._id ?? null;
}

async function requireUserId(
  ctx: { db: DbReader; user: { _id: string } },
): Promise<Id<"users">> {
  const userId = await resolveUserId(ctx);
  if (!userId) throw new Error("User not found");
  return userId;
}

// ── Queries ──────────────────────────────────────────────────────

/** List all currently-live streams */
export const listActive = authQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("livestreams"),
      groupId: v.id("groups"),
      groupName: v.string(),
      hostId: v.id("users"),
      hostName: v.string(),
      hostAvatarUrl: v.optional(v.string()),
      title: v.string(),
      viewerCount: v.number(),
      startedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const streams = await ctx.db
      .query("livestreams")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .order("desc")
      .take(20);

    return streams.map((s) => ({
      _id: s._id,
      groupId: s.groupId,
      groupName: s.groupName,
      hostId: s.hostId,
      hostName: s.hostName,
      hostAvatarUrl: s.hostAvatarUrl,
      title: s.title,
      viewerCount: s.viewerCount,
      startedAt: s.startedAt,
    }));
  },
});

/** Get a single livestream by ID */
export const getById = query({
  args: { livestreamId: v.id("livestreams") },
  returns: v.union(
    v.object({
      _id: v.id("livestreams"),
      groupId: v.id("groups"),
      groupName: v.string(),
      hostId: v.id("users"),
      hostName: v.string(),
      hostAvatarUrl: v.optional(v.string()),
      title: v.string(),
      status: v.union(v.literal("live"), v.literal("ended")),
      viewerCount: v.number(),
      peakViewerCount: v.number(),
      startedAt: v.number(),
      endedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const stream = await ctx.db.get(args.livestreamId);
    if (!stream) return null;
    return {
      _id: stream._id,
      groupId: stream.groupId,
      groupName: stream.groupName,
      hostId: stream.hostId,
      hostName: stream.hostName,
      hostAvatarUrl: stream.hostAvatarUrl,
      title: stream.title,
      status: stream.status,
      viewerCount: stream.viewerCount,
      peakViewerCount: stream.peakViewerCount,
      startedAt: stream.startedAt,
      endedAt: stream.endedAt,
    };
  },
});

/** Get active livestream for a specific group */
export const getActiveForGroup = query({
  args: { groupId: v.id("groups") },
  returns: v.union(
    v.object({
      _id: v.id("livestreams"),
      hostId: v.id("users"),
      hostName: v.string(),
      hostAvatarUrl: v.optional(v.string()),
      title: v.string(),
      viewerCount: v.number(),
      startedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const stream = await ctx.db
      .query("livestreams")
      .withIndex("by_groupId_and_status", (q) =>
        q.eq("groupId", args.groupId).eq("status", "live"),
      )
      .first();
    if (!stream) return null;
    return {
      _id: stream._id,
      hostId: stream.hostId,
      hostName: stream.hostName,
      hostAvatarUrl: stream.hostAvatarUrl,
      title: stream.title,
      viewerCount: stream.viewerCount,
      startedAt: stream.startedAt,
    };
  },
});

/** Get viewers for a livestream */
export const getViewers = authQuery({
  args: { livestreamId: v.id("livestreams") },
  returns: v.array(
    v.object({
      _id: v.id("livestreamViewers"),
      userId: v.id("users"),
      userName: v.string(),
      userAvatarUrl: v.optional(v.string()),
      joinedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const viewers = await ctx.db
      .query("livestreamViewers")
      .withIndex("by_livestreamId", (q) => q.eq("livestreamId", args.livestreamId))
      .take(MAX_VIEWERS_PER_STREAM);

    return viewers.map((v_) => ({
      _id: v_._id,
      userId: v_.userId,
      userName: v_.userName,
      userAvatarUrl: v_.userAvatarUrl,
      joinedAt: v_.joinedAt,
    }));
  },
});

/** Get recent comments for a livestream */
export const getComments = query({
  args: { livestreamId: v.id("livestreams") },
  returns: v.array(
    v.object({
      _id: v.id("livestreamComments"),
      userId: v.id("users"),
      userName: v.string(),
      userAvatarUrl: v.optional(v.string()),
      text: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("livestreamComments")
      .withIndex("by_livestreamId_and_createdAt", (q) =>
        q.eq("livestreamId", args.livestreamId),
      )
      .order("desc")
      .take(COMMENTS_PAGE_SIZE);

    // Return in chronological order (oldest first)
    return comments.reverse().map((c) => ({
      _id: c._id,
      userId: c.userId,
      userName: c.userName,
      userAvatarUrl: c.userAvatarUrl,
      text: c.text,
      createdAt: c.createdAt,
    }));
  },
});

/** Get signaling messages for the current user in a livestream */
export const getSignals = authQuery({
  args: { livestreamId: v.id("livestreams") },
  returns: v.array(
    v.object({
      _id: v.id("livestreamSignaling"),
      senderId: v.id("users"),
      type: v.union(
        v.literal("offer"),
        v.literal("answer"),
        v.literal("ice-candidate"),
      ),
      payload: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx);
    if (!userId) return [];

    const signals = await ctx.db
      .query("livestreamSignaling")
      .withIndex("by_livestreamId_and_recipientId", (q) =>
        q.eq("livestreamId", args.livestreamId).eq("recipientId", userId),
      )
      .take(SIGNAL_FETCH_LIMIT);

    return signals.map((s) => ({
      _id: s._id,
      senderId: s.senderId,
      type: s.type,
      payload: s.payload,
    }));
  },
});

// ── Mutations ────────────────────────────────────────────────────

/** Start a livestream in a group */
export const goLive = authMutation({
  args: {
    groupId: v.id("groups"),
    title: v.string(),
  },
  returns: v.id("livestreams"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await rateLimiter.limit(ctx, "goLive", { key: userId });

    // Verify group membership
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId_and_userId", (q) =>
        q.eq("groupId", args.groupId).eq("userId", userId),
      )
      .unique();
    if (!membership || membership.status !== "active") {
      throw new Error("Du musst Mitglied der Gruppe sein, um live zu gehen.");
    }

    // Check no existing live stream in this group
    const existing = await ctx.db
      .query("livestreams")
      .withIndex("by_groupId_and_status", (q) =>
        q.eq("groupId", args.groupId).eq("status", "live"),
      )
      .first();
    if (existing) {
      throw new Error("Es gibt bereits einen aktiven Livestream in dieser Gruppe.");
    }

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");

    return await ctx.db.insert("livestreams", {
      groupId: args.groupId,
      groupName: group.name,
      hostId: userId,
      hostName: user.name,
      hostAvatarUrl: user.avatarUrl,
      title: args.title,
      status: "live",
      viewerCount: 0,
      peakViewerCount: 0,
      startedAt: Date.now(),
    });
  },
});

/** End a livestream */
export const endStream = authMutation({
  args: { livestreamId: v.id("livestreams") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const stream = await ctx.db.get(args.livestreamId);
    if (!stream) throw new Error("Livestream not found");
    if (stream.hostId !== userId) throw new Error("Nur der Host kann den Stream beenden.");
    if (stream.status === "ended") return null;

    await ctx.db.patch(args.livestreamId, {
      status: "ended",
      endedAt: Date.now(),
    });

    // Clean up viewers
    const viewers = await ctx.db
      .query("livestreamViewers")
      .withIndex("by_livestreamId", (q) => q.eq("livestreamId", args.livestreamId))
      .collect();
    for (const viewer of viewers) {
      await ctx.db.delete(viewer._id);
    }

    // Clean up signals
    const signals = await ctx.db
      .query("livestreamSignaling")
      .withIndex("by_livestreamId_and_recipientId", (q) =>
        q.eq("livestreamId", args.livestreamId),
      )
      .collect();
    for (const signal of signals) {
      await ctx.db.delete(signal._id);
    }

    return null;
  },
});

/** Join a livestream as a viewer */
export const joinStream = authMutation({
  args: { livestreamId: v.id("livestreams") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const stream = await ctx.db.get(args.livestreamId);
    if (!stream) throw new Error("Livestream not found");
    if (stream.status !== "live") throw new Error("Dieser Livestream ist beendet.");

    // Don't add host as viewer
    if (stream.hostId === userId) return null;

    // Check if already viewing
    const existing = await ctx.db
      .query("livestreamViewers")
      .withIndex("by_livestreamId_and_userId", (q) =>
        q.eq("livestreamId", args.livestreamId).eq("userId", userId),
      )
      .unique();
    if (existing) return null;

    if (stream.viewerCount >= MAX_VIEWERS_PER_STREAM) {
      throw new Error("Der Livestream ist voll.");
    }

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    await ctx.db.insert("livestreamViewers", {
      livestreamId: args.livestreamId,
      userId,
      userName: user.name,
      userAvatarUrl: user.avatarUrl,
      joinedAt: Date.now(),
    });

    const newCount = stream.viewerCount + 1;
    await ctx.db.patch(args.livestreamId, {
      viewerCount: newCount,
      peakViewerCount: Math.max(stream.peakViewerCount, newCount),
    });

    return null;
  },
});

/** Leave a livestream */
export const leaveStream = authMutation({
  args: { livestreamId: v.id("livestreams") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const stream = await ctx.db.get(args.livestreamId);

    const viewer = await ctx.db
      .query("livestreamViewers")
      .withIndex("by_livestreamId_and_userId", (q) =>
        q.eq("livestreamId", args.livestreamId).eq("userId", userId),
      )
      .unique();
    if (viewer) {
      await ctx.db.delete(viewer._id);
    }

    if (stream && stream.status === "live" && viewer) {
      await ctx.db.patch(args.livestreamId, {
        viewerCount: Math.max(0, stream.viewerCount - 1),
      });
    }

    // Clean up user's signals
    const sigs = await ctx.db
      .query("livestreamSignaling")
      .withIndex("by_livestreamId_and_recipientId", (q) =>
        q.eq("livestreamId", args.livestreamId).eq("recipientId", userId),
      )
      .collect();
    for (const s of sigs) {
      await ctx.db.delete(s._id);
    }

    return null;
  },
});

/** Send a comment */
export const sendComment = authMutation({
  args: {
    livestreamId: v.id("livestreams"),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await rateLimiter.limit(ctx, "livestreamComment", { key: userId });

    const stream = await ctx.db.get(args.livestreamId);
    if (!stream || stream.status !== "live") {
      throw new Error("Livestream ist nicht aktiv.");
    }

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const trimmed = args.text.trim().slice(0, 500);
    if (trimmed.length === 0) return null;

    await ctx.db.insert("livestreamComments", {
      livestreamId: args.livestreamId,
      userId,
      userName: user.name,
      userAvatarUrl: user.avatarUrl,
      text: trimmed,
      createdAt: Date.now(),
    });

    return null;
  },
});

/** Send a WebRTC signaling message */
export const sendSignal = authMutation({
  args: {
    livestreamId: v.id("livestreams"),
    recipientId: v.id("users"),
    type: v.union(v.literal("offer"), v.literal("answer"), v.literal("ice-candidate")),
    payload: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await rateLimiter.limit(ctx, "livestreamSignal", { key: userId });

    await ctx.db.insert("livestreamSignaling", {
      livestreamId: args.livestreamId,
      senderId: userId,
      recipientId: args.recipientId,
      type: args.type,
      payload: args.payload,
    });

    return null;
  },
});

/** Acknowledge / delete processed signals */
export const ackSignals = authMutation({
  args: { signalIds: v.array(v.id("livestreamSignaling")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const id of args.signalIds) {
      const doc = await ctx.db.get(id);
      if (doc) await ctx.db.delete(id);
    }
    return null;
  },
});
