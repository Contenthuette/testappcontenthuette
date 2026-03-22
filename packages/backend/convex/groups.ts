import { v } from "convex/values";
import { query } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { buildGroupSearchText, normalizeSearchQuery } from "./searchText";

// Helper to get userId from authId
async function getMyUserId(ctx: { db: QueryCtx["db"]; user: { _id: string } }): Promise<Id<"users"> | null> {
  const authId = ctx.user._id;
  const user = await ctx.db.query("users").withIndex("by_authId", (q) => q.eq("authId", authId)).unique();
  return user?._id ?? null;
}

export const list = authQuery({
  args: {
    county: v.optional(v.string()),
    city: v.optional(v.string()),
    topic: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id("groups"),
    name: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    county: v.optional(v.string()),
    city: v.optional(v.string()),
    topic: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    visibility: v.union(v.literal("public"), v.literal("invite_only"), v.literal("request")),
    memberCount: v.number(),
    isMember: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    let groups;
    const searchQuery = args.searchQuery;
    const normalizedQuery = normalizeSearchQuery(searchQuery ?? "");
    if (normalizedQuery) {
      groups = await ctx.db
        .query("groups")
        .withSearchIndex("search_text", (q) => q.search("searchText", normalizedQuery))
        .take(50);
    } else {
      const county = args.county;
      const city = args.city;
      if (county && city) {
        groups = await ctx.db.query("groups")
          .withIndex("by_county_and_city", (q) => q.eq("county", county).eq("city", city))
          .take(50);
      } else if (county) {
        groups = await ctx.db.query("groups")
          .withIndex("by_county_and_city", (q) => q.eq("county", county))
          .take(50);
      } else {
        groups = await ctx.db.query("groups").order("desc").take(50);
      }
    }

    const results = [];
    for (const g of groups) {
      let isMember = false;
      if (myUserId) {
        const membership = await ctx.db.query("groupMembers")
          .withIndex("by_groupId_and_userId", q => q.eq("groupId", g._id).eq("userId", myUserId))
          .unique();
        isMember = membership?.status === "active";
      }
      results.push({
        _id: g._id,
        name: g.name,
        description: g.description,
        thumbnailUrl: g.thumbnailStorageId ? await ctx.storage.getUrl(g.thumbnailStorageId) ?? undefined : g.thumbnailUrl,
        county: g.county,
        city: g.city,
        topic: g.topic,
        interests: g.interests,
        visibility: g.visibility,
        memberCount: g.memberCount,
        isMember,
        createdAt: g.createdAt,
      });
    }
    return results;
  },
});

export const getById = query({
  args: { groupId: v.id("groups") },
  returns: v.union(v.null(), v.object({
    _id: v.id("groups"),
    name: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    county: v.optional(v.string()),
    city: v.optional(v.string()),
    topic: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    visibility: v.union(v.literal("public"), v.literal("invite_only"), v.literal("request")),
    memberCount: v.number(),
    creatorId: v.id("users"),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const g = await ctx.db.get(args.groupId);
    if (!g) return null;
    return {
      _id: g._id,
      name: g.name,
      description: g.description,
      thumbnailUrl: g.thumbnailStorageId ? await ctx.storage.getUrl(g.thumbnailStorageId) ?? undefined : g.thumbnailUrl,
      county: g.county,
      city: g.city,
      topic: g.topic,
      interests: g.interests,
      visibility: g.visibility,
      memberCount: g.memberCount,
      creatorId: g.creatorId,
      createdAt: g.createdAt,
    };
  },
});

export const create = authMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    county: v.optional(v.string()),
    city: v.optional(v.string()),
    topic: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    visibility: v.union(v.literal("public"), v.literal("invite_only"), v.literal("request")),
    thumbnailStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("groups"),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const groupId = await ctx.db.insert("groups", {
      ...args,
      searchText: buildGroupSearchText({
        name: args.name,
        description: args.description,
        county: args.county,
        city: args.city,
        topic: args.topic,
        interests: args.interests,
      }),
      creatorId: myUserId,
      memberCount: 1,
      createdAt: Date.now(),
    });
    // Create conversation for group
    await ctx.db.insert("conversations", {
      type: "group",
      groupId,
      createdAt: Date.now(),
    });
    // Creator is admin member
    await ctx.db.insert("groupMembers", {
      groupId,
      userId: myUserId,
      role: "admin",
      status: "active",
      joinedAt: Date.now(),
    });
    return groupId;
  },
});

export const join = authMutation({
  args: { groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const existing = await ctx.db.query("groupMembers")
      .withIndex("by_groupId_and_userId", q => q.eq("groupId", args.groupId).eq("userId", myUserId))
      .unique();
    if (existing) return null;
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    const needsApproval = group.visibility === "invite_only" || group.visibility === "request";
    const status = needsApproval ? "pending" as const : "active" as const;
    await ctx.db.insert("groupMembers", {
      groupId: args.groupId,
      userId: myUserId,
      role: "member",
      status,
      joinedAt: Date.now(),
    });
    if (status === "active") {
      await ctx.db.patch(args.groupId, { memberCount: group.memberCount + 1 });
    } else {
      // Notify group admins about join request
      const me = await ctx.db.get(myUserId);
      const adminMembers = await ctx.db.query("groupMembers")
        .withIndex("by_groupId", q => q.eq("groupId", args.groupId))
        .collect();
      for (const admin of adminMembers) {
        if (admin.role === "admin" && admin.status === "active") {
          await ctx.db.insert("notifications", {
            userId: admin.userId,
            type: "join_request",
            title: "Beitrittsanfrage",
            body: `${me?.name ?? "Jemand"} möchte der Gruppe "${group.name}" beitreten.`,
            referenceId: args.groupId,
            isRead: false,
            createdAt: Date.now(),
          });
        }
      }
    }
    return null;
  },
});

export const acceptRequest = authMutation({
  args: {
    groupId: v.id("groups"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    // Verify caller is admin
    const myMembership = await ctx.db.query("groupMembers")
      .withIndex("by_groupId_and_userId", q => q.eq("groupId", args.groupId).eq("userId", myUserId))
      .unique();
    if (!myMembership || myMembership.role !== "admin") {
      throw new Error("Nur Admins können Anfragen bearbeiten");
    }
    // Find pending membership
    const membership = await ctx.db.query("groupMembers")
      .withIndex("by_groupId_and_userId", q => q.eq("groupId", args.groupId).eq("userId", args.userId))
      .unique();
    if (!membership || membership.status !== "pending") {
      throw new Error("Keine offene Anfrage gefunden");
    }
    await ctx.db.patch(membership._id, { status: "active", joinedAt: Date.now() });
    const group = await ctx.db.get(args.groupId);
    if (group) {
      await ctx.db.patch(args.groupId, { memberCount: group.memberCount + 1 });
    }
    // Notify the user
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "join_accepted",
      title: "Anfrage angenommen",
      body: `Deine Anfrage für die Gruppe "${group?.name ?? ""}" wurde angenommen!`,
      referenceId: args.groupId,
      isRead: false,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const rejectRequest = authMutation({
  args: {
    groupId: v.id("groups"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    // Verify caller is admin
    const myMembership = await ctx.db.query("groupMembers")
      .withIndex("by_groupId_and_userId", q => q.eq("groupId", args.groupId).eq("userId", myUserId))
      .unique();
    if (!myMembership || myMembership.role !== "admin") {
      throw new Error("Nur Admins können Anfragen bearbeiten");
    }
    // Find pending membership
    const membership = await ctx.db.query("groupMembers")
      .withIndex("by_groupId_and_userId", q => q.eq("groupId", args.groupId).eq("userId", args.userId))
      .unique();
    if (!membership || membership.status !== "pending") {
      throw new Error("Keine offene Anfrage gefunden");
    }
    await ctx.db.delete(membership._id);
    // Notify the user
    const group = await ctx.db.get(args.groupId);
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "join_rejected",
      title: "Anfrage abgelehnt",
      body: `Deine Anfrage für die Gruppe "${group?.name ?? ""}" wurde leider abgelehnt.`,
      referenceId: args.groupId,
      isRead: false,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const getPendingRequests = authQuery({
  args: { groupId: v.id("groups") },
  returns: v.array(v.object({
    _id: v.id("groupMembers"),
    userId: v.id("users"),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    requestedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) return [];
    // Verify caller is admin
    const myMembership = await ctx.db.query("groupMembers")
      .withIndex("by_groupId_and_userId", q => q.eq("groupId", args.groupId).eq("userId", myUserId))
      .unique();
    if (!myMembership || myMembership.role !== "admin") return [];
    const members = await ctx.db.query("groupMembers")
      .withIndex("by_groupId", q => q.eq("groupId", args.groupId))
      .collect();
    const pending = members.filter(m => m.status === "pending");
    const results = [];
    for (const m of pending) {
      const user = await ctx.db.get(m.userId);
      if (user) {
        results.push({
          _id: m._id,
          userId: m.userId,
          name: user.name,
          avatarUrl: user.avatarStorageId ? await ctx.storage.getUrl(user.avatarStorageId) ?? undefined : user.avatarUrl,
          requestedAt: m.joinedAt,
        });
      }
    }
    return results;
  },
});

export const leave = authMutation({
  args: { groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const membership = await ctx.db.query("groupMembers")
      .withIndex("by_groupId_and_userId", q => q.eq("groupId", args.groupId).eq("userId", myUserId))
      .unique();
    if (!membership) return null;
    await ctx.db.delete(membership._id);
    const group = await ctx.db.get(args.groupId);
    if (group && group.memberCount > 0) {
      await ctx.db.patch(args.groupId, { memberCount: group.memberCount - 1 });
    }
    return null;
  },
});

export const getMembers = query({
  args: { groupId: v.id("groups") },
  returns: v.array(v.object({
    _id: v.id("groupMembers"),
    userId: v.id("users"),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("member")),
    status: v.union(v.literal("active"), v.literal("pending")),
  })),
  handler: async (ctx, args) => {
    const members = await ctx.db.query("groupMembers")
      .withIndex("by_groupId", q => q.eq("groupId", args.groupId))
      .collect();
    const results = [];
    for (const m of members) {
      const user = await ctx.db.get(m.userId);
      if (user) {
        results.push({
          _id: m._id,
          userId: m.userId,
          name: user.name,
          avatarUrl: user.avatarStorageId ? await ctx.storage.getUrl(user.avatarStorageId) ?? undefined : user.avatarUrl,
          role: m.role,
          status: m.status,
        });
      }
    }
    return results;
  },
});

export const getMyMembership = authQuery({
  args: { groupId: v.id("groups") },
  returns: v.union(v.null(), v.object({
    _id: v.id("groupMembers"),
    role: v.union(v.literal("admin"), v.literal("member")),
    status: v.union(v.literal("active"), v.literal("pending")),
  })),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) return null;
    const membership = await ctx.db.query("groupMembers")
      .withIndex("by_groupId_and_userId", q => q.eq("groupId", args.groupId).eq("userId", myUserId))
      .unique();
    if (!membership) return null;
    return { _id: membership._id, role: membership.role, status: membership.status };
  },
});

export const update = authMutation({
  args: {
    groupId: v.id("groups"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    county: v.optional(v.string()),
    city: v.optional(v.string()),
    topic: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    visibility: v.optional(v.union(v.literal("public"), v.literal("invite_only"), v.literal("request"))),
    thumbnailStorageId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");

    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");

    // Verify user is admin of this group
    const membership = await ctx.db.query("groupMembers")
      .withIndex("by_groupId_and_userId", (q) => q.eq("groupId", args.groupId).eq("userId", myUserId))
      .unique();
    if (!membership || membership.role !== "admin") {
      throw new Error("Only group admins can edit this group");
    }

    const nextName = args.name !== undefined ? args.name : group.name;
    const nextDescription = args.description !== undefined ? args.description : group.description;
    const nextCounty = args.county !== undefined ? args.county : group.county;
    const nextCity = args.city !== undefined ? args.city : group.city;
    const nextTopic = args.topic !== undefined ? args.topic : group.topic;
    const nextInterests = args.interests !== undefined ? args.interests : group.interests;

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (args.county !== undefined) patch.county = args.county;
    if (args.city !== undefined) patch.city = args.city;
    if (args.topic !== undefined) patch.topic = args.topic;
    if (args.interests !== undefined) patch.interests = args.interests;
    if (args.visibility !== undefined) patch.visibility = args.visibility;
    if (args.thumbnailStorageId !== undefined) patch.thumbnailStorageId = args.thumbnailStorageId;

    if (Object.keys(patch).length > 0) {
      patch.searchText = buildGroupSearchText({
        name: nextName,
        description: nextDescription,
        county: nextCounty,
        city: nextCity,
        topic: nextTopic,
        interests: nextInterests,
      });
      await ctx.db.patch(args.groupId, patch);
    }
    return null;
  },
});

export const generateUploadUrl = authMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
