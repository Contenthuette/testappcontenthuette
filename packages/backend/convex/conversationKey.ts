import type { Id } from "./_generated/dataModel";

export function getDirectConversationKey(
  firstUserId: Id<"users">,
  secondUserId: Id<"users">,
): string {
  return [firstUserId, secondUserId].sort().join(":");
}

export function getConversationKeyFromParticipants(
  participantIds: Array<Id<"users">> | undefined,
): string | undefined {
  if (!participantIds || participantIds.length !== 2) return undefined;
  return [...participantIds].sort().join(":");
}
