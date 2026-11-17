/**
 * Function references without codegen.
 *
 * `convex/_generated/api` only exists after `npx convex dev` has run against a
 * deployment. The web app has to build without one, so references are built
 * from their `module:function` names instead. Run `npm run convex:dev` once and
 * you can switch these to `api.forecasts.recordOutlook` if you prefer codegen.
 */

import { makeFunctionReference } from "convex/server";

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
}

export const convexFunctions = {
  recordOutlook: makeFunctionReference<
    "mutation",
    RecordOutlookArgs,
    RecordOutlookResult
  >("forecasts:recordOutlook"),
  latestOutlook: makeFunctionReference<
    "query",
    { locationCode: string },
    LatestOutlook | null
  >("forecasts:latestOutlook"),
  recentRuns: makeFunctionReference<"query", { limit?: number }, RecentRun[]>(
    "forecasts:recentRuns",
  ),
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
};

export const convexUrl: string | undefined =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
