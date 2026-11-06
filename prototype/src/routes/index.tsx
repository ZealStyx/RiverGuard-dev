import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { buttonClass } from "@/components/button";
import { IndexMeter } from "@/components/meter";
import { Panel } from "@/components/panel";
import { RainChart } from "@/components/rain-chart";
import { RiskBadge } from "@/components/risk-badge";
import { ISSUE_LABEL, PRESETS } from "@/data/laguna";
import {
  callNarrative,
  confidenceOf,
  HORIZON_BLEND,
  levelLabel,
  levelOf,
  roundIndex,
  verdictTitle,
  type Level,
} from "@/lib/flood-model";
import { useOutlook } from "@/lib/use-outlook";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Desk · Baha" }] }),
  component: DeskPage,
});

function DeskPage() {
  const { days, presetId, thresholds, outlook, score, level, ranked } = useOutlook();
  const preset = PRESETS.find((item) => item.id === presetId);
  const confidence = confidenceOf(score, thresholds);
  const horizonDays = days.slice(0, 3);
  const rain72 = horizonDays.reduce((sum, day) => sum + day.rainfallMm, 0);
  const peak = Math.max(...horizonDays.map((day) => day.peakMmHr));
  const river = Math.max(...horizonDays.map((day) => day.riverStageM));
  const soil = Math.max(...horizonDays.map((day) => day.soilPct));
  const lake = Math.max(...horizonDays.map((day) => day.lakeRiseM));
  const hotNames = ranked
    .filter((item) => item.level === "warning" || item.level === "critical")
    .slice(0, 3)
    .map((item) => item.town.name);
  const narrative = callNarrative(level, outlook.points, hotNames);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="min-w-0 lg:col-span-3">
        <p className="text-xs font-medium uppercase tracking-widest text-water">
          {preset ? preset.name : "Custom forecast"}
        </p>
        <h1 className="mt-2 max-w-xl font-display text-4xl tracking-tight text-ink sm:text-5xl">
          {verdictTitle(level)}
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted">
          The next 72 hours, scored from rainfall, river stage, soil, and Laguna de Bay.
        </p>
        <div className="mt-6 flex flex-wrap items-end gap-4">
          <p className="font-display text-6xl tabular-nums leading-none">{score}</p>
          <div className="pb-1">
            <RiskBadge level={level} />
            <p className="mt-1 text-sm text-muted">72-hour index · {confidence.label} confidence</p>
          </div>
        </div>
        <div className="mt-6 max-w-xl">
          <IndexMeter score={score} level={level} thresholds={thresholds} />
        </div>
        <p className="mt-6 max-w-xl text-base">{narrative}</p>
      </div>

      <Panel className="lg:col-span-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted">This issue</p>
        <p className="mt-2 font-display text-2xl tracking-tight">{ISSUE_LABEL}</p>
        <p className="mt-2 text-sm text-muted">{confidence.note}</p>
        <dl className="mt-4 divide-y divide-line">
          <Stat label="Rain, next 72h" value={`${rain72} mm`} />
          <Stat label="Strongest hour" value={`${peak} mm/h`} />
          <Stat label="Highest river stage" value={`+${river.toFixed(1)} m`} />
          <Stat label="Wettest soil" value={`${soil}%`} />
          <Stat label="Highest lake rise" value={`+${lake.toFixed(2)} m`} />
        </dl>
        <Link to="/forecast" className={`${buttonClass()} mt-6 w-full`}>
          Edit the forecast
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </Panel>

      <Panel className="min-w-0 lg:col-span-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl tracking-tight">Seven-day rain</h2>
          <p className="text-sm text-muted">Millimeters</p>
        </div>
        <ol className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {days.map((day, index) => {
            const dayScore = roundIndex(outlook.daily[index] ?? 0);
            const dayLevel = levelOf(dayScore, thresholds);
            const inCall = index < HORIZON_BLEND.length;
            return (
              <li key={day.id} className="min-w-20 flex-1 rounded-xl bg-paper px-2 py-3 text-center">
                <p className="text-xs text-muted">{day.weekday}</p>
                <p className="mt-1 text-lg font-medium tabular-nums">{day.rainfallMm}</p>
                <p className="text-xs text-muted">mm</p>
                <p className={`mt-2 text-xs font-medium ${tone(dayLevel)}`}>{levelLabel(dayLevel)}</p>
                <p className="mt-1 text-xs text-muted">{inCall ? "72h" : "Later"}</p>
              </li>
            );
          })}
        </ol>
        <div className="mt-4">
          <RainChart rows={days.map((day) => ({ label: day.weekday, rain: day.rainfallMm }))} />
        </div>
      </Panel>

      <Panel className="lg:col-span-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl tracking-tight">Hottest towns</h2>
          <Link to="/towns" className="text-sm font-medium text-water">
            All towns
          </Link>
        </div>
        <ul className="mt-2 divide-y divide-line">
          {ranked.slice(0, 5).map((item) => (
            <li key={item.town.slug}>
              <Link
                to="/town/$slug"
                params={{ slug: item.town.slug }}
                className="flex items-center gap-3 py-3"
              >
                <span className="w-10 font-display text-2xl tabular-nums">{item.score}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.town.name}</span>
                  <span className="block text-sm text-muted">{item.town.group}</span>
                </span>
                <RiskBadge level={item.level} />
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function tone(level: Level) {
  if (level === "warning" || level === "critical") return "text-clay";
  if (level === "low") return "text-water";
  return "text-ink";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
