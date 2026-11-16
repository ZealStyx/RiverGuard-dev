"use client";

/**
 * Client-side outlook feed.
 *
 * Two sources, one shape:
 *   - a POST to /api/forecast (weather -> ML -> Convex) that returns the run it
 *     just performed;
 *   - a Convex subscription to the latest stored run, so a reload shows the last
 *     forecast without spending another weather or ML call.
 *
 * The static placeholder in @/data/dashboard stays the fallback so the dashboard
 * renders even with no ML service, no network, and no deployment.
 */

import { useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { convexFunctions } from "@/lib/convex-functions";
import type { OutlookDay } from "@/types";

import { outlookDays as staticOutlook } from "@/data/dashboard";

export type OutlookSource = "live" | "convex" | "static";

export interface OutlookSnapshot {
  days: OutlookDay[];
  source: Exclude<OutlookSource, "static">;
  updatedAt: number;
  locationName: string;
  modelVersion: string | null;
  provider: string;
  degraded: boolean;
  alerts: number;
  warnings: string[];
}

const LABELS: Record<string, OutlookDay["label"]> = {
  lower: "Lower",
  moderate: "Moderate",
  elevated: "Elevated",
  unavailable: "Unavailable",
};

const WEEKDAY = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  timeZone: "Asia/Manila",
});

export function toOutlookDay(row: {
  date: string;
  riskLevel: string;
  probability?: number;
  waterLevelM?: number;
  alertLevel?: OutlookDay["alertLevel"];
}): OutlookDay {
  const parsed = new Date(`${row.date}T00:00:00+08:00`);
  return {
    isoDate: row.date,
    day: WEEKDAY.format(parsed),
    date: parsed.getDate(),
    label: LABELS[row.riskLevel] ?? "Unavailable",
    probability: row.probability,
    waterLevelM: row.waterLevelM,
    alertLevel: row.alertLevel ?? "none",
  };
}

export function staticOutlookDays(): OutlookDay[] {
  return staticOutlook;
}

interface ForecastApiDay {
  date: string;
  riskLevel: string;
  probability: number;
  waterLevelM: number;
  alertLevel: OutlookDay["alertLevel"];
}

interface ForecastApiResponse {
  location: { code: string; name: string };
  weather: { provider: string; degraded: boolean };
  forecast: { modelVersion: string; days: ForecastApiDay[] };
  persistence: {
    enabled: boolean;
    stored: boolean;
    alerts?: number;
    error?: string;
  };
  warnings: string[];
  error?: string;
  detail?: string;
}

export function useOutlookFeed(locationCode: string) {
  const [snapshot, setSnapshot] = useState<OutlookSnapshot | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/forecast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locationCode }),
      });
      const payload = (await response.json()) as ForecastApiResponse;

      if (!response.ok) {
        setError(payload.error ?? `Forecast failed (${response.status})`);
        return;
      }

      setSnapshot({
        days: payload.forecast.days.map(toOutlookDay),
        source: "live",
        updatedAt: Date.now(),
        locationName: payload.location.name,
        modelVersion: payload.forecast.modelVersion,
        provider: payload.weather.provider,
        degraded: payload.weather.degraded,
        alerts: payload.persistence.alerts ?? 0,
        warnings: payload.warnings ?? [],
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Forecast request failed",
      );
    } finally {
      setIsRunning(false);
    }
  }, [locationCode]);

  const adopt = useCallback((incoming: OutlookSnapshot) => {
    setSnapshot((current) =>
      current && current.updatedAt >= incoming.updatedAt ? current : incoming,
    );
  }, []);

  return { snapshot, isRunning, error, run, adopt };
}

/** Subscription to the stored outlook. Rendered only when Convex is configured. */
export function useStoredOutlook(
  locationCode: string,
  onSnapshot: (snapshot: OutlookSnapshot) => void,
) {
  const data = useQuery(convexFunctions.latestOutlook, { locationCode });

  const snapshot = useMemo<OutlookSnapshot | null>(() => {
    if (!data || data.days.length === 0) return null;
    return {
      days: data.days.map(toOutlookDay),
      source: "convex",
      updatedAt: data.requestedAt,
      locationName: locationCode,
      modelVersion: data.modelVersion,
      provider: data.provider,
      degraded: false,
      alerts: data.alerts,
      warnings: [],
    };
  }, [data, locationCode]);

  useEffect(() => {
    if (snapshot) onSnapshot(snapshot);
  }, [snapshot, onSnapshot]);

  return data;
}
