"use client";

import {
  ArrowClockwise,
  CalendarDots,
  CheckCircle,
  CloudRain,
  Database,
  Drop,
  MapPin,
  Play,
  ShieldWarning,
  Thermometer,
  WarningCircle,
  Waves,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useMemo, useState } from "react";

import { RainfallChart } from "@/components/charts/RainfallChart";
import { ModelContributionPanel } from "@/components/dashboard/ModelContributionPanel";
import {
  convexConfigured,
  OutlookBridge,
} from "@/components/dashboard/OutlookBridge";
import { RiverMap } from "@/components/map/RiverMap";
import {
  DEFAULT_LOCATION,
  LOCATION_CODES,
  LOCATIONS,
  type LocationCode,
} from "@/lib/locations";
import { describeStorageShort } from "@/lib/persistence";
import { useModelArtifacts } from "@/lib/use-model-artifacts";
import { useOutlookFeed } from "@/lib/outlook";
import type { MapLayerId, OutlookDay } from "@/types";
import {
  Metric,
  WorkspaceChartSection,
  WorkspaceHero,
} from "@/components/prototype/Primitives";

import { ResearcherForecastChart } from "./ResearcherForecastChart";

function formatTimestamp(value?: number) {
  if (!value) return "No completed run";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(value);
}

function riskTone(label?: OutlookDay["label"]) {
  if (label === "Elevated") return "bg-[#9d3127] text-white";
  if (label === "Moderate") return "bg-[#f0d78f] text-[#62450a]";
  if (label === "Lower") return "bg-[#dbe9df] text-[#265c42]";
  return "bg-white/65 text-[#53697d]";
}

function InputRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#d7e2e9] py-2.5 last:border-0">
      <dt className="text-sm text-[#53697d]">{label}</dt>
      <dd className="text-sm font-semibold text-[#092847] tabular-nums">
        {value}
      </dd>
    </div>
  );
}

export function ResearcherWorkspaceDashboard() {
  const [locationCode, setLocationCode] =
    useState<LocationCode>(DEFAULT_LOCATION);
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeLayer, setActiveLayer] = useState<MapLayerId>("base");
  const outlook = useOutlookFeed(locationCode);
  const artifacts = useModelArtifacts();
  const location = LOCATIONS[locationCode];
  const days = useMemo(
    () => outlook.snapshot?.days ?? [],
    [outlook.snapshot?.days],
  );
  const activeDay = days[Math.min(selectedDay, Math.max(days.length - 1, 0))];
  const peakDay = useMemo(
    () =>
      days.reduce<OutlookDay | null>(
        (peak, day) =>
          !peak || (day.probability ?? 0) > (peak.probability ?? 0)
            ? day
            : peak,
        null,
      ),
    [days],
  );
  const totalRain = days.reduce(
    (total, day) => total + (day.rainfallMm ?? 0),
    0,
  );
  const maxWaterLevel = days.reduce(
    (maximum, day) => Math.max(maximum, day.waterLevelM ?? 0),
    0,
  );
  const threshold =
    outlook.snapshot?.operatingThreshold ??
    artifacts.model?.operatingThreshold ??
    0.5;
  const inputs = outlook.snapshot?.modelInputs;

  function runForecast() {
    setSelectedDay(0);
    void outlook.run();
  }

  return (
    <div className="w-full text-[#092847]">
      {convexConfigured ? (
        <OutlookBridge locationCode={locationCode} onSnapshot={outlook.adopt} />
      ) : null}

      <WorkspaceHero
        eyebrow="RiverGuard research"
        title="Flood forecast workspace"
        description="Run the city-level model, inspect its seven-day evidence, and trace each result to its weather source and model version."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="grid gap-1 text-xs font-semibold text-[#53697d]">
              Location
              <span className="relative">
                <MapPin
                  size={17}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#147384]"
                />
                <select
                  id="researcher-location"
                  name="location"
                  value={locationCode}
                  onChange={(event) => {
                    setLocationCode(event.target.value as LocationCode);
                    setSelectedDay(0);
                  }}
                  className="min-h-11 w-full min-w-52 appearance-none rounded-xl border border-[#d7e2e9] bg-white pr-9 pl-10 text-sm font-medium text-[#092847] shadow-sm outline-none focus:border-[#168191] sm:w-auto"
                >
                  {LOCATION_CODES.map((code) => (
                    <option key={code} value={code}>
                      {LOCATIONS[code].name}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <button
              type="button"
              onClick={runForecast}
              disabled={outlook.isRunning}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0b4564] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(7,42,76,0.20)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#147384] active:translate-y-0 disabled:cursor-wait disabled:opacity-60"
            >
              {outlook.isRunning ? (
                <ArrowClockwise size={18} className="animate-spin" />
              ) : (
                <Play size={17} weight="fill" />
              )}
              {outlook.isRunning ? "Running forecast" : "Run forecast"}
            </button>
          </div>
        }
      >
        {outlook.error ? (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-2xl border border-[#e7c9bd] bg-[#fff8f4] p-4 text-sm text-[#733d2d]"
          >
            <WarningCircle size={21} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">The forecast did not complete</p>
              <p className="mt-1">{outlook.error}</p>
              {outlook.errorDetail ? (
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold">
                    Technical detail
                  </summary>
                  <p className="mt-1">{outlook.errorDetail}</p>
                </details>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="relative">
          <div className="grid min-h-[430px] md:grid-cols-12">
            <div className="relative z-10 flex flex-col justify-between p-6 sm:p-8 md:col-span-5 md:p-7 xl:col-span-3 xl:p-9">
              <div>
                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${riskTone(activeDay?.label)}`}
                >
                  {activeDay ? `${activeDay.label} risk` : "Awaiting forecast"}
                </span>
                <h2 className="mt-5 text-4xl leading-[0.98] font-semibold tracking-[-0.06em] text-[#092847] sm:text-5xl xl:text-[3.35rem]">
                  {location.river}
                </h2>
                <p className="mt-4 max-w-sm text-sm leading-6 text-[#53697d]">
                  City-level experimental evidence for {location.name}. Model
                  output supports research review and is not an official flood
                  warning.
                </p>
              </div>

              <div className="mt-8 grid gap-2 text-xs text-[#53697d]">
                <p className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${
                      outlook.snapshot?.degraded
                        ? "bg-[#c3892f]"
                        : outlook.snapshot
                          ? "bg-[#5b9a55]"
                          : "bg-[#91a5b3]"
                    }`}
                  />
                  {outlook.snapshot?.degraded
                    ? "Weather source degraded"
                    : outlook.snapshot
                      ? "Forecast pipeline completed"
                      : "Ready to run the forecast pipeline"}
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDots size={16} />
                  {formatTimestamp(outlook.snapshot?.updatedAt)}
                </p>
              </div>
            </div>

            <div className="relative flex min-h-[300px] items-center justify-center px-4 md:col-span-7 md:min-h-[430px] xl:col-span-6">
              <Image
                src="/images/researcher-watershed-cutout.png"
                alt="Isometric conceptual urban river watershed"
                width={1680}
                height={945}
                priority
                className="h-full max-h-[430px] w-full object-contain drop-shadow-[0_24px_30px_rgba(7,42,76,0.16)] transition duration-500 hover:scale-[1.015] motion-reduce:transition-none"
              />
            </div>

            <aside className="m-4 rounded-[1.45rem] bg-[rgba(255,255,255,0.74)] p-5 shadow-[0_16px_45px_rgba(7,42,76,0.09)] backdrop-blur-sm sm:m-6 sm:p-6 md:col-span-12 xl:col-span-3 xl:ml-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#53697d]">
                    Selected forecast day
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#092847]">
                    {activeDay
                      ? `${activeDay.day}, ${activeDay.isoDate}`
                      : "No result yet"}
                  </p>
                </div>
                <Waves size={24} className="text-[#147384]" />
              </div>

              {activeDay ? (
                <>
                  <div className="mt-7 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#657d90]">Probability</p>
                      <p className="mt-1 text-4xl font-semibold tracking-[-0.055em] tabular-nums">
                        {((activeDay.probability ?? 0) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="border-l border-[#d7e2e9] pl-4">
                      <p className="text-xs text-[#657d90]">Predicted level</p>
                      <p className="mt-1 text-4xl font-semibold tracking-[-0.055em] tabular-nums">
                        {(activeDay.waterLevelM ?? 0).toFixed(2)}
                        <span className="ml-1 text-base">m</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 rounded-2xl bg-white/70 p-4">
                    <div className="flex items-center justify-between text-xs font-medium text-[#53697d]">
                      <span>Operating threshold</span>
                      <span>{(threshold * 100).toFixed(1)}%</span>
                    </div>
                    <div className="relative mt-2 h-2 rounded-full bg-[#d7e2e9]">
                      <div
                        className="h-full rounded-full bg-[#0b4564]"
                        style={{
                          width: `${Math.min(100, Math.max(2, (activeDay.probability ?? 0) * 100))}%`,
                        }}
                      />
                      <span
                        className="absolute top-[-3px] h-3.5 w-0.5 bg-[#bd4b3d]"
                        style={{ left: `${threshold * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className="mt-5 text-xs leading-5 text-[#53697d]">
                    {(activeDay.rainfallMm ?? 0).toFixed(1)} mm forecast rain ·
                    water level is a model-predicted proxy, not a direct gauge
                    observation.
                  </p>
                </>
              ) : (
                <div className="mt-8 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbdce5] bg-white/45 px-5 text-center">
                  <CloudRain size={30} className="text-[#657d90]" />
                  <p className="mt-3 text-sm font-semibold">No forecast yet</p>
                  <p className="mt-1 text-xs leading-5 text-[#657d90]">
                    Run the pipeline to fetch weather, score seven days, and
                    store the result.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </WorkspaceHero>

      <div className="relative w-full px-4 pt-4 pb-8 sm:px-6 sm:pt-5 lg:px-8 lg:pt-6">
        <section
          aria-label="Forecast indicators"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Metric
            icon={<ShieldWarning size={20} />}
            label="Peak probability"
            value={
              peakDay
                ? `${((peakDay.probability ?? 0) * 100).toFixed(1)}%`
                : "—"
            }
            detail={
              peakDay ? `${peakDay.isoDate} · ${peakDay.label}` : "No run"
            }
          />
          <Metric
            icon={<Waves size={20} />}
            label="Highest predicted level"
            value={days.length ? `${maxWaterLevel.toFixed(2)} m` : "—"}
            detail="Model-predicted proxy"
          />
          <Metric
            icon={<CloudRain size={20} />}
            label="Seven-day rainfall"
            value={days.length ? `${totalRain.toFixed(1)} mm` : "—"}
            detail={outlook.snapshot?.provider ?? "Weather source pending"}
          />
          <Metric
            icon={<Database size={20} />}
            label="Model and storage"
            value={
              outlook.snapshot?.modelVersion ?? artifacts.model?.version ?? "—"
            }
            detail={
              outlook.snapshot?.persistence
                ? (describeStorageShort(outlook.snapshot.persistence) ??
                  "Storage status unavailable")
                : "No completed run"
            }
          />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-12">
          <article className="flex min-h-0 flex-col overflow-hidden rounded-[1.6rem] bg-white shadow-[0_12px_38px_rgba(7,42,76,0.06)] ring-1 ring-[#d7e2e9] lg:col-span-8">
            <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.035em]">
                  Geographic context
                </h2>
                <p className="mt-1 text-sm text-[#53697d]">
                  Real basemap with verified local layers when available.
                </p>
              </div>
              <MapPin size={21} className="text-[#147384]" />
            </div>
            <div className="mt-4 min-h-[610px] flex-1">
              <RiverMap
                activeLayer={activeLayer}
                onLayerChange={setActiveLayer}
                cooperativeGestures
                className="!h-full min-h-[610px] rounded-none border-0"
              />
            </div>
          </article>

          <WorkspaceChartSection
            className="mt-0 lg:col-span-4"
            title="Seven-day model outlook"
            description="Rainfall bars and flood probability against the operating threshold."
            gridClassName="lg:grid-cols-1"
            meta={
              <div className="grid w-full grid-cols-3 gap-2 text-xs text-[#53697d] sm:w-auto">
                <span>Blue · rainfall</span>
                <span>Teal · probability</span>
                <span>Red · threshold</span>
              </div>
            }
          >
            <div>
              <ResearcherForecastChart
                days={days}
                selectedIndex={selectedDay}
                threshold={threshold}
                onSelect={setSelectedDay}
              />
            </div>
          </WorkspaceChartSection>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-12">
          <article className="rounded-[1.6rem] bg-white p-5 shadow-[0_12px_38px_rgba(7,42,76,0.06)] ring-1 ring-[#d7e2e9] sm:p-6 xl:col-span-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.035em]">
                  Model inputs used
                </h2>
                <p className="mt-1 text-sm text-[#53697d]">
                  Weather values retained from the latest live run.
                </p>
              </div>
              <Database size={21} className="text-[#147384]" />
            </div>
            {inputs ? (
              <dl className="mt-4">
                <InputRow
                  label="Rain today"
                  value={`${inputs.rainfallTodayMm.toFixed(1)} mm`}
                />
                <InputRow
                  label="Forecast rain tomorrow"
                  value={
                    inputs.nextDayRainfallMm === null
                      ? "Unavailable"
                      : `${inputs.nextDayRainfallMm.toFixed(1)} mm`
                  }
                />
                <InputRow
                  label="Antecedent rain · 3 days"
                  value={`${inputs.antecedentRain3dMm.toFixed(1)} mm`}
                />
                <InputRow
                  label="Antecedent rain · 7 days"
                  value={`${inputs.antecedentRain7dMm.toFixed(1)} mm`}
                />
                <InputRow
                  label="Antecedent rain · 30 days"
                  value={`${inputs.antecedentRain30dMm.toFixed(1)} mm`}
                />
                <InputRow
                  label="Soil moisture"
                  value={`${inputs.soilMoisturePercent.toFixed(1)}%`}
                />
                <InputRow
                  label="Tomorrow temperature"
                  value={
                    inputs.nextDayTminC === null || inputs.nextDayTmaxC === null
                      ? "Unavailable"
                      : `${inputs.nextDayTminC.toFixed(1)}–${inputs.nextDayTmaxC.toFixed(1)} °C`
                  }
                />
              </dl>
            ) : (
              <p className="mt-5 rounded-2xl bg-[#f3f7fa] p-4 text-sm leading-6 text-[#53697d]">
                Exact input values are available after a new live run. Older
                stored runs do not include the original input snapshot.
              </p>
            )}
          </article>

          <div className="xl:col-span-4 [&>section]:h-full [&>section]:rounded-[1.6rem] [&>section]:border-[#d7e2e9] [&>section]:bg-white [&>section]:shadow-[0_12px_38px_rgba(7,42,76,0.06)]">
            <ModelContributionPanel locationCode={locationCode} />
          </div>

          <article className="rounded-[1.6rem] bg-[#0b4564] p-5 text-white shadow-[0_12px_38px_rgba(7,42,76,0.12)] sm:p-6 xl:col-span-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.035em]">
                  Evidence status
                </h2>
                <p className="mt-1 text-sm text-white/65">
                  Source, model, storage, and known limits.
                </p>
              </div>
              <CheckCircle size={23} className="text-[#168191]" />
            </div>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="text-white/55">Weather provider</dt>
                <dd className="mt-1 font-semibold">
                  {outlook.snapshot?.provider ?? "No completed run"}
                </dd>
              </div>
              <div>
                <dt className="text-white/55">Model version</dt>
                <dd className="mt-1 font-semibold">
                  {outlook.snapshot?.modelVersion ??
                    artifacts.model?.version ??
                    "Unavailable"}
                </dd>
              </div>
              <div>
                <dt className="text-white/55">Forecast storage</dt>
                <dd className="mt-1 font-semibold">
                  {outlook.snapshot?.persistence
                    ? (describeStorageShort(outlook.snapshot.persistence) ??
                      "Storage status unavailable")
                    : "No run to store"}
                </dd>
              </div>
            </dl>
            <div className="mt-6 rounded-2xl bg-white/8 p-4 text-xs leading-5 text-white/70">
              <p className="flex gap-2">
                <WarningCircle
                  size={17}
                  className="mt-0.5 shrink-0 text-[#9dd6df]"
                />
                The forecast is experimental and city-level. It does not show
                street-level flood extent, direct gauge measurements, or an
                official warning.
              </p>
              {outlook.snapshot?.modelWarning ? (
                <p className="mt-3 border-t border-white/10 pt-3">
                  {outlook.snapshot.modelWarning}
                </p>
              ) : null}
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8 [&>section]:rounded-[1.6rem] [&>section]:border-[#d7e2e9] [&>section]:bg-white [&>section]:shadow-[0_12px_38px_rgba(7,42,76,0.06)]">
            <RainfallChart location={location.name} compact />
          </div>
          <article className="rounded-[1.6rem] bg-white p-5 shadow-[0_12px_38px_rgba(7,42,76,0.06)] ring-1 ring-[#d7e2e9] sm:p-6 xl:col-span-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.035em]">
                  Research notes
                </h2>
                <p className="mt-1 text-sm text-[#53697d]">
                  How to read this workspace.
                </p>
              </div>
              <Thermometer size={21} className="text-[#147384]" />
            </div>
            <ul className="mt-5 grid gap-4 text-sm leading-6 text-[#53697d]">
              <li className="flex gap-3">
                <Drop size={18} className="mt-1 shrink-0 text-[#168191]" />
                Rainfall bars come from the selected provider and are measured
                in millimetres.
              </li>
              <li className="flex gap-3">
                <Waves size={18} className="mt-1 shrink-0 text-[#147384]" />
                Water level is predicted by the model and must not be presented
                as a gauge observation.
              </li>
              <li className="flex gap-3">
                <ShieldWarning
                  size={18}
                  className="mt-1 shrink-0 text-[#9b6c25]"
                />
                Alarm levels outside Marikina remain indicative unless their
                source is verified.
              </li>
              <li className="flex gap-3">
                <Database size={18} className="mt-1 shrink-0 text-[#147384]" />
                The watershed image is conceptual; the map and charts carry the
                factual spatial and analytical evidence.
              </li>
            </ul>
          </article>
        </section>
      </div>
    </div>
  );
}
