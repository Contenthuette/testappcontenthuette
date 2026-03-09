import { v } from "convex/values";
import { query } from "./_generated/server";
import { authMutation } from "./functions";

export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("partners"),
    businessName: v.string(),
    shortText: v.string(),
    thumbnailUrl: v.optional(v.string()),
    city: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const partners = await ctx.db.query("partners")
      .withIndex("by_isActive", q => q.eq("isActive", true))
      .order("desc")
      .take(50);
    const results = [];
    for (const p of partners) {
      results.push({
        _id: p._id,
        businessName: p.businessName,
        shortText: p.shortText,
        thumbnailUrl: p.thumbnailStorageId ? await ctx.storage.getUrl(p.thumbnailStorageId) ?? undefined : p.thumbnailUrl,
        city: p.city,
        isActive: p.isActive,
        createdAt: p.createdAt,
      });
    }
    return results;
  },
});

export const getById = query({
  args: { partnerId: v.id("partners") },
  returns: v.union(v.null(), v.object({
    _id: v.id("partners"),
    businessName: v.string(),
    shortText: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const p = await ctx.db.get(args.partnerId);
    if (!p) return null;
    return {
      ...p,
      thumbnailUrl: p.thumbnailStorageId ? await ctx.storage.getUrl(p.thumbnailStorageId) ?? undefined : p.thumbnailUrl,
      mediaUrl: p.mediaStorageId ? await ctx.storage.getUrl(p.mediaStorageId) ?? undefined : p.mediaUrl,
    };
  },
});
