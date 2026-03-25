import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const CONVERSATION_ACTIVITY_PATCH_WINDOW_MS = 15_000;

export async function touchConversationActivity(
  ctx: { db: MutationCtx["db"] },
  conversationId: Id<"conversations">,
  now: number,
): Promise<void> {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  const lastMessageAt = conversation.lastMessageAt ?? 0;
  if (lastMessageAt >= now - CONVERSATION_ACTIVITY_PATCH_WINDOW_MS) return;

  await ctx.db.patch(conversationId, { lastMessageAt: now });
}
