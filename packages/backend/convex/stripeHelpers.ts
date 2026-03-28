import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// ── Queries ─────────────────────────────────────────────────────

// Public: check pending subscription status by session token
export const getPendingByToken = query({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
      plan: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("pendingSubscriptions")
      .withIndex("by_sessionToken", (q) => q.eq("sessionToken", args.sessionToken))
      .unique();
    if (!pending) return null;
    return { status: pending.status, plan: pending.plan };
  },
});

// Internal: get pending subscription by session token
export const getByToken = internalQuery({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("pendingSubscriptions"),
      sessionToken: v.string(),
      plan: v.string(),
      status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
      stripeSessionId: v.optional(v.string()),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
      claimedByUserId: v.optional(v.id("users")),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingSubscriptions")
      .withIndex("by_sessionToken", (q) => q.eq("sessionToken", args.sessionToken))
      .unique();
  },
});

// Internal: get pending subscription by Stripe session ID
export const getByStripeSessionId = internalQuery({
  args: { stripeSessionId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("pendingSubscriptions"),
      sessionToken: v.string(),
      plan: v.string(),
      status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
      stripeSessionId: v.optional(v.string()),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
      claimedByUserId: v.optional(v.id("users")),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingSubscriptions")
      .withIndex("by_stripeSessionId", (q) => q.eq("stripeSessionId", args.stripeSessionId))
      .unique();
  },
});

// ── Mutations ───────────────────────────────────────────────────

// Internal: create a pending subscription record
export const create = internalMutation({
  args: {
    sessionToken: v.string(),
    plan: v.string(),
    stripeSessionId: v.string(),
  },
  returns: v.id("pendingSubscriptions"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("pendingSubscriptions", {
      sessionToken: args.sessionToken,
      plan: args.plan,
      status: "pending",
      stripeSessionId: args.stripeSessionId,
      createdAt: Date.now(),
    });
  },
});

// Internal: mark a pending subscription as completed
export const markCompleted = internalMutation({
  args: {
    stripeSessionId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("pendingSubscriptions")
      .withIndex("by_stripeSessionId", (q) => q.eq("stripeSessionId", args.stripeSessionId))
      .unique();
    if (!pending) return null;
    await ctx.db.patch(pending._id, {
      status: "completed",
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
    });
    return null;
  },
});

// Internal: mark a pending subscription as failed
export const markFailed = internalMutation({
  args: { stripeSessionId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("pendingSubscriptions")
      .withIndex("by_stripeSessionId", (q) => q.eq("stripeSessionId", args.stripeSessionId))
      .unique();
    if (!pending) return null;
    await ctx.db.patch(pending._id, { status: "failed" });
    return null;
  },
});

// Helper to get user by authId
async function getUserByAuthId(ctx: { db: QueryCtx["db"] }, authId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", authId))
    .unique();
}

// Public: claim a pending subscription after signup/login
export const claimSubscription = mutation({
  args: { sessionToken: v.string() },
  returns: v.union(v.literal("claimed"), v.literal("not_found"), v.literal("not_completed"), v.literal("no_user")),
  handler: async (ctx, args) => {
    // Check auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return "no_user" as const;
    const authId = identity.subject.split("|")[0]?.trim();
    if (!authId) return "no_user" as const;

    const user = await getUserByAuthId(ctx, authId);
    if (!user) return "no_user" as const;

    const pending = await ctx.db
      .query("pendingSubscriptions")
      .withIndex("by_sessionToken", (q) => q.eq("sessionToken", args.sessionToken))
      .unique();
    if (!pending) return "not_found" as const;
    if (pending.status !== "completed") return "not_completed" as const;
    if (pending.claimedByUserId) return "claimed" as const;

    const plan = pending.plan;
    const expiresAt = plan === "yearly"
      ? Date.now() + 365 * 24 * 60 * 60 * 1000
      : Date.now() + 30 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(user._id, {
      subscriptionStatus: "active",
      subscriptionPlan: plan,
      subscriptionExpiresAt: expiresAt,
      stripeCustomerId: pending.stripeCustomerId,
      stripeSubscriptionId: pending.stripeSubscriptionId,
    });

    await ctx.db.patch(pending._id, { claimedByUserId: user._id });

    return "claimed" as const;
  },
});

// Internal: update user subscription status via Stripe customer ID (for webhooks)
export const updateSubscriptionByCustomer = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    status: v.union(v.literal("active"), v.literal("canceled"), v.literal("expired")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripeCustomerId", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .unique();
    if (!user) {
      console.warn("No user found for Stripe customer:", args.stripeCustomerId);
      return null;
    }
    await ctx.db.patch(user._id, { subscriptionStatus: args.status });
    return null;
  },
});
