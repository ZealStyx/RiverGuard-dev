import { createFileRoute } from "@tanstack/react-router";
import { buttonClass } from "@/components/button";
import { IndexMeter } from "@/components/meter";
import { PageIntro } from "@/components/page-intro";
import { Panel } from "@/components/panel";
import { RiskBadge } from "@/components/risk-badge";
import { PARTS, SCALE_FIELDS, verdictTitle } from "@/lib/flood-model";
import { useOutlook } from "@/lib/use-outlook";

export const Route = createFileRoute("/model")({
  head: () => ({ meta: [{ title: "Model · Baha" }] }),
  component: ModelPage,
});

function ModelPage() {
  const {
    weights,
    scales,
    thresholds,
    score,
    level,
    setWeight,
    setScale,
    setThreshold,
    restoreDefaults,
  } = useOutlook();
  const weightSum =
    weights.rainfall + weights.peak + weights.river + weights.soil + weights.lake || 1;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <PageIntro
          kicker="Stand-in model"
          title="The scoring mix"
          lede="A transparent stand-in, not a trained network. Move the mix, the scales, or the thresholds. The desk, the prediction, the towns, and the alerts all use whatever you set here."
        />
        <div className="rounded-2xl bg-card px-5 py-4 shadow-card lg:shrink-0">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Live 72-hour index</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="font-display text-4xl tabular-nums leading-none">{score}</p>
            <RiskBadge level={level} />
          </div>
          <p className="mt-2 text-sm text-muted">{verdictTitle(level)}</p>
        </div>
      </div>

      <Panel>
        <h2 className="font-display text-2xl tracking-tight">How a day becomes an index</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          <Step
            n="1"
            title="Scale each input"
            body="Rain, peak rate, river stage, and lake rise are divided by the extreme you set. Soil is divided by 100. Each piece stops at 1."
          />
          <Step
            n="2"
            title="Weight and add"
            body="Each piece is multiplied by its weight. The weights are normalized, so only the mix matters, then scaled to 0–100."
          />
          <Step
            n="3"
            title="Blend 72 hours"
            body="Today is half, tomorrow is 30 percent, the next day is 20. A town multiplies that provincial index by its exposure."
          />
        </ol>
        <div className="mt-6">
          <IndexMeter score={score} level={level} thresholds={thresholds} />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-2xl tracking-tight">Weights</h2>
          <p className="mt-2 text-sm text-muted">
            Share of the mix after normalizing. Set a piece to zero to ignore it.
          </p>
          <ul className="mt-5 grid gap-5">
            {PARTS.map((part) => (
              <li key={part.key}>
                <WeightRow
                  label={part.label}
                  value={weights[part.key]}
                  share={weights[part.key] / weightSum}
                  onChange={(value) => setWeight(part.key, value)}
                />
              </li>
            ))}
          </ul>
        </Panel>

        <div className="grid gap-6">
          <Panel>
            <h2 className="font-display text-2xl tracking-tight">What counts as extreme</h2>
            <p className="mt-2 text-sm text-muted">
              Lower a scale and the same weather scores as more dangerous.
            </p>
            <ul className="mt-5 grid gap-4">
              {SCALE_FIELDS.map((field) => (
                <li key={field.key}>
                  <NumberRow
                    label={field.label}
                    hint={field.blurb}
                    unit={field.unit}
                    value={scales[field.key]}
                    step={field.key === "rainfallMm" || field.key === "peakMmHr" ? "1" : "0.1"}
                    onChange={(value) => setScale(field.key, value)}
                  />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <h2 className="font-display text-2xl tracking-tight">Thresholds</h2>
            <p className="mt-2 text-sm text-muted">
              The index has to clear these lines. They stay in order if you cross them.
            </p>
            <ul className="mt-5 grid gap-4">
              <ThresholdRow
                label="Watch"
                value={thresholds.watch}
                onChange={(value) => setThreshold("watch", value)}
              />
              <ThresholdRow
                label="Warning"
                value={thresholds.warning}
                onChange={(value) => setThreshold("warning", value)}
              />
              <ThresholdRow
                label="Critical"
                value={thresholds.critical}
                onChange={(value) => setThreshold("critical", value)}
              />
            </ul>
          </Panel>
        </div>
      </div>

      <div>
        <button type="button" onClick={restoreDefaults} className={buttonClass("ghost")}>
          Restore the sample desk
        </button>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li>
      <p className="font-display text-3xl text-water">{n}</p>
      <h3 className="mt-2 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </li>
  );
}

function WeightRow({
  label,
  value,
  share,
  onChange,
}: {
  label: string;
  value: number;
  share: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">{Math.round(share * 100)}% of the mix</span>
      </span>
      <input
        className="mt-2 h-11 w-full accent-water"
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
    </label>
  );
}

function NumberRow({
  label,
  hint,
  unit,
  value,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  unit: string;
  value: number;
  step: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 sm:grid-cols-[1fr_7rem] sm:items-center">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-sm text-muted">{hint}</span>
      </span>
      <span className="flex items-center gap-2">
        <input
          className="h-11 w-full rounded-xl border border-line bg-paper px-3 tabular-nums outline-none focus:border-water"
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(Number.isFinite(next) ? next : value);
          }}
        />
        <span className="w-10 shrink-0 text-sm text-muted">{unit}</span>
      </span>
    </label>
  );
}

function ThresholdRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <NumberRow label={label} hint="Index points, out of 100." unit="pts" value={value} step="1" onChange={onChange} />
  );
}
