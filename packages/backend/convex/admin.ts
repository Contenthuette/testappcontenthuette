import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { paginatedResultValidator } from "./pagination";

/* ─── helpers ─────────────────────────────────────────────────── */
type AdminCtx = {
  user: { _id: string };
  db: QueryCtx["db"];
};

async function requireAdmin(ctx: AdminCtx): Promise<{ _id: Id<"users"> }> {
  const authId = ctx.user._id;
  const user = await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", authId))
    .unique();
  if (!user || user.role !== "admin") throw new Error("Admin access required");
  return { _id: user._id };
}

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const ABO_PRICE = 5.99;

const buyerValidator = v.object({
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
});

function buildDateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function formatSnapshotLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("de-DE", {
    weekday: "short",
  });
}

async function countResults<T>(source: AsyncIterable<T>): Promise<number> {
  let count = 0;
  for await (const _row of source) {
    count += 1;
  }
  return count;
}

async function buildAnalyticsSnapshot(ctx: { db: QueryCtx["db"] }, now: number) {
  const dayStart = now - DAY;
  const weekStart = now - WEEK;
  const monthStart = now - MONTH;

  const [
    activeSubscriptions,
    canceledSubscriptions,
    noneSubscriptions,
    expiredSubscriptions,
    newRegistrations,
    activeUsersToday,
    activeUsers7d,
    activeUsers30d,
    totalPosts,
    totalMessages,
    totalGroups,
    totalEvents,
    postsToday,
    ticketsToday,
    events,
  ] = await Promise.all([
    countResults(
      ctx.db
        .query("users")
        .withIndex("by_subscriptionStatus", (q) =>
          q.eq("subscriptionStatus", "active"),
        ),
    ),
    countResults(
      ctx.db
        .query("users")
        .withIndex("by_subscriptionStatus", (q) =>
          q.eq("subscriptionStatus", "canceled"),
        ),
    ),
    countResults(
      ctx.db
        .query("users")
        .withIndex("by_subscriptionStatus", (q) => q.eq("subscriptionStatus", "none")),
    ),
    countResults(
      ctx.db
        .query("users")
        .withIndex("by_subscriptionStatus", (q) =>
          q.eq("subscriptionStatus", "expired"),
        ),
    ),
    countResults(
      ctx.db
        .query("users")
        .withIndex("by_createdAt", (q) => q.gte("createdAt", dayStart)),
    ),
    countResults(
      ctx.db
        .query("users")
        .withIndex("by_lastActiveAt", (q) => q.gte("lastActiveAt", dayStart)),
    ),
    countResults(
      ctx.db
        .query("users")
        .withIndex("by_lastActiveAt", (q) => q.gte("lastActiveAt", weekStart)),
    ),
    countResults(
      ctx.db
        .query("users")
        .withIndex("by_lastActiveAt", (q) => q.gte("lastActiveAt", monthStart)),
    ),
    countResults(ctx.db.query("posts")),
    countResults(ctx.db.query("messages")),
    countResults(ctx.db.query("groups")),
    countResults(ctx.db.query("events")),
    ctx.db
      .query("posts")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", dayStart))
      .collect(),
    ctx.db
      .query("tickets")
      .withIndex("by_purchasedAt", (q) => q.gte("purchasedAt", dayStart))
      .collect(),
    ctx.db.query("events").take(5000),
  ]);

  const eventPriceById = new Map(events.map((event) => [event._id, event.ticketPrice] as const));
  const ticketRevenue = ticketsToday.reduce(
    (sum, ticket) => sum + (eventPriceById.get(ticket.eventId) ?? 0),
    0,
  );

  return {
    date: buildDateKey(now),
    totalUsers:
      activeSubscriptions + canceledSubscriptions + noneSubscriptions + expiredSubscriptions,
    activeUsersToday,
    activeUsers7d,
    activeUsers30d,
    newRegistrations,
    activeSubscriptions,
    canceledSubscriptions,
    newSubscriptions: 0,
    cancellations: 0,
    totalPosts,
    totalMessages,
    totalGroups,
    totalEvents,
    photosCreated: postsToday.filter((post) => post.type === "photo").length,
    videosCreated: postsToday.filter((post) => post.type === "video").length,
    ticketRevenue,
    updatedAt: now,
  };
}

async function upsertAnalyticsSnapshot(ctx: { db: QueryCtx["db"] }, now: number) {
  const snapshot = await buildAnalyticsSnapshot(ctx, now);
  const existing = await ctx.db
    .query("analyticsSnapshots")
    .withIndex("by_date", (q) => q.eq("date", snapshot.date))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, snapshot);
    return null;
  }

  await ctx.db.insert("analyticsSnapshots", {
    ...snapshot,
    createdAt: now,
  });
  return null;
}

async function getDashboardFromSnapshots(ctx: { db: QueryCtx["db"] }) {
  const snapshots = await ctx.db
    .query("analyticsSnapshots")
    .withIndex("by_date")
    .order("desc")
    .take(30);
  const events = await ctx.db.query("events").order("desc").take(500);

  if (snapshots.length === 0) {
    const liveSnapshot = await buildAnalyticsSnapshot(ctx, Date.now());
    const ticketRevenuePerEvent = events.map((event) => ({
      eventName: event.name,
      revenue: event.soldTickets * event.ticketPrice,
      soldTickets: event.soldTickets,
      totalTickets: event.totalTickets,
      currency: event.currency,
    }));
    const ticketRevenueTotal = ticketRevenuePerEvent.reduce(
      (sum, event) => sum + event.revenue,
      0,
    );
    return {
      totalMembers: liveSnapshot.totalUsers,
      activeSubscriptions: liveSnapshot.activeSubscriptions,
      canceledSubscriptions: liveSnapshot.canceledSubscriptions,
      newMembersWeek: liveSnapshot.newRegistrations,
      newMembersMonth: liveSnapshot.newRegistrations,
      ticketRevenueTotal,
      ticketRevenueMonth: liveSnapshot.ticketRevenue ?? 0,
      subscriptionRevenueMonthly: liveSnapshot.activeSubscriptions * ABO_PRICE,
      subscriptionRevenueTotal:
        (liveSnapshot.activeSubscriptions + liveSnapshot.canceledSubscriptions) * ABO_PRICE,
      activeToday: liveSnapshot.activeUsersToday,
      activeWeek: liveSnapshot.activeUsers7d,
      photosToday: liveSnapshot.photosCreated ?? 0,
      videosToday: liveSnapshot.videosCreated ?? 0,
      photosWeek: liveSnapshot.photosCreated ?? 0,
      videosWeek: liveSnapshot.videosCreated ?? 0,
      photosMonth: liveSnapshot.photosCreated ?? 0,
      videosMonth: liveSnapshot.videosCreated ?? 0,
      totalGroups: liveSnapshot.totalGroups,
      totalEvents: liveSnapshot.totalEvents,
      totalPosts: liveSnapshot.totalPosts,
      ticketRevenuePerEvent,
      postsByDay: [
        {
          label: formatSnapshotLabel(liveSnapshot.date),
          photos: liveSnapshot.photosCreated ?? 0,
          videos: liveSnapshot.videosCreated ?? 0,
        },
      ],
      userGrowthByDay: [
        {
          label: formatSnapshotLabel(liveSnapshot.date),
          count: liveSnapshot.newRegistrations,
        },
      ],
    };
  }

  const ascendingSnapshots = [...snapshots].reverse();
  const latestSnapshot = snapshots[0];
  const last7Snapshots = snapshots.slice(0, 7);
  const ticketRevenuePerEvent = events.map((event) => ({
    eventName: event.name,
    revenue: event.soldTickets * event.ticketPrice,
    soldTickets: event.soldTickets,
    totalTickets: event.totalTickets,
    currency: event.currency,
  }));
  const ticketRevenueTotal = ticketRevenuePerEvent.reduce(
    (sum, event) => sum + event.revenue,
    0,
  );

  return {
    totalMembers: latestSnapshot.totalUsers,
    activeSubscriptions: latestSnapshot.activeSubscriptions,
    canceledSubscriptions: latestSnapshot.canceledSubscriptions ?? 0,
    newMembersWeek: last7Snapshots.reduce(
      (sum, snapshot) => sum + snapshot.newRegistrations,
      0,
    ),
    newMembersMonth: snapshots.reduce(
      (sum, snapshot) => sum + snapshot.newRegistrations,
      0,
    ),
    ticketRevenueTotal,
    ticketRevenueMonth: snapshots.reduce(
      (sum, snapshot) => sum + (snapshot.ticketRevenue ?? 0),
      0,
    ),
    subscriptionRevenueMonthly: latestSnapshot.activeSubscriptions * ABO_PRICE,
    subscriptionRevenueTotal:
      (latestSnapshot.activeSubscriptions + (latestSnapshot.canceledSubscriptions ?? 0)) * ABO_PRICE,
    activeToday: latestSnapshot.activeUsersToday,
    activeWeek: latestSnapshot.activeUsers7d,
    photosToday: latestSnapshot.photosCreated ?? 0,
    videosToday: latestSnapshot.videosCreated ?? 0,
    photosWeek: last7Snapshots.reduce(
      (sum, snapshot) => sum + (snapshot.photosCreated ?? 0),
      0,
    ),
    videosWeek: last7Snapshots.reduce(
      (sum, snapshot) => sum + (snapshot.videosCreated ?? 0),
      0,
    ),
    photosMonth: snapshots.reduce(
      (sum, snapshot) => sum + (snapshot.photosCreated ?? 0),
      0,
    ),
    videosMonth: snapshots.reduce(
      (sum, snapshot) => sum + (snapshot.videosCreated ?? 0),
      0,
    ),
    totalGroups: latestSnapshot.totalGroups,
    totalEvents: latestSnapshot.totalEvents,
    totalPosts: latestSnapshot.totalPosts,
    ticketRevenuePerEvent,
    postsByDay: ascendingSnapshots.slice(-7).map((snapshot) => ({
      label: formatSnapshotLabel(snapshot.date),
      photos: snapshot.photosCreated ?? 0,
      videos: snapshot.videosCreated ?? 0,
    })),
    userGrowthByDay: ascendingSnapshots.slice(-7).map((snapshot) => ({
      label: formatSnapshotLabel(snapshot.date),
      count: snapshot.newRegistrations,
    })),
  };
}

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

export const refreshAnalyticsSnapshot = authMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await upsertAnalyticsSnapshot(ctx, Date.now());
  },
});

export const refreshAnalyticsSnapshotInternal = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    return await upsertAnalyticsSnapshot(ctx, Date.now());
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
    subscriptionRevenueMonthly: v.number(),
    subscriptionRevenueTotal: v.number(),
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
    ticketRevenuePerEvent: v.array(
      v.object({
        eventName: v.string(),
        revenue: v.number(),
        soldTickets: v.number(),
        totalTickets: v.number(),
        currency: v.string(),
      }),
    ),
    postsByDay: v.array(
      v.object({ label: v.string(), photos: v.number(), videos: v.number() }),
    ),
    userGrowthByDay: v.array(
      v.object({ label: v.string(), count: v.number() }),
    ),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await getDashboardFromSnapshots(ctx);
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
    return events.map((event) => ({
      _id: event._id,
      name: event.name,
      date: event.date,
      city: event.city,
      venue: event.venue,
      totalTickets: event.totalTickets,
      soldTickets: event.soldTickets,
      ticketPrice: event.ticketPrice,
      currency: event.currency,
      status: event.status,
    }));
  },
});

/* ─── event detail ────────────────────────────────────────────── */
export const getEventDetail = authQuery({
  args: { eventId: v.id("events") },
  returns: v.union(
    v.object({
      _id: v.id("events"),
      name: v.string(),
      description: v.union(v.string(), v.null()),
      thumbnailUrl: v.union(v.string(), v.null()),
      videoUrl: v.union(v.string(), v.null()),
      videoThumbnailUrl: v.union(v.string(), v.null()),
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
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const [thumbnailUrl, videoUrl, videoThumbnailUrl] = await Promise.all([
      event.thumbnailStorageId ? ctx.storage.getUrl(event.thumbnailStorageId) : null,
      event.videoStorageId ? ctx.storage.getUrl(event.videoStorageId) : null,
      event.videoThumbnailStorageId
        ? ctx.storage.getUrl(event.videoThumbnailStorageId)
        : null,
    ]);

    return {
      _id: event._id,
      name: event.name,
      description: event.description ?? null,
      thumbnailUrl,
      videoUrl,
      videoThumbnailUrl,
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
    };
  },
});

export const listEventBuyers = authQuery({
  args: {
    eventId: v.id("events"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginatedResultValidator(buyerValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const results = await ctx.db
      .query("tickets")
      .withIndex("by_eventId_and_purchasedAt", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...results,
      page: await Promise.all(
        results.page.map(async (ticket) => {
          const user = await ctx.db.get(ticket.userId);
          return {
            ticketId: ticket._id,
            userName: user?.name ?? "Unbekannt",
            userEmail: user?.email ?? "",
            status: ticket.status,
            purchasedAt: ticket.purchasedAt,
          };
        }),
      ),
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
    videoStorageId: v.optional(v.id("_storage")),
    videoThumbnailStorageId: v.optional(v.id("_storage")),
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
    videoStorageId: v.optional(v.id("_storage")),
    videoThumbnailStorageId: v.optional(v.id("_storage")),
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

/* ─── Announcements ────────────────────────────────────────────── */

/** Public: returns the currently active announcement (or null). */
export const getActiveAnnouncement = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("announcements"),
      text: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const active = await ctx.db
      .query("announcements")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .order("desc")
      .first();
    if (!active) return null;
    return { _id: active._id, text: active.text };
  },
});

/** Admin: list all announcements */
export const listAnnouncements = authQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("announcements"),
      text: v.string(),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const all = await ctx.db.query("announcements").order("desc").take(50);
    return all.map((a) => ({
      _id: a._id,
      text: a.text,
      isActive: a.isActive,
      createdAt: a.createdAt,
    }));
  },
});

/** Admin: create announcement */
export const createAnnouncement = authMutation({
  args: { text: v.string() },
  returns: v.id("announcements"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    // Deactivate any existing active announcements
    const existing = await ctx.db
      .query("announcements")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    for (const a of existing) {
      await ctx.db.patch(a._id, { isActive: false });
    }
    return await ctx.db.insert("announcements", {
      text: args.text.trim(),
      isActive: true,
      createdBy: admin._id,
      createdAt: Date.now(),
    });
  },
});

/** Admin: update announcement text */
export const updateAnnouncement = authMutation({
  args: { id: v.id("announcements"), text: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      text: args.text.trim(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Admin: toggle announcement active state */
export const toggleAnnouncement = authMutation({
  args: { id: v.id("announcements"), isActive: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.isActive) {
      // Deactivate all others first
      const existing = await ctx.db
        .query("announcements")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .collect();
      for (const a of existing) {
        if (a._id !== args.id) {
          await ctx.db.patch(a._id, { isActive: false });
        }
      }
    }
    await ctx.db.patch(args.id, { isActive: args.isActive });
    return null;
  },
});

/** Admin: delete announcement */
export const deleteAnnouncement = authMutation({
  args: { id: v.id("announcements") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});
