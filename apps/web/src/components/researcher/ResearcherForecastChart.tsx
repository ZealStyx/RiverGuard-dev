"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { OutlookDay } from "@/types";

function riskClass(label: OutlookDay["label"]) {
  if (label === "Elevated") return "bg-[#f7ded8] text-[#9d3127]";
  if (label === "Moderate") return "bg-[#f6e9c6] text-[#805b12]";
  if (label === "Lower") return "bg-[#deeee5] text-[#2d684a]";
  return "bg-[#e9ece8] text-[#66706a]";
}

export function ResearcherForecastChart({
  days,
  selectedIndex,
  threshold,
  onSelect,
}: {
  days: OutlookDay[];
  selectedIndex: number;
  threshold: number;
  onSelect: (index: number) => void;
}) {
  const data = days.map((day) => ({
    name: day.day,
    isoDate: day.isoDate,
    rainfall: day.rainfallMm ?? 0,
    probability: (day.probability ?? 0) * 100,
    waterLevel: day.waterLevelM ?? 0,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-[330px] items-center justify-center rounded-2xl bg-[#f8fbfd] px-6 text-center text-sm leading-6 text-[#53697d]">
        Run a forecast to compare seven days of rainfall, flood probability, and
        predicted water level.
      </div>
    );
  }

  return (
    <div>
      <div className="h-[330px] w-full" aria-label="Seven-day forecast chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 18, right: 8, bottom: 4, left: -12 }}
          >
            <CartesianGrid vertical={false} stroke="#d7e2e9" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#53697d", fontSize: 12 }}
            />
            <YAxis
              yAxisId="rain"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#53697d", fontSize: 11 }}
              unit=" mm"
            />
            <YAxis
              yAxisId="probability"
              orientation="right"
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#53697d", fontSize: 11 }}
              unit="%"
            />
            <Tooltip
              cursor={{ fill: "rgba(8, 108, 207, 0.035)" }}
              contentStyle={{
                border: "1px solid #d7e2e9",
                borderRadius: 14,
                boxShadow: "0 16px 42px rgba(7, 42, 76, 0.12)",
                color: "#092847",
              }}
              formatter={(value, name) => {
                const numeric = Number(value);
                if (name === "probability")
                  return [`${numeric.toFixed(1)}%`, "Flood probability"];
                if (name === "rainfall")
                  return [`${numeric.toFixed(1)} mm`, "Rainfall"];
                return [numeric, name];
              }}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.isoDate ?? "Forecast day"
              }
            />
            <ReferenceLine
              yAxisId="probability"
              y={threshold * 100}
              stroke="#c45242"
              strokeDasharray="5 5"
            />
            <Bar
              yAxisId="rain"
              dataKey="rainfall"
              fill="#8bb9c4"
              radius={[7, 7, 0, 0]}
              maxBarSize={42}
            />
            <Line
              yAxisId="probability"
              type="monotone"
              dataKey="probability"
              stroke="#147384"
              strokeWidth={3}
              dot={{ r: 4, fill: "#9dd6df", stroke: "#147384", strokeWidth: 2 }}
              activeDot={{
                r: 6,
                fill: "#9dd6df",
                stroke: "#147384",
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-2" aria-label="Forecast days">
        {days.map((day, index) => (
          <button
            key={day.isoDate}
            type="button"
            aria-pressed={selectedIndex === index}
            onClick={() => onSelect(index)}
            className={`grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
              selectedIndex === index
                ? "border-[#0b4564] bg-[#0b4564] text-white shadow-[0_10px_26px_rgba(7,42,76,0.18)]"
                : "border-[#d7e2e9] bg-white text-[#092847] hover:border-[#9db4c3]"
            }`}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-5">
                {day.day}
              </span>
              <span className="block truncate text-xs opacity-65">
                {day.date} · {(day.rainfallMm ?? 0).toFixed(1)} mm rain
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2.5">
              <span className="text-right">
                <span className="block text-sm font-semibold tabular-nums">
                  {((day.probability ?? 0) * 100).toFixed(0)}%
                </span>
                <span className="block text-[10px] opacity-60">
                  probability
                </span>
              </span>
              <span
                className={`inline-flex min-w-[4.75rem] justify-center rounded-full px-2 py-1 text-[11px] font-semibold ${
                  selectedIndex === index
                    ? "bg-white/12 text-white"
                    : riskClass(day.label)
                }`}
              >
                {day.label}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
