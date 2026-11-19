import { cn } from "@/lib/cn";
import { levelLabel, type Level } from "@/lib/flood-model";

const STYLES: Record<Level, string> = {
  low: "bg-water-soft text-water",
  watch: "bg-card text-ink shadow-card",
  warning: "bg-clay-soft text-clay",
  critical: "bg-clay text-card",
};

export function RiskBadge({ level }: { level: Level }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-xs font-medium",
        STYLES[level],
      )}
    >
      {levelLabel(level)}
    </span>
  );
}
