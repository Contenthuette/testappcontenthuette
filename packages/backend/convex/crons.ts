import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "refresh analytics snapshots",
  { hours: 6 },
  internal.admin.refreshAnalyticsSnapshotInternal,
  {},
);

export default crons;
