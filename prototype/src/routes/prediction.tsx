import { Link, createFileRoute } from "@tanstack/react-router";
import { buttonClass } from "@/components/button";
import { IndexMeter } from "@/components/meter";
import { PageIntro } from "@/components/page-intro";
import { Panel } from "@/components/panel";
import { RiskBadge } from "@/components/risk-badge";
import {
  HORIZON_BLEND,
  PARTS,
  callNarrative,
  confidenceOf,
  dayParts,
  leadingKey,
  levelOf,
  roundIndex,
  verdictTitle,
} from "@/lib/flood-model";
import { useOutlook } from "@/lib/use-outlook";

export const Route = createFileRoute("/prediction")({
  head: () => ({ meta: [{ title: "Prediction · Baha" }] }),
  component: PredictionPage,
});

const WHEN = ["Today", "Tomorrow", "The day after"];

function PredictionPage() {
  const { days, outlook, score, level, thresholds, config, ranked } = useOutlook();
  const confidence = confidenceOf(score, thresholds);
  const hot = ranked.filter((item) => item.score >= thresholds.watch).slice(0, 3);
  const narrative = callNarrative(
    level,
    outlook.points,
    hot.map((item) => item.town.name),
  );
  const lead = leadingKey(outlook.points);
  const maxPoint = Math.max(...PARTS.map((part) => outlook.points[part.key]), 1);

  return (
    <div className="grid gap-6">
      <PageIntro
        kicker="Model output"
        title={verdictTitle(level)}
        lede="Scored from the first three forecast days. Today is half the call, tomorrow is 30 percent, and the day after is 20."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted">72-hour index</p>
              <p className="mt-2 font-display text-6xl tabular-nums leading-none">{score}</p>
            </div>
            <div className="pb-1 text-right">
              <RiskBadge level={level} />
              <p className="mt-2 text-sm text-muted">{confidence.label} confidence</p>
            </div>
          </div>
          <div className="mt-6">
            <IndexMeter score={score} level={level} thresholds={thresholds} />
          </div>
          <p className="mt-6 text-base">{narrative}</p>
          <p className="mt-3 text-sm text-muted">{confidence.note}</p>
        </Panel>

        <Panel className="lg:col-span-2">
          <h2 className="font-display text-2xl tracking-tight">What is driving it</h2>
          <ul className="mt-4 grid gap-4">
            {PARTS.map((part) => {
              const points = outlook.points[part.key];
              const width = Math.max(0, Math.min(100, (points / maxPoint) * 100));
              const leader = part.key === lead;
              return (
                <li key={part.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className={leader ? "font-medium text-ink" : "text-muted"}>{part.label}</span>
                    <span className="tabular-nums">{points.toFixed(1)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                    <div
                      className={leader ? "h-full rounded-full bg-clay" : "h-full rounded-full bg-water"}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Points add up to the index. The clay bar is the piece leading this call.
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {days.slice(0, 3).map((day, index) => {
          const part = dayParts(day, config);
          const dayScore = roundIndex(part.score);
          const dayLevel = levelOf(dayScore, thresholds);
          return (
            <Panel key={day.id}>
              <p className="text-xs font-medium uppercase tracking-widest text-muted">
                {WHEN[index]} · {Math.round(HORIZON_BLEND[index] * 100)}%
              </p>
              <h2 className="mt-2 font-display text-3xl tracking-tight">
                {day.weekday} {day.dateLabel}
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <p className="font-display text-4xl tabular-nums">{dayScore}</p>
                <RiskBadge level={dayLevel} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <Fact label="Rain" value={`${day.rainfallMm} mm`} />
                <Fact label="Peak" value={`${day.peakMmHr} mm/h`} />
                <Fact label="River" value={`+${day.riverStageM.toFixed(1)} m`} />
                <Fact label="Soil" value={`${day.soilPct}%`} />
                <Fact label="Lake" value={`+${day.lakeRiseM.toFixed(2)} m`} />
              </dl>
            </Panel>
          );
        })}
      </div>

      <Panel>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl tracking-tight">Towns on this call</h2>
          <Link to="/towns" className="text-sm font-medium text-water">
            Open the town list
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {ranked.slice(0, 6).map((item) => (
            <li key={item.town.slug} className="flex items-center gap-3 py-3">
              <span className="w-10 font-display text-2xl tabular-nums">{item.score}</span>
              <span className="min-w-0 flex-1">
                <Link to="/town/$slug" params={{ slug: item.town.slug }} className="font-medium">
                  {item.town.name}
                </Link>
                <span className="mt-0.5 block text-sm text-muted">{item.town.note}</span>
              </span>
              <RiskBadge level={item.level} />
            </li>
          ))}
        </ul>
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Link to="/forecast" className={buttonClass()}>
          Change the forecast
        </Link>
        <Link to="/model" className={buttonClass("ghost")}>
          Change the weights
        </Link>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </>
  );
}
