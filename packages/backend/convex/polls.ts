import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";

const APP_ADMIN_EMAIL = "leif@z-social.com";
const POLL_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours

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

async function isAppAdmin(db: QueryCtx["db"], userId: Id<"users">): Promise<boolean> {
  const user = await db.get(userId);
  if (!user) return false;
  return user.role === "admin" || user.email === APP_ADMIN_EMAIL;
}

/* ── enrichment helper ── */
interface EnrichedPoll {
  _id: Id<"polls">;
  question: string;
  options: string[];
  creatorId: Id<"users">;
  creatorName: string;
  creatorAvatarUrl?: string;
  totalVotes: number;
  voteCounts: number[];
  myVote?: number;
  isActive: boolean;
  isOwner: boolean;
  canDelete: boolean;
  createdAt: number;
  expiresAt: number;
}

async function enrichPoll(
  db: QueryCtx["db"],
  poll: {
    _id: Id<"polls">;
    question: string;
    options: string[];
    creatorId: Id<"users">;
    totalVotes: number;
    isActive: boolean;
    createdAt: number;
  },
  userId: Id<"users"> | null,
  userIsAdmin: boolean,
): Promise<EnrichedPoll> {
  const creator = await db.get(poll.creatorId);
  const votes = await db
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

  const isOwner = userId !== null && poll.creatorId === userId;

  return {
    _id: poll._id,
    question: poll.question,
    options: poll.options,
    creatorId: poll.creatorId,
    creatorName: creator?.name ?? "Unbekannt",
    creatorAvatarUrl: creator?.avatarUrl,
    totalVotes: poll.totalVotes,
    voteCounts,
    myVote,
    isActive: poll.isActive,
    isOwner,
    canDelete: isOwner || userIsAdmin,
    createdAt: poll.createdAt,
    expiresAt: poll.createdAt + POLL_LIFETIME_MS,
  };
}

const enrichedPollValidator = v.object({
  _id: v.id("polls"),
  question: v.string(),
  options: v.array(v.string()),
  creatorId: v.id("users"),
  creatorName: v.string(),
  creatorAvatarUrl: v.optional(v.string()),
  totalVotes: v.number(),
  voteCounts: v.array(v.number()),
  myVote: v.optional(v.number()),
  isActive: v.boolean(),
  isOwner: v.boolean(),
  canDelete: v.boolean(),
  createdAt: v.number(),
  expiresAt: v.number(),
});

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

    const existing = await ctx.db
      .query("pollVotes")
      .withIndex("by_pollId_and_userId", (q) => q.eq("pollId", args.pollId).eq("userId", userId))
      .unique();
    if (existing) throw new Error("Du hast bereits abgestimmt");

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

/* ── edit poll (owner only, only if no votes yet) ── */
export const edit = authMutation({
  args: {
    pollId: v.id("polls"),
    question: v.string(),
    options: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getMyUserId(ctx);
    if (!userId) throw new Error("User not found");

    const poll = await ctx.db.get(args.pollId);
    if (!poll) throw new Error("Umfrage nicht gefunden");
    if (poll.creatorId !== userId) throw new Error("Nur der Ersteller kann bearbeiten");
    if (!poll.isActive) throw new Error("Beendete Umfrage kann nicht bearbeitet werden");
    if (poll.totalVotes > 0) throw new Error("Umfrage hat bereits Stimmen, Bearbeiten nicht möglich");

    if (args.options.length < 2 || args.options.length > 5) {
      throw new Error("Eine Umfrage braucht 2–5 Optionen");
    }
    if (!args.question.trim()) throw new Error("Bitte stelle eine Frage");

    await ctx.db.patch(args.pollId, {
      question: args.question.trim(),
      options: args.options.map((o) => o.trim()).filter(Boolean),
    });
  },
});

/* ── delete poll (owner or app admin) ── */
export const remove = authMutation({
  args: { pollId: v.id("polls") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getMyUserId(ctx);
    if (!userId) throw new Error("User not found");

    const poll = await ctx.db.get(args.pollId);
    if (!poll) throw new Error("Umfrage nicht gefunden");

    const admin = await isAppAdmin(ctx.db, userId);
    if (poll.creatorId !== userId && !admin) {
      throw new Error("Keine Berechtigung");
    }

    // Delete all votes
    const votes = await ctx.db
      .query("pollVotes")
      .withIndex("by_pollId", (q) => q.eq("pollId", args.pollId))
      .collect();
    for (const v of votes) {
      await ctx.db.delete(v._id);
    }
    await ctx.db.delete(args.pollId);
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

    const admin = await isAppAdmin(ctx.db, userId);
    if (poll.creatorId !== userId && !admin) {
      throw new Error("Keine Berechtigung");
    }

    await ctx.db.patch(args.pollId, { isActive: false });
  },
});

/* ── list community polls ── */
export const listCommunity = authQuery({
  args: {},
  returns: v.array(enrichedPollValidator),
  handler: async (ctx) => {
    const userId = await getMyUserId(ctx);
    const admin = userId ? await isAppAdmin(ctx.db, userId) : false;

    const polls = await ctx.db
      .query("polls")
      .withIndex("by_target_and_createdAt", (q) => q.eq("target", "community"))
      .order("desc")
      .take(20);

    const result: EnrichedPoll[] = [];
    for (const poll of polls) {
      result.push(await enrichPoll(ctx.db, poll, userId, admin));
    }
    return result;
  },
});

/* ── list group polls ── */
export const listByGroup = authQuery({
  args: { groupId: v.id("groups") },
  returns: v.array(enrichedPollValidator),
  handler: async (ctx, args) => {
    const userId = await getMyUserId(ctx);
    const admin = userId ? await isAppAdmin(ctx.db, userId) : false;

    const polls = await ctx.db
      .query("polls")
      .withIndex("by_groupId_and_createdAt", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .take(20);

    const result: EnrichedPoll[] = [];
    for (const poll of polls) {
      result.push(await enrichPoll(ctx.db, poll, userId, admin));
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

    const groups: Array<{ _id: Id<"groups">; name: string }> = [];
    for (const gId of activeGroupIds) {
      const g = await ctx.db.get(gId);
      if (g) groups.push({ _id: g._id, name: g.name });
    }
    return groups;
  },
});

/* ── cron: auto-delete expired polls ── */
export const deleteExpiredPolls = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const cutoff = Date.now() - POLL_LIFETIME_MS;

    // Find active polls older than 24h
    const expired = await ctx.db
      .query("polls")
      .withIndex("by_target_and_createdAt")
      .order("asc")
      .take(100);

    const toDelete = expired.filter((p) => p.createdAt < cutoff);

    for (const poll of toDelete) {
      const votes = await ctx.db
        .query("pollVotes")
        .withIndex("by_pollId", (q) => q.eq("pollId", poll._id))
        .collect();
      for (const vote of votes) {
        await ctx.db.delete(vote._id);
      }
      await ctx.db.delete(poll._id);
    }
  },
});
