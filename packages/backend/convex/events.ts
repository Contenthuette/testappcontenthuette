import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { paginatedResultValidator } from "./pagination";

type AuthCtx = {
  db: QueryCtx["db"];
  user: { _id: string };
};

const eventListItemValidator = v.object({
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
  status: v.union(
    v.literal("upcoming"),
    v.literal("ongoing"),
    v.literal("completed"),
    v.literal("canceled"),
  ),
  createdAt: v.number(),
});

async function getMyUserId(ctx: AuthCtx): Promise<Id<"users"> | null> {
  const authId = ctx.user._id;
  const user = await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", authId))
    .unique();
  return user?._id ?? null;
}

// List events
export const list = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    city: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  returns: paginatedResultValidator(eventListItemValidator),
  handler: async (ctx, args) => {
    const city = args.city;
    const status = args.status;

    const results = city
      ? await ctx.db
          .query("events")
          .withIndex("by_city", (q) => q.eq("city", city))
          .order("desc")
          .paginate(args.paginationOpts)
      : status
        ? await ctx.db
            .query("events")
            .withIndex("by_status", (q) => q.eq("status", status as "upcoming" | "ongoing" | "completed" | "canceled"))
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db.query("events").order("desc").paginate(args.paginationOpts);

    return {
      ...results,
      page: await Promise.all(
        results.page.map(async (event) => ({
          _id: event._id,
          name: event.name,
          thumbnailUrl: event.thumbnailStorageId
            ? ((await ctx.storage.getUrl(event.thumbnailStorageId)) ?? undefined)
            : event.thumbnailUrl,
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
          createdAt: event.createdAt,
        })),
      ),
    };
  },
});

// Get event by ID
export const getById = query({
  args: { eventId: v.id("events") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("events"),
      name: v.string(),
      description: v.optional(v.string()),
      thumbnailUrl: v.optional(v.string()),
      videoUrl: v.optional(v.string()),
      videoThumbnailUrl: v.optional(v.string()),
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
      status: v.union(
        v.literal("upcoming"),
        v.literal("ongoing"),
        v.literal("completed"),
        v.literal("canceled"),
      ),
      creatorId: v.id("users"),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const thumbnailUrl = event.thumbnailStorageId
      ? ((await ctx.storage.getUrl(event.thumbnailStorageId)) ?? undefined)
      : event.thumbnailUrl;
    const videoUrl = event.videoStorageId
      ? ((await ctx.storage.getUrl(event.videoStorageId)) ?? undefined)
      : undefined;
    const videoThumbnailUrl = event.videoThumbnailStorageId
      ? ((await ctx.storage.getUrl(event.videoThumbnailStorageId)) ?? undefined)
      : undefined;

    return {
      _id: event._id,
      name: event.name,
      description: event.description,
      thumbnailUrl,
      videoUrl,
      videoThumbnailUrl,
      venue: event.venue,
      city: event.city,
      county: event.county,
      date: event.date,
      startTime: event.startTime,
      durationMinutes: event.durationMinutes,
      totalTickets: event.totalTickets,
      soldTickets: event.soldTickets,
      ticketPrice: event.ticketPrice,
      currency: event.currency,
      status: event.status,
      creatorId: event.creatorId,
      createdAt: event.createdAt,
    };
  },
});

// Buy ticket
export const buyTicket = authMutation({
  args: { eventId: v.id("events") },
  returns: v.union(
    v.null(),
    v.object({ ticketId: v.id("tickets"), qrCode: v.string() }),
  ),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");
    if (event.status !== "upcoming" && event.status !== "ongoing") {
      throw new Error("Event is not available");
    }
    if (event.soldTickets >= event.totalTickets) {
      throw new Error("Event is sold out");
    }

    const purchasedAt = Date.now();
    const qrCode = `Z-${args.eventId.slice(-6)}-${myUserId.slice(-6)}-${purchasedAt.toString(36)}`.toUpperCase();

    const ticketId = await ctx.db.insert("tickets", {
      eventId: args.eventId,
      userId: myUserId,
      qrCode,
      status: "active",
      purchasedAt,
    });

    await ctx.db.patch(args.eventId, { soldTickets: event.soldTickets + 1 });
    return { ticketId, qrCode };
  },
});

// Get my tickets
export const getMyTickets = authQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("tickets"),
      eventId: v.id("events"),
      eventName: v.string(),
      eventDate: v.string(),
      eventCity: v.string(),
      eventVenue: v.string(),
      qrCode: v.string(),
      status: v.union(
        v.literal("active"),
        v.literal("scanned"),
        v.literal("canceled"),
        v.literal("expired"),
      ),
      purchasedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) return [];

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_userId", (q) => q.eq("userId", myUserId))
      .order("desc")
      .take(50);

    return (await Promise.all(
      tickets.map(async (ticket) => {
        const event = await ctx.db.get(ticket.eventId);
        if (!event) return null;
        return {
          _id: ticket._id,
          eventId: ticket.eventId,
          eventName: event.name,
          eventDate: event.date,
          eventCity: event.city,
          eventVenue: event.venue,
          qrCode: ticket.qrCode,
          status: ticket.status,
          purchasedAt: ticket.purchasedAt,
        };
      }),
    )).flatMap((ticket) => (ticket ? [ticket] : []));
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
    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .unique();
    if (!user || user.role !== "admin") {
      return { valid: false, message: "Unauthorized" };
    }

    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_qrCode", (q) => q.eq("qrCode", args.qrCode))
      .unique();
    if (!ticket) return { valid: false, message: "Ticket not found" };
    if (ticket.status === "scanned") return { valid: false, message: "Ticket already scanned" };
    if (ticket.status === "canceled") return { valid: false, message: "Ticket canceled" };
    if (ticket.status === "expired") return { valid: false, message: "Ticket expired" };

    await ctx.db.patch(ticket._id, {
      status: "scanned",
      scannedAt: Date.now(),
    });
    return {
      valid: true,
      message: "Ticket validated successfully",
      ticketId: ticket._id,
    };
  },
});
