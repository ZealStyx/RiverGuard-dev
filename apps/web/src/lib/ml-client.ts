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

export interface MlContribution {
  key: string;
  label: string;
  deltaProbability: number;
  deltaWaterLevelM: number;
}

export interface MlNextDayResponse {
  locationCode: string;
  locationName: string;
  meta: MlForecastResponse["meta"];
  day: MlDailyForecast;
  contributions: MlContribution[];
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

function buildRequestBody(bundle: WeatherBundle, issueDate: string) {
  return {
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
      // The provider returns ET0 per day and the soil-moisture bucket needs it:
      // it is the outflow term. Dropping it here is what made the horizon drain
      // by a monthly average instead of the actual forecast.
      et0Mm: day.et0Mm,
    })),
  };
}

async function post<T>(
  path: string,
  body: unknown,
  options?: { baseUrl?: string; timeoutMs?: number },
): Promise<T> {
  const baseUrl = (options?.baseUrl ?? mlBaseUrl()).replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
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

  return (await response.json()) as T;
}

export async function requestDailyForecast(
  bundle: WeatherBundle,
  options?: { baseUrl?: string; timeoutMs?: number; issueDate?: string },
): Promise<MlForecastResponse> {
  const issueDate = options?.issueDate ?? manilaToday();
  const payload = await post<MlForecastResponse>(
    "/v1/forecast/daily",
    buildRequestBody(bundle, issueDate),
    options,
  );
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

/**
 * Score the next day plus a real sensitivity sweep over each input.
 *
 * `contributions` is what the contribution panel plots: the service moves one
 * feature at a time to both ends of its plausible range, re-scores, and reports
 * the swing in flood probability and water level.
 */
export async function requestNextDayForecast(
  bundle: WeatherBundle,
  options?: { baseUrl?: string; timeoutMs?: number; issueDate?: string },
): Promise<MlNextDayResponse> {
  const issueDate = options?.issueDate ?? manilaToday();
  const payload = await post<MlNextDayResponse>(
    "/v1/forecast/next-day",
    buildRequestBody(bundle, issueDate),
    options,
  );
  if (!isForecastDay(payload.day) || !Array.isArray(payload.contributions)) {
    throw new MlServiceError(
      "ML service returned an unexpected next-day response shape",
    );
  }
  return payload;
}
