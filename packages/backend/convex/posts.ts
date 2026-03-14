import { v } from "convex/values";
import { query } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import type { Id, Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

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

// ── Shared helpers ──────────────────────────────────────────────
type AuthorCache = Map<Id<"users">, Doc<"users"> | null>;
type UrlCache = Map<Id<"_storage">, string | null>;

async function batchGetAuthors(
  ctx: { db: QueryCtx["db"] },
  ids: Array<Id<"users">>,
): Promise<AuthorCache> {
  const unique = [...new Set(ids)];
  const cache: AuthorCache = new Map();
  await Promise.all(
    unique.map(async (id) => {
      cache.set(id, await ctx.db.get(id));
    }),
  );
  return cache;
}

async function batchGetUrls(
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

function getAuthorAvatarUrl(author: Doc<"users"> | null | undefined, urlCache: UrlCache): string | undefined {
  if (!author) return undefined;
  if (author.avatarStorageId) return urlCache.get(author.avatarStorageId) ?? undefined;
  return author.avatarUrl;
}

// Feed - get posts with pagination (optimized with parallel fetches)
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
    cropOffsetX: v.optional(v.number()),
    cropZoom: v.optional(v.number()),
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
    
    // Fetch pinned + regular in parallel
    const [pinned, regular] = await Promise.all([
      ctx.db.query("posts")
        .withIndex("by_isPinned", q => q.eq("isPinned", true))
        .order("desc")
        .take(5),
      ctx.db.query("posts")
        .withIndex("by_createdAt")
        .order("desc")
        .take(limit),
    ]);
    
    const pinnedIds = new Set(pinned.map(p => p._id));
    const allPosts = [...pinned, ...regular.filter(p => !pinnedIds.has(p._id))];
    
    // Batch-fetch all authors + storage URLs in parallel
    const authorIds = allPosts.map(p => p.authorId);
    const storageIds = allPosts.flatMap(p => [
      p.mediaStorageId,
      p.thumbnailStorageId,
    ]);
    const avatarStorageIds = [...new Set(authorIds)];
    
    const [authorCache, urlCache] = await Promise.all([
      batchGetAuthors(ctx, authorIds),
      (async () => {
        // We need author avatarStorageIds too, so first get authors
        const authors = await batchGetAuthors(ctx, authorIds);
        const allStorageIds = [
          ...storageIds,
          ...[...authors.values()]
            .filter((a): a is Doc<"users"> => !!a?.avatarStorageId)
            .map(a => a.avatarStorageId!),
        ];
        return batchGetUrls(ctx, allStorageIds);
      })(),
    ]);
    
    // Actually use the second result's author data too
    // Re-fetch author cache from the parallel call that already ran
    const authors = authorCache;
    
    // Batch-fetch all like/save checks in parallel
    const likeChecks = myUserId
      ? await Promise.all(
          allPosts.map(p =>
            ctx.db.query("likes")
              .withIndex("by_postId_and_userId", q => q.eq("postId", p._id).eq("userId", myUserId))
              .unique()
          ),
        )
      : allPosts.map(() => null);
    
    const saveChecks = myUserId
      ? await Promise.all(
          allPosts.map(p =>
            ctx.db.query("savedPosts")
              .withIndex("by_postId_and_userId", q => q.eq("postId", p._id).eq("userId", myUserId))
              .unique()
          ),
        )
      : allPosts.map(() => null);
    
    return allPosts.map((post, i) => {
      const author = authors.get(post.authorId);
      return {
        _id: post._id,
        authorId: post.authorId,
        authorName: author?.name ?? "Unknown",
        authorAvatarUrl: getAuthorAvatarUrl(author, urlCache),
        type: post.type,
        caption: post.caption,
        mediaUrl: post.mediaStorageId
          ? (urlCache.get(post.mediaStorageId) ?? undefined)
          : post.mediaUrl,
        thumbnailUrl: post.thumbnailStorageId
          ? (urlCache.get(post.thumbnailStorageId) ?? undefined)
          : post.thumbnailUrl,
        aspectMode: post.aspectMode,
        cropOffsetY: post.cropOffsetY,
        cropOffsetX: post.cropOffsetX,
        cropZoom: post.cropZoom,
        mediaAspectRatio: post.mediaAspectRatio,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        isLiked: !!likeChecks[i],
        isSaved: !!saveChecks[i],
        isPinned: post.isPinned,
        isAnnouncement: post.isAnnouncement,
        createdAt: post.createdAt,
      };
    });
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
      thumbnailUrl: v.optional(v.string()),
      aspectMode: v.optional(v.union(v.literal("original"), v.literal("cropped"))),
      cropOffsetY: v.optional(v.number()),
      cropOffsetX: v.optional(v.number()),
      cropZoom: v.optional(v.number()),
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
    
    // Parallel: author + like + save + URLs
    const [author, like, saved, mediaUrl, thumbnailUrl] = await Promise.all([
      ctx.db.get(post.authorId),
      myUserId
        ? ctx.db.query("likes")
            .withIndex("by_postId_and_userId", q => q.eq("postId", post._id).eq("userId", myUserId))
            .unique()
        : null,
      myUserId
        ? ctx.db.query("savedPosts")
            .withIndex("by_postId_and_userId", q => q.eq("postId", post._id).eq("userId", myUserId))
            .unique()
        : null,
      post.mediaStorageId ? ctx.storage.getUrl(post.mediaStorageId) : null,
      post.thumbnailStorageId ? ctx.storage.getUrl(post.thumbnailStorageId) : null,
    ]);
    
    const avatarUrl = author?.avatarStorageId
      ? await ctx.storage.getUrl(author.avatarStorageId)
      : null;

    return {
      _id: post._id,
      authorId: post.authorId,
      authorName: author?.name ?? "Unknown",
      authorAvatarUrl: avatarUrl ?? author?.avatarUrl,
      type: post.type,
      caption: post.caption,
      mediaUrl: mediaUrl ?? post.mediaUrl,
      thumbnailUrl: thumbnailUrl ?? post.thumbnailUrl,
      aspectMode: post.aspectMode,
      cropOffsetY: post.cropOffsetY,
      cropOffsetX: post.cropOffsetX,
      cropZoom: post.cropZoom,
      mediaAspectRatio: post.mediaAspectRatio,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      isLiked: !!like,
      isSaved: !!saved,
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
    cropOffsetX: v.optional(v.number()),
    cropZoom: v.optional(v.number()),
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
      cropOffsetX: args.cropOffsetX,
      cropZoom: args.cropZoom,
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

// Comments (optimized)
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
    
    if (comments.length === 0) return [];
    
    // Batch-fetch all authors in parallel
    const authorIds = comments.map(c => c.authorId);
    const authorCache = await batchGetAuthors(ctx, authorIds);
    
    // Batch avatar URLs
    const avatarStorageIds = [...authorCache.values()]
      .filter((a): a is Doc<"users"> => !!a?.avatarStorageId)
      .map(a => a.avatarStorageId!);
    const urlCache = await batchGetUrls(ctx, avatarStorageIds);
    
    // Batch-fetch like checks in parallel
    const currentUserId = args.currentUserId;
    const likeChecks = currentUserId
      ? await Promise.all(
          comments.map(c =>
            ctx.db.query("commentLikes")
              .withIndex("by_commentId_and_userId", q => q.eq("commentId", c._id).eq("userId", currentUserId))
              .first()
          ),
        )
      : comments.map(() => null);
    
    return comments.map((c, i) => {
      const author = authorCache.get(c.authorId);
      return {
        _id: c._id,
        authorId: c.authorId,
        authorName: author?.name ?? "Unknown",
        authorAvatarUrl: getAuthorAvatarUrl(author, urlCache),
        text: c.text,
        likeCount: c.likeCount ?? 0,
        isLiked: !!likeChecks[i],
        createdAt: c.createdAt,
      };
    });
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

export const deleteComment = authMutation({
  args: { commentId: v.id("comments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = ctx.user._id;
    const user = await ctx.db.query("users").withIndex("by_authId", (q) => q.eq("authId", authId)).unique();
    if (!user) throw new Error("User not found");
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    if (comment.authorId !== user._id) throw new Error("Not your comment");
    await ctx.db.delete(args.commentId);
    // Decrement comment count on the post
    const post = await ctx.db.get(comment.postId);
    if (post && (post.commentCount ?? 0) > 0) {
      await ctx.db.patch(comment.postId, { commentCount: (post.commentCount ?? 1) - 1 });
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

// Get user posts (optimized)
export const getUserPosts = query({
  args: { userId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("posts"),
    type: v.union(v.literal("photo"), v.literal("video")),
    mediaUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    aspectMode: v.optional(v.union(v.literal("original"), v.literal("cropped"))),
    cropOffsetY: v.optional(v.number()),
    cropOffsetX: v.optional(v.number()),
    cropZoom: v.optional(v.number()),
    mediaAspectRatio: v.optional(v.number()),
    likeCount: v.number(),
    commentCount: v.number(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const posts = await ctx.db.query("posts")
      .withIndex("by_authorId", q => q.eq("authorId", args.userId))
      .order("desc")
      .take(50);
    
    if (posts.length === 0) return [];
    
    // Batch-fetch all storage URLs in parallel
    const allStorageIds = posts.flatMap(p => [p.mediaStorageId, p.thumbnailStorageId]);
    const urlCache = await batchGetUrls(ctx, allStorageIds);
    
    return posts.map(p => ({
      _id: p._id,
      type: p.type,
      mediaUrl: p.mediaStorageId ? (urlCache.get(p.mediaStorageId) ?? undefined) : p.mediaUrl,
      thumbnailUrl: p.thumbnailStorageId ? (urlCache.get(p.thumbnailStorageId) ?? undefined) : p.thumbnailUrl,
      aspectMode: p.aspectMode,
      cropOffsetY: p.cropOffsetY,
      cropOffsetX: p.cropOffsetX,
      cropZoom: p.cropZoom,
      mediaAspectRatio: p.mediaAspectRatio,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      createdAt: p.createdAt,
    }));
  },
});
