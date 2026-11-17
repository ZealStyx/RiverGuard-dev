"use client";

/**
 * Client-side outlook feed.
 *
 * Two sources, one shape:
 *   - a POST to /api/forecast (dataset observed state -> weather -> ML -> Convex)
 *     that returns the run it just performed;
 *   - a Convex subscription to the latest stored run, so a reload shows the last
 *     forecast without spending another weather or ML call.
 *
 * There is deliberately no static fallback any more. If neither source has a
 * run, the feed reports "no run" and the UI must say so — it may not substitute
 * an illustrative week, because an illustrative week is indistinguishable from
 * a forecast once it is drawn on a chart.
 */

import { useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { convexFunctions } from "@/lib/convex-functions";
import type { OutlookDay } from "@/types";

export type OutlookSource = "live" | "convex";

export interface ObservedStateSummary {
  source: "dataset" | "weather";
  asOfDate: string | null;
  rainSource: string | null;
  qualityStatus: string | null;
  waterLevelM: number | null;
}

export interface OutlookSnapshot {
  days: OutlookDay[];
  source: OutlookSource;
  updatedAt: number;
  locationName: string;
  modelVersion: string | null;
  provider: string;
  degraded: boolean;
  alerts: number;
  warnings: string[];
  /** Why the run is degraded, when it is. */
  degradationReason: string | null;
  observed: ObservedStateSummary | null;
  /** The model's own caveat string, carried through from the ML service. */
  modelWarning: string | null;
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
  rainfallMm?: number;
  reasons?: string[];
  exceedsOperatingThreshold?: boolean;
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
    rainfallMm: row.rainfallMm,
    reasons: row.reasons,
    exceedsOperatingThreshold: row.exceedsOperatingThreshold,
  };
}

interface ForecastApiDay {
  date: string;
  riskLevel: string;
  probability: number;
  waterLevelM: number;
  alertLevel: OutlookDay["alertLevel"];
  rainfallMm: number;
  reasons: string[];
  exceedsOperatingThreshold: boolean;
}

interface ForecastApiResponse {
  location: { code: string; name: string };
  weather: { provider: string; degraded: boolean; degradationReason?: string };
  observedState: ObservedStateSummary;
  forecast: { modelVersion: string; days: ForecastApiDay[]; warning?: string };
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
  /** Verbose server detail for the failed run, shown behind a disclosure. */
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  /** Observed state from a run that failed downstream, for context in the UI. */
  const [failedObserved, setFailedObserved] =
    useState<ObservedStateSummary | null>(null);

  const run = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setErrorDetail(null);
    try {
      const response = await fetch("/api/forecast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locationCode }),
      });
      const payload = (await response.json()) as ForecastApiResponse;

      if (!response.ok) {
        setError(payload.error ?? `Forecast failed (${response.status})`);
        setErrorDetail(payload.detail ?? null);
        // A failed run still tells us what the model was seeded from, which is
        // useful when the failure is the weather provider rather than the CSV.
        setFailedObserved(payload.observedState ?? null);
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
        degradationReason: payload.weather.degradationReason ?? null,
        alerts: payload.persistence.alerts ?? 0,
        warnings: payload.warnings ?? [],
        observed: payload.observedState ?? null,
        modelWarning: payload.forecast.warning ?? null,
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

  return {
    snapshot,
    isRunning,
    error,
    errorDetail,
    failedObserved,
    run,
    adopt,
  };
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
      degradationReason: null,
      alerts: data.alerts,
      warnings: [],
      observed: null,
      modelWarning: null,
    };
  }, [data, locationCode]);

  useEffect(() => {
    if (snapshot) onSnapshot(snapshot);
  }, [snapshot, onSnapshot]);

  return data;
}
