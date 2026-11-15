"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useState } from "react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  StatusLabel,
} from "@/components/ui";
import { historicalReadings } from "@/data/dashboard";

export function RainfallChart({
  endDate,
  location = "Marikina",
  startDate,
}: {
  endDate?: string;
  location?: string;
  startDate?: string;
} = {}) {
  const [readings, setReadings] = useState(historicalReadings);
  const [datasetLabel, setDatasetLabel] = useState("Dataset v2 · loading");
  const [state, setState] = useState<
    "loading" | "ready" | "fallback" | "empty"
  >("loading");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ location, limit: "14" });
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    fetch(`/api/historical?${params.toString()}`)
      .then(async (response) => {
        if (response.status === 404) return { empty: true as const };
        if (!response.ok) throw new Error("Historical dataset unavailable");
        return (await response.json()) as {
          dataset: string;
          readings: typeof historicalReadings;
        };
      })
      .then((payload) => {
        if (!active) return;
        if ("empty" in payload) {
          setReadings([]);
          setDatasetLabel("Dataset v2 · no records");
          setState("empty");
          return;
        }
        setReadings(payload.readings);
        setDatasetLabel("Dataset v2 · historical");
        setState("ready");
      })
      .catch(() => {
        if (active) {
          setDatasetLabel("Dataset v2 · fallback preview");
          setState("fallback");
        }
      });
    return () => {
      active = false;
    };
  }, [endDate, location, startDate]);

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
            Historical context
          </h2>
          <p className="text-metadata mt-0.5 text-muted">
            Daily rainfall and documented derived water-level proxy · {location}
          </p>
        </div>
        <StatusLabel className="border-line bg-canvas text-muted">
          {datasetLabel}
        </StatusLabel>
      </div>

      <div className="mt-3 grid gap-3" aria-label="Historical context charts">
        {state === "loading" ? (
          <p className="text-metadata flex h-full items-center justify-center text-muted">
            Loading historical records…
          </p>
        ) : state === "empty" ? (
          <p className="text-metadata flex h-full items-center justify-center text-muted">
            No Dataset v2 records match this date range.
          </p>
        ) : (
          <>
            <div>
              <p className="text-metadata mb-1 font-semibold text-ink">
                Daily rainfall · mm
              </p>
              <div className="h-[135px]">
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
              <div className="h-[135px]">
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
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {location === "Marikina" ? (
                      <>
                        <ReferenceLine
                          y={15}
                          stroke="var(--color-warning)"
                          strokeDasharray="4 4"
                          label={{
                            value: "1st alarm 15 m",
                            fontSize: 9,
                            fill: "var(--color-warning)",
                          }}
                        />
                        <ReferenceLine
                          y={16}
                          stroke="var(--color-danger)"
                          strokeDasharray="4 4"
                          label={{
                            value: "2nd alarm 16 m",
                            fontSize: 9,
                            fill: "var(--color-danger)",
                          }}
                        />
                        <ReferenceLine
                          y={18}
                          stroke="var(--color-danger)"
                          strokeDasharray="4 4"
                          label={{
                            value: "3rd alarm 18 m",
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
      {state === "fallback" ? (
        <p className="text-metadata mt-2 text-warning">
          Live Dataset v2 records were unavailable, so the compact preview is
          shown.
        </p>
      ) : null}
    </section>
  );
}
