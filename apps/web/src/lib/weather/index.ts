/**
 * Provider selection.
 *
 * `WEATHER_PROVIDER` picks the primary adapter (`open-meteo` by default).
 *
 * `WEATHER_ALLOW_FIXTURE` defaults to **off**: a provider failure raises, and the
 * API answers 502 rather than scoring the model on illustrative rainfall. The
 * fixture is the model's whole input when it is used, so the run is marked
 * `degraded` and labelled; set `WEATHER_ALLOW_FIXTURE` to exactly `true` to opt
 * into it for demos with no network.
 */

import { blendGaugeRainfall, readGaugeRainfall } from "../gauge";
import { fixtureProvider } from "./fixture";
import { buildObserved } from "./observed";
import { openMeteoProvider } from "./open-meteo";
import type {
  WeatherBundle,
  WeatherProvider,
  WeatherProviderName,
} from "./types";

export type {
  DailyWeatherPoint,
  WeatherBundle,
  ObservedWeather,
} from "./types";
export { WeatherProviderError } from "./types";

export interface WeatherOptions {
  provider?: WeatherProviderName;
  allowFixture?: boolean;
}

function configuredProvider(): WeatherProviderName {
  const raw = process.env.WEATHER_PROVIDER?.trim().toLowerCase();
  return raw === "fixture" ? "fixture" : "open-meteo";
}

function fixtureAllowed(): boolean {
  // Opt in explicitly. Any other value — unset, "", "1", "yes" — means off, so a
  // missing variable can never silently reinstate invented rainfall.
  return process.env.WEATHER_ALLOW_FIXTURE?.trim().toLowerCase() === "true";
}

/** What the environment selected, for the status screens to report. */
export interface ProviderConfig {
  provider: WeatherProviderName;
  allowFixture: boolean;
}

export function providerConfig(): ProviderConfig {
  return { provider: configuredProvider(), allowFixture: fixtureAllowed() };
}

export function resolveProvider(options?: WeatherOptions): WeatherProvider {
  const name = options?.provider ?? configuredProvider();
  return name === "fixture" ? fixtureProvider() : openMeteoProvider();
}

export async function getWeatherBundle(
  location: Parameters<WeatherProvider["fetchBundle"]>[0],
  options?: WeatherOptions,
): Promise<WeatherBundle> {
  const allowFixture = options?.allowFixture ?? fixtureAllowed();
  const primary = resolveProvider(options);

  let bundle: WeatherBundle;
  try {
    bundle = await primary.fetchBundle(location);
  } catch (error) {
    if (!allowFixture) {
      throw error;
    }
    const fallback = await fixtureProvider().fetchBundle(location);
    bundle = {
      ...fallback,
      degradationReason:
        `Live provider failed (${error instanceof Error ? error.message : "unknown error"}). ${
          fallback.degradationReason ?? ""
        }`.trim(),
    };
  }

  return await withGaugeObservations(bundle, location);
}

/**
 * Swap in real gauge rainfall where a local file covers it.
 *
 * Applied to whichever provider answered, so a gauge day wins over reanalysis
 * and over the offline fixture alike. The derivation is redone from the blended
 * window rather than patched onto the totals, so the antecedent sums and the
 * soil bucket stay consistent with the days above them.
 */
export async function withGaugeObservations(
  bundle: WeatherBundle,
  location: { code: string; name: string },
): Promise<WeatherBundle> {
  const gauge = await readGaugeRainfall(location);
  const blend = blendGaugeRainfall(bundle.history, gauge.readings);

  if (blend.gaugeDays === 0 && !gauge.error) {
    return {
      ...bundle,
      gauge: { days: 0, todayFromGauge: false, file: gauge.file },
    };
  }

  if (blend.gaugeDays === 0) {
    return {
      ...bundle,
      gauge: {
        days: 0,
        todayFromGauge: false,
        file: gauge.file,
        error: gauge.error ?? undefined,
      },
    };
  }

  const observed = buildObserved(blend.history, bundle.asOf, {
    soilMoisturePercent: reportedSoil(bundle),
    gaugeDays: blend.gaugeDays,
  });

  const notes = [
    ...bundle.notes,
    `Rain gauge: ${blend.gaugeDays} of ${blend.history.length} observed days replaced from ${gauge.file}${
      blend.todayFromGauge ? " (including today)" : ""
    }.`,
    "Observed soil moisture is derived after the gauge blend; it is not a soil measurement.",
  ];

  return {
    ...bundle,
    history: blend.history,
    observed,
    notes,
    gauge: {
      days: blend.gaugeDays,
      todayFromGauge: blend.todayFromGauge,
      file: gauge.file,
      error: gauge.error ?? undefined,
    },
  };
}

/**
 * The provider's own soil figure, when it reported one.
 *
 * The blend keeps the observed soil value only if the provider measured it; the
 * water-balance bucket is recomputed from the blended rain inside
 * `buildObserved`, so gauge rain and derived soil stay in step.
 */
function reportedSoil(bundle: WeatherBundle): number | null {
  return bundle.observed.soilMoistureSource === "open-meteo"
    ? bundle.observed.soilMoisturePercent
    : null;
}
