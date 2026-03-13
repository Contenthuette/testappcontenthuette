import { v } from "convex/values";
import { query } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";

export const generateUploadUrl = authMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

async function getMyUserId(ctx: any): Promise<Id<"users"> | null> {
  const authId = ctx.user._id;
  const user = await ctx.db.query("users").withIndex("by_authId", (q: any) => q.eq("authId", authId)).unique();
  return user?._id ?? null;
}

// Feed - get posts with pagination
export const feed = authQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    _id: v.id("posts"),
    authorId: v.id("users"),
    authorName: v.string(),
    authorAvatarUrl: v.optional(v.string()),
    type: v.union(v.literal("photo"), v.literal("video")),
    caption: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    aspectMode: v.optional(v.union(v.literal("original"), v.literal("cropped"))),
    cropOffsetY: v.optional(v.number()),
    mediaAspectRatio: v.optional(v.number()),
    likeCount: v.number(),
    commentCount: v.number(),
    isLiked: v.boolean(),
    isSaved: v.boolean(),
    isPinned: v.boolean(),
    isAnnouncement: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    const limit = args.limit ?? 30;
    
    // Get pinned/announcements first
    const pinned = await ctx.db.query("posts")
      .withIndex("by_isPinned", q => q.eq("isPinned", true))
      .order("desc")
      .take(5);
    
    // Get regular posts
    const regular = await ctx.db.query("posts")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
    
    // Combine, pinned first, avoid duplicates
    const pinnedIds = new Set(pinned.map(p => p._id));
    const allPosts = [...pinned, ...regular.filter(p => !pinnedIds.has(p._id))];
    
    const results = [];
    for (const post of allPosts) {
      const author = await ctx.db.get(post.authorId);
      let isLiked = false;
      let isSaved = false;
      if (myUserId) {
        const like = await ctx.db.query("likes")
          .withIndex("by_postId_and_userId", q => q.eq("postId", post._id).eq("userId", myUserId))
          .unique();
        isLiked = !!like;
        const saved = await ctx.db.query("savedPosts")
          .withIndex("by_postId_and_userId", q => q.eq("postId", post._id).eq("userId", myUserId))
          .unique();
        isSaved = !!saved;
      }
      results.push({
        _id: post._id,
        authorId: post.authorId,
        authorName: author?.name ?? "Unknown",
        authorAvatarUrl: author?.avatarStorageId ? await ctx.storage.getUrl(author.avatarStorageId) ?? undefined : author?.avatarUrl,
        type: post.type,
        caption: post.caption,
        mediaUrl: post.mediaStorageId ? await ctx.storage.getUrl(post.mediaStorageId) ?? undefined : post.mediaUrl,
        thumbnailUrl: post.thumbnailStorageId ? await ctx.storage.getUrl(post.thumbnailStorageId) ?? undefined : post.thumbnailUrl,
        aspectMode: post.aspectMode,
        cropOffsetY: post.cropOffsetY,
        mediaAspectRatio: post.mediaAspectRatio,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        isLiked,
        isSaved,
        isPinned: post.isPinned,
        isAnnouncement: post.isAnnouncement,
        createdAt: post.createdAt,
      });
    }
    return results;
  },
});

// Get single post by ID
export const getById = authQuery({
  args: { postId: v.id("posts") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("posts"),
      authorId: v.id("users"),
      authorName: v.string(),
      authorAvatarUrl: v.optional(v.string()),
      type: v.union(v.literal("photo"), v.literal("video")),
      caption: v.optional(v.string()),
      mediaUrl: v.optional(v.string()),
      aspectMode: v.optional(v.union(v.literal("original"), v.literal("cropped"))),
      cropOffsetY: v.optional(v.number()),
      mediaAspectRatio: v.optional(v.number()),
      likeCount: v.number(),
      commentCount: v.number(),
      isLiked: v.boolean(),
      isSaved: v.boolean(),
      isPinned: v.boolean(),
      isAnnouncement: v.boolean(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    const myUserId = await getMyUserId(ctx);
    const author = await ctx.db.get(post.authorId);

    let isLiked = false;
    let isSaved = false;
    if (myUserId) {
      const like = await ctx.db
        .query("likes")
        .withIndex("by_postId_and_userId", (q) =>
          q.eq("postId", post._id).eq("userId", myUserId),
        )
        .unique();
      isLiked = !!like;
      const saved = await ctx.db
        .query("savedPosts")
        .withIndex("by_postId_and_userId", (q) =>
          q.eq("postId", post._id).eq("userId", myUserId),
        )
        .unique();
      isSaved = !!saved;
    }

    return {
      _id: post._id,
      authorId: post.authorId,
      authorName: author?.name ?? "Unknown",
      authorAvatarUrl: author?.avatarStorageId
        ? ((await ctx.storage.getUrl(author.avatarStorageId)) ?? undefined)
        : author?.avatarUrl,
      type: post.type,
      caption: post.caption,
      mediaUrl: post.mediaStorageId
        ? ((await ctx.storage.getUrl(post.mediaStorageId)) ?? undefined)
        : post.mediaUrl,
      aspectMode: post.aspectMode,
      cropOffsetY: post.cropOffsetY,
      mediaAspectRatio: post.mediaAspectRatio,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      isLiked,
      isSaved,
      isPinned: post.isPinned,
      isAnnouncement: post.isAnnouncement,
      createdAt: post.createdAt,
    };
  },
});

// Create post
export const create = authMutation({
  args: {
    type: v.union(v.literal("photo"), v.literal("video")),
    caption: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),
    thumbnailStorageId: v.optional(v.id("_storage")),
    aspectMode: v.optional(v.union(v.literal("original"), v.literal("cropped"))),
    cropOffsetY: v.optional(v.number()),
    mediaAspectRatio: v.optional(v.number()),
    isAnnouncement: v.optional(v.boolean()),
  },
  returns: v.id("posts"),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const user = await ctx.db.get(myUserId);
    const isAdmin = user?.role === "admin";
    const isAnnouncement = args.isAnnouncement && isAdmin;
    return await ctx.db.insert("posts", {
      authorId: myUserId,
      type: args.type,
      caption: args.caption,
      mediaStorageId: args.mediaStorageId,
      thumbnailStorageId: args.thumbnailStorageId,
      aspectMode: args.aspectMode,
      cropOffsetY: args.cropOffsetY,
      mediaAspectRatio: args.mediaAspectRatio,
      likeCount: 0,
      commentCount: 0,
      isPinned: isAnnouncement ?? false,
      isAnnouncement: isAnnouncement ?? false,
      createdAt: Date.now(),
    });
  },
});

// Like
export const toggleLike = authMutation({
  args: { postId: v.id("posts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const existing = await ctx.db.query("likes")
      .withIndex("by_postId_and_userId", q => q.eq("postId", args.postId).eq("userId", myUserId))
      .unique();
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");
    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.postId, { likeCount: Math.max(0, post.likeCount - 1) });
    } else {
      await ctx.db.insert("likes", { postId: args.postId, userId: myUserId, createdAt: Date.now() });
      await ctx.db.patch(args.postId, { likeCount: post.likeCount + 1 });
    }
    return null;
  },
});

// Save
export const toggleSave = authMutation({
  args: { postId: v.id("posts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const existing = await ctx.db.query("savedPosts")
      .withIndex("by_postId_and_userId", q => q.eq("postId", args.postId).eq("userId", myUserId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("savedPosts", { postId: args.postId, userId: myUserId, createdAt: Date.now() });
    }
    return null;
  },
});

// Comments
export const getComments = query({
  args: { postId: v.id("posts"), currentUserId: v.optional(v.id("users")) },
  returns: v.array(v.object({
    _id: v.id("comments"),
    authorId: v.id("users"),
    authorName: v.string(),
    authorAvatarUrl: v.optional(v.string()),
    text: v.string(),
    likeCount: v.number(),
    isLiked: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const comments = await ctx.db.query("comments")
      .withIndex("by_postId", q => q.eq("postId", args.postId))
      .order("desc")
      .take(100);
    const results = [];
    for (const c of comments) {
      const author = await ctx.db.get(c.authorId);
      let isLiked = false;
      if (args.currentUserId) {
        const existing = await ctx.db.query("commentLikes")
          .withIndex("by_commentId_and_userId", q => q.eq("commentId", c._id).eq("userId", args.currentUserId!))
          .first();
        isLiked = !!existing;
      }
      results.push({
        _id: c._id,
        authorId: c.authorId,
        authorName: author?.name ?? "Unknown",
        authorAvatarUrl: author?.avatarStorageId ? await ctx.storage.getUrl(author.avatarStorageId) ?? undefined : author?.avatarUrl,
        text: c.text,
        likeCount: c.likeCount ?? 0,
        isLiked,
        createdAt: c.createdAt,
      });
    }
    return results;
  },
});

export const addComment = authMutation({
  args: { postId: v.id("posts"), text: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    await ctx.db.insert("comments", { postId: args.postId, authorId: myUserId, text: args.text, likeCount: 0, createdAt: Date.now() });
    const post = await ctx.db.get(args.postId);
    if (post) {
      await ctx.db.patch(args.postId, { commentCount: post.commentCount + 1 });
    }
    return null;
  },
});

export const toggleCommentLike = authMutation({
  args: { commentId: v.id("comments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const existing = await ctx.db.query("commentLikes")
      .withIndex("by_commentId_and_userId", q => q.eq("commentId", args.commentId).eq("userId", myUserId))
      .first();
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.commentId, { likeCount: Math.max(0, (comment.likeCount ?? 0) - 1) });
    } else {
      await ctx.db.insert("commentLikes", { commentId: args.commentId, userId: myUserId, createdAt: Date.now() });
      await ctx.db.patch(args.commentId, { likeCount: (comment.likeCount ?? 0) + 1 });
    }
    return null;
  },
});

export const likeComment = authMutation({
  args: { commentId: v.id("comments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const existing = await ctx.db.query("commentLikes")
      .withIndex("by_commentId_and_userId", q => q.eq("commentId", args.commentId).eq("userId", myUserId))
      .first();
    if (existing) return null;
    await ctx.db.insert("commentLikes", { commentId: args.commentId, userId: myUserId, createdAt: Date.now() });
    const comment = await ctx.db.get(args.commentId);
    if (comment) {
      await ctx.db.patch(args.commentId, { likeCount: (comment.likeCount ?? 0) + 1 });
    }
    return null;
  },
});

export const unlikeComment = authMutation({
  args: { commentId: v.id("comments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const existing = await ctx.db.query("commentLikes")
      .withIndex("by_commentId_and_userId", q => q.eq("commentId", args.commentId).eq("userId", myUserId))
      .first();
    if (!existing) return null;
    await ctx.db.delete(existing._id);
    const comment = await ctx.db.get(args.commentId);
    if (comment) {
      await ctx.db.patch(args.commentId, { likeCount: Math.max(0, (comment.likeCount ?? 0) - 1) });
    }
    return null;
  },
});

// Saved posts
export const getSavedPosts = authQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("posts"),
    type: v.union(v.literal("photo"), v.literal("video")),
    caption: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    authorName: v.string(),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) return [];
    const saved = await ctx.db.query("savedPosts")
      .withIndex("by_userId", q => q.eq("userId", myUserId))
      .order("desc")
      .take(50);
    const results = [];
    for (const s of saved) {
      const post = await ctx.db.get(s.postId);
      if (!post) continue;
      const author = await ctx.db.get(post.authorId);
      results.push({
        _id: post._id,
        type: post.type,
        caption: post.caption,
        mediaUrl: post.mediaStorageId ? await ctx.storage.getUrl(post.mediaStorageId) ?? undefined : post.mediaUrl,
        authorName: author?.name ?? "Unknown",
        createdAt: post.createdAt,
      });
    }
    return results;
  },
});

// Get user posts
export const getUserPosts = query({
  args: { userId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("posts"),
    type: v.union(v.literal("photo"), v.literal("video")),
    mediaUrl: v.optional(v.string()),
    likeCount: v.number(),
    commentCount: v.number(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const posts = await ctx.db.query("posts")
      .withIndex("by_authorId", q => q.eq("authorId", args.userId))
      .order("desc")
      .take(50);
    const results = [];
    for (const p of posts) {
      results.push({
        _id: p._id,
        type: p.type,
        mediaUrl: p.mediaStorageId ? await ctx.storage.getUrl(p.mediaStorageId) ?? undefined : p.mediaUrl,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        createdAt: p.createdAt,
      });
    }
    return results;
  },
});
