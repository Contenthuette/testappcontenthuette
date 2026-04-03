import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { paginatedResultValidator } from "./pagination";

/* --- helpers --- */

async function getAppUser(ctx: { user: { _id: string }; db: QueryCtx["db"] }) {
  const authId = ctx.user._id;
  return await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", authId))
    .unique();
}

async function requireEventAccess(
  ctx: { user: { _id: string }; db: QueryCtx["db"] },
  eventId: Id<"events">,
): Promise<{ _id: Id<"users"> }> {
  const user = await getAppUser(ctx);
  if (!user) throw new Error("Nutzer nicht gefunden");
  if (user.role === "admin") return { _id: user._id };
  const ea = await ctx.db
    .query("eventAdmins")
    .withIndex("by_eventId_and_userId", (q) =>
      q.eq("eventId", eventId).eq("userId", user._id),
    )
    .first();
  if (!ea || ea.status !== "accepted") throw new Error("Kein Zugang");
  return { _id: user._id };
}

async function isGlobalAdmin(ctx: { user: { _id: string }; db: QueryCtx["db"] }): Promise<boolean> {
  const user = await getAppUser(ctx);
  return (user?.role === "admin") === true;
}

const buyerValidator = v.object({
  ticketId: v.id("tickets"),
  userName: v.string(),
  userEmail: v.string(),
  status: v.union(v.literal("active"), v.literal("scanned"), v.literal("canceled"), v.literal("expired")),
  checkedIn: v.boolean(),
  checkedInAt: v.optional(v.number()),
  purchasedAt: v.number(),
});

/* --- list events the current user can admin --- */
export const listMyEvents = authQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("events"),
    name: v.string(),
    date: v.string(),
    city: v.string(),
    venue: v.string(),
    totalTickets: v.number(),
    soldTickets: v.number(),
  })),
  handler: async (ctx) => {
    const user = await getAppUser(ctx);
    if (!user) return [];
    if (user.role === "admin") {
      const events = await ctx.db.query("events").order("desc").take(200);
      return events.map((e) => ({ _id: e._id, name: e.name, date: e.date, city: e.city, venue: e.venue, totalTickets: e.totalTickets, soldTickets: e.soldTickets }));
    }
    const entries = await ctx.db.query("eventAdmins").withIndex("by_userId_and_status", (q) => q.eq("userId", user._id).eq("status", "accepted")).collect();
    const events = [];
    for (const entry of entries) {
      const event = await ctx.db.get(entry.eventId);
      if (event) events.push({ _id: event._id, name: event.name, date: event.date, city: event.city, venue: event.venue, totalTickets: event.totalTickets, soldTickets: event.soldTickets });
    }
    return events;
  },
});

/* --- check access --- */
export const hasAccess = authQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const user = await getAppUser(ctx);
    if (!user) return false;
    if (user.role === "admin") return true;
    const entry = await ctx.db.query("eventAdmins").withIndex("by_userId_and_status", (q) => q.eq("userId", user._id).eq("status", "accepted")).first();
    return entry !== null;
  },
});

/* --- is global admin --- */
export const isAdmin = authQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    return await isGlobalAdmin(ctx);
  },
});

/* --- event detail --- */
export const getEventDetail = authQuery({
  args: { eventId: v.id("events") },
  returns: v.union(v.object({ _id: v.id("events"), name: v.string(), venue: v.string(), city: v.string(), date: v.string(), startTime: v.string() }), v.null()),
  handler: async (ctx, args) => {
    await requireEventAccess(ctx, args.eventId);
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    return { _id: event._id, name: event.name, venue: event.venue, city: event.city, date: event.date, startTime: event.startTime };
  },
});

/* --- guest list (paginated) --- */
export const listGuests = authQuery({
  args: { eventId: v.id("events"), paginationOpts: paginationOptsValidator },
  returns: paginatedResultValidator(buyerValidator),
  handler: async (ctx, args) => {
    await requireEventAccess(ctx, args.eventId);
    const results = await ctx.db.query("tickets").withIndex("by_eventId_and_purchasedAt", (q) => q.eq("eventId", args.eventId)).order("desc").paginate(args.paginationOpts);
    return {
      ...results,
      page: await Promise.all(results.page.map(async (ticket) => {
        const user = await ctx.db.get(ticket.userId);
        return {
          ticketId: ticket._id,
          userName: ticket.buyerName ?? user?.name ?? "Unbekannt",
          userEmail: ticket.buyerEmail ?? user?.email ?? "",
          status: ticket.status,
          checkedIn: ticket.checkedIn ?? false,
          checkedInAt: ticket.checkedInAt,
          purchasedAt: ticket.purchasedAt,
        };
      })),
    };
  },
});

/* --- check-in stats --- */
export const getCheckInStats = authQuery({
  args: { eventId: v.id("events") },
  returns: v.object({ totalTickets: v.number(), checkedIn: v.number(), notCheckedIn: v.number() }),
  handler: async (ctx, args) => {
    await requireEventAccess(ctx, args.eventId);
    const tickets = await ctx.db.query("tickets").withIndex("by_eventId", (q) => q.eq("eventId", args.eventId)).collect();
    const active = tickets.filter((t) => t.status !== "canceled");
    const checkedIn = active.filter((t) => t.checkedIn).length;
    return { totalTickets: active.length, checkedIn, notCheckedIn: active.length - checkedIn };
  },
});

/* --- toggle check-in --- */
export const toggleCheckIn = authMutation({
  args: { ticketId: v.id("tickets"), checkedIn: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket nicht gefunden");
    await requireEventAccess(ctx, ticket.eventId);
    await ctx.db.patch(args.ticketId, { checkedIn: args.checkedIn, checkedInAt: args.checkedIn ? Date.now() : undefined });
    return null;
  },
});

/* --- invite event admin --- */
export const inviteEventAdmin = authMutation({
  args: { eventId: v.id("events"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAppUser(ctx);
    if (!user || user.role !== "admin") throw new Error("Nur Admins");
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event nicht gefunden");
    const existing = await ctx.db.query("eventAdmins").withIndex("by_eventId_and_userId", (q) => q.eq("eventId", args.eventId).eq("userId", args.userId)).first();
    if (existing) throw new Error("Bereits eingeladen");
    await ctx.db.insert("eventAdmins", { eventId: args.eventId, userId: args.userId, invitedBy: user._id, status: "pending", createdAt: Date.now() });
    await ctx.db.insert("notifications", { userId: args.userId, type: "event_reminder", title: "Event-Einlass Einladung", body: `Du wurdest als Einlass-Helfer für "${event.name}" eingeladen.`, referenceId: args.eventId, isRead: false, createdAt: Date.now() });
    return null;
  },
});

/* --- respond to invite --- */
export const respondToInvite = authMutation({
  args: { eventAdminId: v.id("eventAdmins"), accept: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAppUser(ctx);
    if (!user) throw new Error("Nutzer nicht gefunden");
    const invite = await ctx.db.get(args.eventAdminId);
    if (!invite) throw new Error("Einladung nicht gefunden");
    if (invite.userId !== user._id) throw new Error("Keine Berechtigung");
    if (invite.status !== "pending") throw new Error("Bereits beantwortet");
    await ctx.db.patch(args.eventAdminId, { status: args.accept ? "accepted" : "declined" });
    return null;
  },
});

/* --- pending invites --- */
export const myPendingInvites = authQuery({
  args: {},
  returns: v.array(v.object({ _id: v.id("eventAdmins"), eventId: v.id("events"), eventName: v.string(), eventDate: v.string(), inviterName: v.string(), createdAt: v.number() })),
  handler: async (ctx) => {
    const user = await getAppUser(ctx);
    if (!user) return [];
    const pending = await ctx.db.query("eventAdmins").withIndex("by_userId_and_status", (q) => q.eq("userId", user._id).eq("status", "pending")).collect();
    const results = [];
    for (const invite of pending) {
      const event = await ctx.db.get(invite.eventId);
      const inviter = await ctx.db.get(invite.invitedBy);
      if (event) results.push({ _id: invite._id, eventId: invite.eventId, eventName: event.name, eventDate: event.date, inviterName: inviter?.name ?? "Admin", createdAt: invite.createdAt });
    }
    return results;
  },
});

/* --- list event admins (global admin) --- */
export const listEventAdmins = authQuery({
  args: { eventId: v.id("events") },
  returns: v.array(v.object({ _id: v.id("eventAdmins"), userId: v.id("users"), userName: v.string(), userEmail: v.string(), status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")) })),
  handler: async (ctx, args) => {
    if (!(await isGlobalAdmin(ctx))) throw new Error("Nur Admins");
    const admins = await ctx.db.query("eventAdmins").withIndex("by_eventId", (q) => q.eq("eventId", args.eventId)).collect();
    const results = [];
    for (const a of admins) {
      const user = await ctx.db.get(a.userId);
      results.push({ _id: a._id, userId: a.userId, userName: user?.name ?? "Unbekannt", userEmail: user?.email ?? "", status: a.status });
    }
    return results;
  },
});

/* --- remove event admin --- */
export const removeEventAdmin = authMutation({
  args: { eventAdminId: v.id("eventAdmins") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await isGlobalAdmin(ctx))) throw new Error("Nur Admins");
    await ctx.db.delete(args.eventAdminId);
    return null;
  },
});

/* --- search users for invite --- */
export const searchUsersForInvite = authQuery({
  args: { searchText: v.string(), eventId: v.id("events") },
  returns: v.array(v.object({ _id: v.id("users"), name: v.string(), email: v.string(), alreadyInvited: v.boolean() })),
  handler: async (ctx, args) => {
    if (!(await isGlobalAdmin(ctx))) return [];
    if (args.searchText.trim().length < 2) return [];
    const users = await ctx.db.query("users").withSearchIndex("search_text", (q) => q.search("searchText", args.searchText)).take(10);
    const results = [];
    for (const user of users) {
      const existing = await ctx.db.query("eventAdmins").withIndex("by_eventId_and_userId", (q) => q.eq("eventId", args.eventId).eq("userId", user._id)).first();
      results.push({ _id: user._id, name: user.name, email: user.email, alreadyInvited: existing !== null });
    }
    return results;
  },
});
