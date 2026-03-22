import { action, mutation, query } from "./_generated/server";
import {
  customAction,
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";

interface AuthIdentity {
  subject: string;
}

interface AuthenticatedUser {
  _id: string;
}

function getAuthIdFromSubject(subject: string): string {
  const authId = subject.split("|")[0]?.trim();
  if (!authId) {
    throw new Error("Invalid authentication token");
  }
  return authId;
}

async function requireAuthenticatedUser(ctx: {
  auth: {
    getUserIdentity: () => Promise<AuthIdentity | null>;
  };
}): Promise<AuthenticatedUser> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  return {
    _id: getAuthIdFromSubject(identity.subject),
  };
}

export const authQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    return {
      user: await requireAuthenticatedUser(ctx),
    };
  }),
);

export const authMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    return {
      user: await requireAuthenticatedUser(ctx),
    };
  }),
);

export const authAction = customAction(
  action,
  customCtx(async (ctx) => {
    return {
      user: await requireAuthenticatedUser(ctx),
    };
  }),
);
