import { v } from "convex/values";
import { query } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import type { Id, Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

async function getMyUserId(ctx: { db: QueryCtx["db"]; user: { _id: string } }): Promise<Id<"users"> | null> {
  const authId = ctx.user._id;
  const user = await ctx.db.query("users").withIndex("by_authId", (q) => q.eq("authId", authId)).unique();
  return user?._id ?? null;
}

const sharedPostPreviewValidator = v.optional(v.object({
  thumbnailUrl: v.optional(v.string()),
  mediaUrl: v.optional(v.string()),
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
    thumbnailUrl: thumbUrl ?? (post.type === "photo" ? mediaUrl : undefined),
    mediaUrl: mediaUrl ?? undefined,
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
  mediaDuration: v.optional(v.number()),
  sharedPostId: v.optional(v.id("posts")),
  sharedPostPreview: sharedPostPreviewValidator,
  isMe: v.boolean(),
  createdAt: v.number(),
});

// ── Performance helpers ───────────────────────────────────────────
type UserCache = Map<Id<"users">, Doc<"users"> | null>;
type UrlCache = Map<Id<"_storage">, string | null>;

async function batchGetUsers(
  ctx: { db: QueryCtx["db"] },
  ids: Array<Id<"users">>,
): Promise<UserCache> {
  const unique = [...new Set(ids)];
  const cache: UserCache = new Map();
  await Promise.all(
    unique.map(async (id) => {
      cache.set(id, await ctx.db.get(id));
    }),
  );
  return cache;
}

async function batchGetStorageUrls(
  ctx: { storage: QueryCtx["storage"] },
  ids: Array<Id<"_storage"> | undefined>,
): Promise<UrlCache> {
  const unique = [...new Set(ids.filter((id): id is Id<"_storage"> => !!id))];
  const cache: UrlCache = new Map();
  await Promise.all(
    unique.map(async (id) => {
      cache.set(id, await ctx.storage.getUrl(id));
    }),
  );
  return cache;
}

function getUserAvatarUrl(user: Doc<"users"> | null | undefined, urlCache: UrlCache): string | undefined {
  if (!user) return undefined;
  if (user.avatarStorageId) return urlCache.get(user.avatarStorageId) ?? undefined;
  return user.avatarUrl;
}

async function enrichMessagesOptimized(
  ctx: { db: QueryCtx["db"]; storage: QueryCtx["storage"] },
  messages: Array<Doc<"messages">>,
  myUserId: Id<"users"> | null,
) {
  if (messages.length === 0) return [];
  
  // 1. Batch-fetch all senders
  const senderIds = messages.map(m => m.senderId);
  const senderCache = await batchGetUsers(ctx, senderIds);
  
  // 2. Batch-fetch all storage URLs (media + sender avatars)
  const mediaStorageIds = messages.map(m => m.mediaStorageId);
  const avatarStorageIds = [...senderCache.values()]
    .filter((u): u is Doc<"users"> => !!u?.avatarStorageId)
    .map(u => u.avatarStorageId!);
  const urlCache = await batchGetStorageUrls(ctx, [...mediaStorageIds, ...avatarStorageIds]);
  
  // 3. Batch-fetch shared post previews in parallel
  const sharedPostMsgs = messages.filter(m => m.type === "post_share" && m.sharedPostId);
  const previewMap = new Map<string, Awaited<ReturnType<typeof enrichPostPreview>>>();
  if (sharedPostMsgs.length > 0) {
    const previews = await Promise.all(
      sharedPostMsgs.map(m => enrichPostPreview(ctx, m)),
    );
    sharedPostMsgs.forEach((m, i) => {
      previewMap.set(m._id, previews[i]);
    });
  }
  
  return messages.map(m => {
    const sender = senderCache.get(m.senderId);
    return {
      _id: m._id,
      senderId: m.senderId,
      senderName: sender?.name ?? "Unknown",
      senderAvatarUrl: getUserAvatarUrl(sender, urlCache),
      type: m.type,
      text: m.text,
      mediaUrl: m.mediaStorageId ? (urlCache.get(m.mediaStorageId) ?? undefined) : m.mediaUrl,
      mediaDuration: m.mediaDuration,
      sharedPostId: m.sharedPostId,
      sharedPostPreview: previewMap.get(m._id),
      isMe: m.senderId === myUserId,
      createdAt: m.createdAt,
    };
  });
}

// Get conversations list (DMs) - optimized
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
    
    // Filter to my conversations first
    const myConvos = allConvos.filter(
      c => c.type === "direct" && c.participantIds?.includes(myUserId),
    );
    
    // Batch-fetch all other users + last messages in parallel
    const otherUserIds = myConvos.map(c => {
      const otherId = c.participantIds?.find(id => id !== myUserId);
      return otherId as Id<"users">;
    }).filter(Boolean);
    
    const [userCache, lastMessages] = await Promise.all([
      batchGetUsers(ctx, otherUserIds),
      Promise.all(
        myConvos.map(c =>
          ctx.db.query("messages")
            .withIndex("by_conversationId", q => q.eq("conversationId", c._id))
            .order("desc")
            .first()
        ),
      ),
    ]);
    
    // Batch-fetch avatar URLs
    const avatarStorageIds = [...userCache.values()]
      .filter((u): u is Doc<"users"> => !!u?.avatarStorageId)
      .map(u => u.avatarStorageId!);
    const urlCache = await batchGetStorageUrls(ctx, avatarStorageIds);
    
    return myConvos.map((c, i) => {
      const otherId = c.participantIds?.find(id => id !== myUserId);
      const other = otherId ? userCache.get(otherId) : null;
      const lastMsg = lastMessages[i];
      return {
        _id: c._id,
        type: c.type,
        otherUserId: otherId,
        otherUserName: other?.name,
        otherUserAvatarUrl: getUserAvatarUrl(other, urlCache),
        lastMessage: lastMsg?.text ?? (lastMsg?.type === "image" ? "🖼 Photo" : lastMsg?.type === "voice" ? "🎙 Voice" : undefined),
        lastMessageAt: c.lastMessageAt,
        unreadCount: 0,
      };
    });
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

// Get messages for conversation (optimized)
export const getMessages = authQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.array(messageReturnValidator),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    const messages = await ctx.db.query("messages")
      .withIndex("by_conversationId", q => q.eq("conversationId", args.conversationId))
      .order("asc")
      .take(100);
    return enrichMessagesOptimized(ctx, messages, myUserId);
  },
});

// Send message
export const sendMessage = authMutation({
  args: {
    conversationId: v.id("conversations"),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("voice"), v.literal("post_share")),
    text: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaDuration: v.optional(v.number()),
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
      mediaDuration: args.mediaDuration,
      sharedPostId: args.sharedPostId,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, { lastMessageAt: Date.now() });
    return msgId;
  },
});

// Group messages (optimized)
export const getGroupMessages = authQuery({
  args: { groupId: v.id("groups") },
  returns: v.array(messageReturnValidator),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    const conv = await ctx.db.query("conversations")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .unique();
    if (!conv) return [];
    const messages = await ctx.db.query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
      .order("desc")
      .take(100);
    return enrichMessagesOptimized(ctx, messages, myUserId);
  },
});

// Send group message
export const sendGroupMessage = authMutation({
  args: {
    groupId: v.id("groups"),
    text: v.optional(v.string()),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("voice")),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaDuration: v.optional(v.number()),
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
      mediaDuration: args.mediaDuration,
      createdAt: Date.now(),
    });
    await ctx.db.patch(conv._id, { lastMessageAt: Date.now() });
    return msgId;
  },
});

// Generate upload URL for voice messages and media
export const generateUploadUrl = authMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get direct messages (optimized)
export const getDirectMessages = authQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.array(messageReturnValidator),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    const messages = await ctx.db.query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(100);
    return enrichMessagesOptimized(ctx, messages, myUserId);
  },
});

// Send direct message (alias for sendMessage)
export const sendDirectMessage = authMutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.optional(v.string()),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("voice")),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaDuration: v.optional(v.number()),
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
      mediaDuration: args.mediaDuration,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, { lastMessageAt: Date.now() });
    return msgId;
  },
});

// Delete own message
export const deleteMessage = authMutation({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = ctx.user._id;
    const user = await ctx.db.query("users").withIndex("by_authId", (q) => q.eq("authId", authId)).unique();
    if (!user) throw new Error("User not found");
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId !== user._id) throw new Error("Not your message");
    await ctx.db.delete(args.messageId);
    return null;
  },
});
