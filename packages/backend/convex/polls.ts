import { v } from "convex/values";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

/* ── helpers ── */
async function getMyUserId(ctx: { db: QueryCtx["db"]; user: { _id: string } }): Promise<Id<"users"> | null> {
  const authId = ctx.user._id;
  const user = await ctx.db.query("users").withIndex("by_authId", (q) => q.eq("authId", authId)).unique();
  return user?._id ?? null;
}

async function isGroupMemberOrAdmin(
  db: QueryCtx["db"],
  groupId: Id<"groups">,
  userId: Id<"users">,
): Promise<boolean> {
  const membership = await db
    .query("groupMembers")
    .withIndex("by_groupId_and_userId", (q) => q.eq("groupId", groupId).eq("userId", userId))
    .unique();
  return membership?.status === "active";
}

/* ── create poll ── */
export const create = authMutation({
  args: {
    question: v.string(),
    options: v.array(v.string()),
    target: v.union(v.literal("community"), v.literal("group")),
    groupId: v.optional(v.id("groups")),
  },
  returns: v.id("polls"),
  handler: async (ctx, args) => {
    const userId = await getMyUserId(ctx);
    if (!userId) throw new Error("User not found");

    if (args.options.length < 2 || args.options.length > 5) {
      throw new Error("Eine Umfrage braucht 2–5 Optionen");
    }
    if (!args.question.trim()) {
      throw new Error("Bitte stelle eine Frage");
    }

    if (args.target === "group") {
      if (!args.groupId) throw new Error("Gruppe muss ausgewählt werden");
      const isMember = await isGroupMemberOrAdmin(ctx.db, args.groupId, userId);
      if (!isMember) throw new Error("Du musst Mitglied der Gruppe sein");
    }

    return await ctx.db.insert("polls", {
      question: args.question.trim(),
      options: args.options.map((o) => o.trim()).filter(Boolean),
      creatorId: userId,
      target: args.target,
      groupId: args.target === "group" ? args.groupId : undefined,
      totalVotes: 0,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

/* ── vote ── */
export const vote = authMutation({
  args: {
    pollId: v.id("polls"),
    optionIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getMyUserId(ctx);
    if (!userId) throw new Error("User not found");

    const poll = await ctx.db.get(args.pollId);
    if (!poll || !poll.isActive) throw new Error("Umfrage nicht gefunden");
    if (args.optionIndex < 0 || args.optionIndex >= poll.options.length) {
      throw new Error("Ungültige Option");
    }

    // Check if already voted
    const existing = await ctx.db
      .query("pollVotes")
      .withIndex("by_pollId_and_userId", (q) => q.eq("pollId", args.pollId).eq("userId", userId))
      .unique();
    if (existing) throw new Error("Du hast bereits abgestimmt");

    // If group poll, check membership
    if (poll.target === "group" && poll.groupId) {
      const isMember = await isGroupMemberOrAdmin(ctx.db, poll.groupId, userId);
      if (!isMember) throw new Error("Du musst Mitglied der Gruppe sein");
    }

    await ctx.db.insert("pollVotes", {
      pollId: args.pollId,
      userId,
      optionIndex: args.optionIndex,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.pollId, { totalVotes: poll.totalVotes + 1 });
  },
});

/* ── list community polls ── */
export const listCommunity = authQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("polls"),
      question: v.string(),
      options: v.array(v.string()),
      creatorName: v.string(),
      creatorAvatarUrl: v.optional(v.string()),
      totalVotes: v.number(),
      voteCounts: v.array(v.number()),
      myVote: v.optional(v.number()),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getMyUserId(ctx);

    const polls = await ctx.db
      .query("polls")
      .withIndex("by_target_and_createdAt", (q) => q.eq("target", "community"))
      .order("desc")
      .take(20);

    const result = [];
    for (const poll of polls) {
      const creator = await ctx.db.get(poll.creatorId);
      const votes = await ctx.db
        .query("pollVotes")
        .withIndex("by_pollId", (q) => q.eq("pollId", poll._id))
        .collect();

      // Count per option
      const voteCounts = poll.options.map(
        (_, i) => votes.filter((v) => v.optionIndex === i).length,
      );

      // User's vote
      let myVote: number | undefined;
      if (userId) {
        const myV = votes.find((v) => v.userId === userId);
        if (myV) myVote = myV.optionIndex;
      }

      result.push({
        _id: poll._id,
        question: poll.question,
        options: poll.options,
        creatorName: creator?.name ?? "Unbekannt",
        creatorAvatarUrl: creator?.avatarUrl,
        totalVotes: poll.totalVotes,
        voteCounts,
        myVote,
        isActive: poll.isActive,
        createdAt: poll.createdAt,
      });
    }
    return result;
  },
});

/* ── list group polls ── */
export const listByGroup = authQuery({
  args: { groupId: v.id("groups") },
  returns: v.array(
    v.object({
      _id: v.id("polls"),
      question: v.string(),
      options: v.array(v.string()),
      creatorName: v.string(),
      creatorAvatarUrl: v.optional(v.string()),
      totalVotes: v.number(),
      voteCounts: v.array(v.number()),
      myVote: v.optional(v.number()),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getMyUserId(ctx);

    const polls = await ctx.db
      .query("polls")
      .withIndex("by_groupId_and_createdAt", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .take(20);

    const result = [];
    for (const poll of polls) {
      const creator = await ctx.db.get(poll.creatorId);
      const votes = await ctx.db
        .query("pollVotes")
        .withIndex("by_pollId", (q) => q.eq("pollId", poll._id))
        .collect();

      const voteCounts = poll.options.map(
        (_, i) => votes.filter((v) => v.optionIndex === i).length,
      );

      let myVote: number | undefined;
      if (userId) {
        const myV = votes.find((v) => v.userId === userId);
        if (myV) myVote = myV.optionIndex;
      }

      result.push({
        _id: poll._id,
        question: poll.question,
        options: poll.options,
        creatorName: creator?.name ?? "Unbekannt",
        creatorAvatarUrl: creator?.avatarUrl,
        totalVotes: poll.totalVotes,
        voteCounts,
        myVote,
        isActive: poll.isActive,
        createdAt: poll.createdAt,
      });
    }
    return result;
  },
});

/* ── my groups (for picker) ── */
export const myGroups = authQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("groups"),
      name: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getMyUserId(ctx);
    if (!userId) return [];

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const activeGroupIds = memberships
      .filter((m) => m.status === "active")
      .map((m) => m.groupId);

    const groups = [];
    for (const gId of activeGroupIds) {
      const g = await ctx.db.get(gId);
      if (g) groups.push({ _id: g._id, name: g.name });
    }
    return groups;
  },
});

/* ── close poll (creator or admin) ── */
export const closePoll = authMutation({
  args: { pollId: v.id("polls") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getMyUserId(ctx);
    if (!userId) throw new Error("User not found");

    const poll = await ctx.db.get(args.pollId);
    if (!poll) throw new Error("Umfrage nicht gefunden");

    // Check permission: creator or app admin
    const user = await ctx.db.get(userId);
    if (poll.creatorId !== userId && user?.role !== "admin") {
      throw new Error("Keine Berechtigung");
    }

    await ctx.db.patch(args.pollId, { isActive: false });
  },
});
