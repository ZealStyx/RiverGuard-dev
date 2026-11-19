"use client";

import { CalendarDots } from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui";
import type { OutlookSnapshot } from "@/lib/outlook";

import { WorkspaceChartPanel, WorkspaceChartSection } from "./Primitives";

export function SharedForecastOutlook({
  description,
  error,
  eyebrow = "Seven-day outlook",
  onRun,
  snapshot,
  title = "Daily forecast indicators",
}: {
  description?: string;
  error?: string | null;
  eyebrow?: string;
  onRun?: () => void;
  snapshot?: OutlookSnapshot | null;
  title?: string;
}) {
  const days = snapshot?.days ?? [];
  const peakDay = days.reduce(
    (peak, day) =>
      (day.rainfallMm ?? 0) > (peak.rainfallMm ?? 0) ? day : peak,
    days[0] ?? ({} as (typeof days)[number]),
  );
  const chartData = days.map((day) => ({
    day: day.day,
    rainfallMm: day.rainfallMm ?? null,
    waterLevelM: day.waterLevelM ?? null,
  }));

  return (
    <WorkspaceChartSection
      eyebrow={eyebrow}
      title={title}
      description={description}
      meta={
        snapshot ? (
          <span className="rounded-full border border-[#d7e2e9] bg-[#f3f7fa] px-3 py-1.5 text-xs font-semibold text-[#53697d]">
            Updated{" "}
            {new Intl.DateTimeFormat("en-PH", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Manila",
            }).format(snapshot.updatedAt)}
          </span>
        ) : null
      }
    >
      {error ? (
        <div
          role="alert"
          className="rounded-[0.75rem] border border-[#e7c9bd] bg-[#fff8f4] p-4 text-sm text-[#733d2d] lg:col-span-2"
        >
          <p className="font-semibold">The forecast could not be completed</p>
          <p className="mt-1 text-[#53697d]">{error}</p>
        </div>
      ) : null}

      {days.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-[1rem] border border-dashed border-[#cbdce5] bg-[#f8fbfd] px-5 text-center lg:col-span-2">
          <CalendarDots size={28} className="text-[#147384]" />
          <p className="mt-3 font-semibold text-[#092847]">
            Run a forecast to view the seven-day graphs
          </p>
          <p className="mt-1 max-w-md text-sm leading-6 text-[#53697d]">
            Daily rainfall and the derived water-level indicator will appear
            here after a completed run.
          </p>
          {onRun ? (
            <button
              type="button"
              onClick={onRun}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[0.75rem] bg-[#086ccf] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#075db2] active:translate-y-0"
            >
              Run forecast
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <WorkspaceChartPanel
            title="Daily rainfall"
            description="Forecast precipitation · millimetres"
            meta={
              peakDay?.rainfallMm !== undefined ? (
                <span className="text-xs font-semibold text-[#147384]">
                  Peak {peakDay.rainfallMm?.toFixed(1)} mm
                </span>
              ) : null
            }
          >
            <div className="h-64">
              <ChartContainer
                config={{
                  rainfallMm: { label: "Rainfall (mm)", color: "#147384" },
                }}
              >
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                >
                  <CartesianGrid vertical={false} stroke="#d7e2e9" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                    unit=" mm"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="rainfallMm"
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
            <div className="h-64">
              <ChartContainer
                config={{
                  waterLevelM: {
                    label: "Derived water level (m)",
                    color: "#086ccf",
                  },
                }}
              >
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                >
                  <CartesianGrid vertical={false} stroke="#d7e2e9" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                    unit=" m"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="waterLevelM"
                    name="Derived water level (m)"
                    stroke="#086ccf"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#ffffff", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </WorkspaceChartPanel>
        </>
      )}
    </WorkspaceChartSection>
  );
}
