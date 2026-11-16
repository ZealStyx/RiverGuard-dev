/**
 * Server-side client for the local Python service (services/ml).
 *
 * Only the Next route handler may call it. A Convex action must never do the
 * same: Convex runs in the cloud and cannot reach this machine's loopback
 * interface.
 */

import type { WeatherBundle } from "./weather";

export interface MlDailyForecast {
  date: string;
  horizonDays: number;
  rainfallMm: number;
  probability: number;
  waterLevelM: number;
  riskLevel: "lower" | "moderate" | "elevated" | "unavailable";
  alertLevel: "none" | "first" | "second" | "third";
  exceedsOperatingThreshold: boolean;
  antecedentRain3dMm: number;
  antecedentRain7dMm: number;
  antecedentRain30dMm: number;
  soilMoisturePercent: number;
  reasons: string[];
}

export interface MlForecastResponse {
  locationCode: string;
  locationName: string;
  meta: {
    modelVersion: string;
    modelKind: string;
    operatingThreshold: number;
    featureSchemaVersion: string;
    generatedAt: string;
    warning: string;
    alarms: number[];
    alarmsVerified: boolean;
  };
  days: MlDailyForecast[];
}

export class MlServiceError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "MlServiceError";
  }
}

export function mlBaseUrl(): string {
  return (process.env.ML_API_BASE_URL ?? "http://127.0.0.1:8000").replace(
    /\/+$/,
    "",
  );
}

/** Today's calendar date in Manila, which is the "issue day" for the chain. */
export function manilaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function isForecastDay(value: unknown): value is MlDailyForecast {
  if (typeof value !== "object" || value === null) return false;
  const day = value as Record<string, unknown>;
  return (
    typeof day.date === "string" &&
    typeof day.probability === "number" &&
    typeof day.waterLevelM === "number" &&
    typeof day.riskLevel === "string" &&
    Array.isArray(day.reasons)
  );
}

export async function requestDailyForecast(
  bundle: WeatherBundle,
  options?: { baseUrl?: string; timeoutMs?: number; issueDate?: string },
): Promise<MlForecastResponse> {
  const baseUrl = (options?.baseUrl ?? mlBaseUrl()).replace(/\/+$/, "");
  const issueDate = options?.issueDate ?? manilaToday();

  const body = {
    locationCode: bundle.location.code,
    issueDate,
    observed: {
      rainfallTodayMm: bundle.observed.rainfallTodayMm,
      antecedentRain3dMm: bundle.observed.antecedentRain3dMm,
      antecedentRain7dMm: bundle.observed.antecedentRain7dMm,
      antecedentRain30dMm: bundle.observed.antecedentRain30dMm,
      soilMoisturePercent: bundle.observed.soilMoisturePercent,
    },
    days: bundle.days.map((day) => ({
      date: day.date,
      rainfallMm: day.rainfallMm,
      tmaxC: day.tmaxC,
      tminC: day.tminC,
    })),
  };

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/forecast/daily`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options?.timeoutMs ?? 10000),
      cache: "no-store",
    });
  } catch (error) {
    throw new MlServiceError(
      `ML service unreachable at ${baseUrl}: ${error instanceof Error ? error.message : "unknown error"}. ` +
        "Start it with `uvicorn app.main:app --port 8000` from services/ml.",
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new MlServiceError(
      `ML service returned ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
      response.status,
    );
  }

  const payload = (await response.json()) as MlForecastResponse;
  if (
    !Array.isArray(payload.days) ||
    payload.days.length === 0 ||
    !payload.days.every(isForecastDay)
  ) {
    throw new MlServiceError(
      "ML service returned an unexpected response shape",
    );
  }
  return payload;
}
