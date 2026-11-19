import { Link, createFileRoute } from "@tanstack/react-router";
import { buttonClass } from "@/components/button";
import { PageIntro } from "@/components/page-intro";
import { Panel } from "@/components/panel";
import { RiskBadge } from "@/components/risk-badge";
import { PRESETS } from "@/data/laguna";
import { cn } from "@/lib/cn";
import { dayParts, HORIZON_BLEND, levelOf, PARTS, roundIndex, verdictTitle } from "@/lib/flood-model";
import { useOutlook } from "@/lib/use-outlook";

export const Route = createFileRoute("/forecast")({
  head: () => ({ meta: [{ title: "Forecast · Baha" }] }),
  component: ForecastPage,
});

const FIELDS: {
  key: "rainfallMm" | "peakMmHr" | "riverStageM" | "soilPct" | "lakeRiseM";
  label: string;
  step: string;
}[] = [
  { key: "rainfallMm", label: "Rain mm", step: "1" },
  { key: "peakMmHr", label: "Peak mm/h", step: "1" },
  { key: "riverStageM", label: "River m", step: "0.1" },
  { key: "soilPct", label: "Soil %", step: "1" },
  { key: "lakeRiseM", label: "Lake m", step: "0.05" },
];

function ForecastPage() {
  const { days, presetId, config, score, level, applyPreset, setDay } = useOutlook();

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <PageIntro
          kicker="Model input"
          title="The forecast"
          lede="These five numbers are the only thing the model reads. Change a day and the flood call on every other page moves with it."
        />
        <div className="rounded-2xl bg-card px-5 py-4 shadow-card lg:shrink-0">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">72-hour call</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="font-display text-4xl tabular-nums leading-none">{score}</p>
            <RiskBadge level={level} />
          </div>
          <p className="mt-2 text-sm text-muted">{verdictTitle(level)}</p>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const active = preset.id === presetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={cn(
                  "h-11 rounded-full px-4 text-sm font-medium transition-colors",
                  active ? "bg-ink text-card" : "bg-card text-ink shadow-card hover:shadow-card-hover",
                )}
                aria-pressed={active}
              >
                {preset.name}
              </button>
            );
          })}
          {presetId === "custom" ? (
            <span className="inline-flex h-11 items-center text-sm text-muted">Edited by hand</span>
          ) : null}
        </div>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          {PRESETS.find((preset) => preset.id === presetId)?.blurb ??
            "You changed a number. Pick a sample scenario any time to put the weather back."}
        </p>
      </div>

      <ul className="grid gap-4">
        {days.map((day, index) => {
          const dayScore = roundIndex(dayParts(day, config).score);
          const dayLevel = levelOf(dayScore, config.thresholds);
          const blend = HORIZON_BLEND[index];
          return (
            <li key={day.id}>
              <Panel>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 className="font-display text-3xl tracking-tight">
                      {day.weekday} <span className="text-muted">{day.dateLabel}</span>
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {blend != null
                        ? `Counts as ${Math.round(blend * 100)}% of the 72-hour call`
                        : "Outside the 72-hour call. Kept so the week still reads as a forecast."}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-display text-3xl tabular-nums">{dayScore}</p>
                    <RiskBadge level={dayLevel} />
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {FIELDS.map((field) => (
                    <label key={field.key} className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                        {field.label}
                      </span>
                      <input
                        className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-ink tabular-nums outline-none focus:border-water"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={field.step}
                        value={day[field.key]}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          setDay(day.id, { [field.key]: Number.isFinite(next) ? next : 0 });
                        }}
                        onFocus={(event) => event.currentTarget.select()}
                      />
                    </label>
                  ))}
                </div>
              </Panel>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {PARTS.map((part) => (
          <p key={part.key} className="text-sm text-muted">
            <span className="font-medium text-ink">{part.label}. </span>
            {part.blurb}
          </p>
        ))}
      </div>
      <p className="text-sm text-muted">
        Scenarios replace the weather only. Weights and scales stay put until you change them on the model page.
      </p>
      <div>
        <Link to="/model" className={buttonClass("ghost")}>
          Adjust the model
        </Link>
      </div>
    </div>
  );
}
