import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation, internalMutation } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { buildUserSearchText, normalizeSearchQuery } from "./searchText";
import { paginatedResultValidator } from "./pagination";
import { rateLimiter, INPUT_LIMITS, validateStringLength, sanitizeText } from "./rateLimit";

// Helper: get user by authId
async function getUserByAuthId(ctx: { db: QueryCtx["db"] }, authId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", authId))
    .unique();
}

// Public: get current user profile
export const me = authQuery({
  args: {},
  returns: v.union(v.null(), v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    authId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    county: v.optional(v.string()),
    city: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"), v.literal("prefer_not_to_say"))),
    birthDate: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    role: v.union(v.literal("user"), v.literal("admin")),
    onboardingComplete: v.boolean(),
    subscriptionStatus: v.union(v.literal("none"), v.literal("active"), v.literal("canceled"), v.literal("expired")),
    subscriptionPlan: v.optional(v.string()),
    subscriptionExpiresAt: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),
    notificationPreferences: v.optional(v.object({
      calls: v.boolean(),
      groupCalls: v.boolean(),
      directMessages: v.boolean(),
      groupMessages: v.boolean(),
      announcements: v.boolean(),
    })),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const authId = ctx.user._id;
    const user = await getUserByAuthId(ctx, authId);
    if (!user) return null;
    return {
      _id: user._id,
      _creationTime: user._creationTime,
      authId: user.authId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarStorageId ? await ctx.storage.getUrl(user.avatarStorageId) ?? undefined : user.avatarUrl,
      bannerUrl: user.bannerStorageId ? await ctx.storage.getUrl(user.bannerStorageId) ?? undefined : user.bannerUrl,
      bio: user.bio,
      county: user.county,
      city: user.city,
      gender: user.gender,
      birthDate: user.birthDate,
      interests: user.interests,
      role: user.role,
      onboardingComplete: user.onboardingComplete,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      lastActiveAt: user.lastActiveAt,
      notificationPreferences: user.notificationPreferences,
      createdAt: user.createdAt,
    };
  },
});

// Public: ensure user record exists (called after auth signup)
export const ensureUser = authMutation({
  args: { name: v.string(), email: v.string() },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const authId = ctx.user._id;
    const existing = await getUserByAuthId(ctx, authId);
    if (existing) return existing._id;
    const isAdmin = args.email.toLowerCase() === "live@z-social.com" || args.email.toLowerCase() === "leif@z-social.com";
    return await ctx.db.insert("users", {
      authId,
      email: args.email,
      name: args.name,
      searchText: buildUserSearchText({ name: args.name }),
      role: isAdmin ? "admin" : "user",
      onboardingComplete: false,
      subscriptionStatus: "none",
      createdAt: Date.now(),
    });
  },
});

// Public: update subscription
export const updateSubscription = authMutation({
  args: { plan: v.string(), status: v.union(v.literal("active"), v.literal("canceled"), v.literal("expired"), v.literal("none")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = ctx.user._id;
    const user = await getUserByAuthId(ctx, authId);
    if (!user) throw new Error("User not found");
    const expiresAt = args.status === "active"
      ? Date.now() + (args.plan === "yearly" ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)
      : user.subscriptionExpiresAt;
    await ctx.db.patch(user._id, {
      subscriptionStatus: args.status,
      subscriptionPlan: args.plan,
      subscriptionExpiresAt: expiresAt,
    });
    return null;
  },
});

// Public: complete onboarding
export const completeOnboarding = authMutation({
  args: {
    county: v.optional(v.string()),
    city: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    bio: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"), v.literal("prefer_not_to_say"))),
    birthDate: v.optional(v.string()),
    notificationPreferences: v.optional(v.object({
      calls: v.boolean(),
      groupCalls: v.boolean(),
      directMessages: v.boolean(),
      groupMessages: v.boolean(),
      announcements: v.boolean(),
    })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = ctx.user._id;
    const user = await getUserByAuthId(ctx, authId);
    if (!user) throw new Error("User not found");

    const nextBio = args.bio !== undefined ? args.bio : user.bio;
    const nextCounty = args.county !== undefined ? args.county : user.county;
    const nextCity = args.city !== undefined ? args.city : user.city;
    const nextInterests = args.interests !== undefined ? args.interests : user.interests;

    await ctx.db.patch(user._id, {
      ...args,
      onboardingComplete: true,
      lastActiveAt: Date.now(),
      searchText: buildUserSearchText({
        name: user.name,
        bio: nextBio,
        county: nextCounty,
        city: nextCity,
        interests: nextInterests,
      }),
    });
    return null;
  },
});

// Public: update profile
export const updateProfile = authMutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    county: v.optional(v.string()),
    city: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"), v.literal("prefer_not_to_say"))),
    birthDate: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    avatarStorageId: v.optional(v.id("_storage")),
    bannerStorageId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "updateProfile", { key: ctx.user._id });
    validateStringLength(args.name, "Name", INPUT_LIMITS.name);
    validateStringLength(args.bio, "Bio", INPUT_LIMITS.bio);
    validateStringLength(args.county, "Landkreis", INPUT_LIMITS.county);
    validateStringLength(args.city, "Stadt", INPUT_LIMITS.city);
    const authId = ctx.user._id;
    const user = await getUserByAuthId(ctx, authId);
    if (!user) throw new Error("User not found");

    const nextName = args.name !== undefined ? args.name : user.name;
    const nextBio = args.bio !== undefined ? args.bio : user.bio;
    const nextCounty = args.county !== undefined ? args.county : user.county;
    const nextCity = args.city !== undefined ? args.city : user.city;
    const nextInterests = args.interests !== undefined ? args.interests : user.interests;

    await ctx.db.patch(user._id, {
      ...args,
      searchText: buildUserSearchText({
        name: nextName,
        bio: nextBio,
        county: nextCounty,
        city: nextCity,
        interests: nextInterests,
      }),
    });
    return null;
  },
});

// Public: get user by ID
export const getById = query({
  args: { userId: v.id("users") },
  returns: v.union(v.null(), v.object({
    _id: v.id("users"),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    county: v.optional(v.string()),
    city: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    role: v.union(v.literal("user"), v.literal("admin")),
    createdAt: v.number(),
    friendCount: v.number(),
    posts: v.array(v.object({
      _id: v.id("posts"),
      type: v.union(v.literal("photo"), v.literal("video")),
      mediaUrl: v.optional(v.string()),
      thumbnailUrl: v.optional(v.string()),
      caption: v.optional(v.string()),
      likeCount: v.number(),
      commentCount: v.number(),
      createdAt: v.number(),
    })),
  })),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Get user's posts
    const posts = await ctx.db.query("posts")
      .withIndex("by_authorId", (q) => q.eq("authorId", args.userId))
      .order("desc")
      .take(30);

    const enrichedPosts = [];
    for (const p of posts) {
      const mediaUrl = p.mediaStorageId
        ? await ctx.storage.getUrl(p.mediaStorageId) ?? undefined
        : p.mediaUrl;
      const thumbnailUrl = p.thumbnailStorageId
        ? await ctx.storage.getUrl(p.thumbnailStorageId) ?? undefined
        : p.thumbnailUrl;
      enrichedPosts.push({
        _id: p._id,
        type: p.type,
        mediaUrl,
        thumbnailUrl,
        caption: p.caption,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        createdAt: p.createdAt,
      });
    }

    // Count friends
    const friendsAsSender = await ctx.db.query("friendRequests")
      .withIndex("by_senderId", (q) => q.eq("senderId", args.userId))
      .collect();
    const friendsAsReceiver = await ctx.db.query("friendRequests")
      .withIndex("by_receiverId", (q) => q.eq("receiverId", args.userId))
      .collect();
    const friendCount = friendsAsSender.filter((r) => r.status === "accepted").length
      + friendsAsReceiver.filter((r) => r.status === "accepted").length;

    return {
      _id: user._id,
      name: user.name,
      avatarUrl: user.avatarStorageId ? await ctx.storage.getUrl(user.avatarStorageId) ?? undefined : user.avatarUrl,
      bannerUrl: user.bannerStorageId ? await ctx.storage.getUrl(user.bannerStorageId) ?? undefined : user.bannerUrl,
      bio: user.bio,
      county: user.county,
      city: user.city,
      interests: user.interests,
      role: user.role,
      createdAt: user.createdAt,
      friendCount,
      posts: enrichedPosts,
    };
  },
});

// Public: get user's group memberships with group names and roles
export const getUserGroups = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      groupId: v.id("groups"),
      groupName: v.string(),
      role: v.union(v.literal("admin"), v.literal("member")),
    }),
  ),
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const activeMemberships = memberships.filter((m) => m.status === "active");
    const results: Array<{
      groupId: Id<"groups">;
      groupName: string;
      role: "admin" | "member";
    }> = [];

    for (const m of activeMemberships) {
      const group = await ctx.db.get(m.groupId);
      if (group) {
        results.push({
          groupId: m.groupId,
          groupName: group.name,
          role: m.role,
        });
      }
    }
    return results;
  },
});

// Public: generate upload url
export const generateUploadUrl = authMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Track activity
export const trackActivity = authMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const authId = ctx.user._id;
    const user = await getUserByAuthId(ctx, authId);
    if (user) {
      await ctx.db.patch(user._id, { lastActiveAt: Date.now() });
    }
    return null;
  },
});

// Search users
export const search = authQuery({
  args: { query: v.string() },
  returns: v.array(v.object({
    _id: v.id("users"),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    city: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const normalizedQuery = normalizeSearchQuery(args.query);
    if (!normalizedQuery) return [];

    const matched = await ctx.db
      .query("users")
      .withSearchIndex("search_text", (q) => q.search("searchText", normalizedQuery))
      .take(24);

    const results: Array<{ _id: Id<"users">; name: string; avatarUrl?: string; city?: string }> = [];
    for (const u of matched.slice(0, 20)) {
      results.push({
        _id: u._id,
        name: u.name,
        avatarUrl: u.avatarStorageId ? await ctx.storage.getUrl(u.avatarStorageId) ?? undefined : u.avatarUrl,
        city: u.city,
      });
    }
    return results;
  },
});

// List all users with optional search by name & interests
export const listAll = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    searchQuery: v.optional(v.string()),
  },
  returns: paginatedResultValidator(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      avatarUrl: v.optional(v.string()),
      city: v.optional(v.string()),
      interests: v.optional(v.array(v.string())),
    }),
  ),
  handler: async (ctx, args) => {
    const authId = ctx.user._id;
    const me = await getUserByAuthId(ctx, authId);
    const myId = me?._id;

    const normalizedQuery = normalizeSearchQuery(args.searchQuery ?? "");
    const results = normalizedQuery
      ? await ctx.db
          .query("users")
          .withSearchIndex("search_text", (q) =>
            q.search("searchText", normalizedQuery),
          )
          .paginate(args.paginationOpts)
      : await ctx.db.query("users").order("desc").paginate(args.paginationOpts);

    return {
      ...results,
      page: await Promise.all(
        results.page
          .filter((user) => (myId ? user._id !== myId : true))
          .map(async (user) => ({
            _id: user._id,
            name: user.name,
            avatarUrl: user.avatarStorageId
              ? ((await ctx.storage.getUrl(user.avatarStorageId)) ?? undefined)
              : user.avatarUrl,
            city: user.city,
            interests: user.interests,
          })),
      ),
    };
  },
});

// Cancel subscription
export const cancelSubscription = authMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const authId = ctx.user._id;
    const user = await getUserByAuthId(ctx, authId);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { subscriptionStatus: "canceled" });
    return null;
  },
});

// Check if a block relationship exists in either direction
export async function isBlockedBetween(
  ctx: { db: QueryCtx["db"] },
  userA: Id<"users">,
  userB: Id<"users">,
): Promise<boolean> {
  const [aBlockedB, bBlockedA] = await Promise.all([
    ctx.db
      .query("blockedUsers")
      .withIndex("by_blockerId_and_blockedId", (q) =>
        q.eq("blockerId", userA).eq("blockedId", userB),
      )
      .first(),
    ctx.db
      .query("blockedUsers")
      .withIndex("by_blockedId_and_blockerId", (q) =>
        q.eq("blockedId", userA).eq("blockerId", userB),
      )
      .first(),
  ]);
  return aBlockedB !== null || bBlockedA !== null;
}

// Block user
export const blockUser = authMutation({
  args: { blockedUserId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "blockUser", { key: ctx.user._id });
    const authId = ctx.user._id;
    const user = await getUserByAuthId(ctx, authId);
    if (!user) throw new Error("User not found");
    const existing = await ctx.db.query("blockedUsers")
      .withIndex("by_blockerId_and_blockedId", q => q.eq("blockerId", user._id).eq("blockedId", args.blockedUserId))
      .unique();
    if (!existing) {
      await ctx.db.insert("blockedUsers", {
        blockerId: user._id,
        blockedId: args.blockedUserId,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

// Get blocked users
export const getBlockedUsers = authQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("blockedUsers"),
    blockedId: v.id("users"),
    blockedName: v.string(),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const authId = ctx.user._id;
    const user = await getUserByAuthId(ctx, authId);
    if (!user) return [];
    const blocked = await ctx.db.query("blockedUsers")
      .withIndex("by_blockerId", q => q.eq("blockerId", user._id))
      .collect();
    const results: Array<{ _id: Id<"blockedUsers">; blockedId: Id<"users">; blockedName: string; createdAt: number }> = [];
    for (const b of blocked) {
      const blockedUser = await ctx.db.get(b.blockedId);
      results.push({
        _id: b._id,
        blockedId: b.blockedId,
        blockedName: blockedUser?.name ?? "Unknown",
        createdAt: b.createdAt,
      });
    }
    return results;
  },
});

// Unblock user
export const unblockUser = authMutation({
  args: { blockId: v.id("blockedUsers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.blockId);
    return null;
  },
});
