"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StatusLabel } from "@/components/ui";
import { historicalReadings } from "@/data/dashboard";

export function RainfallChart() {
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
            Recent rainfall and water level · Marikina River
          </p>
        </div>
        <StatusLabel className="border-line bg-canvas text-muted">
          Research data
        </StatusLabel>
      </div>

      <div
        className="mt-3 h-[165px] w-full overflow-hidden"
        aria-label="Historical sample chart"
      >
        <ComposedChart
          width={520}
          height={165}
          className="h-full! w-full!"
          data={historicalReadings}
          margin={{ top: 8, right: 4, bottom: 0, left: -18 }}
        >
          <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
          />
          <YAxis
            yAxisId="rainfall"
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
          />
          <YAxis yAxisId="water" orientation="right" domain={[14, 17]} hide />
          <Tooltip
            contentStyle={{
              background: "var(--color-canvas-soft)",
              border: "1px solid var(--color-line)",
              borderRadius: 8,
              color: "var(--color-ink)",
              fontSize: 11,
            }}
            labelStyle={{ color: "var(--color-ink)" }}
          />
          <Legend
            iconSize={9}
            wrapperStyle={{ color: "var(--color-muted)", fontSize: 10 }}
          />
          <Bar
            yAxisId="rainfall"
            name="Rainfall (mm)"
            dataKey="rainfall"
            fill="var(--color-chart-bar)"
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="water"
            name="Water level (m)"
            dataKey="waterLevel"
            type="monotone"
            stroke="var(--color-brand-secondary)"
            strokeWidth={3}
            dot={{
              fill: "var(--color-brand-secondary)",
              stroke: "var(--color-chart-surface)",
              strokeWidth: 2,
              r: 4,
            }}
            activeDot={{ r: 5, fill: "var(--color-brand-secondary-hover)" }}
          />
        </ComposedChart>
      </div>
    </section>
  );
}
