import { Link, createFileRoute } from "@tanstack/react-router";
import { buttonClass } from "@/components/button";
import { PageIntro } from "@/components/page-intro";
import { Panel } from "@/components/panel";
import { RiskBadge } from "@/components/risk-badge";
import {
  dayParts,
  levelOf,
  roundIndex,
  smsText,
  townIndex,
  verdictTitle,
} from "@/lib/flood-model";
import { useOutlook } from "@/lib/use-outlook";
import { TOWNS } from "@/data/laguna";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alerts · Baha" }] }),
  component: AlertsPage,
});

const WHEN = ["Today", "Tomorrow", "The day after"];

function AlertsPage() {
  const { days, score, level, thresholds, ranked, config } = useOutlook();
  const names = ranked.slice(0, 3).map((item) => item.town.name);
  const sms = smsText(level, score, names);
  const windows = days.slice(0, 3).map((day, index) => {
    const dayScore = roundIndex(dayParts(day, config).score);
    const dayLevel = levelOf(dayScore, thresholds);
    const towns = TOWNS.map((town) => ({
      name: town.name,
      score: roundIndex(townIndex(dayScore, town.susceptibility)),
    }))
      .filter((town) => town.score >= thresholds.watch)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
    return { day, dayScore, dayLevel, towns, index };
  });
  const triggered = windows.filter((window) => window.dayLevel !== "low");

  return (
    <div className="grid gap-6">
      <PageIntro
        kicker="If this call were live"
        title="Alerts"
        lede="A bulletin the desk would send from the current forecast. Nothing here is dispatched, and it is not a PAGASA warning."
      />

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted">SMS draft</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight">{verdictTitle(level)}</h2>
          </div>
          <RiskBadge level={level} />
        </div>
        <p className="mt-5 rounded-xl bg-paper px-4 py-4 text-base">{sms}</p>
        <p className={`mt-2 text-sm tabular-nums ${sms.length > 160 ? "text-clay" : "text-muted"}`}>
          {sms.length} / 160 characters
        </p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Channels, not connected">
          {["Barangay desk", "SMS", "Shore siren"].map((channel) => (
            <li
              key={channel}
              className="inline-flex h-11 items-center rounded-full bg-paper px-4 text-sm text-muted"
            >
              {channel}
              <span className="ml-2 text-xs">Not connected</span>
            </li>
          ))}
        </ul>
      </Panel>

      <div>
        <h2 className="font-display text-2xl tracking-tight">Windows inside 72 hours</h2>
        {triggered.length === 0 ? (
          <Panel className="mt-4">
            <p className="font-medium">No window is over Watch.</p>
            <p className="mt-2 max-w-xl text-sm text-muted">
              The draft above still exists, and it says the desk would stay quiet. Raise the rain or the lake on the forecast page to see a window open.
            </p>
          </Panel>
        ) : (
          <ul className="mt-4 grid gap-4">
            {triggered.map((window) => (
              <li key={window.day.id}>
                <Panel>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-muted">
                        {WHEN[window.index]} · {window.day.weekday} {window.day.dateLabel}
                      </p>
                      <h3 className="mt-2 font-display text-3xl tracking-tight">
                        {window.day.rainfallMm} mm, index {window.dayScore}
                      </h3>
                    </div>
                    <RiskBadge level={window.dayLevel} />
                  </div>
                  <p className="mt-4 text-sm text-muted">
                    {window.towns.length
                      ? `Towns at Watch or above: ${window.towns.map((town) => `${town.name} ${town.score}`).join(", ")}.`
                      : "The provincial day is elevated, but no town on the desk clears Watch."}
                  </p>
                </Panel>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/forecast" className={buttonClass()}>
          Edit the forecast
        </Link>
        <Link to="/prediction" className={buttonClass("ghost")}>
          Read the full call
        </Link>
      </div>
    </div>
  );
}
