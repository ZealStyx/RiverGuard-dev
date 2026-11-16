/**
 * POST /api/forecast
 *
 * The one place that orchestrates the three external pieces:
 *
 *   1. weather provider   (Open-Meteo, or the offline fixture)
 *   2. local ML service   (services/ml, 127.0.0.1:8000)
 *   3. Convex deployment  (write side; best effort)
 *
 * It lives in the Next server on purpose. The browser must not call the weather
 * provider (no secrets leaking, no CORS games) and Convex must never be asked to
 * reach this machine's loopback address.
 */

import { NextResponse } from "next/server";

import { persistOutlook } from "@/lib/forecast-persistence";
import { getLocation } from "@/lib/locations";
import { MlServiceError, requestDailyForecast } from "@/lib/ml-client";
import { getWeatherBundle } from "@/lib/weather";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ForecastRequestBody {
  locationCode?: string;
}

export async function POST(request: Request) {
  let body: ForecastRequestBody;
  try {
    body = (await request.json()) as ForecastRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const location = getLocation(body.locationCode ?? "");
  if (!location) {
    return NextResponse.json(
      {
        error: "Unknown locationCode.",
        supported: ["marikina", "quezon-city", "manila", "pasig"],
      },
      { status: 400 },
    );
  }

  let bundle;
  try {
    bundle = await getWeatherBundle(location);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Weather provider failed and fixture fallback is disabled.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 502 },
    );
  }

  let forecast;
  try {
    forecast = await requestDailyForecast(bundle);
  } catch (error) {
    return NextResponse.json(
      {
        error: "The local ML service did not produce a forecast.",
        detail: error instanceof Error ? error.message : "unknown error",
        weather: summariseWeather(bundle),
      },
      { status: error instanceof MlServiceError ? 503 : 500 },
    );
  }

  const issueDate = forecast.days[0] ? previousDay(forecast.days[0].date) : "";
  const persistence = await persistOutlook(bundle, forecast, issueDate);

  const warnings: string[] = [];
  if (bundle.degraded) {
    warnings.push(bundle.degradationReason ?? "Weather data is degraded.");
  }
  if (!persistence.enabled) {
    warnings.push(
      "Convex is not configured; this outlook exists only in the response.",
    );
  } else if (!persistence.stored) {
    warnings.push(`Outlook not saved to Convex: ${persistence.error}`);
  }

  return NextResponse.json({
    location: {
      code: location.code,
      name: location.name,
      alarms: location.alarmLevelsM,
    },
    weather: summariseWeather(bundle),
    forecast: {
      modelVersion: forecast.meta.modelVersion,
      modelKind: forecast.meta.modelKind,
      operatingThreshold: forecast.meta.operatingThreshold,
      featureSchemaVersion: forecast.meta.featureSchemaVersion,
      generatedAt: forecast.meta.generatedAt,
      warning: forecast.meta.warning,
      alarms: forecast.meta.alarms,
      alarmsVerified: forecast.meta.alarmsVerified,
      days: forecast.days,
    },
    persistence,
    warnings,
  });
}

type WeatherBundle = Awaited<ReturnType<typeof getWeatherBundle>>;

function summariseWeather(bundle: WeatherBundle) {
  return {
    provider: bundle.provider,
    retrievedAt: bundle.retrievedAt,
    timezone: bundle.timezone,
    historyDays: bundle.historyDays,
    degraded: bundle.degraded,
    degradationReason: bundle.degradationReason,
    observed: bundle.observed,
    days: bundle.days,
    notes: bundle.notes,
  };
}

/** `2026-11-16` -> `2026-11-15` without timezone surprises. */
function previousDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
