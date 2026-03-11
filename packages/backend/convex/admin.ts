import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";

/* ─── helpers ─────────────────────────────────────────────────── */
async function requireAdmin(ctx: { user: { _id: string }; db: any }) {
  const authId = ctx.user._id;
  const user = await ctx.db
    .query("users")
    .withIndex("by_authId", (q: any) => q.eq("authId", authId))
    .unique();
  if (!user || user.role !== "admin") throw new Error("Admin access required");
  return user as { _id: Id<"users"> };
}

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

/* ─── login ───────────────────────────────────────────────────── */
export const verifyAdminPassword = mutation({
  args: { email: v.string(), password: v.string() },
  returns: v.boolean(),
  handler: async (_ctx, args) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) return false;
    return (
      args.email.toLowerCase().trim() === "leif@z-social.com" &&
      args.password === adminPassword
    );
  },
});

/* ─── comprehensive dashboard ─────────────────────────────────── */
export const getAdminDashboard = authQuery({
  args: {},
  returns: v.object({
    totalMembers: v.number(),
    activeSubscriptions: v.number(),
    canceledSubscriptions: v.number(),
    newMembersWeek: v.number(),
    newMembersMonth: v.number(),
    ticketRevenueTotal: v.number(),
    ticketRevenueMonth: v.number(),
    activeToday: v.number(),
    activeWeek: v.number(),
    photosToday: v.number(),
    videosToday: v.number(),
    photosWeek: v.number(),
    videosWeek: v.number(),
    photosMonth: v.number(),
    videosMonth: v.number(),
    totalGroups: v.number(),
    totalEvents: v.number(),
    totalPosts: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();

    const users = await ctx.db.query("users").take(50000);
    const posts = await ctx.db.query("posts").take(50000);
    const events = await ctx.db.query("events").take(10000);
    const tickets = await ctx.db.query("tickets").take(50000);
    const groups = await ctx.db.query("groups").take(50000);

    const activeSubscriptions = users.filter(
      (u) => u.subscriptionStatus === "active",
    ).length;
    const canceledSubscriptions = users.filter(
      (u) => u.subscriptionStatus === "canceled",
    ).length;

    /* revenue */
    let ticketRevenueTotal = 0;
    let ticketRevenueMonth = 0;
    for (const t of tickets) {
      const ev = events.find((e) => e._id === t.eventId);
      if (!ev) continue;
      ticketRevenueTotal += ev.ticketPrice;
      if (t.purchasedAt > now - MONTH) ticketRevenueMonth += ev.ticketPrice;
    }

    return {
      totalMembers: users.length,
      activeSubscriptions,
      canceledSubscriptions,
      newMembersWeek: users.filter((u) => u.createdAt > now - WEEK).length,
      newMembersMonth: users.filter((u) => u.createdAt > now - MONTH).length,
      ticketRevenueTotal,
      ticketRevenueMonth,
      activeToday: users.filter(
        (u) => u.lastActiveAt != null && u.lastActiveAt > now - DAY,
      ).length,
      activeWeek: users.filter(
        (u) => u.lastActiveAt != null && u.lastActiveAt > now - WEEK,
      ).length,
      photosToday: posts.filter(
        (p) => p.type === "photo" && p.createdAt > now - DAY,
      ).length,
      videosToday: posts.filter(
        (p) => p.type === "video" && p.createdAt > now - DAY,
      ).length,
      photosWeek: posts.filter(
        (p) => p.type === "photo" && p.createdAt > now - WEEK,
      ).length,
      videosWeek: posts.filter(
        (p) => p.type === "video" && p.createdAt > now - WEEK,
      ).length,
      photosMonth: posts.filter(
        (p) => p.type === "photo" && p.createdAt > now - MONTH,
      ).length,
      videosMonth: posts.filter(
        (p) => p.type === "video" && p.createdAt > now - MONTH,
      ).length,
      totalGroups: groups.length,
      totalEvents: events.length,
      totalPosts: posts.length,
    };
  },
});

/* ─── events: list with details ───────────────────────────────── */
export const listEventsAdmin = authQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("events"),
      name: v.string(),
      date: v.string(),
      city: v.string(),
      venue: v.string(),
      totalTickets: v.number(),
      soldTickets: v.number(),
      ticketPrice: v.number(),
      currency: v.string(),
      status: v.union(
        v.literal("upcoming"),
        v.literal("ongoing"),
        v.literal("completed"),
        v.literal("canceled"),
      ),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const events = await ctx.db.query("events").order("desc").take(200);
    return events.map((e) => ({
      _id: e._id,
      name: e.name,
      date: e.date,
      city: e.city,
      venue: e.venue,
      totalTickets: e.totalTickets,
      soldTickets: e.soldTickets,
      ticketPrice: e.ticketPrice,
      currency: e.currency,
      status: e.status,
    }));
  },
});

/* ─── event detail with buyers ────────────────────────────────── */
export const getEventDetail = authQuery({
  args: { eventId: v.id("events") },
  returns: v.union(
    v.object({
      _id: v.id("events"),
      name: v.string(),
      description: v.union(v.string(), v.null()),
      thumbnailUrl: v.union(v.string(), v.null()),
      venue: v.string(),
      city: v.string(),
      date: v.string(),
      startTime: v.string(),
      durationMinutes: v.number(),
      totalTickets: v.number(),
      soldTickets: v.number(),
      ticketPrice: v.number(),
      currency: v.string(),
      status: v.union(
        v.literal("upcoming"),
        v.literal("ongoing"),
        v.literal("completed"),
        v.literal("canceled"),
      ),
      buyers: v.array(
        v.object({
          ticketId: v.id("tickets"),
          userName: v.string(),
          userEmail: v.string(),
          status: v.union(
            v.literal("active"),
            v.literal("scanned"),
            v.literal("canceled"),
            v.literal("expired"),
          ),
          purchasedAt: v.number(),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const thumbUrl = event.thumbnailStorageId
      ? await ctx.storage.getUrl(event.thumbnailStorageId)
      : null;

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();

    const buyers = [];
    for (const t of tickets) {
      const user = await ctx.db.get(t.userId);
      buyers.push({
        ticketId: t._id,
        userName: user?.name ?? "Unbekannt",
        userEmail: user?.email ?? "",
        status: t.status,
        purchasedAt: t.purchasedAt,
      });
    }

    return {
      _id: event._id,
      name: event.name,
      description: event.description ?? null,
      thumbnailUrl: thumbUrl,
      venue: event.venue,
      city: event.city,
      date: event.date,
      startTime: event.startTime,
      durationMinutes: event.durationMinutes,
      totalTickets: event.totalTickets,
      soldTickets: event.soldTickets,
      ticketPrice: event.ticketPrice,
      currency: event.currency,
      status: event.status,
      buyers,
    };
  },
});

/* ─── event CRUD ──────────────────────────────────────────────── */
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

export const updateEvent = authMutation({
  args: {
    eventId: v.id("events"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    venue: v.optional(v.string()),
    city: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    totalTickets: v.optional(v.number()),
    ticketPrice: v.optional(v.number()),
    thumbnailStorageId: v.optional(v.id("_storage")),
    status: v.optional(
      v.union(
        v.literal("upcoming"),
        v.literal("ongoing"),
        v.literal("completed"),
        v.literal("canceled"),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { eventId, ...patch } = args;
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event nicht gefunden");
    // remove undefined keys
    const clean: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) clean[k] = val;
    }
    await ctx.db.patch(eventId, clean);
    return null;
  },
});

export const deleteEvent = authMutation({
  args: { eventId: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // delete tickets first
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const t of tickets) {
      await ctx.db.delete(t._id);
    }
    await ctx.db.delete(args.eventId);
    return null;
  },
});

export const generateUploadUrl = authMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/* ─── users ───────────────────────────────────────────────────── */
export const listUsers = authQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
      role: v.union(v.literal("user"), v.literal("admin")),
      subscriptionStatus: v.union(
        v.literal("none"),
        v.literal("active"),
        v.literal("canceled"),
        v.literal("expired"),
      ),
      onboardingComplete: v.boolean(),
      createdAt: v.number(),
      lastActiveAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").order("desc").take(500);
    return users.map((u) => ({
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

/* ─── reports ─────────────────────────────────────────────────── */
export const listReports = authQuery({
  args: { status: v.optional(v.string()) },
  returns: v.array(
    v.object({
      _id: v.id("reports"),
      reporterId: v.id("users"),
      reporterName: v.string(),
      type: v.union(
        v.literal("user"),
        v.literal("post"),
        v.literal("group"),
        v.literal("partner"),
      ),
      targetId: v.string(),
      reason: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("reviewed"),
        v.literal("resolved"),
      ),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const statusFilter = args.status as
      | "pending"
      | "reviewed"
      | "resolved"
      | undefined;
    const reports = statusFilter
      ? await ctx.db
          .query("reports")
          .withIndex("by_status", (q) => q.eq("status", statusFilter))
          .order("desc")
          .take(100)
      : await ctx.db.query("reports").order("desc").take(100);

    const results = [];
    for (const r of reports) {
      const reporter = await ctx.db.get(r.reporterId);
      results.push({ ...r, reporterName: reporter?.name ?? "Unbekannt" });
    }
    return results;
  },
});

export const resolveReport = authMutation({
  args: {
    reportId: v.id("reports"),
    status: v.union(v.literal("reviewed"), v.literal("resolved")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.reportId, { status: args.status });
    return null;
  },
});

/* ─── partners ────────────────────────────────────────────────── */
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

export const listPartners = authQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("partners"),
      businessName: v.string(),
      city: v.optional(v.string()),
      status: v.string(),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const partners = await ctx.db.query("partners").take(200);
    return partners.map((p) => ({
      _id: p._id,
      businessName: p.businessName,
      city: p.city,
      status: p.isActive ? "active" : "inactive",
    }));
  },
});

/* ─── moderation ──────────────────────────────────────────────── */
export const suspendUser = authMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { subscriptionStatus: "canceled" });
    return null;
  },
});

export const sendBroadcast = authMutation({
  args: { title: v.string(), body: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").take(50000);
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

export const listGroups = authQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("groups"),
      name: v.string(),
      memberCount: v.number(),
      city: v.optional(v.string()),
      visibility: v.union(
        v.literal("public"),
        v.literal("invite_only"),
        v.literal("request"),
      ),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const groups = await ctx.db.query("groups").order("desc").take(500);
    return groups.map((g) => ({
      _id: g._id,
      name: g.name,
      memberCount: g.memberCount,
      city: g.city,
      visibility: g.visibility,
    }));
  },
});
