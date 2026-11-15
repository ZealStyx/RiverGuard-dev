import { StatusLabel } from "@/components/ui";
import { modelContributions } from "@/data/dashboard";

const toneClasses = {
  strong: "bg-brand-primary",
  medium: "bg-brand-secondary",
  light: "bg-brand-secondary-muted",
};

export function ModelContributionPanel() {
  return (
    <section
      id="model-contribution"
      aria-labelledby="model-contribution-title"
      data-dashboard-section
      className="rounded-panel border border-line bg-chart-surface p-4 text-ink"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="model-contribution-title" className="text-section">
            Model contribution
          </h2>
          <p className="text-metadata mt-0.5 text-muted">
            Relative contribution to the experimental outlook
          </p>
        </div>
        <StatusLabel className="border-line bg-canvas text-muted">
          Contribution, not physical cause
        </StatusLabel>
      </div>

      <div className="mt-3 grid gap-2.5">
        {modelContributions.map((contribution) => (
          <div
            key={contribution.label}
            className="grid items-center gap-2 sm:grid-cols-[145px_minmax(0,1fr)]"
          >
            <p className="text-metadata text-muted">{contribution.label}</p>
            <div className="h-2.5 overflow-hidden rounded-sm bg-ink/10">
              <div
                className={`h-full ${toneClasses[contribution.tone]}`}
                style={{ width: `${contribution.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
