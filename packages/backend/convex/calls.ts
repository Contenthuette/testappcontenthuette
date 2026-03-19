import { v } from "convex/values";
import { authQuery, authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

// ── helpers ──────────────────────────────────────────────────────────────────
async function resolveUserId(
  ctx: { db: QueryCtx["db"]; user: { _id: string } },
): Promise<Id<"users"> | null> {
  const u = await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", ctx.user._id))
    .unique();
  return u?._id ?? null;
}

// ── initiate a 1:1 call ──────────────────────────────────────────────────────
export const initiateCall = authMutation({
  args: {
    receiverId: v.id("users"),
    conversationId: v.id("conversations"),
    type: v.union(v.literal("audio"), v.literal("video")),
  },
  returns: v.id("calls"),
  handler: async (ctx, args) => {
    const myId = await resolveUserId(ctx);
    if (!myId) throw new Error("User not found");

    const me = await ctx.db.get(myId);
    if (!me) throw new Error("User not found");

    const avatarUrl = me.avatarStorageId
      ? await ctx.storage.getUrl(me.avatarStorageId)
      : me.avatarUrl;

    const callId = await ctx.db.insert("calls", {
      type: args.type,
      status: "ringing",
      callerId: myId,
      callerName: me.name,
      callerAvatarUrl: avatarUrl ?? undefined,
      conversationId: args.conversationId,
      receiverId: args.receiverId,
      startedAt: Date.now(),
    });

    // Add caller as connected participant
    await ctx.db.insert("callParticipants", {
      callId,
      userId: myId,
      userName: me.name,
      userAvatarUrl: avatarUrl ?? undefined,
      status: "connected",
      isMuted: false,
      isVideoOff: args.type === "audio",
      joinedAt: Date.now(),
    });

    // Add receiver as ringing participant
    const receiver = await ctx.db.get(args.receiverId);
    const receiverAvatar = receiver?.avatarStorageId
      ? await ctx.storage.getUrl(receiver.avatarStorageId)
      : receiver?.avatarUrl;

    await ctx.db.insert("callParticipants", {
      callId,
      userId: args.receiverId,
      userName: receiver?.name ?? "Unbekannt",
      userAvatarUrl: receiverAvatar ?? undefined,
      status: "ringing",
      isMuted: false,
      isVideoOff: args.type === "audio",
    });

    // Create notification
    await ctx.db.insert("notifications", {
      userId: args.receiverId,
      type: "call",
      title: args.type === "video" ? "Videoanruf" : "Anruf",
      body: `${me.name} ruft dich an`,
      referenceId: callId,
      isRead: false,
      createdAt: Date.now(),
    });

    return callId;
  },
});

// ── initiate a group call ────────────────────────────────────────────────────
export const initiateGroupCall = authMutation({
  args: {
    groupId: v.id("groups"),
    type: v.union(v.literal("audio"), v.literal("video")),
  },
  returns: v.id("calls"),
  handler: async (ctx, args) => {
    const myId = await resolveUserId(ctx);
    if (!myId) throw new Error("User not found");

    const me = await ctx.db.get(myId);
    if (!me) throw new Error("User not found");
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");

    const avatarUrl = me.avatarStorageId
      ? await ctx.storage.getUrl(me.avatarStorageId)
      : me.avatarUrl;

    const callId = await ctx.db.insert("calls", {
      type: args.type,
      status: "ringing",
      callerId: myId,
      callerName: me.name,
      callerAvatarUrl: avatarUrl ?? undefined,
      groupId: args.groupId,
      groupName: group.name,
      startedAt: Date.now(),
    });

    // Add caller as connected
    await ctx.db.insert("callParticipants", {
      callId,
      userId: myId,
      userName: me.name,
      userAvatarUrl: avatarUrl ?? undefined,
      status: "connected",
      isMuted: false,
      isVideoOff: args.type === "audio",
      joinedAt: Date.now(),
    });

    // Add all group members as ringing (except caller)
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_groupId", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const member of members) {
      if (member.userId === myId || member.status !== "active") continue;
      const u = await ctx.db.get(member.userId);
      const uAvatar = u?.avatarStorageId
        ? await ctx.storage.getUrl(u.avatarStorageId)
        : u?.avatarUrl;

      await ctx.db.insert("callParticipants", {
        callId,
        userId: member.userId,
        userName: u?.name ?? "Unbekannt",
        userAvatarUrl: uAvatar ?? undefined,
        status: "ringing",
        isMuted: false,
        isVideoOff: args.type === "audio",
      });

      await ctx.db.insert("notifications", {
        userId: member.userId,
        type: "call",
        title: args.type === "video" ? "Gruppen-Videoanruf" : "Gruppenanruf",
        body: `${me.name} ruft in ${group.name} an`,
        referenceId: callId,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return callId;
  },
});

// ── answer call ──────────────────────────────────────────────────────────────
export const answerCall = authMutation({
  args: { callId: v.id("calls") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myId = await resolveUserId(ctx);
    if (!myId) throw new Error("User not found");

    const call = await ctx.db.get(args.callId);
    if (!call) throw new Error("Call not found");

    // Update participant status
    const participant = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId_and_userId", (q) =>
        q.eq("callId", args.callId).eq("userId", myId)
      )
      .unique();

    if (participant) {
      await ctx.db.patch(participant._id, {
        status: "connected",
        joinedAt: Date.now(),
      });
    }

    // Update call status to active
    if (call.status === "ringing") {
      await ctx.db.patch(args.callId, {
        status: "active",
        answeredAt: Date.now(),
      });
    }
  },
});

// ── decline call ─────────────────────────────────────────────────────────────
export const declineCall = authMutation({
  args: { callId: v.id("calls") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myId = await resolveUserId(ctx);
    if (!myId) throw new Error("User not found");

    const call = await ctx.db.get(args.callId);
    if (!call) throw new Error("Call not found");

    // Update participant
    const participant = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId_and_userId", (q) =>
        q.eq("callId", args.callId).eq("userId", myId)
      )
      .unique();

    if (participant) {
      await ctx.db.patch(participant._id, {
        status: "declined",
        leftAt: Date.now(),
      });
    }

    // For 1:1 calls, mark the whole call as declined
    if (call.receiverId && call.status === "ringing") {
      await ctx.db.patch(args.callId, {
        status: "declined",
        endedAt: Date.now(),
      });
    }
  },
});

// ── end call ─────────────────────────────────────────────────────────────────
export const endCall = authMutation({
  args: { callId: v.id("calls") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myId = await resolveUserId(ctx);
    if (!myId) throw new Error("User not found");

    const call = await ctx.db.get(args.callId);
    if (!call || call.status === "ended") return;

    // Update my participant status
    const participant = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId_and_userId", (q) =>
        q.eq("callId", args.callId).eq("userId", myId)
      )
      .unique();

    if (participant && participant.status === "connected") {
      await ctx.db.patch(participant._id, {
        status: "left",
        leftAt: Date.now(),
      });
    }

    // Check if any participants are still connected
    const remaining = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId", (q) => q.eq("callId", args.callId))
      .collect();

    const stillConnected = remaining.filter((p) => p.status === "connected");

    // If nobody is connected, or only caller remains and it's a 1:1, end the call
    if (stillConnected.length <= 1) {
      await ctx.db.patch(args.callId, {
        status: "ended",
        endedAt: Date.now(),
      });

      // Mark all remaining ringing participants as missed
      for (const p of remaining) {
        if (p.status === "ringing") {
          await ctx.db.patch(p._id, { status: "left", leftAt: Date.now() });
        }
        if (p.status === "connected" && p._id !== participant?._id) {
          await ctx.db.patch(p._id, { status: "left", leftAt: Date.now() });
        }
      }

      // Clean up WebRTC signaling records
      const signals = await ctx.db
        .query("callSignaling")
        .withIndex("by_callId", (q) => q.eq("callId", args.callId))
        .collect();
      for (const sig of signals) {
        await ctx.db.delete(sig._id);
      }
    }
  },
});

// ── toggle mute ──────────────────────────────────────────────────────────────
export const toggleMute = authMutation({
  args: { callId: v.id("calls") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myId = await resolveUserId(ctx);
    if (!myId) throw new Error("User not found");

    const participant = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId_and_userId", (q) =>
        q.eq("callId", args.callId).eq("userId", myId)
      )
      .unique();

    if (participant) {
      await ctx.db.patch(participant._id, { isMuted: !participant.isMuted });
    }
  },
});

// ── toggle video ─────────────────────────────────────────────────────────────
export const toggleVideo = authMutation({
  args: { callId: v.id("calls") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myId = await resolveUserId(ctx);
    if (!myId) throw new Error("User not found");

    const participant = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId_and_userId", (q) =>
        q.eq("callId", args.callId).eq("userId", myId)
      )
      .unique();

    if (participant) {
      await ctx.db.patch(participant._id, { isVideoOff: !participant.isVideoOff });
    }
  },
});

// ── get incoming calls for current user ──────────────────────────────────────
export const getIncomingCall = authQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("calls"),
      type: v.union(v.literal("audio"), v.literal("video")),
      callerId: v.id("users"),
      callerName: v.string(),
      callerAvatarUrl: v.optional(v.string()),
      groupName: v.optional(v.string()),
      groupId: v.optional(v.id("groups")),
      startedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const myId = await resolveUserId(ctx);
    if (!myId) return null;

    // Find a call where I'm a ringing participant
    const ringingParticipant = await ctx.db
      .query("callParticipants")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", myId).eq("status", "ringing")
      )
      .first();

    if (!ringingParticipant) return null;

    const call = await ctx.db.get(ringingParticipant.callId);
    if (!call || (call.status !== "ringing" && call.status !== "active")) return null;

    return {
      _id: call._id,
      type: call.type,
      callerId: call.callerId,
      callerName: call.callerName,
      callerAvatarUrl: call.callerAvatarUrl,
      groupName: call.groupName,
      groupId: call.groupId,
      startedAt: call.startedAt,
    };
  },
});

// ── get active call details ──────────────────────────────────────────────────
export const getCallDetails = authQuery({
  args: { callId: v.id("calls") },
  returns: v.union(
    v.object({
      _id: v.id("calls"),
      type: v.union(v.literal("audio"), v.literal("video")),
      status: v.union(
        v.literal("ringing"),
        v.literal("active"),
        v.literal("ended"),
        v.literal("declined"),
        v.literal("missed")
      ),
      callerId: v.id("users"),
      callerName: v.string(),
      callerAvatarUrl: v.optional(v.string()),
      groupName: v.optional(v.string()),
      groupId: v.optional(v.id("groups")),
      receiverId: v.optional(v.id("users")),
      startedAt: v.number(),
      answeredAt: v.optional(v.number()),
      endedAt: v.optional(v.number()),
      participants: v.array(
        v.object({
          _id: v.id("callParticipants"),
          userId: v.id("users"),
          userName: v.string(),
          userAvatarUrl: v.optional(v.string()),
          status: v.union(
            v.literal("ringing"),
            v.literal("connected"),
            v.literal("declined"),
            v.literal("left")
          ),
          isMuted: v.boolean(),
          isVideoOff: v.boolean(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return null;

    const participants = await ctx.db
      .query("callParticipants")
      .withIndex("by_callId", (q) => q.eq("callId", args.callId))
      .collect();

    return {
      _id: call._id,
      type: call.type,
      status: call.status,
      callerId: call.callerId,
      callerName: call.callerName,
      callerAvatarUrl: call.callerAvatarUrl,
      groupName: call.groupName,
      groupId: call.groupId,
      receiverId: call.receiverId,
      startedAt: call.startedAt,
      answeredAt: call.answeredAt,
      endedAt: call.endedAt,
      participants: participants.map((p) => ({
        _id: p._id,
        userId: p.userId,
        userName: p.userName,
        userAvatarUrl: p.userAvatarUrl,
        status: p.status,
        isMuted: p.isMuted,
        isVideoOff: p.isVideoOff,
      })),
    };
  },
});

// ── get other user info for DM call ──────────────────────────────────────────
export const getConversationPartner = authQuery({
  args: { conversationId: v.id("conversations") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      avatarUrl: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const myId = await resolveUserId(ctx);
    if (!myId) return null;

    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.type !== "direct" || !conv.participantIds) return null;

    const otherId = conv.participantIds.find((id) => id !== myId);
    if (!otherId) return null;

    const other = await ctx.db.get(otherId);
    if (!other) return null;

    const avatarUrl = other.avatarStorageId
      ? await ctx.storage.getUrl(other.avatarStorageId)
      : other.avatarUrl;

    return {
      _id: other._id,
      name: other.name,
      avatarUrl: avatarUrl ?? undefined,
    };
  },
});

// ── WebRTC signaling ─────────────────────────────────────────────────────────
export const sendSignal = authMutation({
  args: {
    callId: v.id("calls"),
    type: v.union(
      v.literal("offer"),
      v.literal("answer"),
      v.literal("ice-candidate")
    ),
    payload: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const myId = await resolveUserId(ctx);
    if (!myId) throw new Error("User not found");

    await ctx.db.insert("callSignaling", {
      callId: args.callId,
      senderId: myId,
      type: args.type,
      payload: args.payload,
    });
  },
});

export const getSignals = authQuery({
  args: { callId: v.id("calls") },
  returns: v.array(
    v.object({
      _id: v.id("callSignaling"),
      _creationTime: v.number(),
      senderId: v.id("users"),
      type: v.union(
        v.literal("offer"),
        v.literal("answer"),
        v.literal("ice-candidate")
      ),
      payload: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const myId = await resolveUserId(ctx);
    if (!myId) return [];

    const signals = await ctx.db
      .query("callSignaling")
      .withIndex("by_callId", (q) => q.eq("callId", args.callId))
      .collect();

    // Return only signals from the other participant
    return signals
      .filter((s) => s.senderId !== myId)
      .map((s) => ({
        _id: s._id,
        _creationTime: s._creationTime,
        senderId: s.senderId,
        type: s.type as "offer" | "answer" | "ice-candidate",
        payload: s.payload,
      }));
  },
});
