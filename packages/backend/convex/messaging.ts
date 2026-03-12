import { v } from "convex/values";
import { query } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

async function getMyUserId(ctx: { db: QueryCtx["db"]; user: { _id: string } }): Promise<Id<"users"> | null> {
  const authId = ctx.user._id;
  const user = await ctx.db.query("users").withIndex("by_authId", (q) => q.eq("authId", authId)).unique();
  return user?._id ?? null;
}

const sharedPostPreviewValidator = v.optional(v.object({
  thumbnailUrl: v.optional(v.string()),
  postType: v.union(v.literal("photo"), v.literal("video")),
  authorName: v.string(),
  caption: v.optional(v.string()),
}));

async function enrichPostPreview(
  ctx: { db: QueryCtx["db"]; storage: QueryCtx["storage"] },
  m: { type: string; sharedPostId?: Id<"posts"> },
) {
  if (m.type !== "post_share" || !m.sharedPostId) return undefined;
  const post = await ctx.db.get(m.sharedPostId);
  if (!post) return undefined;
  const author = await ctx.db.get(post.authorId);
  const thumbUrl = post.thumbnailStorageId
    ? ((await ctx.storage.getUrl(post.thumbnailStorageId)) ?? undefined)
    : post.thumbnailUrl;
  const mediaUrl = post.mediaStorageId
    ? ((await ctx.storage.getUrl(post.mediaStorageId)) ?? undefined)
    : post.mediaUrl;
  return {
    thumbnailUrl: thumbUrl ?? mediaUrl ?? undefined,
    postType: post.type,
    authorName: author?.name ?? "Unbekannt",
    caption: post.caption?.slice(0, 80) ?? undefined,
  };
}

const messageReturnValidator = v.object({
  _id: v.id("messages"),
  senderId: v.id("users"),
  senderName: v.string(),
  senderAvatarUrl: v.optional(v.string()),
  type: v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("voice"), v.literal("post_share")),
  text: v.optional(v.string()),
  mediaUrl: v.optional(v.string()),
  sharedPostId: v.optional(v.id("posts")),
  sharedPostPreview: sharedPostPreviewValidator,
  isMe: v.boolean(),
  createdAt: v.number(),
});

// Get conversations list (DMs)
export const listConversations = authQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("conversations"),
    type: v.union(v.literal("direct"), v.literal("group")),
    otherUserId: v.optional(v.id("users")),
    otherUserName: v.optional(v.string()),
    otherUserAvatarUrl: v.optional(v.string()),
    groupId: v.optional(v.id("groups")),
    groupName: v.optional(v.string()),
    lastMessage: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    unreadCount: v.number(),
  })),
  handler: async (ctx) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) return [];
    const allConvos = await ctx.db.query("conversations")
      .withIndex("by_lastMessageAt")
      .order("desc")
      .take(100);
    
    const results = [];
    for (const c of allConvos) {
      if (c.type === "direct") {
        if (!c.participantIds?.includes(myUserId)) continue;
        const otherId = c.participantIds.find(id => id !== myUserId);
        const other = otherId ? await ctx.db.get(otherId) : null;
        const lastMsg = await ctx.db.query("messages")
          .withIndex("by_conversationId", q => q.eq("conversationId", c._id))
          .order("desc")
          .first();
        results.push({
          _id: c._id,
          type: c.type,
          otherUserId: otherId,
          otherUserName: other?.name,
          otherUserAvatarUrl: other?.avatarStorageId ? await ctx.storage.getUrl(other.avatarStorageId) ?? undefined : other?.avatarUrl,
          lastMessage: lastMsg?.text ?? (lastMsg?.type === "image" ? "🖼 Photo" : lastMsg?.type === "voice" ? "🎤 Voice" : undefined),
          lastMessageAt: c.lastMessageAt,
          unreadCount: 0,
        });
      }
    }
    return results;
  },
});

// Get or create DM conversation
export const getOrCreateDM = authMutation({
  args: { otherUserId: v.id("users") },
  returns: v.id("conversations"),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    
    // Find existing
    const allConvos = await ctx.db.query("conversations")
      .withIndex("by_lastMessageAt")
      .order("desc")
      .take(200);
    for (const c of allConvos) {
      if (c.type === "direct" && c.participantIds?.includes(myUserId) && c.participantIds?.includes(args.otherUserId)) {
        return c._id;
      }
    }
    
    return await ctx.db.insert("conversations", {
      type: "direct",
      participantIds: [myUserId, args.otherUserId],
      createdAt: Date.now(),
    });
  },
});

// Get group conversation
export const getGroupConversation = query({
  args: { groupId: v.id("groups") },
  returns: v.union(v.null(), v.id("conversations")),
  handler: async (ctx, args) => {
    const conv = await ctx.db.query("conversations")
      .withIndex("by_groupId", q => q.eq("groupId", args.groupId))
      .unique();
    return conv?._id ?? null;
  },
});

// Get messages for conversation
export const getMessages = authQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.array(messageReturnValidator),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    const messages = await ctx.db.query("messages")
      .withIndex("by_conversationId", q => q.eq("conversationId", args.conversationId))
      .order("asc")
      .take(100);
    const results = [];
    for (const m of messages) {
      const sender = await ctx.db.get(m.senderId);
      const preview = await enrichPostPreview(ctx, m);
      results.push({
        _id: m._id,
        senderId: m.senderId,
        senderName: sender?.name ?? "Unknown",
        senderAvatarUrl: sender?.avatarStorageId ? await ctx.storage.getUrl(sender.avatarStorageId) ?? undefined : sender?.avatarUrl,
        type: m.type,
        text: m.text,
        mediaUrl: m.mediaStorageId ? await ctx.storage.getUrl(m.mediaStorageId) ?? undefined : m.mediaUrl,
        sharedPostId: m.sharedPostId,
        sharedPostPreview: preview,
        isMe: m.senderId === myUserId,
        createdAt: m.createdAt,
      });
    }
    return results;
  },
});

// Send message
export const sendMessage = authMutation({
  args: {
    conversationId: v.id("conversations"),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("voice"), v.literal("post_share")),
    text: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),
    sharedPostId: v.optional(v.id("posts")),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const msgId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: myUserId,
      type: args.type,
      text: args.text,
      mediaStorageId: args.mediaStorageId,
      sharedPostId: args.sharedPostId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, { lastMessageAt: Date.now() });
    return msgId;
  },
});

// Group messages - get messages for a group's conversation
export const getGroupMessages = authQuery({
  args: { groupId: v.id("groups") },
  returns: v.array(messageReturnValidator),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    // Find or create group conversation
    const conv = await ctx.db.query("conversations")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .unique();
    if (!conv) return [];
    const messages = await ctx.db.query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
      .order("desc")
      .take(100);
    const results = [];
    for (const m of messages) {
      const sender = await ctx.db.get(m.senderId);
      const preview = await enrichPostPreview(ctx, m);
      results.push({
        _id: m._id,
        senderId: m.senderId,
        senderName: sender?.name ?? "Unknown",
        senderAvatarUrl: sender?.avatarStorageId ? await ctx.storage.getUrl(sender.avatarStorageId) ?? undefined : sender?.avatarUrl,
        type: m.type,
        text: m.text,
        mediaUrl: m.mediaStorageId ? await ctx.storage.getUrl(m.mediaStorageId) ?? undefined : m.mediaUrl,
        sharedPostId: m.sharedPostId,
        sharedPostPreview: preview,
        isMe: m.senderId === myUserId,
        createdAt: m.createdAt,
      });
    }
    return results;
  },
});

// Send group message
export const sendGroupMessage = authMutation({
  args: {
    groupId: v.id("groups"),
    text: v.string(),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("voice")),
    mediaStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    // Find or create group conversation
    let conv = await ctx.db.query("conversations")
      .withIndex("by_groupId", (q: any) => q.eq("groupId", args.groupId))
      .unique();
    if (!conv) {
      const convId = await ctx.db.insert("conversations", {
        type: "group",
        groupId: args.groupId,
        participantIds: [myUserId],
        createdAt: Date.now(),
      });
      conv = await ctx.db.get(convId);
    }
    if (!conv) throw new Error("Conversation error");
    const msgId = await ctx.db.insert("messages", {
      conversationId: conv._id,
      senderId: myUserId,
      type: args.type,
      text: args.text,
      mediaStorageId: args.mediaStorageId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(conv._id, { lastMessageAt: Date.now() });
    return msgId;
  },
});

// Get direct messages (alias for getMessages)
export const getDirectMessages = authQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.array(messageReturnValidator),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    const messages = await ctx.db.query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(100);
    const results = [];
    for (const m of messages) {
      const sender = await ctx.db.get(m.senderId);
      const preview = await enrichPostPreview(ctx, m);
      results.push({
        _id: m._id,
        senderId: m.senderId,
        senderName: sender?.name ?? "Unknown",
        senderAvatarUrl: sender?.avatarStorageId ? await ctx.storage.getUrl(sender.avatarStorageId) ?? undefined : sender?.avatarUrl,
        type: m.type,
        text: m.text,
        mediaUrl: m.mediaStorageId ? await ctx.storage.getUrl(m.mediaStorageId) ?? undefined : m.mediaUrl,
        sharedPostId: m.sharedPostId,
        sharedPostPreview: preview,
        isMe: m.senderId === myUserId,
        createdAt: m.createdAt,
      });
    }
    return results;
  },
});

// Send direct message (alias for sendMessage)
export const sendDirectMessage = authMutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("voice")),
    mediaStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const msgId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: myUserId,
      type: args.type,
      text: args.text,
      mediaStorageId: args.mediaStorageId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, { lastMessageAt: Date.now() });
    return msgId;
  },
});
