import { useEffect, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Row = { label: string; rain: number };

export function RainChart({ rows }: { rows: Row[] }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <div className="h-56 w-full min-w-0" aria-hidden={ready ? undefined : true}>
      {ready ? (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--color-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              width={36}
              tick={{ fill: "var(--color-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              unit=""
            />
            <Tooltip
              cursor={{ fill: "var(--color-water-soft)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const value = payload[0]?.value;
                return (
                  <div className="rounded-lg bg-ink px-3 py-2 text-sm text-card shadow-card">
                    <p>{label}</p>
                    <p className="tabular-nums">{value} mm</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="rain" name="Rain" fill="var(--color-water)" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </ComposedChart>
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
