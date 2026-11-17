/**
 * GET /api/contributions?locationCode=marikina
 *
 * Real model attribution for a city. The observed state comes from the dataset;
 * the weather window is the live provider (or the labelled offline fixture when
 * the provider is down and fixtures are allowed). The local ML service then
 * scores the next day and returns its sensitivity sweep.
 */

import { NextResponse } from "next/server";

import { getLocation } from "@/lib/locations";
import { MlServiceError, requestNextDayForecast } from "@/lib/ml-client";
import { observedStateFromDataset } from "@/lib/observed-state";
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

  const observed = await observedStateFromDataset(location);
  const seeded = observed ? { ...bundle, observed: observed.observed } : bundle;

  try {
    const result = await requestNextDayForecast(seeded);
    return NextResponse.json({
      locationCode: location.code,
      locationName: location.name,
      modelVersion: result.meta.modelVersion,
      asOfDate: observed?.asOfDate ?? result.day.date,
      baseProbability: result.day.probability,
      baseWaterLevelM: result.day.waterLevelM,
      contributions: result.contributions,
      observedState: observed
        ? {
            source: "dataset",
            asOfDate: observed.asOfDate,
            rainSource: observed.rainSource,
            qualityStatus: observed.qualityStatus,
          }
        : {
            source: "weather",
            asOfDate: null,
            rainSource: null,
            qualityStatus: null,
          },
      degraded: seeded.degraded,
      warnings: [
        ...(seeded.degraded
          ? [seeded.degradationReason ?? "Weather inputs are degraded."]
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
