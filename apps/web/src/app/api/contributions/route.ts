/**
 * GET /api/contributions?locationCode=marikina
 *
 * Real model attribution for a city. The input state comes from the weather
 * provider window (or the labelled offline fixture when the provider is down and
 * fixtures are allowed) — the same input `POST /api/forecast` uses, so the bars
 * explain the run the dashboard shows. The local ML service then scores the next
 * day and returns its sensitivity sweep.
 */

import { NextResponse } from "next/server";

import { getLocation } from "@/lib/locations";
import { MlServiceError, requestNextDayForecast } from "@/lib/ml-client";
import { describeModelInput } from "@/lib/model-input";
import { getWeatherBundle } from "@/lib/weather";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const location = getLocation(
    url.searchParams.get("locationCode") ?? "marikina",
  );
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
        error: "Weather provider failed and the offline fallback is disabled.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 502 },
    );
  }

  const inputState = describeModelInput(bundle);

  try {
    const result = await requestNextDayForecast(bundle);
    return NextResponse.json({
      locationCode: location.code,
      locationName: location.name,
      modelVersion: result.meta.modelVersion,
      asOfDate: inputState.asOfDate,
      baseProbability: result.day.probability,
      baseWaterLevelM: result.day.waterLevelM,
      contributions: result.contributions,
      observedState: inputState,
      degraded: bundle.degraded,
      warnings: [
        ...(bundle.degraded
          ? [bundle.degradationReason ?? "Weather inputs are degraded."]
          : []),
        "Contributions are a one-at-a-time sensitivity sweep, not causal effects.",
      ],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "The local ML service did not return an attribution.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: error instanceof MlServiceError ? 503 : 500 },
    );
  }
}
