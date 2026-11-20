"use client";

/**
 * Observed history, presented with the same card language as the shared
 * seven-day outlook used by the resident and LGU workspaces.
 *
 * The researcher history screen and the admin research dashboard both used to
 * render the older bordered `RainfallChart`, which looked nothing like the
 * resident/LGU panels. This component reuses those primitives
 * (`WorkspaceChartSection`, `WorkspaceChartPanel`, `ChartContainer`) so all
 * three roles show observed history the same way.
 *
 * Every number comes from `GET /api/historical`, which reads the real dataset.
 * There is no illustrative fallback: a failure says so and offers a retry.
 */

import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useEffect, useState } from "react";

import { authFetch } from "@/lib/api-client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui";
import {
  WorkspaceChartPanel,
  WorkspaceChartSection,
} from "@/components/prototype/Primitives";
import { LOCATIONS, type LocationCode } from "@/lib/locations";
import type { HistoricalReading } from "@/types";

type LoadState = "loading" | "ready" | "empty" | "error";

interface HistoricalResponse {
  dataset: string;
  location: string;
  dateMin: string;
  dateMax: string;
  readings: HistoricalReading[];
  /** What the response could not provide (unpublished days, missing levels). */
  notes?: string[];
  error?: string;
  detail?: string;
}

function isLocationCode(value: string): value is LocationCode {
  return value in LOCATIONS;
}

export function ObservedHistoryChart({
  className,
  endDate,
  location = "Marikina",
  startDate,
  limit = 14,
  title = "Observed history",
  description,
  eyebrow,
}: {
  className?: string;
  endDate?: string;
  location?: string;
  startDate?: string;
  limit?: number;
  title?: string;
  description?: string;
  eyebrow?: string;
}) {
  const [readings, setReadings] = useState<HistoricalReading[]>([]);
  const [range, setRange] = useState<{ min: string; max: string } | null>(null);
  const [dataset, setDataset] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

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

    authFetch(`/api/historical?${params.toString()}`)
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
        setDataset(payload.dataset);
        setNotes(payload.notes ?? []);
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
  const code = location.toLowerCase().replace(/\s+/g, "-");
  const alarms = isLocationCode(code)
    ? (LOCATIONS[code].alarmLevelsM ?? null)
    : null;
  const peak = readings.reduce(
    (high, row) => Math.max(high, row.waterLevel ?? -Infinity),
    -Infinity,
  );
  const showAlarms =
    alarms !== null && Number.isFinite(peak) && peak >= alarms[0] - 2.5;

  return (
    <WorkspaceChartSection
      className={className}
      // One panel per row: the two charts get the full card width instead of
      // being squeezed into half of it each.
      gridClassName="grid-cols-1"
      eyebrow={eyebrow}
      title={title}
      description={
        description ??
        `Daily rainfall and derived water-level proxy · ${location}${
          range ? ` · ${range.min} → ${range.max}` : ""
        }`
      }
      meta={
        <span className="rounded-full border border-[#d7e2e9] bg-[#f3f7fa] px-3 py-1.5 text-xs font-semibold text-[#53697d]">
          {shownState === "ready" && dataset
            ? `${dataset} · ${readings.length} days`
            : shownState === "loading"
              ? "Loading…"
              : shownState === "error"
                ? "Unavailable"
                : "No records"}
        </span>
      }
    >
      {shownState === "loading" ? (
        <p className="flex h-64 items-center justify-center rounded-2xl bg-[#f8fbfd] text-sm text-[#53697d] lg:col-span-2">
          Loading observed records…
        </p>
      ) : shownState === "error" ? (
        <div
          role="alert"
          className="flex h-64 flex-col items-start justify-center gap-2 rounded-2xl border border-[#e7c9bd] bg-[#fff8f4] p-4 text-[#733d2d] lg:col-span-2"
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <WarningCircle size={18} /> Observed history is unavailable
          </p>
          <p className="text-xs">
            {errorDetail ?? "The dataset could not be read."}
          </p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#e7c9bd] bg-white px-3 text-xs font-semibold"
          >
            <ArrowClockwise size={14} /> Retry
          </button>
        </div>
      ) : shownState === "empty" ? (
        <p className="flex h-64 items-center justify-center rounded-2xl bg-[#f8fbfd] text-sm text-[#53697d] lg:col-span-2">
          No dataset rows match this location and date range.
        </p>
      ) : (
        <>
          <WorkspaceChartPanel
            title="Daily rainfall"
            description="Observed precipitation · millimetres"
          >
            <div className="h-60">
              <ChartContainer
                config={{
                  rainfall: { label: "Rainfall (mm)", color: "#147384" },
                }}
              >
                <BarChart
                  data={readings}
                  margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                >
                  <CartesianGrid vertical={false} stroke="#d7e2e9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#53697d" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#53697d" }}
                    unit=" mm"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="rainfall"
                    name="Rainfall (mm)"
                    fill="#147384"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </WorkspaceChartPanel>

          <WorkspaceChartPanel
            title="Derived water level"
            description="Model-derived indicator · metres"
            meta={
              <span className="text-xs font-semibold text-[#a36726]">
                Not a gauge reading
              </span>
            }
          >
            <div className="h-60">
              <ChartContainer
                config={{
                  waterLevel: { label: "Derived proxy (m)", color: "#086ccf" },
                }}
              >
                <LineChart
                  data={readings}
                  margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                >
                  <CartesianGrid vertical={false} stroke="#d7e2e9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#53697d" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#53697d" }}
                    unit=" m"
                    domain={["auto", "auto"]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {showAlarms && alarms
                    ? alarms.map((level, index) => (
                        <ReferenceLine
                          key={level}
                          y={level}
                          stroke={index === 0 ? "#a36726" : "#9d3127"}
                          strokeDasharray="4 4"
                        />
                      ))
                    : null}
                  <Line
                    type="monotone"
                    dataKey="waterLevel"
                    name="Derived proxy (m)"
                    stroke="#086ccf"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#ffffff", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </WorkspaceChartPanel>
        </>
      )}

      {shownState === "ready" ? (
        <p className="text-xs text-[#53697d] lg:col-span-2">
          Source: {latest?.rainSource ?? "undocumented"}
          {latest?.stationId ? ` · station ${latest.stationId}` : ""}
          {!showAlarms && alarms
            ? ` · alarm lines hidden: the series peaks at ${peak.toFixed(2)} m, more than 2.5 m below the ${alarms[0]} m first alarm`
            : ""}
        </p>
      ) : null}

      {shownState === "ready" && notes.length > 0 ? (
        <ul className="space-y-1 text-xs text-[#53697d] lg:col-span-2">
          {notes.map((note) => (
            <li key={note} className="flex gap-1.5">
              <span aria-hidden className="text-[#94a9ba]">
                ·
              </span>
              {note}
            </li>
          ))}
        </ul>
      ) : null}
    </WorkspaceChartSection>
  );
}
