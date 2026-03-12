import { v } from "convex/values";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

async function getMyUserId(ctx: { db: QueryCtx["db"]; user: { _id: string } }): Promise<Id<"users"> | null> {
  const authId = ctx.user._id;
  const user = await ctx.db.query("users").withIndex("by_authId", (q) => q.eq("authId", authId)).unique();
  return user?._id ?? null;
}

// Get friendship status between me and another user
export const getStatus = authQuery({
  args: { otherUserId: v.id("users") },
  returns: v.union(
    v.literal("none"),
    v.literal("pending_sent"),
    v.literal("pending_received"),
    v.literal("friends"),
  ),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) return "none";
    if (myUserId === args.otherUserId) return "none";

    // Check if I sent a request
    const sent = await ctx.db.query("friendRequests")
      .withIndex("by_senderId_and_receiverId", (q) =>
        q.eq("senderId", myUserId).eq("receiverId", args.otherUserId)
      ).first();
    if (sent?.status === "accepted") return "friends";
    if (sent?.status === "pending") return "pending_sent";

    // Check if they sent a request to me
    const received = await ctx.db.query("friendRequests")
      .withIndex("by_senderId_and_receiverId", (q) =>
        q.eq("senderId", args.otherUserId).eq("receiverId", myUserId)
      ).first();
    if (received?.status === "accepted") return "friends";
    if (received?.status === "pending") return "pending_received";

    return "none";
  },
});

// Send friend request
export const sendRequest = authMutation({
  args: { receiverId: v.id("users") },
  returns: v.id("friendRequests"),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    if (myUserId === args.receiverId) throw new Error("Cannot send request to yourself");

    // Check no existing pending request
    const existing = await ctx.db.query("friendRequests")
      .withIndex("by_senderId_and_receiverId", (q) =>
        q.eq("senderId", myUserId).eq("receiverId", args.receiverId)
      ).first();
    if (existing?.status === "pending") throw new Error("Request already sent");
    if (existing?.status === "accepted") throw new Error("Already friends");

    // Also check reverse
    const reverse = await ctx.db.query("friendRequests")
      .withIndex("by_senderId_and_receiverId", (q) =>
        q.eq("senderId", args.receiverId).eq("receiverId", myUserId)
      ).first();
    if (reverse?.status === "accepted") throw new Error("Already friends");
    if (reverse?.status === "pending") {
      // Auto-accept if they already sent me one
      await ctx.db.patch(reverse._id, { status: "accepted", respondedAt: Date.now() });
      const myUser = await ctx.db.get(myUserId);
      await ctx.db.insert("notifications", {
        userId: args.receiverId,
        type: "friend_accepted",
        title: "Freundschaft bestätigt",
        body: `${myUser?.name ?? "Jemand"} hat deine Freundschaftsanfrage angenommen`,
        referenceId: myUserId,
        isRead: false,
        createdAt: Date.now(),
      });
      return reverse._id;
    }

    const reqId = await ctx.db.insert("friendRequests", {
      senderId: myUserId,
      receiverId: args.receiverId,
      status: "pending",
      createdAt: Date.now(),
    });

    // Create notification
    const myUser = await ctx.db.get(myUserId);
    await ctx.db.insert("notifications", {
      userId: args.receiverId,
      type: "friend_request",
      title: "Neue Freundschaftsanfrage",
      body: `${myUser?.name ?? "Jemand"} möchte mit dir befreundet sein`,
      referenceId: myUserId,
      isRead: false,
      createdAt: Date.now(),
    });

    return reqId;
  },
});

// Accept friend request
export const acceptRequest = authMutation({
  args: { requestId: v.id("friendRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.receiverId !== myUserId) throw new Error("Not your request");
    if (req.status !== "pending") throw new Error("Request already handled");

    await ctx.db.patch(args.requestId, { status: "accepted", respondedAt: Date.now() });

    const myUser = await ctx.db.get(myUserId);
    await ctx.db.insert("notifications", {
      userId: req.senderId,
      type: "friend_accepted",
      title: "Freundschaft bestätigt",
      body: `${myUser?.name ?? "Jemand"} hat deine Freundschaftsanfrage angenommen`,
      referenceId: myUserId,
      isRead: false,
      createdAt: Date.now(),
    });
    return null;
  },
});

// Decline friend request
export const declineRequest = authMutation({
  args: { requestId: v.id("friendRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");
    if (req.receiverId !== myUserId) throw new Error("Not your request");
    if (req.status !== "pending") throw new Error("Request already handled");

    await ctx.db.patch(args.requestId, { status: "declined", respondedAt: Date.now() });
    return null;
  },
});

// Get my pending friend requests (received)
export const getMyRequests = authQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("friendRequests"),
    senderId: v.id("users"),
    senderName: v.string(),
    senderAvatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) return [];

    const requests = await ctx.db.query("friendRequests")
      .withIndex("by_receiverId", (q) => q.eq("receiverId", myUserId))
      .order("desc")
      .take(50);

    const pending = requests.filter((r) => r.status === "pending");
    const results = [];
    for (const r of pending) {
      const sender = await ctx.db.get(r.senderId);
      if (sender) {
        results.push({
          _id: r._id,
          senderId: r.senderId,
          senderName: sender.name,
          senderAvatarUrl: sender.avatarStorageId
            ? await ctx.storage.getUrl(sender.avatarStorageId) ?? undefined
            : sender.avatarUrl,
          createdAt: r.createdAt,
        });
      }
    }
    return results;
  },
});

// Get my friends list
export const getMyFriends = authQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("users"),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    city: v.optional(v.string()),
  })),
  handler: async (ctx) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) return [];

    const sentAccepted = await ctx.db.query("friendRequests")
      .withIndex("by_senderId", (q) => q.eq("senderId", myUserId))
      .collect();
    const receivedAccepted = await ctx.db.query("friendRequests")
      .withIndex("by_receiverId", (q) => q.eq("receiverId", myUserId))
      .collect();

    const friendIds = new Set<Id<"users">>();
    for (const r of sentAccepted) {
      if (r.status === "accepted") friendIds.add(r.receiverId);
    }
    for (const r of receivedAccepted) {
      if (r.status === "accepted") friendIds.add(r.senderId);
    }

    const results = [];
    for (const fId of friendIds) {
      const user = await ctx.db.get(fId);
      if (user) {
        results.push({
          _id: user._id,
          name: user.name,
          avatarUrl: user.avatarStorageId
            ? await ctx.storage.getUrl(user.avatarStorageId) ?? undefined
            : user.avatarUrl,
          city: user.city,
        });
      }
    }
    return results;
  },
});
