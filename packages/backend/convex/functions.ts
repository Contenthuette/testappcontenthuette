import { action, mutation, query } from "./_generated/server";
import {
    customQuery,
    customCtx,
    customMutation,
    customAction,
} from "convex-helpers/server/customFunctions";
import { authComponent } from "./auth";

// =============================================================================
// ROW-LEVEL SECURITY (optional)
// =============================================================================
// To enable RLS, uncomment the imports below and the wrapDatabaseReader/Writer
// calls inside each custom function. Then define your rules in rules.ts.
//
// import { wrapDatabaseReader, wrapDatabaseWriter } from "convex-helpers/server/rowLevelSecurity";
// import { rules } from "./rules";
// import type { DataModel } from "./_generated/dataModel";

export const authQuery = customQuery(
    query,
    customCtx(async (ctx) => {
        const user = await authComponent.getAuthUser(ctx);
        if (!user) throw new Error("Authentication required");
        return {
            user,
            // Uncomment to enable RLS on reads:
            // db: wrapDatabaseReader<DataModel>({ user }, ctx.db, rules),
        };
    })
);

export const authMutation = customMutation(
    mutation,
    customCtx(async (ctx) => {
        const user = await authComponent.getAuthUser(ctx);
        if (!user) throw new Error("Authentication required");
        return {
            user,
            // Uncomment to enable RLS on reads + writes:
            // db: wrapDatabaseWriter<DataModel>({ user }, ctx.db, rules),
        };
    })
);

export const authAction = customAction(
    action,
    customCtx(async (ctx) => {
        const user = await authComponent.getAuthUser(ctx);
        if (!user) throw new Error("Authentication required");
        return { user };
    })
);
