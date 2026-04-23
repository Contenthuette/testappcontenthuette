import { authMutation } from "./functions";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/* ─── Self-service account deletion ─────────────────────────── */
export const deleteMyAccount = authMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = ctx.user._id as Id<"users">;
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Nutzer nicht gefunden");

    // 1. Delete user's posts and all related data (likes, comments, saved)
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_authorId", (q) => q.eq("authorId", userId))
      .collect();
    for (const post of posts) {
      const [likes, comments, saved] = await Promise.all([
        ctx.db
          .query("likes")
          .withIndex("by_postId", (q) => q.eq("postId", post._id))
          .collect(),
        ctx.db
          .query("comments")
          .withIndex("by_postId", (q) => q.eq("postId", post._id))
          .collect(),
        ctx.db
          .query("savedPosts")
          .withIndex("by_postId_and_userId", (q) => q.eq("postId", post._id))
          .collect(),
      ]);
      for (const like of likes) await ctx.db.delete(like._id);
      for (const comment of comments) {
        const commentLikes = await ctx.db
          .query("commentLikes")
          .withIndex("by_commentId", (q) => q.eq("commentId", comment._id))
          .collect();
        for (const cl of commentLikes) await ctx.db.delete(cl._id);
        await ctx.db.delete(comment._id);
      }
      for (const sp of saved) await ctx.db.delete(sp._id);
      if (post.mediaStorageId) await ctx.storage.delete(post.mediaStorageId);
      if (post.thumbnailStorageId) await ctx.storage.delete(post.thumbnailStorageId);
      await ctx.db.delete(post._id);
    }

    // 2. Delete user's likes on other posts
    const userLikes = await ctx.db
      .query("likes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const like of userLikes) await ctx.db.delete(like._id);

    // 3. Delete user's comments on other posts
    const userComments = await ctx.db
      .query("comments")
      .withIndex("by_authorId", (q) => q.eq("authorId", userId))
      .collect();
    for (const comment of userComments) {
      const commentLikes = await ctx.db
        .query("commentLikes")
        .withIndex("by_commentId", (q) => q.eq("commentId", comment._id))
        .collect();
      for (const cl of commentLikes) await ctx.db.delete(cl._id);
      await ctx.db.delete(comment._id);
    }

    // 4. Delete user's saved posts
    const userSaved = await ctx.db
      .query("savedPosts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const sp of userSaved) await ctx.db.delete(sp._id);

    // 5. Delete group memberships (decrement member count)
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
      const group = await ctx.db.get(membership.groupId);
      if (group && group.memberCount > 0) {
        await ctx.db.patch(membership.groupId, {
          memberCount: group.memberCount - 1,
        });
      }
    }

    // 6. Delete conversation read status and settings
    // NOTE: Messages sent by this user are intentionally NOT deleted
    const readStatuses = await ctx.db
      .query("conversationReadStatus")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const rs of readStatuses) await ctx.db.delete(rs._id);

    const convSettings = await ctx.db
      .query("conversationSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const cs of convSettings) await ctx.db.delete(cs._id);

    // 7. Delete friend requests (sent and received)
    const sentRequests = await ctx.db
      .query("friendRequests")
      .withIndex("by_senderId", (q) => q.eq("senderId", userId))
      .collect();
    for (const request of sentRequests) await ctx.db.delete(request._id);

    const receivedRequests = await ctx.db
      .query("friendRequests")
      .withIndex("by_receiverId", (q) => q.eq("receiverId", userId))
      .collect();
    for (const request of receivedRequests) await ctx.db.delete(request._id);

    // 8. Delete notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const notification of notifications) await ctx.db.delete(notification._id);

    // 9. Delete tickets
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const ticket of tickets) await ctx.db.delete(ticket._id);

    // 10. Delete avatar & banner from storage
    if (user.avatarStorageId) await ctx.storage.delete(user.avatarStorageId);
    if (user.bannerStorageId) await ctx.storage.delete(user.bannerStorageId);

    // 11. Delete the user record
    const email = user.email;
    const name = user.name;
    const stripeSubscriptionId = user.stripeSubscriptionId;
    await ctx.db.delete(userId);

    // 12. Schedule Stripe cancellation + email notification
    await ctx.scheduler.runAfter(0, internal.adminActions.processUserDeletion, {
      email,
      name,
      stripeSubscriptionId,
    });
    // Scheduler safe: one-shot, triggered only by user's own account deletion

    return null;
  },
});
