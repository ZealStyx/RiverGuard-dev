"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";

type DailyReading = {
  date: string;
  rainfall: number | null;
  waterLevel: number | null;
  rainSource: string;
};

type MonthlyReading = { month: string; rainfall: number };

function TremorTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    color?: string;
    name?: string | number;
    value?: string | number | null;
    payload?: { rainSource?: string };
  }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-control border border-line bg-canvas px-3 py-2 text-[11px] shadow-lg">
      <p className="font-semibold text-ink">{label}</p>
      <div className="mt-1 grid gap-1">
        {payload.map((entry) => (
          <div key={String(entry.name)} className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{
                background: entry.color ?? "var(--color-brand-primary)",
              }}
            />
            <span className="text-muted">{entry.name}</span>
            <span className="ml-auto font-semibold text-ink">
              {typeof entry.value === "number"
                ? entry.value.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : (entry.value ?? "Missing")}
            </span>
          </div>
        ))}
      </div>
      {payload[0]?.payload?.rainSource ? (
        <p className="mt-1 border-t border-line pt-1 text-[10px] text-muted">
          Rain source: {payload[0].payload.rainSource}
        </p>
      ) : null}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-control bg-canvas-soft px-3 py-2">
      <p className="text-metadata text-muted">{label}</p>
      <p className="mt-0.5 text-section text-ink">{value}</p>
    </div>
  );
}

function useDailyReadings(
  location: string,
  startDate: string,
  endDate: string,
) {
  const [readings, setReadings] = useState<DailyReading[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      location,
      limit: "14",
      start: startDate,
      end: endDate,
    });
    fetch(`/api/historical?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Daily data unavailable");
        return (await response.json()) as { readings?: DailyReading[] };
      })
      .then((payload) => {
        if (!active) return;
        const next = payload.readings ?? [];
        setReadings(next);
        setState(next.length ? "ready" : "empty");
      })
      .catch(() => {
        if (active) setState("empty");
      });
    return () => {
      active = false;
    };
  }, [endDate, location, startDate]);

  return { readings, state };
}

export function TremorHistoricalCharts({
  endDate,
  location,
  startDate,
}: {
  endDate: string;
  location: string;
  startDate: string;
}) {
  const { readings, state } = useDailyReadings(location, startDate, endDate);
  const rainfallReadings = readings.filter(
    (reading) => reading.rainfall !== null,
  );
  const waterReadings = readings.filter(
    (reading) => reading.waterLevel !== null,
  );
  const rainfallStats = useMemo(() => {
    const values = rainfallReadings.map(
      (reading) => reading.rainfall as number,
    );
    const peak = values.length ? Math.max(...values) : null;
    const total = values.length
      ? values.reduce((sum, value) => sum + value, 0)
      : null;
    const peakDay = rainfallReadings.find(
      (reading) => reading.rainfall === peak,
    )?.date;
    const sourceCount = new Set(
      rainfallReadings.map((reading) => reading.rainSource),
    ).size;
    return { peak, total, peakDay, sourceCount };
  }, [rainfallReadings]);
  const waterStats = useMemo(() => {
    const values = waterReadings.map((reading) => reading.waterLevel as number);
    const latest = values.at(-1) ?? null;
    const peak = values.length ? Math.max(...values) : null;
    return { latest, peak };
  }, [waterReadings]);

  if (state === "loading") {
    return (
      <div className="grid gap-3 xl:grid-cols-2">
        {["rainfall", "water-level"].map((key) => (
          <section
            key={key}
            className="rounded-panel border border-line bg-canvas p-4"
          >
            <p className="text-metadata flex h-[300px] items-center justify-center text-muted">
              Loading Dataset v2 records…
            </p>
          </section>
        ))}
      </div>
    );
  }

  if (state === "empty") {
    return (
      <section className="rounded-panel border border-line bg-canvas p-4">
        <p className="text-metadata py-8 text-center text-muted">
          No Dataset v2 records match this date range.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <section className="rounded-panel border border-line bg-canvas p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-section">Daily rainfall</h2>
            <p className="text-metadata mt-0.5 text-muted">
              Accumulated daily rainfall · {location} · mm
            </p>
          </div>
          <span className="text-metadata rounded-full border border-brand-secondary-muted bg-brand-secondary-soft px-2 py-1 text-brand-secondary">
            Tremor trial
          </span>
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <SummaryStat
            label="Period total"
            value={
              rainfallStats.total === null
                ? "Missing"
                : `${rainfallStats.total.toFixed(1)} mm`
            }
          />
          <SummaryStat
            label="Peak day"
            value={
              rainfallStats.peak === null
                ? "Missing"
                : `${rainfallStats.peak.toFixed(1)} mm`
            }
          />
          <SummaryStat
            label="Rain sources"
            value={`${rainfallStats.sourceCount}`}
          />
        </div>
        <div
          className="h-[240px]"
          aria-label={`Daily rainfall for ${location}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={readings}
              margin={{ top: 8, right: 8, bottom: 0, left: -15 }}
            >
              <defs>
                <linearGradient
                  id="tremor-rainfall-fill"
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
                tick={{ fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
                label={{
                  value: "mm",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 10,
                }}
              />
              <Tooltip
                content={<TremorTooltip />}
                cursor={{ strokeDasharray: "3 3" }}
              />
              <Area
                type="monotone"
                dataKey="rainfall"
                name="Rainfall (mm)"
                stroke="var(--color-brand-secondary)"
                strokeWidth={2.5}
                fill="url(#tremor-rainfall-fill)"
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-metadata mt-2 text-muted">
          Peak day: {rainfallStats.peakDay ?? "not available"}. Source labels
          remain attached to each tooltip.
        </p>
      </section>

      <section className="rounded-panel border border-line bg-canvas p-4">
        <div className="mb-3">
          <h2 className="text-section">Derived water-level proxy</h2>
          <p className="text-metadata mt-0.5 text-muted">
            Daily proxy trend · {location} · metres (m)
          </p>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <SummaryStat
            label="Latest value"
            value={
              waterStats.latest === null
                ? "Missing"
                : `${waterStats.latest.toFixed(2)} m`
            }
          />
          <SummaryStat
            label="Period peak"
            value={
              waterStats.peak === null
                ? "Missing"
                : `${waterStats.peak.toFixed(2)} m`
            }
          />
        </div>
        <div
          className="h-[240px]"
          aria-label={`Derived water-level proxy for ${location}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={readings}
              margin={{ top: 8, right: 8, bottom: 0, left: -15 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-chart-grid)"
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
                label={{
                  value: "m",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 10,
                }}
              />
              <Tooltip
                content={<TremorTooltip />}
                cursor={{ strokeDasharray: "3 3" }}
              />
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
                stroke="var(--color-brand-primary)"
                strokeWidth={2.5}
                dot={{
                  r: 3,
                  fill: "var(--color-brand-primary)",
                  stroke: "var(--color-canvas)",
                  strokeWidth: 2,
                }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-metadata mt-2 text-warning">
          Derived proxy only; this is not a verified direct gauge observation.
        </p>
      </section>
    </div>
  );
}

export function TremorMonthlyRainfallChart({ location }: { location: string }) {
  const [readings, setReadings] = useState<MonthlyReading[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    let active = true;
    fetch(
      `/api/historical?mode=monthly&location=${encodeURIComponent(location)}`,
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Monthly data unavailable");
        return (await response.json()) as { readings?: MonthlyReading[] };
      })
      .then((payload) => {
        if (!active) return;
        const next = payload.readings ?? [];
        setReadings(next);
        setState(next.length ? "ready" : "empty");
      })
      .catch(() => {
        if (active) setState("empty");
      });
    return () => {
      active = false;
    };
  }, [location]);

  return (
    <section className="rounded-panel border border-line bg-canvas p-4">
      <div className="mb-3">
        <h2 className="text-section">Monthly rainfall pattern</h2>
        <p className="text-metadata mt-0.5 text-muted">
          Monthly totals · {location} · latest 24 months · mm
        </p>
      </div>
      <div
        className="h-[240px]"
        aria-label={`Monthly rainfall pattern for ${location}`}
      >
        {state === "loading" ? (
          <p className="text-metadata flex h-full items-center justify-center text-muted">
            Loading Dataset v2 summary…
          </p>
        ) : state === "empty" ? (
          <p className="text-metadata flex h-full items-center justify-center text-muted">
            Monthly rainfall data is unavailable for this location.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={readings}
              margin={{ top: 8, right: 8, bottom: 0, left: -15 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-chart-grid)"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
                label={{
                  value: "mm",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 10,
                }}
              />
              <Tooltip
                content={<TremorTooltip />}
                cursor={{ fill: "var(--color-brand-secondary-soft)" }}
              />
              <Bar
                dataKey="rainfall"
                name="Rainfall (mm)"
                fill="var(--color-brand-primary)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
