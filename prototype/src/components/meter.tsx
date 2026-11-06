import { cn } from "@/lib/cn";
import type { Level, Thresholds } from "@/lib/flood-model";

const FILL: Record<Level, string> = {
  low: "bg-water",
  watch: "bg-ink",
  warning: "bg-clay",
  critical: "bg-clay",
};

export function IndexMeter({
  score,
  level,
  thresholds,
}: {
  score: number;
  level: Level;
  thresholds: Thresholds;
}) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div>
      <div
        className="h-2 overflow-hidden rounded-full bg-line"
        role="img"
        aria-label={`Flood index ${Math.round(score)} out of 100`}
      >
        <div className={cn("h-full rounded-full", FILL[level])} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="tabular-nums">Watch {thresholds.watch}</span>
        <span className="tabular-nums">Warning {thresholds.warning}</span>
        <span className="tabular-nums">Critical {thresholds.critical}</span>
      </div>
    </div>
  );
}
