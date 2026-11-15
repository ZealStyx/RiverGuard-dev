import { StatusLabel } from "@/components/ui";
import { outlookDays } from "@/data/dashboard";

export interface RiskSummaryProps {
  selectedDay: number;
  onDayChange: (index: number) => void;
}

export function RiskSummary({ selectedDay, onDayChange }: RiskSummaryProps) {
  const activeDay = outlookDays[selectedDay];

  return (
    <section
      aria-labelledby="risk-summary-title"
      className="rounded-panel border border-line bg-chart-surface p-4 text-ink"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="risk-summary-title" className="text-major-status">
            Marikina
          </h2>
          <p className="text-body mt-0.5 text-muted">
            {activeDay.day}, November {activeDay.date}, 2026
          </p>
        </div>
        <StatusLabel className="border-line bg-canvas text-muted">
          Experimental
        </StatusLabel>
      </div>
      <p className="text-major-status mt-2 text-warning">
        {activeDay.label} experimental index
      </p>
      <p className="text-body mt-1 text-muted">
        Experimental · City-level · Not an official warning
      </p>

      <div
        className="mt-3 grid grid-cols-7 gap-1"
        aria-label="Seven-day outlook"
      >
        {outlookDays.map((day, index) => {
          const active = selectedDay === index;
          return (
            <button
              key={`${day.day}-${day.date}`}
              type="button"
              aria-pressed={active}
              aria-label={`${day.day}, November ${day.date}: ${day.label}`}
              onClick={() => onDayChange(index)}
              className={`rounded-control border px-1 py-1.5 text-center transition-colors motion-reduce:transition-none ${
                active
                  ? "border-brand-secondary bg-brand-secondary text-white"
                  : "border-line bg-canvas text-ink hover:bg-brand-secondary-soft"
              }`}
            >
              <span className="text-metadata block">{day.day}</span>
              <span className="text-button mt-0.5 block">{day.date}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
