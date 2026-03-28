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
      ticketUrl: v.optional(v.string()),
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
      ticketUrl: event.ticketUrl,
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
