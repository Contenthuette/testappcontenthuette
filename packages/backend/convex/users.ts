import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Helper: get user by authId
async function getUserByAuthId(ctx: any, authId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_authId", (q: any) => q.eq("authId", authId))
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
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const authId = ctx.user._id;
    const user = await getUserByAuthId(ctx, authId);
    if (!user) return null;
    return {
      ...user,
      avatarUrl: user.avatarStorageId ? await ctx.storage.getUrl(user.avatarStorageId) : user.avatarUrl,
      bannerUrl: user.bannerStorageId ? await ctx.storage.getUrl(user.bannerStorageId) : user.bannerUrl,
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
    const isAdmin = args.email.toLowerCase() === "live@z-social.com";
    return await ctx.db.insert("users", {
      authId,
      email: args.email,
      name: args.name,
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = ctx.user._id;
    const user = await getUserByAuthId(ctx, authId);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      ...args,
      onboardingComplete: true,
      lastActiveAt: Date.now(),
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
    const authId = ctx.user._id;
    const user = await getUserByAuthId(ctx, authId);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, args);
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
    bio: v.optional(v.string()),
    county: v.optional(v.string()),
    city: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    role: v.union(v.literal("user"), v.literal("admin")),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      avatarUrl: user.avatarStorageId ? await ctx.storage.getUrl(user.avatarStorageId) ?? undefined : user.avatarUrl,
      bio: user.bio,
      county: user.county,
      city: user.city,
      interests: user.interests,
      role: user.role,
      createdAt: user.createdAt,
    };
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
    if (!args.query.trim()) return [];
    const allUsers = await ctx.db.query("users").take(200);
    const q = args.query.toLowerCase();
    const matched = allUsers.filter(u => u.name.toLowerCase().includes(q));
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

// Block user
export const blockUser = authMutation({
  args: { blockedId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = ctx.user._id;
    const user = await getUserByAuthId(ctx, authId);
    if (!user) throw new Error("User not found");
    const existing = await ctx.db.query("blockedUsers")
      .withIndex("by_blockerId_and_blockedId", q => q.eq("blockerId", user._id).eq("blockedId", args.blockedId))
      .unique();
    if (!existing) {
      await ctx.db.insert("blockedUsers", {
        blockerId: user._id,
        blockedId: args.blockedId,
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
