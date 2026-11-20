/**
 * Writes a completed outlook somewhere it can be read back.
 *
 * Two stores, one call:
 *   - Convex, when `NEXT_PUBLIC_CONVEX_URL` is set — the shared deployment;
 *   - the local file store (`lib/run-store.ts`) when it is not, so run history,
 *     run detail and the comparison screen still have records to read on a
 *     machine with no deployment.
 *
 * Deliberately server-side and best-effort: a storage hiccup must not destroy a
 * forecast the user already paid for with a weather call and an ML call. The
 * route reports what happened instead of throwing.
 */

import { ConvexHttpClient } from "convex/browser";

import {
  convexErrorHint,
  convexFunctions,
  convexUrl,
  type RecordOutlookArgs,
} from "./convex-functions";
import type { MlForecastResponse } from "./ml-client";
import { saveLocalRun } from "./run-store";
import type { WeatherBundle } from "./weather";

export interface PersistenceResult {
  /** Which store took the run. `none` means it was not stored at all. */
  kind: "convex" | "local" | "none";
  enabled: boolean;
  stored: boolean;
  runId?: string;
  alerts?: number;
  error?: string;
}

export function persistenceEnabled(): boolean {
  return Boolean(convexUrl);
}

export async function persistOutlook(
  bundle: WeatherBundle,
  forecast: MlForecastResponse,
  issueDate: string,
  accessToken?: string | null,
  serverSecret?: string | null,
): Promise<PersistenceResult> {
  if (!convexUrl) {
    // No deployment: keep the run on this machine so history, detail and
    // comparison still work. This is a fallback, not a second source of truth —
    // nothing is written here once Convex is configured.
    try {
      const run = await saveLocalRun({
        locationCode: forecast.locationCode,
        locationName: forecast.locationName,
        issueDate,
        provider: bundle.provider,
        providerDegraded: bundle.degraded,
        retrievedAt: Date.parse(bundle.retrievedAt),
        modelVersion: forecast.meta.modelVersion,
        modelKind: forecast.meta.modelKind ?? null,
        featureSchemaVersion: forecast.meta.featureSchemaVersion,
        operatingThreshold: forecast.meta.operatingThreshold,
        warning: forecast.meta.warning,
        days: forecast.days.map((day) => ({
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
      });
      return {
        kind: "local",
        enabled: true,
        stored: true,
        runId: run.runId,
        alerts: run.alerts,
      };
    } catch (error) {
      return {
        kind: "none",
        enabled: false,
        stored: false,
        error:
          error instanceof Error
            ? `local run store: ${error.message}`
            : "local run store failed",
      };
    }
  }

  const args: RecordOutlookArgs = {
    locationCode: forecast.locationCode,
    locationName: forecast.locationName,
    issueDate,
    provider: bundle.provider,
    providerDegraded: bundle.degraded,
    retrievedAt: Date.parse(bundle.retrievedAt),
    modelName: "RiverGuard test model",
    modelVersion: forecast.meta.modelVersion,
    featureSchemaVersion: forecast.meta.featureSchemaVersion,
    operatingThreshold: forecast.meta.operatingThreshold,
    warning: forecast.meta.warning,
    ...(serverSecret ? { serverSecret } : {}),
    days: forecast.days.map((day) => ({
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
  };

  try {
    const client = new ConvexHttpClient(convexUrl);
    if (accessToken) {
      client.setAuth(accessToken);
    }
    const result = await client.mutation(convexFunctions.recordOutlook, args);
    return {
      kind: "convex",
      enabled: true,
      stored: true,
      runId: result.runId,
      alerts: result.alerts,
    };
  } catch (error) {
    return {
      kind: "convex",
      enabled: true,
      stored: false,
      error:
        error instanceof Error
          ? convexErrorHint(error)
          : "unknown Convex error",
    };
  }
}
