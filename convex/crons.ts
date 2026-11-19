/**
 * Scheduled housekeeping.
 *
 * Scope warning: a Convex cron runs in the cloud and cannot reach the
 * developer's machine, so it cannot fetch weather or call the local ML service.
 * Forecast generation stays user-initiated through the local Next app; these
 * jobs only tidy up data Convex already owns.
 *
 * The job target is referenced by name rather than through `internal.*`, because
 * `convex/_generated/api` does not exist until `npx convex dev` has run once.
 * Swap it for `internal.forecasts.failStaleRuns` after codegen if you prefer.
 */

import { cronJobs, makeFunctionReference } from "convex/server";

const failStaleRuns = makeFunctionReference<
  "mutation",
  { olderThanMs?: number },
  number
>("forecasts:failStaleRuns");

const crons = cronJobs();

// Runs that were requested but never completed (process killed, request
// dropped) must not sit in `requested` forever and skew the dashboard.
crons.interval("fail stale forecast runs", { minutes: 15 }, failStaleRuns, {
  olderThanMs: 15 * 60 * 1000,
});

export default crons;
