import { MINUTE, RateLimiter, SECOND } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
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
});
