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

import { useCallback, useEffect, useMemo, useState } from "react";

import { convexErrorHint, convexFunctions } from "@/lib/convex-functions";
import type { PersistenceKind, RunPersistence } from "@/lib/persistence";
import { useConvexQueryResult } from "@/lib/convex-query";
import type { OutlookDay } from "@/types";

export type OutlookSource = "live" | "convex";

/**
 * What the model was fed for this run.
 *
 * The input is the weather provider's window — today's rain, the antecedent
 * 3/7/30-day sums and soil moisture — so `source` is always `"weather"`. The
 * dataset is history for the charts, not a model input.
 */
export interface ObservedStateSummary {
  source: "weather";
  /** Last day of the provider window, ISO `YYYY-MM-DD`. */
  asOfDate: string;
  rainSource: string;
  qualityStatus: string;
  waterLevelM: number | null;
}

export interface ModelInputSnapshot {
  rainfallTodayMm: number;
  antecedentRain3dMm: number;
  antecedentRain7dMm: number;
  antecedentRain30dMm: number;
  soilMoisturePercent: number;
  nextDayRainfallMm: number | null;
  nextDayTmaxC: number | null;
  nextDayTminC: number | null;
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
  modelInputs: ModelInputSnapshot | null;
  operatingThreshold: number | null;
  /** The model's own caveat string, carried through from the ML service. */
  modelWarning: string | null;
  /**
   * Where this run was written — `convex`, the local fallback, or nowhere.
   *
   * The UI must read this rather than guessing from `source`: a run that was
   * just executed is `source: "live"` whether Convex stored it or not.
   */
  persistence: RunPersistence | null;
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

export interface ForecastApiResponse {
  location: { code: string; name: string };
  weather: {
    provider: string;
    degraded: boolean;
    degradationReason?: string;
    observed?: {
      rainfallTodayMm: number;
      antecedentRain3dMm: number;
      antecedentRain7dMm: number;
      antecedentRain30dMm: number;
      soilMoisturePercent: number;
    };
    days?: Array<{
      rainfallMm: number;
      tmaxC: number;
      tminC: number;
    }>;
  };
  /** Absent when no provider answered, e.g. a 502 weather failure. */
  observedState: ObservedStateSummary | null;
  forecast: {
    modelVersion: string;
    operatingThreshold?: number;
    days: ForecastApiDay[];
    warning?: string;
  };
  persistence: {
    kind: PersistenceKind;
    enabled: boolean;
    stored: boolean;
    alerts?: number;
    error?: string;
  };
  warnings: string[];
  error?: string;
  detail?: string;
}

/**
 * The one place a `POST /api/forecast` payload becomes screen state.
 *
 * Extracted so the mapping — especially `persistence`, which the storage line
 * is derived from — can be checked without a browser. It is also the only place
 * that decides a just-executed run is `source: "live"`.
 */
export function snapshotFromApiResponse(
  payload: ForecastApiResponse,
  updatedAt: number,
): OutlookSnapshot {
  const observed = payload.weather.observed;
  const firstForecastDay = payload.weather.days?.[0];
  return {
    days: payload.forecast.days.map(toOutlookDay),
    source: "live",
    updatedAt,
    locationName: payload.location.name,
    modelVersion: payload.forecast.modelVersion,
    provider: payload.weather.provider,
    degraded: payload.weather.degraded,
    degradationReason: payload.weather.degradationReason ?? null,
    alerts: payload.persistence?.alerts ?? 0,
    warnings: payload.warnings ?? [],
    observed: payload.observedState ?? null,
    modelInputs: observed
      ? {
          rainfallTodayMm: observed.rainfallTodayMm,
          antecedentRain3dMm: observed.antecedentRain3dMm,
          antecedentRain7dMm: observed.antecedentRain7dMm,
          antecedentRain30dMm: observed.antecedentRain30dMm,
          soilMoisturePercent: observed.soilMoisturePercent,
          nextDayRainfallMm: firstForecastDay?.rainfallMm ?? null,
          nextDayTmaxC: firstForecastDay?.tmaxC ?? null,
          nextDayTminC: firstForecastDay?.tminC ?? null,
        }
      : null,
    operatingThreshold: payload.forecast.operatingThreshold ?? null,
    modelWarning: payload.forecast.warning ?? null,
    // `kind` is what the server actually did. Older payloads that predate it
    // report nothing rather than being optimistically labelled.
    persistence: payload.persistence
      ? {
          kind: payload.persistence.kind ?? "none",
          stored: Boolean(payload.persistence.stored),
          error: payload.persistence.error,
        }
      : null,
  };
}

export function useOutlookFeed(locationCode: string, horizonDays: 3 | 7 = 7) {
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
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ locationCode, horizonDays }),
      });
      const payload = (await response.json()) as ForecastApiResponse;

      if (!response.ok) {
        setError(payload.error ?? `Forecast failed (${response.status})`);
        setErrorDetail(payload.detail ?? null);
        // A failed run still reports what the model was fed, which is useful
        // when the failure is downstream of the weather call.
        setFailedObserved(payload.observedState ?? null);
        return;
      }

      setSnapshot(snapshotFromApiResponse(payload, Date.now()));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Forecast request failed",
      );
    } finally {
      setIsRunning(false);
    }
  }, [horizonDays, locationCode]);

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

/**
 * Subscription to the stored outlook. Rendered only when Convex is configured.
 *
 * Subscribed through `useConvexQueryResult` rather than `useQuery`: a deployment
 * that has not been pushed since `latestOutlook` was added used to throw out of
 * render and blank the whole dashboard. Here the failure is just "no stored
 * outlook", which is state the feed already knows how to report.
 */
export function useStoredOutlook(
  locationCode: string,
  onSnapshot: (snapshot: OutlookSnapshot) => void,
) {
  const { data, error } = useConvexQueryResult(convexFunctions.latestOutlook, {
    locationCode,
  });

  useEffect(() => {
    if (error)
      console.warn(`[outlook] stored outlook: ${convexErrorHint(error)}`);
  }, [error]);

  const snapshot = useMemo<OutlookSnapshot | null>(() => {
    if (!data || !Array.isArray(data.days) || data.days.length === 0) {
      return null;
    }
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
      modelInputs: null,
      operatingThreshold: data.operatingThreshold ?? null,
      modelWarning: null,
      persistence: { kind: "convex", stored: true },
    };
  }, [data, locationCode]);

  useEffect(() => {
    if (snapshot) onSnapshot(snapshot);
  }, [snapshot, onSnapshot]);

  return data;
}
