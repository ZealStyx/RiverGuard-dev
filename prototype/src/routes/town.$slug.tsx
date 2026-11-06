import { Link, createFileRoute } from "@tanstack/react-router";
import { buttonClass } from "@/components/button";
import { IndexMeter } from "@/components/meter";
import { Panel } from "@/components/panel";
import { RiskBadge } from "@/components/risk-badge";
import { townBySlug } from "@/data/laguna";
import { levelLabel, verdictTitle } from "@/lib/flood-model";
import { useOutlook } from "@/lib/use-outlook";

export const Route = createFileRoute("/town/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${townBySlug(params.slug)?.name ?? "Town"} · Baha` }],
  }),
  component: TownPage,
});

function TownPage() {
  const { slug } = Route.useParams();
  const town = townBySlug(slug);
  const { score, ranked, thresholds, level } = useOutlook();

  if (!town) {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-4xl tracking-tight">This town is not on the desk</h1>
        <p className="mt-3 text-muted">The sample desk covers sixteen Laguna towns.</p>
        <Link to="/towns" className={`${buttonClass()} mt-6`}>
          All towns
        </Link>
      </div>
    );
  }

  const row = ranked.find((item) => item.town.slug === town.slug);
  const townScore = row?.score ?? 0;
  const townLevel = row?.level ?? "low";
  const hotter = town.susceptibility >= 1;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <p className="text-xs font-medium uppercase tracking-widest text-water">{town.group}</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">{town.name}</h1>
        <p className="mt-3 text-muted">{town.water}</p>
        <div className="mt-6 flex flex-wrap items-end gap-4">
          <p className="font-display text-6xl tabular-nums leading-none">{townScore}</p>
          <div className="pb-1">
            <RiskBadge level={townLevel} />
            <p className="mt-1 text-sm text-muted">{verdictTitle(townLevel)}</p>
          </div>
        </div>
        <div className="mt-6 max-w-xl">
          <IndexMeter score={townScore} level={townLevel} thresholds={thresholds} />
        </div>
        <p className="mt-6 max-w-xl text-base">{town.detail}</p>
      </div>

      <Panel className="lg:col-span-2">
        <h2 className="font-display text-2xl tracking-tight">How this score is made</h2>
        <p className="mt-3 text-sm text-muted">
          Provincial index times exposure. The weather does not change from town to town on this desk.
        </p>
        <p className="mt-5 font-display text-3xl tabular-nums">
          {score} × {town.susceptibility.toFixed(2)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {hotter
            ? "This town runs hotter than the province."
            : "This town runs cooler than the province."}{" "}
          The province itself is {levelLabel(level).toLowerCase()}.
        </p>
        <dl className="mt-5 divide-y divide-line text-sm">
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-muted">Exposure</dt>
            <dd className="tabular-nums">{town.susceptibility.toFixed(2)}×</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-muted">Water</dt>
            <dd className="text-right">{town.water}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-muted">Shore group</dt>
            <dd>{town.group}</dd>
          </div>
        </dl>
        <Link to="/towns" className={`${buttonClass("ghost")} mt-6 w-full`}>
          All towns
        </Link>
      </Panel>
    </div>
  );
}
