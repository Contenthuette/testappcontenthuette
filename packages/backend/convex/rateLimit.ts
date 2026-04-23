import { MINUTE, RateLimiter, SECOND } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // ── Posts ──────────────────────────────────────────────────
  postUploadUrl: {
    kind: "token bucket",
    rate: 8,
    period: MINUTE,
    capacity: 12,
  },
  createPost: {
    kind: "token bucket",
    rate: 6,
    period: MINUTE,
    capacity: 8,
  },
  // ── Messaging ─────────────────────────────────────────────
  messageUploadUrl: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 30,
  },
  sendDirectMessage: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 40,
  },
  sendGroupMessage: {
    kind: "token bucket",
    rate: 40,
    period: MINUTE,
    capacity: 60,
  },
  sharePost: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 30,
  },
  // ── Calls ─────────────────────────────────────────────────
  initiateCall: {
    kind: "token bucket",
    rate: 6,
    period: MINUTE,
    capacity: 8,
  },
  sendSignal: {
    kind: "token bucket",
    rate: 18,
    period: SECOND,
    capacity: 30,
  },
  callHeartbeat: {
    kind: "token bucket",
    rate: 1,
    period: SECOND,
    capacity: 3,
  },
  // ── Livestreams ───────────────────────────────────────────
  goLive: {
    kind: "token bucket",
    rate: 2,
    period: MINUTE,
    capacity: 3,
  },
  livestreamComment: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 15,
  },
  livestreamSignal: {
    kind: "token bucket",
    rate: 18,
    period: SECOND,
    capacity: 30,
  },
  // ── Likes & Comments ──────────────────────────────────────
  toggleLike: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 40,
  },
  addComment: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 15,
  },
  toggleCommentLike: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 40,
  },
  // ── Friends ───────────────────────────────────────────────
  friendRequest: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 15,
  },
  // ── Groups ────────────────────────────────────────────────
  createGroup: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 8,
  },
  joinGroup: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 15,
  },
  // ── Events ────────────────────────────────────────────────
  createEvent: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 8,
  },
  purchaseTicket: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 8,
  },
  // ── Polls ─────────────────────────────────────────────────
  createPoll: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 8,
  },
  pollVote: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 15,
  },
  // ── Profile ───────────────────────────────────────────────
  updateProfile: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 15,
  },
  // ── Auth / Admin ──────────────────────────────────────────
  adminLogin: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 8,
  },
  // ── Reports ───────────────────────────────────────────────
  submitReport: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 8,
  },
  // ── Saved Posts ───────────────────────────────────────────
  toggleSave: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 30,
  },
  // ── Notifications ─────────────────────────────────────────
  markNotificationsRead: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 15,
  },
  // ── Block User ────────────────────────────────────────────
  blockUser: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 15,
  },
  // ── Member Events ─────────────────────────────────────────
  createMemberEvent: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 8,
  },
  joinMemberEvent: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 15,
  },
});

// ── Input Validation Helpers ────────────────────────────────────

/** Max string lengths for user-provided text fields */
export const INPUT_LIMITS = {
  name: 100,
  email: 254,
  bio: 500,
  caption: 2_000,
  messageText: 5_000,
  commentText: 1_000,
  groupName: 100,
  groupDescription: 2_000,
  eventName: 200,
  eventDescription: 5_000,
  pollQuestion: 500,
  pollOption: 200,
  reportReason: 1_000,
  searchQuery: 200,
  city: 100,
  county: 100,
  venue: 200,
  announcementText: 2_000,
  partnerBusinessName: 200,
  partnerShortText: 300,
  partnerDescription: 5_000,
  livestreamTitle: 200,
  livestreamComment: 500,
  password: 128,
} as const;

/** Validate a string field has a reasonable length. Throws on violation. */
export function validateStringLength(
  value: string | undefined,
  fieldName: string,
  maxLength: number,
): void {
  if (value !== undefined && value.length > maxLength) {
    throw new Error(`${fieldName} darf maximal ${maxLength} Zeichen lang sein`);
  }
}

/** Sanitize a string: trim, collapse whitespace, strip control chars */
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ");
}

/** Validate array length */
export function validateArrayLength<T>(
  arr: T[] | undefined,
  fieldName: string,
  maxLength: number,
): void {
  if (arr !== undefined && arr.length > maxLength) {
    throw new Error(`${fieldName} darf maximal ${maxLength} Einträge haben`);
  }
}
