import { v } from "convex/values";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";

// Helper: verify admin
async function requireAdmin(ctx: any): Promise<{ _id: Id<"users"> }> {
  const authId = ctx.user._id;
  const user = await ctx.db.query("users").withIndex("by_authId", (q: any) => q.eq("authId", authId)).unique();
  if (!user || user.role !== "admin") throw new Error("Admin access required");
  return user;
}

// Dashboard stats
export const getStats = authQuery({
  args: {},
  returns: v.object({
    totalUsers: v.number(),
    activeSubscriptions: v.number(),
    totalGroups: v.number(),
    totalPosts: v.number(),
    totalEvents: v.number(),
    totalMessages: v.number(),
    totalPartners: v.number(),
    pendingReports: v.number(),
    totalTickets: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").take(10000);
    const groups = await ctx.db.query("groups").take(10000);
    const posts = await ctx.db.query("posts").take(10000);
    const events = await ctx.db.query("events").take(10000);
    const messages = await ctx.db.query("messages").take(10000);
    const partners = await ctx.db.query("partners").take(10000);
    const tickets = await ctx.db.query("tickets").take(10000);
    const reports = await ctx.db.query("reports")
      .withIndex("by_status", q => q.eq("status", "pending"))
      .take(10000);
    return {
      totalUsers: users.length,
      activeSubscriptions: users.filter(u => u.subscriptionStatus === "active").length,
      totalGroups: groups.length,
      totalPosts: posts.length,
      totalEvents: events.length,
      totalMessages: messages.length,
      totalPartners: partners.length,
      pendingReports: reports.length,
      totalTickets: tickets.length,
    };
  },
});

// Alias for frontend compatibility
export const getDashboardStats = authQuery({
  args: {},
  returns: v.object({
    totalUsers: v.number(),
    activeSubscriptions: v.number(),
    totalGroups: v.number(),
    totalPosts: v.number(),
    totalEvents: v.number(),
    totalMessages: v.number(),
    totalPartners: v.number(),
    pendingReports: v.number(),
    totalTickets: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").take(10000);
    const groups = await ctx.db.query("groups").take(10000);
    const posts = await ctx.db.query("posts").take(10000);
    const events = await ctx.db.query("events").take(10000);
    const messages = await ctx.db.query("messages").take(10000);
    const partners = await ctx.db.query("partners").take(10000);
    const tickets = await ctx.db.query("tickets").take(10000);
    const reports = await ctx.db.query("reports")
      .withIndex("by_status", (q: any) => q.eq("status", "pending"))
      .take(10000);
    return {
      totalUsers: users.length,
      activeSubscriptions: users.filter(u => u.subscriptionStatus === "active").length,
      totalGroups: groups.length,
      totalPosts: posts.length,
      totalEvents: events.length,
      totalMessages: messages.length,
      totalPartners: partners.length,
      pendingReports: reports.length,
      totalTickets: tickets.length,
    };
  },
});

// Analytics
export const getAnalytics = authQuery({
  args: {},
  returns: v.object({
    activeToday: v.number(),
    active7Days: v.number(),
    active30Days: v.number(),
    newRegistrations: v.number(),
    cancellations: v.number(),
    totalMessages: v.number(),
    ticketsSold: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const day = 86400000;
    const users = await ctx.db.query("users").take(10000);
    const messages = await ctx.db.query("messages").take(10000);
    const tickets = await ctx.db.query("tickets").take(10000);
    return {
      activeToday: users.filter(u => u.lastActiveAt && u.lastActiveAt > now - day).length,
      active7Days: users.filter(u => u.lastActiveAt && u.lastActiveAt > now - 7 * day).length,
      active30Days: users.filter(u => u.lastActiveAt && u.lastActiveAt > now - 30 * day).length,
      newRegistrations: users.filter(u => u.createdAt > now - 7 * day).length,
      cancellations: users.filter(u => u.subscriptionStatus === "canceled").length,
      totalMessages: messages.length,
      ticketsSold: tickets.length,
    };
  },
});

// List all users (admin)
export const listUsers = authQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("users"),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    subscriptionStatus: v.union(v.literal("none"), v.literal("active"), v.literal("canceled"), v.literal("expired")),
    onboardingComplete: v.boolean(),
    createdAt: v.number(),
    lastActiveAt: v.optional(v.number()),
  })),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").order("desc").take(200);
    return users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      subscriptionStatus: u.subscriptionStatus,
      onboardingComplete: u.onboardingComplete,
      createdAt: u.createdAt,
      lastActiveAt: u.lastActiveAt,
    }));
  },
});

// List reports (admin)
export const listReports = authQuery({
  args: { status: v.optional(v.string()) },
  returns: v.array(v.object({
    _id: v.id("reports"),
    reporterId: v.id("users"),
    reporterName: v.string(),
    type: v.union(v.literal("user"), v.literal("post"), v.literal("group"), v.literal("partner")),
    targetId: v.string(),
    reason: v.string(),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("resolved")),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const reports = await ctx.db.query("reports")
      .withIndex("by_status", q => args.status ? q.eq("status", args.status as "pending" | "reviewed" | "resolved") : q)
      .order("desc")
      .take(100);
    const results = [];
    for (const r of reports) {
      const reporter = await ctx.db.get(r.reporterId);
      results.push({
        ...r,
        reporterName: reporter?.name ?? "Unknown",
      });
    }
    return results;
  },
});

// Resolve report
export const resolveReport = authMutation({
  args: { reportId: v.id("reports"), status: v.union(v.literal("reviewed"), v.literal("resolved")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.reportId, { status: args.status });
    return null;
  },
});

// Create event (admin)
export const createEvent = authMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    venue: v.string(),
    city: v.string(),
    county: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    durationMinutes: v.number(),
    totalTickets: v.number(),
    ticketPrice: v.number(),
    currency: v.string(),
    thumbnailStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    return await ctx.db.insert("events", {
      ...args,
      soldTickets: 0,
      status: "upcoming",
      creatorId: admin._id,
      createdAt: Date.now(),
    });
  },
});

// Create partner (admin)
export const createPartner = authMutation({
  args: {
    businessName: v.string(),
    shortText: v.string(),
    description: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    thumbnailStorageId: v.optional(v.id("_storage")),
    mediaStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("partners"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("partners", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Suspend user
export const suspendUser = authMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { subscriptionStatus: "canceled" });
    return null;
  },
});

// Send notification to all users (admin)
export const sendBroadcast = authMutation({
  args: { title: v.string(), body: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").take(10000);
    for (const u of users) {
      await ctx.db.insert("notifications", {
        userId: u._id,
        type: "announcement",
        title: args.title,
        body: args.body,
        isRead: false,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

// Create announcement post
export const createAnnouncement = authMutation({
  args: {
    caption: v.string(),
    mediaStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("posts"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    return await ctx.db.insert("posts", {
      authorId: admin._id,
      type: "photo",
      caption: args.caption,
      mediaStorageId: args.mediaStorageId,
      isPinned: true,
      isAnnouncement: true,
      likeCount: 0,
      commentCount: 0,
      createdAt: Date.now(),
    });
  },
});

// List all groups (admin)
export const listGroups = authQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("groups"),
    name: v.string(),
    memberCount: v.number(),
    city: v.optional(v.string()),
    visibility: v.union(v.literal("public"), v.literal("invite_only")),
  })),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const groups = await ctx.db.query("groups").order("desc").take(200);
    return groups.map(g => ({
      _id: g._id,
      name: g.name,
      memberCount: g.memberCount,
      city: g.city,
      visibility: g.visibility,
    }));
  },
});

// List all events (admin)
export const listEvents = authQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("events"),
    name: v.string(),
    date: v.string(),
    city: v.string(),
    totalTickets: v.number(),
    soldTickets: v.number(),
  })),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const events = await ctx.db.query("events").order("desc").take(200);
    return events.map(e => ({
      _id: e._id,
      name: e.name,
      date: e.date,
      city: e.city,
      totalTickets: e.totalTickets,
      soldTickets: e.soldTickets,
    }));
  },
});

// List all partners (admin)
export const listPartners = authQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("partners"),
    businessName: v.string(),
    city: v.optional(v.string()),
    status: v.string(),
  })),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const partners = await ctx.db.query("partners").take(200);
    return partners.map(p => ({
      _id: p._id,
      businessName: p.businessName,
      city: p.city,
      status: p.isActive ? "active" : "inactive",
    }));
  },
});
