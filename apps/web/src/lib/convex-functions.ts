/**
 * Function references without codegen.
 *
 * `convex/_generated/api` only exists after `npx convex dev` has run against a
 * deployment. The web app has to build without one, so references are built
 * from their `module:function` names instead. Run `npm run convex:dev` once and
 * you can switch these to `api.forecasts.recordOutlook` if you prefer codegen.
 */

import { makeFunctionReference } from "convex/server";

import { convexDeploymentUrl } from "@/lib/convex-config";

export interface OutlookDayRow {
  date: string;
  horizonDays: number;
  rainfallMm: number;
  probability: number;
  waterLevelM: number;
  riskLevel: "lower" | "moderate" | "elevated" | "unavailable";
  alertLevel: "none" | "first" | "second" | "third";
  reasons: string[];
}

export interface LatestOutlook {
  runId: string;
  requestedAt: number;
  completedAt: number | null;
  provider: string;
  retrievedAt: number;
  modelVersion: string | null;
  operatingThreshold: number | null;
  days: OutlookDayRow[];
  alerts: number;
}

// A type alias (not an interface) so it satisfies convex's DefaultFunctionArgs.
export type RecordOutlookArgs = {
  /**
   * Only the Next server sends this: it runs the forecast in `/api/forecast`
   * and has no Convex identity of its own. Must equal the deployment's
   * `RIVERGUARD_INGEST_SECRET`.
   */
  serverSecret?: string;
  locationCode: string;
  locationName: string;
  issueDate: string;
  provider: string;
  providerDegraded: boolean;
  retrievedAt: number;
  modelName: string;
  modelVersion: string;
  featureSchemaVersion: string;
  operatingThreshold: number;
  warning: string;
  days: Array<{
    date: string;
    horizonDays: number;
    rainfallMm: number;
    probability: number;
    waterLevelM: number;
    riskLevel: "lower" | "moderate" | "elevated" | "unavailable";
    alertLevel: "none" | "first" | "second" | "third";
    exceedsOperatingThreshold: boolean;
    reasons: string[];
  }>;
};

export interface RecordOutlookResult {
  runId: string;
  forecasts: number;
  assessments: number;
  alerts: number;
}

export interface RecentRun {
  runId: string;
  requestedAt: number;
  completedAt: number | null;
  provider: string;
  status: string;
  locations: string[];
  days: number;
  alerts: number;
  modelVersion: string | null;
  reviewStatus: "pending" | "reviewed" | "escalated" | "returned";
  reviewerName: string | null;
}

export interface LguReview {
  status: "reviewed" | "escalated" | "returned";
  locationCode: string;
  notes: string;
  reviewedAt: number;
  reviewerName: string;
}

/** One day of a stored run, as `forecasts:getRun` returns it. */
export interface RemoteRunDay {
  date: string;
  locationCode: string;
  horizonDays: number;
  rainfallMm: number;
  probability: number;
  waterLevelM: number;
  riskLevel: "lower" | "moderate" | "elevated" | "unavailable";
  alertLevel: "none" | "first" | "second" | "third";
  exceedsOperatingThreshold: boolean;
  reasons: string[];
}

/** A stored run with its days, as `forecasts:getRun` returns it. */
export interface RemoteRun {
  runId: string;
  /** Last day of the provider window the model was fed. */
  issueDate: string | null;
  requestedAt: number;
  completedAt: number | null;
  provider: string;
  status: string;
  retrievedAt: number;
  providerDegraded: boolean;
  modelVersion: string | null;
  modelKind: string | null;
  operatingThreshold: number | null;
  featureSchemaVersion: string | null;
  warning: string | null;
  days: RemoteRunDay[];
}

/** A stored observation, as `observedWeather:listRange` returns it. */
export interface StoredObservedDay {
  date: string;
  observedAt: number;
  rainfallMm: number;
  tmaxC?: number;
  tminC?: number;
  et0Mm?: number;
  soilMoisturePercent?: number;
  provider: string;
  rainfallSource?: string;
  /** Absent on rows the older pipeline wrote; fall back to `provider`. */
  sourceLabel?: string;
  retrievedAt: number;
  recordedAt: number;
}

export const convexFunctions = {
  recordOutlook: makeFunctionReference<
    "mutation",
    RecordOutlookArgs,
    RecordOutlookResult
  >("forecasts:recordOutlook"),
  setPrimaryLocation: makeFunctionReference<
    "mutation",
    { locationCode: string },
    { updated: boolean }
  >("users:setPrimaryLocation"),
  latestOutlook: makeFunctionReference<
    "query",
    { locationCode: string },
    LatestOutlook | null
  >("forecasts:latestOutlook"),
  recentRuns: makeFunctionReference<"query", { limit?: number }, RecentRun[]>(
    "forecasts:recentRuns",
  ),
  getRun: makeFunctionReference<"query", { runId: string }, RemoteRun | null>(
    "forecasts:getRun",
  ),
  getLguReview: makeFunctionReference<
    "query",
    { runId: string },
    LguReview | null
  >("reviews:getForRun"),
  submitLguReview: makeFunctionReference<
    "mutation",
    {
      runId: string;
      status: "reviewed" | "escalated" | "returned";
      notes: string;
    },
    { status: "reviewed" | "escalated" | "returned"; reviewedAt: number }
  >("reviews:submit"),
  listOpenAlerts: makeFunctionReference<
    "query",
    { locationCode: string; limit?: number },
    Array<{
      _id: string;
      title: string;
      message: string;
      severity: string;
      createdAt: number;
    }>
  >("alerts:listOpenForLocation"),
  observedRange: makeFunctionReference<
    "query",
    { locationCode: string; start: string; end: string },
    StoredObservedDay[]
  >("observedWeather:listRange"),
  saveObservedDays: makeFunctionReference<
    "mutation",
    {
      locationCode: string;
      locationName: string;
      days: Array<{
        date: string;
        rainfallMm: number;
        tmaxC?: number;
        tminC?: number;
        et0Mm?: number;
        provider: string;
        rainfallSource?: string;
        sourceLabel?: string;
        retrievedAt: number;
      }>;
      /**
       * Server-only proof for the write. Comes from
       * `process.env.RIVERGUARD_INGEST_SECRET` (never a `NEXT_PUBLIC_` value) and
       * is checked by `convex/ingest.ts`.
       */
      secret?: string;
    },
    { inserted: number; updated: number }
  >("observedWeather:upsertDays"),
};

/**
 * Validated once in lib/convex-config.ts. Undefined means "no Convex in this
 * build", either because nothing was configured or because the value was
 * rejected — the caller cannot tell the difference, and should not need to.
 */
export const convexUrl: string | undefined = convexDeploymentUrl ?? undefined;

/**
 * Turn Convex's "Could not find public function for 'forecasts:latestOutlook'"
 * into something that points at the actual cause: the deployment is behind the
 * checked-out `convex/` directory. Shared by the browser and the route handlers,
 * so it lives here rather than in a `"use client"` module.
 */
export function convexErrorHint(error: Error): string {
  if (/could not find public function/i.test(error.message)) {
    return "this Convex deployment does not expose that function yet — run `npm run convex:dev` with the current `convex/` directory to push it";
  }
  return error.message;
}
