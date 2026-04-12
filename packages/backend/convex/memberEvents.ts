import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { paginatedResultValidator } from "./pagination";

async function getMyUserId(
  ctx: { db: QueryCtx["db"]; user: { _id: string } },
): Promise<Id<"users"> | null> {
  const authId = ctx.user._id;
  const user = await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", authId))
    .unique();
  return user?._id ?? null;
}

const memberEventListItemValidator = v.object({
  _id: v.id("memberEvents"),
  name: v.string(),
  description: v.optional(v.string()),
  thumbnailUrl: v.optional(v.string()),
  venue: v.string(),
  city: v.string(),
  date: v.string(),
  startTime: v.string(),
  durationMinutes: v.number(),
  maxAttendees: v.optional(v.number()),
  attendeeCount: v.number(),
  status: v.union(
    v.literal("upcoming"),
    v.literal("ongoing"),
    v.literal("completed"),
    v.literal("canceled"),
  ),
  creatorName: v.string(),
  creatorAvatarUrl: v.optional(v.string()),
  isAttending: v.boolean(),
  isCreator: v.boolean(),
  groupId: v.id("groups"),
  createdAt: v.number(),
});

// ── List member events ──────────────────────────────────────────
export const list = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    city: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  returns: paginatedResultValidator(memberEventListItemValidator),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    const city = args.city;
    const status = args.status;

    const results = city
      ? await ctx.db
          .query("memberEvents")
          .withIndex("by_city", (q) => q.eq("city", city))
          .order("desc")
          .paginate(args.paginationOpts)
      : status
        ? await ctx.db
            .query("memberEvents")
            .withIndex("by_status", (q) =>
              q.eq(
                "status",
                status as
                  | "upcoming"
                  | "ongoing"
                  | "completed"
                  | "canceled",
              ),
            )
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("memberEvents")
            .order("desc")
            .paginate(args.paginationOpts);

    return {
      ...results,
      page: await Promise.all(
        results.page.map(async (event) => {
          const creator = await ctx.db.get(event.creatorId);
          const isAttending = myUserId
            ? !!(await ctx.db
                .query("groupMembers")
                .withIndex("by_groupId_and_userId", (q) =>
                  q.eq("groupId", event.groupId).eq("userId", myUserId),
                )
                .unique())
            : false;
          return {
            _id: event._id,
            name: event.name,
            description: event.description,
            thumbnailUrl: event.thumbnailStorageId
              ? ((await ctx.storage.getUrl(event.thumbnailStorageId)) ??
                undefined)
              : event.thumbnailUrl,
            venue: event.venue,
            city: event.city,
            date: event.date,
            startTime: event.startTime,
            durationMinutes: event.durationMinutes,
            maxAttendees: event.maxAttendees,
            attendeeCount: event.attendeeCount,
            status: event.status,
            creatorName: creator?.name ?? "Unbekannt",
            creatorAvatarUrl: creator?.avatarStorageId
              ? ((await ctx.storage.getUrl(creator.avatarStorageId)) ??
                undefined)
              : creator?.avatarUrl,
            isAttending,
            isCreator: !!myUserId && event.creatorId === myUserId,
            groupId: event.groupId,
            createdAt: event.createdAt,
          };
        }),
      ),
    };
  },
});

// ── Get single member event ─────────────────────────────────
export const getById = query({
  args: { eventId: v.id("memberEvents") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("memberEvents"),
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
      maxAttendees: v.optional(v.number()),
      attendeeCount: v.number(),
      status: v.union(
        v.literal("upcoming"),
        v.literal("ongoing"),
        v.literal("completed"),
        v.literal("canceled"),
      ),
      creatorId: v.id("users"),
      creatorName: v.string(),
      creatorAvatarUrl: v.optional(v.string()),
      groupId: v.id("groups"),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    const creator = await ctx.db.get(event.creatorId);
    return {
      _id: event._id,
      name: event.name,
      description: event.description,
      thumbnailUrl: event.thumbnailStorageId
        ? ((await ctx.storage.getUrl(event.thumbnailStorageId)) ?? undefined)
        : event.thumbnailUrl,
      videoUrl: event.videoStorageId
        ? ((await ctx.storage.getUrl(event.videoStorageId)) ?? undefined)
        : undefined,
      videoThumbnailUrl: event.videoThumbnailStorageId
        ? ((await ctx.storage.getUrl(event.videoThumbnailStorageId)) ?? undefined)
        : undefined,
      venue: event.venue,
      city: event.city,
      county: event.county,
      date: event.date,
      startTime: event.startTime,
      durationMinutes: event.durationMinutes,
      maxAttendees: event.maxAttendees,
      attendeeCount: event.attendeeCount,
      status: event.status,
      creatorId: event.creatorId,
      creatorName: creator?.name ?? "Unbekannt",
      creatorAvatarUrl: creator?.avatarStorageId
        ? ((await ctx.storage.getUrl(creator.avatarStorageId)) ?? undefined)
        : creator?.avatarUrl,
      groupId: event.groupId,
      createdAt: event.createdAt,
    };
  },
});

// ── Create member event ─────────────────────────────────
export const create = authMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    venue: v.string(),
    city: v.string(),
    county: v.optional(v.string()),
    date: v.string(),
    startTime: v.string(),
    durationMinutes: v.number(),
    maxAttendees: v.optional(v.number()),
    thumbnailStorageId: v.optional(v.id("_storage")),
    videoStorageId: v.optional(v.id("_storage")),
    videoThumbnailStorageId: v.optional(v.id("_storage")),
  },
  returns: v.id("memberEvents"),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");

    // 1) Create the event group (hidden from Community tab)
    const groupId = await ctx.db.insert("groups", {
      name: `Event: ${args.name}`,
      description: `Gruppe für das Member Event "${args.name}"`,
      city: args.city,
      county: args.county,
      visibility: "invite_only",
      creatorId: myUserId,
      memberCount: 1,
      createdAt: Date.now(),
      isMemberEventGroup: true,
    });

    // 2) Create conversation for event group
    await ctx.db.insert("conversations", {
      type: "group",
      groupId,
      createdAt: Date.now(),
    });

    // 3) Creator is admin member
    await ctx.db.insert("groupMembers", {
      groupId,
      userId: myUserId,
      role: "admin",
      status: "active",
      joinedAt: Date.now(),
    });

    // 4) Create the member event
    const eventId = await ctx.db.insert("memberEvents", {
      name: args.name,
      description: args.description,
      venue: args.venue,
      city: args.city,
      county: args.county,
      date: args.date,
      startTime: args.startTime,
      durationMinutes: args.durationMinutes,
      maxAttendees: args.maxAttendees,
      thumbnailStorageId: args.thumbnailStorageId,
      videoStorageId: args.videoStorageId,
      videoThumbnailStorageId: args.videoThumbnailStorageId,
      attendeeCount: 1, // creator counts
      creatorId: myUserId,
      groupId,
      status: "upcoming",
      createdAt: Date.now(),
    });

    // 5) Link group back to event
    await ctx.db.patch(groupId, { memberEventId: eventId });

    return eventId;
  },
});

// ── Join event ("Dabei sein") ───────────────────────────────────
export const join = authMutation({
  args: { eventId: v.id("memberEvents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event nicht gefunden");
    if (event.status === "canceled")
      throw new Error("Event wurde abgesagt");
    if (
      event.maxAttendees &&
      event.attendeeCount >= event.maxAttendees
    ) {
      throw new Error("Event ist leider voll");
    }

    // Check if already a member
    const existing = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId_and_userId", (q) =>
        q.eq("groupId", event.groupId).eq("userId", myUserId),
      )
      .unique();
    if (existing) return null; // already attending

    // Add to event group
    await ctx.db.insert("groupMembers", {
      groupId: event.groupId,
      userId: myUserId,
      role: "member",
      status: "active",
      joinedAt: Date.now(),
    });

    // Update counts
    await ctx.db.patch(args.eventId, {
      attendeeCount: event.attendeeCount + 1,
    });
    const group = await ctx.db.get(event.groupId);
    if (group) {
      await ctx.db.patch(event.groupId, {
        memberCount: group.memberCount + 1,
      });
    }

    // Notify event creator
    const me = await ctx.db.get(myUserId);
    await ctx.db.insert("notifications", {
      userId: event.creatorId,
      type: "event_join",
      title: "Neuer Teilnehmer",
      body: `${me?.name ?? "Jemand"} nimmt an deinem Event "${event.name}" teil!`,
      referenceId: args.eventId,
      isRead: false,
      createdAt: Date.now(),
    });

    return null;
  },
});

// ── Leave event ─────────────────────────────────────────────────
export const leave = authMutation({
  args: { eventId: v.id("memberEvents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event nicht gefunden");

    // Can't leave your own event
    if (event.creatorId === myUserId) {
      throw new Error("Du kannst dein eigenes Event nicht verlassen");
    }

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId_and_userId", (q) =>
        q.eq("groupId", event.groupId).eq("userId", myUserId),
      )
      .unique();
    if (!membership) return null;

    await ctx.db.delete(membership._id);

    // Update counts
    if (event.attendeeCount > 0) {
      await ctx.db.patch(args.eventId, {
        attendeeCount: event.attendeeCount - 1,
      });
    }
    const group = await ctx.db.get(event.groupId);
    if (group && group.memberCount > 0) {
      await ctx.db.patch(event.groupId, {
        memberCount: group.memberCount - 1,
      });
    }

    return null;
  },
});

// ── Kick attendee (admin only) ──────────────────────────────────
export const kickAttendee = authMutation({
  args: {
    eventId: v.id("memberEvents"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event nicht gefunden");
    if (event.creatorId !== myUserId)
      throw new Error("Nur der Event-Admin kann Teilnehmer entfernen");

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId_and_userId", (q) =>
        q.eq("groupId", event.groupId).eq("userId", args.userId),
      )
      .unique();
    if (!membership) return null;

    await ctx.db.delete(membership._id);

    if (event.attendeeCount > 0) {
      await ctx.db.patch(args.eventId, {
        attendeeCount: event.attendeeCount - 1,
      });
    }
    const group = await ctx.db.get(event.groupId);
    if (group && group.memberCount > 0) {
      await ctx.db.patch(event.groupId, {
        memberCount: group.memberCount - 1,
      });
    }

    // Notify kicked user
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "event_kicked",
      title: "Event verlassen",
      body: `Du wurdest aus dem Event "${event.name}" entfernt.`,
      referenceId: args.eventId,
      isRead: false,
      createdAt: Date.now(),
    });

    return null;
  },
});

// ── Invite user to event (admin only) ───────────────────────────
export const inviteUser = authMutation({
  args: {
    eventId: v.id("memberEvents"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event nicht gefunden");
    if (event.creatorId !== myUserId)
      throw new Error("Nur der Event-Admin kann einladen");

    // Check not already in group
    const existing = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId_and_userId", (q) =>
        q.eq("groupId", event.groupId).eq("userId", args.userId),
      )
      .unique();
    if (existing) return null;

    // Add to group
    await ctx.db.insert("groupMembers", {
      groupId: event.groupId,
      userId: args.userId,
      role: "member",
      status: "active",
      joinedAt: Date.now(),
    });

    await ctx.db.patch(args.eventId, {
      attendeeCount: event.attendeeCount + 1,
    });
    const group = await ctx.db.get(event.groupId);
    if (group) {
      await ctx.db.patch(event.groupId, {
        memberCount: group.memberCount + 1,
      });
    }

    // Notify invited user
    const me = await ctx.db.get(myUserId);
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "event_invite",
      title: "Event-Einladung",
      body: `${me?.name ?? "Jemand"} hat dich zum Event "${event.name}" eingeladen!`,
      referenceId: args.eventId,
      isRead: false,
      createdAt: Date.now(),
    });

    return null;
  },
});

// ── Cancel event (admin only) ───────────────────────────────────
export const cancel = authMutation({
  args: { eventId: v.id("memberEvents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event nicht gefunden");
    if (event.creatorId !== myUserId)
      throw new Error("Nur der Event-Admin kann das Event absagen");

    await ctx.db.patch(args.eventId, { status: "canceled" });

    // Notify all attendees
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", event.groupId))
      .collect();
    await Promise.all(
      members
        .filter((m) => m.userId !== myUserId && m.status === "active")
        .map((m) =>
          ctx.db.insert("notifications", {
            userId: m.userId,
            type: "event_canceled",
            title: "Event abgesagt",
            body: `Das Event "${event.name}" wurde leider abgesagt.`,
            referenceId: args.eventId,
            isRead: false,
            createdAt: Date.now(),
          }),
        ),
    );

    return null;
  },
});

// ── Update member event (admin only) ────────────────────
export const update = authMutation({
  args: {
    eventId: v.id("memberEvents"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    clearDescription: v.optional(v.boolean()),
    venue: v.optional(v.string()),
    city: v.optional(v.string()),
    county: v.optional(v.string()),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    maxAttendees: v.optional(v.number()),
    clearMaxAttendees: v.optional(v.boolean()),
    thumbnailStorageId: v.optional(v.id("_storage")),
    removeThumbnail: v.optional(v.boolean()),
    videoStorageId: v.optional(v.id("_storage")),
    videoThumbnailStorageId: v.optional(v.id("_storage")),
    removeVideo: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) throw new Error("User not found");

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event nicht gefunden");
    if (event.creatorId !== myUserId)
      throw new Error("Nur der Event-Admin kann das Event bearbeiten");

    const patch: Record<string, unknown> = {};

    if (args.name !== undefined) patch.name = args.name;
    if (args.description !== undefined) patch.description = args.description;
    if (args.clearDescription) patch.description = undefined;
    if (args.venue !== undefined) patch.venue = args.venue;
    if (args.city !== undefined) patch.city = args.city;
    if (args.county !== undefined) patch.county = args.county;
    if (args.date !== undefined) patch.date = args.date;
    if (args.startTime !== undefined) patch.startTime = args.startTime;
    if (args.durationMinutes !== undefined) patch.durationMinutes = args.durationMinutes;
    if (args.maxAttendees !== undefined) patch.maxAttendees = args.maxAttendees;
    if (args.clearMaxAttendees) patch.maxAttendees = undefined;
    if (args.thumbnailStorageId !== undefined) patch.thumbnailStorageId = args.thumbnailStorageId;
    if (args.removeThumbnail) {
      patch.thumbnailStorageId = undefined;
      patch.thumbnailUrl = undefined;
    }
    if (args.videoStorageId !== undefined) patch.videoStorageId = args.videoStorageId;
    if (args.videoThumbnailStorageId !== undefined)
      patch.videoThumbnailStorageId = args.videoThumbnailStorageId;
    if (args.removeVideo) {
      patch.videoStorageId = undefined;
      patch.videoThumbnailStorageId = undefined;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.eventId, patch);
    }

    // Update group name if event name changed
    if (args.name) {
      await ctx.db.patch(event.groupId, {
        name: `Event: ${args.name}`,
      });
    }

    return null;
  },
});

// ── Get attendees ───────────────────────────────────────────────
export const getAttendees = query({
  args: { eventId: v.id("memberEvents") },
  returns: v.array(
    v.object({
      _id: v.id("groupMembers"),
      userId: v.id("users"),
      name: v.string(),
      avatarUrl: v.optional(v.string()),
      role: v.union(v.literal("admin"), v.literal("member")),
    }),
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return [];
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", event.groupId))
      .collect();
    const results: Array<{
      _id: Id<"groupMembers">;
      userId: Id<"users">;
      name: string;
      avatarUrl: string | undefined;
      role: "admin" | "member";
    }> = [];
    for (const m of members) {
      if (m.status !== "active") continue;
      const user = await ctx.db.get(m.userId);
      if (user) {
        results.push({
          _id: m._id,
          userId: m.userId,
          name: user.name,
          avatarUrl: user.avatarStorageId
            ? ((await ctx.storage.getUrl(user.avatarStorageId)) ?? undefined)
            : user.avatarUrl,
          role: m.role,
        });
      }
    }
    return results;
  },
});

// ── My events (events I created or am attending) ────────────────
export const myEvents = authQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("memberEvents"),
      name: v.string(),
      date: v.string(),
      startTime: v.string(),
      city: v.string(),
      attendeeCount: v.number(),
      isCreator: v.boolean(),
      status: v.union(
        v.literal("upcoming"),
        v.literal("ongoing"),
        v.literal("completed"),
        v.literal("canceled"),
      ),
    }),
  ),
  handler: async (ctx) => {
    const myUserId = await getMyUserId(ctx);
    if (!myUserId) return [];

    // Events I created
    const created = await ctx.db
      .query("memberEvents")
      .withIndex("by_creatorId", (q) => q.eq("creatorId", myUserId))
      .collect();

    // Groups I'm a member of that are event groups
    const myMemberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", myUserId))
      .collect();

    const attendingEventIds = new Set<string>();
    const attendingEvents: Array<{
      _id: Id<"memberEvents">;
      name: string;
      date: string;
      startTime: string;
      city: string;
      attendeeCount: number;
      isCreator: boolean;
      status: "upcoming" | "ongoing" | "completed" | "canceled";
    }> = [];

    // Add created events
    for (const e of created) {
      attendingEventIds.add(e._id);
      attendingEvents.push({
        _id: e._id,
        name: e.name,
        date: e.date,
        startTime: e.startTime,
        city: e.city,
        attendeeCount: e.attendeeCount,
        isCreator: true,
        status: e.status,
      });
    }

    // Add events I'm attending but didn't create
    for (const m of myMemberships) {
      if (m.status !== "active") continue;
      const group = await ctx.db.get(m.groupId);
      if (!group?.isMemberEventGroup || !group.memberEventId) continue;
      if (attendingEventIds.has(group.memberEventId)) continue;
      const event = await ctx.db.get(group.memberEventId);
      if (!event) continue;
      attendingEvents.push({
        _id: event._id,
        name: event.name,
        date: event.date,
        startTime: event.startTime,
        city: event.city,
        attendeeCount: event.attendeeCount,
        isCreator: false,
        status: event.status,
      });
    }

    // Sort by date
    attendingEvents.sort((a, b) => a.date.localeCompare(b.date));
    return attendingEvents;
  },
});

// ── Generate upload URL ─────────────────────────────────────────
export const generateUploadUrl = authMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
