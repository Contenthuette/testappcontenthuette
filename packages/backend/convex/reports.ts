import { v } from "convex/values";
import { authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";

async function getMyUserId(ctx: any): Promise<Id<"users"> | null> {
  const authId = ctx.user._id;
  const user = await ctx.db.query("users").withIndex("by_authId", (q: any) => q.eq("authId", authId)).unique();
  return user?._id ?? null;
}

export const create = authMutation({
  args: {
    type: v.union(v.literal("user"), v.literal("post"), v.literal("group"), v.literal("partner")),
    targetId: v.string(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    await ctx.db.insert("reports", {
      reporterId: myUserId,
      type: args.type,
      targetId: args.targetId,
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });
    return null;
  },
});
