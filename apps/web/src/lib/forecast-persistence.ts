/**
 * Writes a completed outlook into Convex.
 *
 * Deliberately server-side and best-effort: a database hiccup must not destroy
 * a forecast the user already paid for with a weather call and an ML call. The
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
import type { WeatherBundle } from "./weather";

export interface PersistenceResult {
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
): Promise<PersistenceResult> {
  if (!convexUrl) {
    return {
      enabled: false,
      stored: false,
      error: "NEXT_PUBLIC_CONVEX_URL is not set, so the outlook was not saved.",
    };
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
      enabled: true,
      stored: true,
      runId: result.runId,
      alerts: result.alerts,
    };
  } catch (error) {
    return {
      enabled: true,
      stored: false,
      error:
        error instanceof Error
          ? convexErrorHint(error)
          : "unknown Convex error",
    };
  }
}
