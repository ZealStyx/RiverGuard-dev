"use client";

/**
 * Observed rainfall and derived water level from the real dataset.
 *
 * Every number comes from `GET /api/historical`, which reads
 * `data/daily_observations.csv`. There is no illustrative fallback: if the
 * dataset cannot be read, the panel says so and offers a retry. Substituting a
 * hard-coded week here is what made previous builds look like they had data.
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useEffect, useState } from "react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  StatusLabel,
} from "@/components/ui";
import type { HistoricalReading } from "@/types";

import { LOCATIONS, type LocationCode } from "@/lib/locations";
import { OBSERVATIONS_UPDATED_EVENT } from "@/lib/observation-refresh";

type LoadState = "loading" | "ready" | "empty" | "error";

interface HistoricalResponse {
  dataset: string;
  location: string;
  dateMin: string;
  dateMax: string;
  /** Days after the dataset's last row that came from stored Open-Meteo runs. */
  liveDays?: number;
  datasetDateMax?: string | null;
  readings: HistoricalReading[];
  error?: string;
  detail?: string;
}

function isLocationCode(value: string): value is LocationCode {
  return value in LOCATIONS;
}

export function RainfallChart({
  endDate,
  location = "Marikina",
  startDate,
  limit = 14,
  compact = false,
}: {
  endDate?: string;
  location?: string;
  startDate?: string;
  limit?: number;
  compact?: boolean;
} = {}) {
  const [readings, setReadings] = useState<HistoricalReading[]>([]);
  const [range, setRange] = useState<{ min: string; max: string } | null>(null);
  const [live, setLive] = useState<{ days: number; after: string } | null>(
    null,
  );
  const [dataset, setDataset] = useState<string>("");
  const [state, setState] = useState<LoadState>("loading");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The request whose result is currently in `state`. Any change to the query
  // means the data on screen is stale, which is how "loading" is derived rather
  // than assigned inside the effect.
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  // A forecast started elsewhere in the app may have added observed days. The
  // panel fetched its payload on mount, so without this it would keep showing a
  // pre-run snapshot and read as "still stuck on the dataset".
  useEffect(() => {
    const refresh = () => setAttempt((value) => value + 1);
    window.addEventListener(OBSERVATIONS_UPDATED_EVENT, refresh);
    return () =>
      window.removeEventListener(OBSERVATIONS_UPDATED_EVENT, refresh);
  }, []);

  const requestKey = `${location}|${limit}|${startDate ?? ""}|${endDate ?? ""}|${attempt}`;
  const isStale = resolvedKey !== requestKey;

  useEffect(() => {
    let active = true;

    const [requestedLocation, requestedLimit, requestedStart, requestedEnd] =
      requestKey.split("|");
    const params = new URLSearchParams({
      location: requestedLocation,
      limit: requestedLimit,
    });
    if (requestedStart) params.set("start", requestedStart);
    if (requestedEnd) params.set("end", requestedEnd);

    fetch(`/api/historical?${params.toString()}`)
      .then(async (response) => {
        const payload = (await response.json()) as HistoricalResponse;
        if (!response.ok) {
          throw new Error(
            payload.error ??
              `Historical data request failed (${response.status})`,
          );
        }
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setReadings(payload.readings ?? []);
        setRange({ min: payload.dateMin, max: payload.dateMax });
        setLive(
          payload.liveDays && payload.datasetDateMax
            ? { days: payload.liveDays, after: payload.datasetDateMax }
            : null,
        );
        setDataset(payload.dataset);
        setErrorDetail(null);
        setState(payload.readings?.length ? "ready" : "empty");
        setResolvedKey(requestKey);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorDetail(
          error instanceof Error
            ? error.message
            : "Historical data unavailable",
        );
        setState("error");
        setResolvedKey(requestKey);
      });

    return () => {
      active = false;
    };
  }, [requestKey]);

  const shownState: LoadState = isStale ? "loading" : state;
  const latest = readings.length ? readings[readings.length - 1] : null;
  const locationConfig = isLocationCode(
    location.toLowerCase().replace(/\s+/g, "-"),
  )
    ? LOCATIONS[location.toLowerCase().replace(/\s+/g, "-") as LocationCode]
    : null;
  const alarms = locationConfig?.alarmLevelsM ?? null;
  const alarmsVerified = locationConfig?.alarmsVerified ?? false;

  // Real water level in Marikina sits near 13 m, well under the 15 m first
  // alarm, so drawing all three alarm lines flattens the series into the axis.
  // Plot the band only when the series actually gets near it.
  const peak = readings.reduce(
    (high, row) => Math.max(high, row.waterLevel ?? -Infinity),
    -Infinity,
  );
  const showAlarms = alarms !== null && peak >= alarms[0] - 2.5;

  // The water level is a proxy, never a gauge reading, so it is labelled every
  // time. The rainfall series is not annotated per-range by design.
  const waterIsDerived = Boolean(latest?.qualityStatus?.includes("derived"));
  const dataNote = waterIsDerived
    ? "Water level is a rainfall-derived proxy in this dataset, not a gauge reading."
    : null;

  return (
    <section
      id="historical-context"
      aria-labelledby="historical-context-title"
      data-dashboard-section
      className="rounded-panel border border-line bg-chart-surface p-4 text-ink"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="historical-context-title" className="text-section">
            Observed history
          </h2>
          <p className="text-metadata mt-0.5 text-muted">
            Daily rainfall and derived water-level proxy · {location}
            {range ? ` · ${range.min} → ${range.max}` : ""}
            {live
              ? ` · ${live.days} live day${live.days === 1 ? "" : "s"} after ${live.after}`
              : ""}
          </p>
        </div>
        <StatusLabel className="border-line bg-canvas text-muted">
          {shownState === "ready" && dataset
            ? `${dataset} · ${readings.length} days`
            : shownState === "loading"
              ? "Loading…"
              : shownState === "error"
                ? "Unavailable"
                : "No records"}
        </StatusLabel>
      </div>

      <div className="mt-3 grid gap-3" aria-label="Historical context charts">
        {shownState === "loading" ? (
          <p
            className={`text-metadata flex items-center justify-center text-muted ${
              compact ? "h-[180px]" : "h-[300px]"
            }`}
          >
            Loading observed records…
          </p>
        ) : shownState === "error" ? (
          <div
            className={`flex flex-col items-start justify-center gap-2 rounded-control border border-warning/30 bg-warning/5 p-4 ${
              compact ? "h-[180px]" : "h-[300px]"
            }`}
            role="alert"
          >
            <p className="text-button">Observed history is unavailable</p>
            <p className="text-metadata text-muted">
              {errorDetail ?? "The dataset could not be read."}
            </p>
            <button
              type="button"
              onClick={retry}
              className="text-button rounded-control border border-line bg-canvas px-2.5 py-1.5 hover:bg-canvas-soft"
            >
              Retry
            </button>
          </div>
        ) : shownState === "empty" ? (
          <p
            className={`text-metadata flex items-center justify-center text-muted ${
              compact ? "h-[180px]" : "h-[300px]"
            }`}
          >
            No dataset rows match this location and date range.
          </p>
        ) : (
          <>
            <div>
              <p className="text-metadata mb-1 font-semibold text-ink">
                Daily rainfall · mm
              </p>
              <div className={compact ? "h-[135px]" : "h-[190px]"}>
                <ChartContainer
                  config={{
                    rainfall: {
                      label: "Rainfall (mm)",
                      color: "var(--color-brand-secondary)",
                    },
                  }}
                >
                  <AreaChart
                    data={readings}
                    margin={{ top: 4, right: 4, bottom: 0, left: -18 }}
                  >
                    <defs>
                      <linearGradient
                        id="dashboard-rainfall-fill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-brand-secondary)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-brand-secondary)"
                          stopOpacity={0.03}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--color-chart-grid)"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9 }}
                      unit=" mm"
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="rainfall"
                      name="Rainfall (mm)"
                      stroke="var(--color-rainfall)"
                      fill="url(#dashboard-rainfall-fill)"
                      strokeWidth={2}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-metadata font-semibold text-ink">
                  Derived water-level proxy · m
                </p>
                <p className="text-metadata text-warning">
                  Not a direct gauge observation
                </p>
              </div>
              <div className={compact ? "h-[135px]" : "h-[190px]"}>
                <ChartContainer
                  config={{
                    waterLevel: {
                      label: "Derived proxy (m)",
                      color: "var(--color-brand-primary)",
                    },
                  }}
                >
                  <AreaChart
                    data={readings}
                    margin={{ top: 4, right: 4, bottom: 0, left: -18 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--color-chart-grid)"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9 }}
                      unit=" m"
                      domain={["auto", "auto"]}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {showAlarms && alarms ? (
                      <>
                        <ReferenceLine
                          y={alarms[0]}
                          stroke="var(--color-warning)"
                          strokeDasharray="4 4"
                          label={{
                            value: `1st alarm ${alarms[0]} m`,
                            fontSize: 9,
                            fill: "var(--color-warning)",
                          }}
                        />
                        <ReferenceLine
                          y={alarms[1]}
                          stroke="var(--color-danger)"
                          strokeDasharray="4 4"
                          label={{
                            value: `2nd alarm ${alarms[1]} m`,
                            fontSize: 9,
                            fill: "var(--color-danger)",
                          }}
                        />
                        <ReferenceLine
                          y={alarms[2]}
                          stroke="var(--color-danger)"
                          strokeDasharray="4 4"
                          label={{
                            value: `3rd alarm ${alarms[2]} m`,
                            fontSize: 9,
                            fill: "var(--color-danger)",
                          }}
                        />
                      </>
                    ) : null}
                    <Line
                      type="monotone"
                      dataKey="waterLevel"
                      name="Derived proxy (m)"
                      stroke="var(--color-waterLevel)"
                      strokeWidth={2.25}
                      dot={{
                        fill: "var(--color-waterLevel)",
                        stroke: "var(--color-chart-surface)",
                        strokeWidth: 2,
                        r: 3,
                      }}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>
          </>
        )}
      </div>

      {shownState === "ready" ? (
        <div className="mt-2 grid gap-1">
          {dataNote ? (
            <p className="text-metadata text-warning">{dataNote}</p>
          ) : null}
          <p className="text-metadata text-muted">
            Source: {latest?.rainSource ?? "undocumented"}
            {latest?.stationId ? ` · station ${latest.stationId}` : ""}
            {live
              ? ` · ${live.days} day${live.days === 1 ? "" : "s"} after ${live.after} read from the observation store (written by forecast runs), not the dataset`
              : ""}
            {!showAlarms && alarms
              ? ` · alarm lines hidden: the series peaks at ${peak.toFixed(2)} m, more than 2.5 m below the ${alarms[0]} m first alarm${alarmsVerified ? "" : " (indicative)"}`
              : ""}
          </p>
        </div>
      ) : null}
    </section>
  );
}
