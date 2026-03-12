import { v } from "convex/values";
import { query } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";

async function getMyUserId(ctx: any): Promise<Id<"users"> | null> {
  const authId = ctx.user._id;
  const user = await ctx.db.query("users").withIndex("by_authId", (q: any) => q.eq("authId", authId)).unique();
  return user?._id ?? null;
}

// List events
export const list = authQuery({
  args: { city: v.optional(v.string()), status: v.optional(v.string()) },
  returns: v.array(v.object({
    _id: v.id("events"),
    name: v.string(),
    thumbnailUrl: v.optional(v.string()),
    venue: v.string(),
    city: v.string(),
    date: v.string(),
    startTime: v.string(),
    durationMinutes: v.number(),
    totalTickets: v.number(),
    soldTickets: v.number(),
    ticketPrice: v.number(),
    currency: v.string(),
    status: v.union(v.literal("upcoming"), v.literal("ongoing"), v.literal("completed"), v.literal("canceled")),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    let events;
    const city = args.city;
    if (city) {
      events = await ctx.db.query("events")
        .withIndex("by_city", q => q.eq("city", city))
        .order("desc")
        .take(50);
    } else {
      events = await ctx.db.query("events").order("desc").take(50);
    }
    const results = [];
    for (const e of events) {
      results.push({
        _id: e._id,
        name: e.name,
        thumbnailUrl: e.thumbnailStorageId ? await ctx.storage.getUrl(e.thumbnailStorageId) ?? undefined : e.thumbnailUrl,
        venue: e.venue,
        city: e.city,
        date: e.date,
        startTime: e.startTime,
        durationMinutes: e.durationMinutes,
        totalTickets: e.totalTickets,
        soldTickets: e.soldTickets,
        ticketPrice: e.ticketPrice,
        currency: e.currency,
        status: e.status,
        createdAt: e.createdAt,
      });
    }
    return results;
  },
});

// Get event by ID
export const getById = query({
  args: { eventId: v.id("events") },
  returns: v.union(v.null(), v.object({
    _id: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    venue: v.string(),
    city: v.string(),
    county: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    durationMinutes: v.number(),
    totalTickets: v.number(),
    soldTickets: v.number(),
    ticketPrice: v.number(),
    currency: v.string(),
    status: v.union(v.literal("upcoming"), v.literal("ongoing"), v.literal("completed"), v.literal("canceled")),
    creatorId: v.id("users"),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const e = await ctx.db.get(args.eventId);
    if (!e) return null;
    const thumbnailUrl = e.thumbnailStorageId
      ? (await ctx.storage.getUrl(e.thumbnailStorageId)) ?? undefined
      : e.thumbnailUrl;
    return {
      _id: e._id,
      name: e.name,
      description: e.description,
      thumbnailUrl,
      venue: e.venue,
      city: e.city,
      county: e.county,
      date: e.date,
      startTime: e.startTime,
      durationMinutes: e.durationMinutes,
      totalTickets: e.totalTickets,
      soldTickets: e.soldTickets,
      ticketPrice: e.ticketPrice,
      currency: e.currency,
      status: e.status,
      creatorId: e.creatorId,
      createdAt: e.createdAt,
    };
  },
});

// Buy ticket
export const buyTicket = authMutation({
  args: { eventId: v.id("events") },
  returns: v.union(v.null(), v.object({ ticketId: v.id("tickets"), qrCode: v.string() })),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (event.status !== "upcoming" && event.status !== "ongoing") throw new Error("Event is not available");
    if (event.soldTickets >= event.totalTickets) throw new Error("Event is sold out");
    
    // Generate unique QR code
    const qrCode = `Z-${args.eventId.slice(-6)}-${myUserId.slice(-6)}-${Date.now().toString(36)}`.toUpperCase();
    
    const ticketId = await ctx.db.insert("tickets", {
      eventId: args.eventId,
      userId: myUserId,
      qrCode,
      status: "active",
      purchasedAt: Date.now(),
    });
    await ctx.db.patch(args.eventId, { soldTickets: event.soldTickets + 1 });
    return { ticketId, qrCode };
  },
});

// Get my tickets
export const getMyTickets = authQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("tickets"),
    eventId: v.id("events"),
    eventName: v.string(),
    eventDate: v.string(),
    eventCity: v.string(),
    eventVenue: v.string(),
    qrCode: v.string(),
    status: v.union(v.literal("active"), v.literal("scanned"), v.literal("canceled"), v.literal("expired")),
    purchasedAt: v.number(),
  })),
  handler: async (ctx) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) return [];
    const tickets = await ctx.db.query("tickets")
      .withIndex("by_userId", q => q.eq("userId", myUserId))
      .order("desc")
      .take(50);
    const results = [];
    for (const t of tickets) {
      const event = await ctx.db.get(t.eventId);
      if (!event) continue;
      results.push({
        _id: t._id,
        eventId: t.eventId,
        eventName: event.name,
        eventDate: event.date,
        eventCity: event.city,
        eventVenue: event.venue,
        qrCode: t.qrCode,
        status: t.status,
        purchasedAt: t.purchasedAt,
      });
    }
    return results;
  },
});

// Scan/validate ticket (admin)
export const scanTicket = authMutation({
  args: { qrCode: v.string() },
  returns: v.object({
    valid: v.boolean(),
    message: v.string(),
    ticketId: v.optional(v.id("tickets")),
  }),
  handler: async (ctx, args) => {
    const authId = ctx.user._id;
    const user = await ctx.db.query("users").withIndex("by_authId", (q: any) => q.eq("authId", authId)).unique();
    if (!user || user.role !== "admin") return { valid: false, message: "Unauthorized" };
    
    const ticket = await ctx.db.query("tickets")
      .withIndex("by_qrCode", q => q.eq("qrCode", args.qrCode))
      .unique();
    if (!ticket) return { valid: false, message: "Ticket not found" };
    if (ticket.status === "scanned") return { valid: false, message: "Ticket already scanned" };
    if (ticket.status === "canceled") return { valid: false, message: "Ticket canceled" };
    if (ticket.status === "expired") return { valid: false, message: "Ticket expired" };
    
    await ctx.db.patch(ticket._id, { status: "scanned", scannedAt: Date.now() });
    return { valid: true, message: "Ticket validated successfully", ticketId: ticket._id };
  },
});
