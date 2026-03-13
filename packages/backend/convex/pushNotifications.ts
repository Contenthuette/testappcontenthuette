import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { authMutation } from "./functions";
import type { Id } from "./_generated/dataModel";

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

// Internal: send push notification to a user by their users table ID
export const sendToUser = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.record(v.string(), v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Look up the user's authId — that's the key used for push token registration
    const user = await ctx.db.get(args.userId);
    if (!user?.authId) return null;

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
        logLevel: "WARN",
      }
    );
    return null;
  },
});
