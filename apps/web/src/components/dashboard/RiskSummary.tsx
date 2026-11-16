import { StatusLabel } from "@/components/ui";
import { outlookDays as staticOutlookDays } from "@/data/dashboard";
import type { OutlookDay } from "@/types";

export interface RiskSummaryProps {
  selectedDay: number;
  onDayChange: (index: number) => void;
  /** Real forecast days when a run has completed; falls back to the illustrative week. */
  days?: OutlookDay[];
  /** Where the days came from, so the label can say it out loud. */
  source?: "live" | "convex" | "static";
  /** Free-form provenance line, e.g. provider and model version. */
  note?: string;
}

export function RiskSummary({
  selectedDay,
  onDayChange,
  days,
  source = "static",
  note,
}: RiskSummaryProps) {
  const outlookDays = days && days.length > 0 ? days : staticOutlookDays;
  const activeDay = outlookDays[Math.min(selectedDay, outlookDays.length - 1)];
  const isLive = source !== "static";

  const monthYear = activeDay.isoDate
    ? new Date(`${activeDay.isoDate}T00:00:00+08:00`).toLocaleDateString(
        "en-PH",
        {
          month: "long",
          year: "numeric",
          timeZone: "Asia/Manila",
        },
      )
    : "November 2026";

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
            {activeDay.day}, {monthYear.split(" ")[0]} {activeDay.date},{" "}
            {monthYear.split(" ")[1]}
          </p>
        </div>
        <StatusLabel className="border-line bg-canvas text-muted">
          {isLive
            ? source === "convex"
              ? "Experimental · stored run"
              : "Experimental · just run"
            : "Experimental · illustrative"}
        </StatusLabel>
      </div>
      <p className="text-major-status mt-2 text-warning">
        {activeDay.label} experimental index
      </p>
      <p className="text-body mt-1 text-muted">
        Experimental · City-level · Not an official warning
        {activeDay.probability !== undefined
          ? ` · ${(activeDay.probability * 100).toFixed(0)}% flood probability`
          : ""}
        {activeDay.waterLevelM !== undefined
          ? ` · ${activeDay.waterLevelM.toFixed(2)} m predicted`
          : ""}
      </p>
      {note ? <p className="text-metadata mt-1 text-muted">{note}</p> : null}

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
              aria-label={`${day.day}, ${day.isoDate ?? `November ${day.date}`}: ${day.label}`}
              onClick={() => onDayChange(index)}
              className={`rounded-control border px-1 py-1.5 text-center transition-colors motion-reduce:transition-none ${
                active
                  ? "border-brand-secondary bg-brand-secondary text-white"
                  : "border-line bg-canvas text-ink hover:bg-brand-secondary-soft"
              }`}
            >
              <span className="text-metadata block">{day.day}</span>
              <span className="text-button mt-0.5 block">{day.date}</span>
              <span
                className={`text-metadata mt-1 block font-medium ${
                  active
                    ? "text-white"
                    : day.label === "Elevated"
                      ? "text-warning"
                      : day.label === "Moderate"
                        ? "text-brand-secondary"
                        : "text-muted"
                }`}
              >
                {day.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
