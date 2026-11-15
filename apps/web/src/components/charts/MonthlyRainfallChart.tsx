"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  StatusLabel,
} from "@/components/ui";

type MonthlyReading = { month: string; rainfall: number };

export function MonthlyRainfallChart({
  location = "Marikina",
}: {
  location?: string;
}) {
  const [readings, setReadings] = useState<MonthlyReading[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    let active = true;
    fetch(
      `/api/historical?mode=monthly&location=${encodeURIComponent(location)}`,
    )
      .then((response) => {
        if (!response.ok) throw new Error("Monthly data unavailable");
        return response.json() as Promise<{ readings?: MonthlyReading[] }>;
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
    <section className="rounded-panel border border-line bg-chart-surface p-4 text-ink">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-section">Monthly rainfall pattern</h2>
          <p className="text-metadata mt-0.5 text-muted">
            Monthly rainfall totals · {location} · millimetres
          </p>
        </div>
        <StatusLabel className="border-line bg-canvas text-muted">
          Dataset v2 · 24 months
        </StatusLabel>
      </div>
      <div
        className="mt-3 h-[190px]"
        aria-label={`Monthly rainfall chart for ${location}`}
      >
        {state === "loading" ? (
          <p className="text-metadata flex h-full items-center justify-center text-muted">
            Loading monthly records…
          </p>
        ) : state === "empty" ? (
          <p className="text-metadata flex h-full items-center justify-center text-muted">
            Monthly rainfall data is unavailable for this location.
          </p>
        ) : (
          <ChartContainer
            config={{
              rainfall: {
                label: "Rainfall (mm)",
                color: "var(--color-brand-primary)",
              },
            }}
          >
            <BarChart
              data={readings}
              margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-chart-grid)"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted)", fontSize: 9 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted)", fontSize: 10 }}
                unit=" mm"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="rainfall"
                name="Rainfall (mm)"
                fill="var(--color-rainfall)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </section>
  );
}
