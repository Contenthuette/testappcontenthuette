import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";

async function getMyUserId(ctx: any): Promise<Id<"users"> | null> {
  const authId = ctx.user._id;
  const user = await ctx.db.query("users").withIndex("by_authId", (q: any) => q.eq("authId", authId)).unique();
  return user?._id ?? null;
}

export const list = authQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("notifications"),
    type: v.union(
      v.literal("message"), v.literal("like"), v.literal("comment"),
      v.literal("group_invite"), v.literal("event_reminder"),
      v.literal("ticket_confirmed"), v.literal("announcement"), v.literal("call"),
      v.literal("join_request"), v.literal("join_accepted"), v.literal("join_rejected"),
      v.literal("post_share")
    ),
    title: v.string(),
    body: v.string(),
    referenceId: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) return [];
    return await ctx.db.query("notifications")
      .withIndex("by_userId", q => q.eq("userId", myUserId))
      .order("desc")
      .take(50);
  },
});

export const markRead = authMutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
    return null;
  },
});

export const markAllRead = authMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) return null;
    const unread = await ctx.db.query("notifications")
      .withIndex("by_userId_and_isRead", q => q.eq("userId", myUserId).eq("isRead", false))
      .collect();
    for (const n of unread) {
      await ctx.db.patch(n._id, { isRead: true });
    }
    return null;
  },
});

export const getUnreadCount = authQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) return 0;
    const unread = await ctx.db.query("notifications")
      .withIndex("by_userId_and_isRead", q => q.eq("userId", myUserId).eq("isRead", false))
      .take(100);
    return unread.length;
  },
});
