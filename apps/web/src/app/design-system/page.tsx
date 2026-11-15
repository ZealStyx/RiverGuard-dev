import {
  Button,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  Panel,
  SectionHeading,
  SelectField,
  StatusLabel,
  Toggle,
  Tooltip,
  UnavailableState,
} from "@/components/ui";
import { RainfallChart } from "@/components/charts/RainfallChart";

const colors = [
  {
    name: "Charcoal",
    role: "Main text · dark canvas",
    className: "bg-stage",
    value: "#353535",
  },
  {
    name: "River teal",
    role: "Selection · active state",
    className: "bg-brand-secondary",
    value: "#3C6E71",
  },
  {
    name: "White",
    role: "Primary surface",
    className: "bg-canvas",
    value: "#FFFFFF",
  },
  {
    name: "Mist",
    role: "Border · grid · disabled",
    className: "bg-line",
    value: "#D9D9D9",
  },
  {
    name: "Deep blue",
    role: "Primary action · data",
    className: "bg-brand-primary",
    value: "#284B63",
  },
];

export const metadata = {
  title: "Design foundation",
};

export default function DesignSystemPage() {
  return (
    <main className="river-palette-preview min-h-screen bg-stage px-6 py-8 text-ink lg:px-10 lg:py-10">
      <div className="mx-auto max-w-[1440px] rounded-structure bg-canvas p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] md:p-8 lg:p-10">
        <header className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-metadata uppercase tracking-[0.14em] text-brand-secondary">
              RiverGuard / Approved foundations
            </p>
            <h1 className="text-page-title mt-2">
              River intelligence palette proof
            </h1>
            <p className="text-body mt-2 max-w-2xl text-muted">
              The approved blue–teal scheme now defines navigation, controls,
              analytical surfaces, and honest system states across the
              RiverGuard dashboard.
            </p>
          </div>
          <StatusLabel tone="experimental">Applied palette</StatusLabel>
        </header>

        <div className="grid gap-10 py-10">
          <section aria-labelledby="color-heading">
            <SectionHeading
              id="color-heading"
              eyebrow="01"
              title="Brand color and surfaces"
              description="Deep blue and river teal carry the identity. Charcoal, white, and mist form the neutral system."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {colors.map((color) => (
                <div
                  key={color.name}
                  className="overflow-hidden rounded-panel border border-line"
                >
                  <div className={`h-24 ${color.className}`} />
                  <div className="bg-canvas-soft p-3">
                    <p className="text-button">{color.name}</p>
                    <p className="text-metadata mt-0.5 text-muted">
                      {color.value}
                    </p>
                    <p className="text-metadata mt-2 text-muted">
                      {color.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Divider />

          <section aria-labelledby="application-heading">
            <SectionHeading
              id="application-heading"
              eyebrow="02"
              title="Application shell"
              description="White carries the workspace; blue and teal appear only where interaction or hierarchy needs emphasis."
            />
            <Panel
              className="mt-5 overflow-hidden border border-line"
              padding="compact"
            >
              <nav
                aria-label="Palette navigation example"
                className="flex flex-wrap items-center gap-2 border-b border-line pb-4"
              >
                <span className="text-section mr-3 text-brand-primary">
                  RiverGuard
                </span>
                <a
                  href="#application-heading"
                  className="text-navigation rounded-full bg-brand-primary px-4 py-2 text-white"
                >
                  Dashboard
                </a>
                <a
                  href="#visualization-heading"
                  className="text-navigation rounded-full px-4 py-2 text-ink hover:bg-canvas-soft"
                >
                  History
                </a>
                <a
                  href="#states-heading"
                  className="text-navigation rounded-full px-4 py-2 text-ink hover:bg-canvas-soft"
                >
                  Data catalogue
                </a>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button size="small">Selected layer</Button>
                  <Button size="small" variant="secondary">
                    Run forecast
                  </Button>
                  <Button size="small" variant="quiet">
                    Refresh
                  </Button>
                </div>
              </nav>
              <div className="grid gap-4 pt-4 md:grid-cols-3">
                <div className="rounded-control border border-line bg-canvas p-4">
                  <p className="text-metadata text-muted">Workspace surface</p>
                  <p className="text-section mt-2">White stays dominant</p>
                </div>
                <div className="rounded-control bg-brand-secondary p-4">
                  <p className="text-metadata text-white/75">Selected state</p>
                  <p className="text-section mt-2 text-white">
                    River teal signals activity
                  </p>
                </div>
                <div className="rounded-control bg-brand-primary p-4 text-white">
                  <p className="text-metadata text-white/70">Primary action</p>
                  <p className="text-section mt-2">
                    Deep blue carries authority
                  </p>
                </div>
              </div>
            </Panel>
          </section>

          <Divider />

          <section aria-labelledby="typography-heading">
            <SectionHeading
              id="typography-heading"
              eyebrow="03"
              title="Typography"
              description="Geist uses a compact hierarchy with weight and tone doing more work than oversized type."
            />
            <Panel className="mt-5 grid gap-6" tone="canvas">
              <div>
                <p className="text-metadata text-muted">Page title · 28/34</p>
                <p className="text-page-title mt-1">Admin Research Workspace</p>
              </div>
              <div>
                <p className="text-metadata text-muted">Major status · 22/27</p>
                <p className="text-major-status mt-1">
                  Elevated experimental index
                </p>
              </div>
              <div>
                <p className="text-metadata text-muted">
                  Section · body · metadata
                </p>
                <p className="text-section mt-1">Historical context</p>
                <p className="text-body mt-1 max-w-xl text-muted">
                  Illustrative city-level sample data for interface development.
                  This is not an official warning or operational reading.
                </p>
              </div>
            </Panel>
          </section>

          <Divider />

          <section aria-labelledby="controls-heading">
            <SectionHeading
              id="controls-heading"
              eyebrow="04"
              title="Controls and status"
              description="Teal marks selection; deep blue carries primary actions; semantic warnings remain separate."
            />
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Panel>
                <h3 className="text-section">Buttons</h3>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button>Run forecast</Button>
                  <Button variant="secondary">Open evidence</Button>
                  <Button variant="quiet">Refresh</Button>
                  <Button loading loadingLabel="Running forecast">
                    Run forecast
                  </Button>
                  <Button disabled>Unavailable</Button>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <Tooltip content="Refresh available evidence">
                    <IconButton label="Refresh available evidence">
                      ↻
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Open dashboard settings">
                    <IconButton label="Open dashboard settings">⋯</IconButton>
                  </Tooltip>
                </div>
              </Panel>

              <Panel>
                <h3 className="text-section">Status labels</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusLabel tone="experimental">
                    Selected / active
                  </StatusLabel>
                  <StatusLabel tone="available">Available sample</StatusLabel>
                  <StatusLabel tone="warning">Elevated risk</StatusLabel>
                  <StatusLabel tone="unavailable">Unavailable</StatusLabel>
                  <StatusLabel tone="unsupported">Unsupported</StatusLabel>
                </div>
                <p className="text-metadata mt-4 text-muted">
                  Warning and danger colors remain functional. They are not
                  replaced by brand teal.
                </p>
              </Panel>

              <Panel>
                <SelectField
                  id="supported-city"
                  label="Supported city"
                  hint="Initial development coverage only."
                  defaultValue="marikina"
                >
                  <option value="quezon-city">Quezon City</option>
                  <option value="marikina">Marikina</option>
                  <option value="manila">Manila</option>
                  <option value="pasig">Pasig</option>
                </SelectField>
              </Panel>

              <Panel className="grid gap-5">
                <Toggle
                  label="Experimental outlook"
                  description="Illustrative dynamic research layer"
                  defaultPressed
                />
                <Divider />
                <Toggle
                  label="Static hazard susceptibility"
                  description="Context layer kept separate from predictions"
                />
                <Divider />
                <Toggle
                  label="Unavailable layer"
                  description="Disabled when no verified asset exists"
                  disabled
                />
              </Panel>
            </div>
          </section>

          <Divider />

          <section aria-labelledby="visualization-heading">
            <SectionHeading
              id="visualization-heading"
              eyebrow="05"
              title="Data visualization"
              description="Deep blue and teal distinguish ordinary data series while neutral gridlines keep the chart quiet and readable."
            />
            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
              <RainfallChart />
              <Panel className="border border-line" tone="outline">
                <p className="text-metadata uppercase tracking-[0.12em] text-muted">
                  Color guardrails
                </p>
                <h3 className="text-section mt-2">Meaning before decoration</h3>
                <div className="text-body mt-4 grid gap-3 text-muted">
                  <p>
                    <strong className="text-brand-primary">Deep blue</strong>{" "}
                    carries the primary data series and authoritative actions.
                  </p>
                  <p>
                    <strong className="text-brand-secondary">River teal</strong>{" "}
                    marks active layers, selected dates, and supporting data.
                  </p>
                  <p>
                    <strong className="text-warning">Amber or red</strong> is
                    reserved for elevated risk, stale evidence, and errors.
                  </p>
                </div>
              </Panel>
            </div>
          </section>

          <Divider />

          <section aria-labelledby="panels-heading">
            <SectionHeading
              id="panels-heading"
              eyebrow="06"
              title="Structural panels"
              description="Surface hierarchy separates navigation, status, and analysis without a generic card grid."
            />
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <Panel tone="canvas">
                <p className="text-metadata text-muted">Canvas panel</p>
                <h3 className="text-section mt-2">Spatial workspace</h3>
              </Panel>
              <Panel tone="selection">
                <p className="text-metadata text-white/65">Status panel</p>
                <h3 className="text-section mt-2">Selected city context</h3>
              </Panel>
              <Panel tone="primary">
                <p className="text-metadata text-white/55">Analysis panel</p>
                <h3 className="text-section mt-2">Historical evidence</h3>
              </Panel>
            </div>
          </section>

          <Divider />

          <section aria-labelledby="states-heading">
            <SectionHeading
              id="states-heading"
              eyebrow="07"
              title="Truth and failure states"
              description="Unavailable or unsupported information is explicit; missing evidence never defaults to low risk."
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <LoadingState />
              <EmptyState action={<Button size="small">Choose city</Button>} />
              <UnavailableState
                action={
                  <Button size="small" variant="quiet">
                    View limitations
                  </Button>
                }
              />
              <ErrorState
                action={
                  <Button size="small" variant="secondary">
                    Retry
                  </Button>
                }
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
