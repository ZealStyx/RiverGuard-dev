"use client";

import type { CSSProperties, ReactElement, ReactNode } from "react";
import { ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { TooltipPayloadEntry } from "recharts";

import { cx } from "@/lib/classnames";

export type ChartConfig = Record<string, { label?: ReactNode; color?: string }>;

export function ChartContainer({
  children,
  className,
  config,
}: {
  children: ReactNode;
  className?: string;
  config: ChartConfig;
}) {
  const variables = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      `--color-${key}`,
      value.color ?? "var(--color-brand-primary)",
    ]),
  );

  return (
    <div
      data-chart="riverguard"
      style={variables as CSSProperties}
      className={cx(
        "h-full w-full min-w-0 [&_.recharts-cartesian-axis-tick_text]:fill-muted [&_.recharts-cartesian-grid_line]:stroke-chart-grid [&_.recharts-curve.recharts-tooltip-cursor]:stroke-line [&_.recharts-dot]:stroke-chart-surface",
        className,
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function ChartTooltip({ content }: { content: ReactElement }) {
  return (
    <RechartsTooltip content={content} cursor={{ strokeDasharray: "3 3" }} />
  );
}

export function ChartTooltipContent({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string | number;
  payload?: readonly TooltipPayloadEntry[];
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-control border border-line bg-canvas px-2.5 py-2 text-[11px] shadow-lg">
      <p className="font-semibold text-ink">{label}</p>
      <div className="mt-1 grid gap-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
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
                : entry.value}
            </span>
          </div>
        ))}
      </div>
      {typeof payload[0]?.payload?.rainSource === "string" ? (
        <p className="mt-1 border-t border-line pt-1 text-[10px] text-muted">
          Source: {payload[0].payload.rainSource}
        </p>
      ) : null}
    </div>
  );
}
