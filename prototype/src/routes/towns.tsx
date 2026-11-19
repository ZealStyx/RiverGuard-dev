import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { PageIntro } from "@/components/page-intro";
import { RiskBadge } from "@/components/risk-badge";
import { GROUPS, type TownGroup } from "@/data/laguna";
import { cn } from "@/lib/cn";
import { useOutlook } from "@/lib/use-outlook";

export const Route = createFileRoute("/towns")({
  head: () => ({ meta: [{ title: "Towns · Baha" }] }),
  component: TownsPage,
});

type Mode = "risk" | TownGroup;

function TownsPage() {
  const { ranked, score, level } = useOutlook();
  const [mode, setMode] = useState<Mode>("risk");
  const shown =
    mode === "risk" ? ranked : ranked.filter((item) => item.town.group === mode);

  return (
    <div className="grid gap-6">
      <PageIntro
        kicker="Where it lands"
        title="Sixteen towns"
        lede="The same 72-hour weather hits every town. Low shore and river mouths run hotter than the provincial index. Inland San Pablo is here so the desk does not paint the whole province."
      />

      <div className="flex flex-wrap gap-2">
        <FilterButton active={mode === "risk"} onClick={() => setMode("risk")}>
          By risk
        </FilterButton>
        {GROUPS.map((group) => (
          <FilterButton key={group} active={mode === group} onClick={() => setMode(group)}>
            {group}
          </FilterButton>
        ))}
      </div>

      <p className="text-sm text-muted">
        Provincial index {score}, {level === "low" ? "low" : level}. A town score is that index times its exposure.
      </p>

      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        <ul className="divide-y divide-line">
          {shown.map((item) => (
            <li key={item.town.slug}>
              <Link
                to="/town/$slug"
                params={{ slug: item.town.slug }}
                className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-water-soft sm:px-5"
              >
                <span className="w-12 font-display text-3xl tabular-nums">{item.score}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{item.town.name}</span>
                    <span className="text-xs text-muted">{item.town.group}</span>
                  </span>
                  <span className="mt-1 block text-sm text-muted">{item.town.note}</span>
                </span>
                <RiskBadge level={item.level} />
                <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-full px-4 text-sm font-medium transition-colors",
        active ? "bg-ink text-card" : "bg-card text-ink shadow-card hover:shadow-card-hover",
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
