import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── User Profiles ──────────────────────────────────────────────
  users: defineTable({
    authId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarStorageId: v.optional(v.id("_storage")),
    avatarUrl: v.optional(v.string()),
    bannerStorageId: v.optional(v.id("_storage")),
    bannerUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    county: v.optional(v.string()),
    city: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"), v.literal("prefer_not_to_say"))),
    birthDate: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    role: v.union(v.literal("user"), v.literal("admin")),
    onboardingComplete: v.boolean(),
    subscriptionStatus: v.union(v.literal("none"), v.literal("active"), v.literal("canceled"), v.literal("expired")),
    subscriptionPlan: v.optional(v.string()),
    subscriptionExpiresAt: v.optional(v.number()),
    lastActiveAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_authId", ["authId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_subscriptionStatus", ["subscriptionStatus"])
    .index("by_county_and_city", ["county", "city"])
    .index("by_lastActiveAt", ["lastActiveAt"]),

  // ── Groups ─────────────────────────────────────────────────────
  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    thumbnailStorageId: v.optional(v.id("_storage")),
    thumbnailUrl: v.optional(v.string()),
    county: v.optional(v.string()),
    city: v.optional(v.string()),
    topic: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    visibility: v.union(v.literal("public"), v.literal("invite_only"), v.literal("request")),
    creatorId: v.id("users"),
    memberCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_creatorId", ["creatorId"])
    .index("by_county_and_city", ["county", "city"])
    .index("by_topic", ["topic"])
    .searchIndex("search_name", { searchField: "name" }),

  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    status: v.union(v.literal("active"), v.literal("pending")),
    joinedAt: v.number(),
  })
    .index("by_groupId", ["groupId"])
    .index("by_userId", ["userId"])
    .index("by_groupId_and_userId", ["groupId", "userId"]),

  // ── Messages (group + DM) ──────────────────────────────────────
  conversations: defineTable({
    type: v.union(v.literal("direct"), v.literal("group")),
    groupId: v.optional(v.id("groups")),
    participantIds: v.optional(v.array(v.id("users"))),
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_groupId", ["groupId"])
    .index("by_lastMessageAt", ["lastMessageAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("voice"), v.literal("post_share")),
    text: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaUrl: v.optional(v.string()),
    mediaDuration: v.optional(v.number()),
    sharedPostId: v.optional(v.id("posts")),
    createdAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"]),

  // ── Posts / Feed ───────────────────────────────────────────────
  posts: defineTable({
    authorId: v.id("users"),
    type: v.union(v.literal("photo"), v.literal("video")),
    caption: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaUrl: v.optional(v.string()),
    thumbnailStorageId: v.optional(v.id("_storage")),
    thumbnailUrl: v.optional(v.string()),
    aspectMode: v.optional(v.union(v.literal("original"), v.literal("cropped"))),
    cropOffsetY: v.optional(v.number()),
    mediaAspectRatio: v.optional(v.number()),
    likeCount: v.number(),
    commentCount: v.number(),
    isPinned: v.boolean(),
    isAnnouncement: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_authorId", ["authorId"])
    .index("by_isPinned", ["isPinned"])
    .index("by_createdAt", ["createdAt"]),

  likes: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_postId", ["postId"])
    .index("by_postId_and_userId", ["postId", "userId"])
    .index("by_userId", ["userId"]),

  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.id("users"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_postId", ["postId"]),

  savedPosts: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_postId_and_userId", ["postId", "userId"]),

  // ── Events ─────────────────────────────────────────────────────
  events: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    thumbnailStorageId: v.optional(v.id("_storage")),
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
  })
    .index("by_city", ["city"])
    .index("by_status", ["status"])
    .index("by_date", ["date"])
    .index("by_creatorId", ["creatorId"]),

  tickets: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    qrCode: v.string(),
    status: v.union(v.literal("active"), v.literal("scanned"), v.literal("canceled"), v.literal("expired")),
    purchasedAt: v.number(),
    scannedAt: v.optional(v.number()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_userId", ["userId"])
    .index("by_qrCode", ["qrCode"]),

  // ── Partners ───────────────────────────────────────────────────
  partners: defineTable({
    businessName: v.string(),
    shortText: v.string(),
    description: v.optional(v.string()),
    thumbnailStorageId: v.optional(v.id("_storage")),
    thumbnailUrl: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_isActive", ["isActive"]),

  // ── Friend Requests ────────────────────────────────────────────
  friendRequests: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_senderId", ["senderId"])
    .index("by_receiverId", ["receiverId"])
    .index("by_senderId_and_receiverId", ["senderId", "receiverId"]),

  // ── Notifications ──────────────────────────────────────────────
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("message"),
      v.literal("like"),
      v.literal("comment"),
      v.literal("group_invite"),
      v.literal("event_reminder"),
      v.literal("ticket_confirmed"),
      v.literal("announcement"),
      v.literal("call"),
      v.literal("join_request"),
      v.literal("join_accepted"),
      v.literal("join_rejected"),
      v.literal("post_share"),
      v.literal("friend_request"),
      v.literal("friend_accepted")
    ),
    title: v.string(),
    body: v.string(),
    referenceId: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_isRead", ["userId", "isRead"]),

  // ── Reports / Moderation ───────────────────────────────────────
  reports: defineTable({
    reporterId: v.id("users"),
    type: v.union(v.literal("user"), v.literal("post"), v.literal("group"), v.literal("partner")),
    targetId: v.string(),
    reason: v.string(),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("resolved")),
    createdAt: v.number(),
  })
    .index("by_status", ["status"]),

  blockedUsers: defineTable({
    blockerId: v.id("users"),
    blockedId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_blockerId", ["blockerId"])
    .index("by_blockerId_and_blockedId", ["blockerId", "blockedId"]),

  // ── Analytics snapshots ────────────────────────────────────────
  analyticsSnapshots: defineTable({
    date: v.string(),
    totalUsers: v.number(),
    activeUsersToday: v.number(),
    activeUsers7d: v.number(),
    activeUsers30d: v.number(),
    newRegistrations: v.number(),
    activeSubscriptions: v.number(),
    newSubscriptions: v.number(),
    cancellations: v.number(),
    totalPosts: v.number(),
    totalMessages: v.number(),
    totalGroups: v.number(),
    totalEvents: v.number(),
    createdAt: v.number(),
  })
    .index("by_date", ["date"]),

  // ── Calls ──────────────────────────────────────────────────────
  calls: defineTable({
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
    conversationId: v.optional(v.id("conversations")),
    receiverId: v.optional(v.id("users")),
    groupId: v.optional(v.id("groups")),
    groupName: v.optional(v.string()),
    startedAt: v.number(),
    answeredAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  })
    .index("by_receiverId_and_status", ["receiverId", "status"])
    .index("by_groupId_and_status", ["groupId", "status"])
    .index("by_callerId_and_status", ["callerId", "status"]),

  callParticipants: defineTable({
    callId: v.id("calls"),
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
    joinedAt: v.optional(v.number()),
    leftAt: v.optional(v.number()),
  })
    .index("by_callId", ["callId"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_callId_and_userId", ["callId", "userId"]),
});
