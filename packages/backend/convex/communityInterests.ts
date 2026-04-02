import { v } from "convex/values";
import { query } from "./_generated/server";
import { authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";

/** Search community interests by name */
export const search = query({
  args: { query: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("communityInterests"),
      name: v.string(),
      usageCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const q = args.query.trim();
    if (!q) {
      // Return popular interests
      const all = await ctx.db
        .query("communityInterests")
        .order("desc")
        .take(50);
      return all
        .sort((a, b) => b.usageCount - a.usageCount)
        .map((i) => ({ _id: i._id, name: i.name, usageCount: i.usageCount }));
    }

    const results = await ctx.db
      .query("communityInterests")
      .withSearchIndex("search_name", (s) => s.search("name", q))
      .take(20);

    return results.map((i) => ({ _id: i._id, name: i.name, usageCount: i.usageCount }));
  },
});

/** Create a new community interest (if it doesn't exist) */
export const create = authMutation({
  args: { name: v.string() },
  returns: v.id("communityInterests"),
  handler: async (ctx, args) => {
    const trimmed = args.name.trim();
    if (!trimmed || trimmed.length > 40) {
      throw new Error("Interesse muss zwischen 1 und 40 Zeichen lang sein.");
    }

    // Check if interest already exists (case-insensitive via search)
    const existing = await ctx.db
      .query("communityInterests")
      .withIndex("by_name", (q) => q.eq("name", trimmed))
      .first();

    if (existing) {
      return existing._id;
    }

    const userId = ctx.user._id;
    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .unique();
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("communityInterests", {
      name: trimmed,
      createdByUserId: user._id,
      usageCount: 1,
      createdAt: Date.now(),
    });
  },
});

/** Increment usage count when a user selects an interest */
export const incrementUsage = authMutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("communityInterests")
      .withIndex("by_name", (q) => q.eq("name", args.name.trim()))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { usageCount: existing.usageCount + 1 });
    }
    return null;
  },
});
