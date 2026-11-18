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
 *
 * The weather provider is the model's only input source: today's rain, the
 * antecedent 3/7/30-day sums and soil moisture all come from its own past_days
 * window. `data/daily_observations.csv` is history for the charts, not a seed.
 *
 * Two additions hang off that window:
 *   - a local gauge file (`data/gauge/daily_rainfall.csv`, optional) replaces the
 *     provider's rainfall day by day, and the sums are recomputed from the blend;
 *   - GloFAS river discharge is fetched as context beside the result. It is never
 *     a feature and is never stored.
 */

import { NextResponse } from "next/server";

import { LOCAL_ACTOR } from "@/lib/audit";
import { recordAuditEvent } from "@/lib/audit-store";
import { fetchRiverContext } from "@/lib/flood";
import { persistOutlook } from "@/lib/forecast-persistence";
import { getLocation } from "@/lib/locations";
import { MlServiceError, requestDailyForecast } from "@/lib/ml-client";
import { describeModelInput } from "@/lib/model-input";
import { getWeatherBundle, type WeatherBundle } from "@/lib/weather";

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

  let bundle: WeatherBundle;
  try {
    bundle = await getWeatherBundle(location);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Weather provider failed and the offline forecast fallback is disabled.",
        detail: error instanceof Error ? error.message : "unknown error",
        // Same key as the success path, so a client reads one shape either way.
        // There is no input to describe when no provider answered.
        observedState: null,
      },
      { status: 502 },
    );
  }

  // The provider window is the model input: `bundle.observed` holds today's
  // rain, the antecedent sums and soil moisture derived from the same response,
  // with gauge rows substituted inside `getWeatherBundle`. Nothing comes from the
  // training CSV, so the chain starts at the observed "today" instead of at the
  // dataset's last row.
  const inputState = describeModelInput(bundle);

  // Context only: a different quantity (m³/s of modelled river flow), fetched in
  // parallel and never fed to the model or stored with the run.
  const river = await fetchRiverContext(location, { asOf: bundle.asOf });

  let forecast;
  try {
    forecast = await requestDailyForecast(bundle);
  } catch (error) {
    return NextResponse.json(
      {
        error: "The local ML service did not produce a forecast.",
        detail: error instanceof Error ? error.message : "unknown error",
        weather: summariseWeather(bundle),
        observedState: inputState,
        riverContext: river.context,
        riverContextError: river.error,
      },
      { status: error instanceof MlServiceError ? 503 : 500 },
    );
  }

  const issueDate = bundle.asOf;
  const accessToken = request.headers.get("authorization")?.replace(
    /^Bearer\s+/i,
    "",
  );
  const persistence = await persistOutlook(
    bundle,
    forecast,
    issueDate,
    accessToken,
  );

  // Best effort: the run is already stored, so a failed audit write is reported
  // as a warning rather than replacing the forecast with an error.
  const audited = await recordAuditEvent({
    actor: LOCAL_ACTOR,
    action: "forecast.run",
    target: persistence.runId ?? location.code,
    outcome: persistence.stored ? "success" : "failure",
    detail: persistence.stored
      ? `${location.name}: ${forecast.days.length} day(s), stored in ${persistence.kind}.`
      : `${location.name}: run produced but not stored (${persistence.error ?? "unknown reason"}).`,
  });

  const warnings: string[] = [];
  if (persistence.stored && !audited) {
    warnings.push(
      "The run was stored, but the audit entry could not be written.",
    );
  }
  if (bundle.gauge?.error) {
    warnings.push(`Rain gauge file ignored: ${bundle.gauge.error}`);
  }
  if (bundle.degraded) {
    warnings.push(bundle.degradationReason ?? "Weather data is degraded.");
  }
  if (!persistence.stored) {
    warnings.push(`The run was not stored: ${persistence.error}`);
  } else if (persistence.kind === "local") {
    warnings.push(
      "No Convex deployment is configured, so this run is stored on this machine only (.data/runs.json).",
    );
  }

  return NextResponse.json({
    location: {
      code: location.code,
      name: location.name,
      alarms: location.alarmLevelsM,
    },
    weather: summariseWeather(bundle),
    observedState: inputState,
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
    riverContext: river.context,
    riverContextError: river.error,
    warnings,
  });
}

function summariseWeather(bundle: WeatherBundle) {
  return {
    provider: bundle.provider,
    retrievedAt: bundle.retrievedAt,
    timezone: bundle.timezone,
    historyDays: bundle.historyDays,
    soilMoistureSource: bundle.observed.soilMoistureSource,
    rainfallSource: bundle.observed.rainfallSource,
    gaugeDays: bundle.observed.gaugeDays,
    gauge: bundle.gauge ?? null,
    degraded: bundle.degraded,
    degradationReason: bundle.degradationReason,
    observed: bundle.observed,
    days: bundle.days,
    notes: bundle.notes,
  };
}
