/**
 * Reads the trained model's exported artifacts.
 *
 * `ml/artifacts/model.json` and `metrics.json` are written by the training
 * script and are the only authoritative record of what model is deployed, how it
 * scored on the held-out test split, and which caveats apply. The admin screens
 * previously showed "RG-NCR v0.4" and "validation pending" as literals; this
 * module replaces them with the values in those files.
 *
 * Server-only: the route handlers call it, never a component.
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export interface ModelArtifactSummary {
  name: string;
  version: string;
  kind: string;
  trainedAt: string;
  dataset: string;
  trainedOn: string;
  thresholdTunedOn: string;
  evaluatedOn: string;
  target: string;
  warning: string;
  operatingThreshold: number;
  alarmsVerified: Record<string, boolean>;
  cities: Array<{
    name: string;
    station: string;
    river: string;
    alarmLevelsM: number[];
    alarmsVerified: boolean;
  }>;
}

export interface ModelMetricsSummary {
  generatedAt: string;
  dataset: string;
  samples: {
    total: number;
    train: number;
    validation: number;
    test: number;
    positives: { train: number; validation: number; test: number };
    positiveRateTest: number;
  };
  classifier: {
    averagePrecision: number;
    rocAuc: number;
    brier: number;
    recall: number;
    precision: number;
    f1: number;
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    falseAlarmRate: number;
    baselines: Array<{
      name: string;
      recall: number;
      precision: number;
      flagged: number;
    }>;
  };
  regressor: {
    maeM: number;
    rmseM: number;
    r2: number;
    persistenceMaeM: number;
    perCityMaeM: Record<string, number>;
  };
  caveat: string;
}

const CANDIDATES = [
  (file: string) => path.join(process.cwd(), "ml", "artifacts", file),
  (file: string) =>
    path.join(process.cwd(), "..", "..", "ml", "artifacts", file),
  (file: string) => path.join(process.cwd(), "..", "ml", "artifacts", file),
];

let cache: {
  stamp: number;
  model: ModelArtifactSummary;
  metrics: ModelMetricsSummary;
} | null = null;

async function readArtifact(file: string): Promise<unknown | null> {
  for (const build of CANDIDATES) {
    const candidate = build(file);
    try {
      const info = await stat(/*turbopackIgnore: true*/ candidate);
      if (!info.isFile()) continue;
      // Runtime input, not a bundle asset: exclude it from static tracing so a
      // build does not pull the whole project into the server output.
      return JSON.parse(
        await readFile(/*turbopackIgnore: true*/ candidate, "utf8"),
      ) as unknown;
    } catch {
      // Try the next layout.
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toModel(raw: unknown): ModelArtifactSummary | null {
  if (!isRecord(raw) || !isRecord(raw.meta)) return null;
  const meta = raw.meta;
  const cities = isRecord(raw.cities) ? raw.cities : {};
  return {
    name: String(meta.name ?? "Unnamed model"),
    version: String(meta.version ?? "unknown"),
    kind: String(meta.kind ?? "unknown"),
    trainedAt: String(meta.trained_at ?? ""),
    dataset: String(meta.dataset ?? ""),
    trainedOn: String(meta.trained_on ?? ""),
    thresholdTunedOn: String(meta.threshold_tuned_on ?? ""),
    evaluatedOn: String(meta.evaluated_on ?? ""),
    target: String(meta.target ?? ""),
    warning: String(meta.warning ?? ""),
    operatingThreshold: toNumber(raw.operating_threshold),
    alarmsVerified: Object.fromEntries(
      Object.entries(cities)
        .filter(([, value]) => isRecord(value))
        .map(([name, value]) => [
          name,
          Boolean((value as Record<string, unknown>).alarms_verified),
        ]),
    ),
    cities: Object.entries(cities)
      .filter(([, value]) => isRecord(value))
      .map(([name, value]) => {
        const city = value as Record<string, unknown>;
        const alarms = Array.isArray(city.alarms)
          ? city.alarms.filter(
              (alarm): alarm is number => typeof alarm === "number",
            )
          : [];
        return {
          name,
          station: String(city.station ?? ""),
          river: String(city.river ?? ""),
          alarmLevelsM: alarms,
          alarmsVerified: Boolean(city.alarms_verified),
        };
      }),
  };
}

function toMetrics(raw: unknown): ModelMetricsSummary | null {
  if (!isRecord(raw) || !isRecord(raw.classifier) || !isRecord(raw.regressor)) {
    return null;
  }
  const samples = isRecord(raw.samples) ? raw.samples : {};
  const positives = isRecord(samples.positives) ? samples.positives : {};
  const classifier = raw.classifier;
  const regressor = raw.regressor;
  const atThreshold = isRecord(classifier.at_operating_threshold_test)
    ? classifier.at_operating_threshold_test
    : {};
  const baselines = Array.isArray(classifier.baselines)
    ? classifier.baselines.filter(isRecord).map((entry) => ({
        name: String(entry.name ?? ""),
        recall: toNumber(entry.recall),
        precision: toNumber(entry.precision),
        flagged: toNumber(entry.flagged),
      }))
    : [];
  const perCity = isRecord(regressor.per_city_mae_test_m)
    ? regressor.per_city_mae_test_m
    : {};

  return {
    generatedAt: String(raw.generated_at ?? ""),
    dataset: String(raw.dataset ?? ""),
    samples: {
      total: toNumber(samples.total),
      train: toNumber(samples.train),
      validation: toNumber(samples.validation),
      test: toNumber(samples.test),
      positives: {
        train: toNumber(positives.train),
        validation: toNumber(positives.validation),
        test: toNumber(positives.test),
      },
      positiveRateTest: toNumber(samples.positive_rate_test),
    },
    classifier: {
      averagePrecision: toNumber(classifier.average_precision_test),
      rocAuc: toNumber(classifier.roc_auc_test),
      brier: toNumber(classifier.brier_test),
      recall: toNumber(atThreshold.recall),
      precision: toNumber(atThreshold.precision),
      f1: toNumber(atThreshold.f1),
      truePositives: toNumber(atThreshold.tp),
      falsePositives: toNumber(atThreshold.fp),
      falseNegatives: toNumber(atThreshold.fn),
      falseAlarmRate: toNumber(atThreshold.false_alarm_rate),
      baselines,
    },
    regressor: {
      maeM: toNumber(regressor.mae_test_m),
      rmseM: toNumber(regressor.rmse_test_m),
      r2: toNumber(regressor.r2_test),
      persistenceMaeM: toNumber(regressor.persistence_mae_test_m),
      perCityMaeM: Object.fromEntries(
        Object.entries(perCity).map(([city, value]) => [city, toNumber(value)]),
      ),
    },
    caveat: String(raw.caveat ?? ""),
  };
}

/** Model + metrics, or `null` when the artifacts are not present. */
export async function loadModelArtifacts(): Promise<{
  model: ModelArtifactSummary;
  metrics: ModelMetricsSummary;
} | null> {
  const [modelRaw, metricsRaw] = await Promise.all([
    readArtifact("model.json"),
    readArtifact("metrics.json"),
  ]);
  const model = toModel(modelRaw);
  const metrics = toMetrics(metricsRaw);
  if (!model || !metrics) return null;

  const stamp = await Promise.all(
    CANDIDATES.map(async (build) => {
      try {
        return (await stat(/*turbopackIgnore: true*/ build("model.json")))
          .mtimeMs;
      } catch {
        return 0;
      }
    }),
  ).then((values) => Math.max(...values));

  if (cache && cache.stamp === stamp)
    return { model: cache.model, metrics: cache.metrics };
  cache = { stamp, model, metrics };
  return { model, metrics };
}
