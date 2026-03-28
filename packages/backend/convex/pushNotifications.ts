import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { authMutation, authQuery } from "./functions";
import type { Id } from "./_generated/dataModel";

// ── Notification preference categories ─────────────────────────
type NotificationCategory = "calls" | "groupCalls" | "directMessages" | "groupMessages" | "announcements";

const DEFAULT_PREFERENCES = {
  calls: true,
  groupCalls: true,
  directMessages: true,
  groupMessages: true,
  announcements: true,
};

// Register a push token for the current user
export const recordToken = authMutation({
  args: {
    pushToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(
      components.pushNotifications.public.recordPushNotificationToken,
      {
        userId: ctx.user._id,
        pushToken: args.pushToken,
        logLevel: "WARN",
      }
    );
    return null;
  },
});

// Remove push token for user (on sign out)
export const removeToken = authMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runMutation(
      components.pushNotifications.public.removePushNotificationToken,
      {
        userId: ctx.user._id,
        logLevel: "WARN",
      }
    );
    return null;
  },
});

// ── Get notification preferences ────────────────────────────────
export const getPreferences = authQuery({
  args: {},
  returns: v.object({
    calls: v.boolean(),
    groupCalls: v.boolean(),
    directMessages: v.boolean(),
    groupMessages: v.boolean(),
    announcements: v.boolean(),
  }),
  handler: async (ctx) => {
    const authId = ctx.user._id;
    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .unique();
    if (!user) return DEFAULT_PREFERENCES;
    return user.notificationPreferences ?? DEFAULT_PREFERENCES;
  },
});

// ── Update notification preferences ─────────────────────────────
export const updatePreferences = authMutation({
  args: {
    calls: v.boolean(),
    groupCalls: v.boolean(),
    directMessages: v.boolean(),
    groupMessages: v.boolean(),
    announcements: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authId = ctx.user._id;
    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      notificationPreferences: {
        calls: args.calls,
        groupCalls: args.groupCalls,
        directMessages: args.directMessages,
        groupMessages: args.groupMessages,
        announcements: args.announcements,
      },
    });
    return null;
  },
});

// Internal: send push notification to a user by their users table ID
// Now checks notification preferences before sending
export const sendToUser = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.record(v.string(), v.string())),
    category: v.optional(v.union(
      v.literal("calls"),
      v.literal("groupCalls"),
      v.literal("directMessages"),
      v.literal("groupMessages"),
      v.literal("announcements")
    )),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.authId) return null;

    // Check notification preferences if category is specified
    if (args.category) {
      const prefs = user.notificationPreferences ?? DEFAULT_PREFERENCES;
      const cat = args.category as NotificationCategory;
      if (!prefs[cat]) {
        // User has disabled this notification category
        return null;
      }
    }

    try {
      await ctx.runMutation(
        components.pushNotifications.public.sendPushNotification,
        {
          userId: user.authId,
          notification: {
            title: args.title,
            body: args.body,
            data: args.data ?? {},
            sound: "default",
          },
          logLevel: "ERROR",
        }
      );
    } catch (e: unknown) {
      // Silently ignore missing push tokens — expected when users haven't opened the app on-device
      const isNoPushToken =
        e instanceof Error &&
        (e.message.includes("NoPushToken") || e.message.includes("No push token"));
      if (!isNoPushToken) throw e;
    }
    return null;
  },
});
