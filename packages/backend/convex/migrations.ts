import { Migrations } from "@convex-dev/migrations";
import { DataModel } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { buildGroupSearchText, buildUserSearchText } from "./searchText";

const migrations = new Migrations<DataModel>(components.migrations);

export const run = migrations.runner();

// =============================================================================
// DEFINING MIGRATIONS
// =============================================================================
// Use migrations.define() to create migrations that process documents in batches.
// Each migration is idempotent and tracks progress by function name.
//
// IMPORTANT: Never rename migration functions after they've been run.
//
// Example: Backfill a new required field
//
// export const backfillCreatedAt = migrations.define({
//   table: "posts",
//   migrateOne: async (_ctx, doc) => {
//     if (doc.createdAt === undefined) {
//       return { createdAt: doc._creationTime };
//     }
//   },
// });
//
// Run a specific migration:
//   export const runBackfillCreatedAt = migrations.runner([backfillCreatedAt]);
//
// Run via convex_run tool:
//   functionName: "migrations:run"
//   args: {}                                          // run all pending
//   args: { fn: "migrations:backfillCreatedAt" }      // run specific
//   args: { dryRun: true }                            // dry run (one batch, no commit)

export const backfillCommentLikeCount = migrations.define({
  table: "comments",
  migrateOne: async (_ctx, doc) => {
    if ((doc as Record<string, unknown>).likeCount === undefined) {
      return { likeCount: 0 };
    }
  },
});

export const backfillUserSearchText = migrations.define({
  table: "users",
  migrateOne: async (_ctx, doc) => {
    const nextSearchText = buildUserSearchText({
      name: doc.name,
      bio: doc.bio,
      county: doc.county,
      city: doc.city,
      interests: doc.interests,
    });
    if (doc.searchText !== nextSearchText) {
      return { searchText: nextSearchText };
    }
  },
});

export const backfillGroupSearchText = migrations.define({
  table: "groups",
  migrateOne: async (_ctx, doc) => {
    const nextSearchText = buildGroupSearchText({
      name: doc.name,
      description: doc.description,
      county: doc.county,
      city: doc.city,
      topic: doc.topic,
      interests: doc.interests,
    });
    if (doc.searchText !== nextSearchText) {
      return { searchText: nextSearchText };
    }
  },
});
