/**
 * Stored forecast runs, one shape for two stores.
 *
 * A run is written either to Convex (when `NEXT_PUBLIC_CONVEX_URL` is set) or to
 * a gitignored local file through `/api/runs` (when it is not). Both paths
 * produce the records described here, so the run history, the run detail page
 * and the comparison screen never branch on storage — only on where they read.
 *
 * Nothing in this module imports Node APIs: the browser needs it too.
 */

import type { RecentRun, RemoteRun } from "./convex-functions";
import { LOCATIONS, type LocationCode } from "./locations";

export type RunRiskLevel = "lower" | "moderate" | "elevated" | "unavailable";
export type RunAlertLevel = "none" | "first" | "second" | "third";

/** One forecast day of a stored run. */
export interface StoredRunDay {
  date: string;
  horizonDays: number;
  rainfallMm: number;
  probability: number;
  waterLevelM: number;
  riskLevel: RunRiskLevel;
  alertLevel: RunAlertLevel;
  exceedsOperatingThreshold: boolean;
  reasons: string[];
}

/** What a run list needs. */
export interface StoredRunSummary {
  runId: string;
  requestedAt: number;
  completedAt: number | null;
  provider: string;
  /** True when the weather input was the labelled offline fixture. */
  providerDegraded: boolean;
  status: string;
  /** City names covered by the run. */
  locations: string[];
  days: number;
  alerts: number;
  modelVersion: string | null;
}

/** What the run detail page needs. */
export interface StoredRun extends StoredRunSummary {
  /** Last day of the weather provider's window — the run's issue date. */
  issueDate: string;
  retrievedAt: number;
  featureSchemaVersion: string;
  operatingThreshold: number;
  /** The ML service's own caveat, carried through unchanged. */
  warning: string;
  modelKind: string | null;
  dayRows: StoredRunDay[];
  source: "convex" | "local";
}

/** Human label for where a run lives, used in headings and notices. */
export const RUN_SOURCE_LABEL: Record<StoredRun["source"], string> = {
  convex: "Convex deployment",
  local: "this machine (.data/runs.json)",
};

export function formatRunTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}

export function formatProbability(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatMetres(value: number): string {
  return `${value.toFixed(2)} m`;
}

/** `marikina` -> `Marikina`, so both stores display city names, not codes. */
export function locationNames(codes: string[]): string[] {
  return codes.map((code) => {
    const location = LOCATIONS[code as LocationCode];
    return location ? location.name : code;
  });
}

/** Convex list rows -> the shared summary shape. */
export function summaryFromConvexRun(run: RecentRun): StoredRunSummary {
  return {
    runId: run.runId,
    requestedAt: run.requestedAt,
    completedAt: run.completedAt,
    provider: run.provider,
    providerDegraded: false,
    status: run.status,
    locations: locationNames(run.locations),
    days: run.days,
    alerts: run.alerts,
    modelVersion: run.modelVersion,
  };
}

/** A Convex run plus its days -> the detail shape the screens render. */
export function detailFromConvexRun(run: RemoteRun): StoredRun {
  return {
    runId: run.runId,
    requestedAt: run.requestedAt,
    completedAt: run.completedAt,
    provider: run.provider,
    providerDegraded: run.providerDegraded,
    status: run.status,
    locations: locationNames([
      ...new Set(run.days.map((day) => day.locationCode)),
    ]),
    days: run.days.length,
    alerts: run.days.filter((day) => day.riskLevel === "elevated").length,
    modelVersion: run.modelVersion,
    issueDate: run.issueDate ?? "—",
    retrievedAt: run.retrievedAt,
    featureSchemaVersion: run.featureSchemaVersion ?? "—",
    operatingThreshold: run.operatingThreshold ?? 0,
    warning: run.warning ?? "",
    modelKind: run.modelKind,
    dayRows: run.days.map((day) => ({
      date: day.date,
      horizonDays: day.horizonDays,
      rainfallMm: day.rainfallMm,
      probability: day.probability,
      waterLevelM: day.waterLevelM,
      riskLevel: day.riskLevel,
      alertLevel: day.alertLevel,
      exceedsOperatingThreshold: day.exceedsOperatingThreshold,
      reasons: day.reasons,
    })),
    source: "convex",
  };
}

export function summaryFromStoredRun(run: StoredRun): StoredRunSummary {
  const summary: StoredRunSummary = {
    runId: run.runId,
    requestedAt: run.requestedAt,
    completedAt: run.completedAt,
    provider: run.provider,
    providerDegraded: run.providerDegraded,
    status: run.status,
    locations: run.locations,
    days: run.days,
    alerts: run.alerts,
    modelVersion: run.modelVersion,
  };
  return summary;
}
