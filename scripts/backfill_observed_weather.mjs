#!/usr/bin/env node
/**
 * Fill observed days the deployment never recorded, from Open-Meteo's
 * historical forecast archive.
 *
 * Why this exists: `data/daily_observations.csv` is a snapshot that ends on a
 * fixed date, so the history chart carries on past it only with the days a live
 * forecast run happened to retrieve. If nobody opened the app on the 15th, the
 * 15th is missing from the chart for good — the live endpoint's `past_days` only
 * reaches back 92 days and returns today's view of those days anyway.
 *
 * The historical forecast archive (`historical-forecast-api.open-meteo.com`)
 * stores the initial hours of each model update from 2021-01-01 onward, with the
 * same variables, units and JSON shape as the live Forecast API. This script
 * asks it for a date range, normalises the answer exactly like
 * `apps/web/src/lib/weather/open-meteo.ts`, and writes the days through the same
 * store the app writes to (`observations:recordWindow`, or the local JSON file
 * when no deployment is configured).
 *
 * What this is not:
 *   - not a gauge. The archive is model output — a near-analysis, the shortest
 *     lead time the provider kept. Rows written by this script carry their own
 *     provider label so they are never mistaken for live-collected days or for
 *     telemetry.
 *   - not a way to change the dataset. `data/daily_observations.csv` stays a
 *     generated snapshot; this only fills the live store.
 *   - not for the pre-2021 era. Ulysses 2020 cannot come from here; the ERA5
 *     reanalysis in `data/era5_recent_rainfall.py` is the only source that far
 *     back, and it is observation-like data already frozen into the repo.
 *
 * Usage:
 *   node scripts/backfill_observed_weather.mjs --from 2026-11-15 --to 2026-11-17
 *   node scripts/backfill_observed_weather.mjs --from ... --to ... --dry-run
 *   node scripts/backfill_observed_weather.mjs --from-file backfill.json --target local
 *
 * Flags:
 *   --from, --to     Inclusive date range (Asia/Manila calendar days). Required
 *                    for a live fetch; taken from the file with --from-file.
 *   --city           One or more of marikina, quezon-city, manila, pasig.
 *                    Repeatable or comma-separated. Default: all four.
 *   --target         `convex`, `local`, or `auto` (default). Auto picks the
 *                    deployment when `NEXT_PUBLIC_CONVEX_URL`/`CONVEX_URL` is
 *                    set — read from the environment, then from
 *                    `apps/web/.env.local` — and the local file otherwise.
 *   --overwrite      Replace days that already exist. Without it, stored days
 *                    are left alone, so a re-run only fills the gaps.
 *   --dry-run        Fetch, validate and report; write nothing.
 *   --model          Pin an archive model (e.g. `ecmwf_ifs025`). Default: the
 *                    provider's own `best_match`, which is what the live route
 *                    uses, recorded in the output either way.
 *   --freeze PATH    Write the normalised days to PATH as JSON, with the endpoint,
 *                    model and fetch time. Committing that file makes a backfill
 *                    reproducible offline (`--from-file`).
 *   --from-file PATH Replay a frozen file instead of calling the provider. No
 *                    network, still validated, still written through the store.
 *   --timeout MS     Per-request timeout. Default 20000.
 *
 * Exit codes: 0 written or nothing to write, 1 refused (bad arguments, provider
 * error, store error). A day that fails validation is reported and skipped, not
 * written; if every requested day fails, the run exits 1.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Archive endpoint. Never the live one: mixing these two is the whole trap. */
const ENDPOINT = "https://historical-forecast-api.open-meteo.com/v1/forecast";
/** First day the archive covers. Anything earlier is a configuration error. */
const ARCHIVE_START = "2021-01-01";
/** Longest range one run may request, so a typo cannot pull a decade. */
const MAX_RANGE_DAYS = 365;

/**
 * The label written to `provider`. Deliberately not `open-meteo`: a row that
 * came from the archive should be recognisable as such in the chart's
 * "Rain source" line and in any later provenance audit.
 */
const PROVIDER = "open-meteo-historical-forecast";

/** Mirrors `apps/web/src/lib/weather/open-meteo.ts`. */
const MIN_SOIL_SAMPLES = 6;
const DAILY_VARIABLES = [
  "precipitation_sum",
  "temperature_2m_max",
  "temperature_2m_min",
  "et0_fao_evapotranspiration",
].join(",");
const HOURLY_VARIABLES = "soil_moisture_0_to_7cm";

/** `observations:recordWindow` refuses more than this many days per call. */
const MAX_DAYS_PER_CALL = 120;
/** Mirrors the web store's caps so both backends behave the same. */
const MAX_DAYS_PER_LOCATION = 120;
const MAX_DAYS = 480;
const STORE_VERSION = 1;

/**
 * The four cities, with the coordinates the live provider uses.
 * Mirrors `apps/web/src/lib/locations.ts` — if a coordinate changes there, it
 * has to change here, or backfilled days come from a different grid cell than
 * the days around them. `assertCoordinatesMatch` checks them against
 * `data/stations.csv`, which both files were derived from.
 */
const LOCATIONS = [
  {
    code: "marikina",
    name: "Marikina",
    latitude: 14.65,
    longitude: 121.1,
    timezone: "Asia/Manila",
  },
  {
    code: "quezon-city",
    name: "Quezon City",
    latitude: 14.6509,
    longitude: 121.0486,
    timezone: "Asia/Manila",
  },
  {
    code: "manila",
    name: "Manila",
    latitude: 14.587,
    longitude: 120.979,
    timezone: "Asia/Manila",
  },
  {
    code: "pasig",
    name: "Pasig",
    latitude: 14.59,
    longitude: 121.07,
    timezone: "Asia/Manila",
  },
];

const HELP = `Fill observed days the store is missing, from Open-Meteo's historical
forecast archive (2021-01-01 onward).

  node scripts/backfill_observed_weather.mjs --from 2026-11-15 --to 2026-11-17
  node scripts/backfill_observed_weather.mjs --from ... --to ... --dry-run
  node scripts/backfill_observed_weather.mjs --from-file backfill.json --target local

Flags
  --from, --to      Inclusive Asia/Manila date range (required unless --from-file).
  --city            marikina | quezon-city | manila | pasig; repeat or comma-separate.
                    Default: all four.
  --target          convex | local | auto (default auto: deployment if configured).
  --overwrite       Replace days already in the store. Default: fill gaps only.
  --dry-run         Fetch, validate, report — write nothing.
  --model           Pin an archive model; default the provider's best_match.
  --freeze PATH     Save the normalised days + provenance to PATH as JSON.
  --from-file PATH  Replay a frozen file instead of calling the provider.
  --timeout MS      Per-request timeout (default 20000).
  --help            This text.

The days written are model output, not gauge readings, and are labelled
"${PROVIDER}" in the store. Days outside 2021-01-01..today cannot be fetched here.
`;

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function fail(message) {
  const error = new Error(message);
  error.userFacing = true;
  throw error;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function num(value, fallback = null) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Calendar arithmetic on `YYYY-MM-DD` strings, in UTC so no zone drifts a day. */
function addDays(date, days) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function eachDate(from, to) {
  const dates = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Today in Manila, as the provider would name the current local day. */
function todayInManila() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Values from an env file, without overwriting anything already set.
 *
 * `npm run data:import` reads the deployment URL from the process environment
 * and nothing loads `apps/web/.env.local` for it, which is an easy way to lose
 * twenty minutes. Rather than repeat that here, the file the web app already
 * uses is read as a default. `process.loadEnvFile` would be shorter but needs
 * Node 20.12 while `engines` allows 20.9.
 */
function applyEnvFile(file, env) {
  if (!existsSync(file)) return false;
  const text = readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key in env && env[key] !== "") continue;
    env[key] = value;
  }
  return true;
}

/** Repo-relative when it is inside the repo, absolute when it is not. */
function displayPath(target) {
  const relative = path.relative(ROOT, target);
  return relative && !relative.startsWith("..") ? relative : target;
}

function convexUrlFromEnv(env) {
  const url = env.NEXT_PUBLIC_CONVEX_URL ?? env.CONVEX_URL;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const options = {
    from: null,
    to: null,
    cities: LOCATIONS.map((location) => location.code),
    target: "auto",
    overwrite: false,
    dryRun: false,
    model: null,
    freeze: null,
    fromFile: null,
    timeoutMs: 20000,
    help: false,
  };

  const takeValue = (index, flag) => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(`--${flag} needs a value`);
    }
    return value;
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) fail(`Unexpected argument: ${arg}`);
    const flag = arg.slice(2);

    switch (flag) {
      case "from":
        options.from = takeValue(index, flag);
        index += 1;
        break;
      case "to":
        options.to = takeValue(index, flag);
        index += 1;
        break;
      case "city": {
        const value = takeValue(index, flag);
        index += 1;
        const codes = value
          .split(",")
          .map((code) => code.trim().toLowerCase())
          .filter(Boolean);
        options.cities = codes;
        break;
      }
      case "target": {
        const value = takeValue(index, flag);
        index += 1;
        if (!["convex", "local", "auto"].includes(value)) {
          fail(`--target must be convex, local or auto (got ${value})`);
        }
        options.target = value;
        break;
      }
      case "overwrite":
        options.overwrite = true;
        break;
      case "dry-run":
        options.dryRun = true;
        break;
      case "model":
        options.model = takeValue(index, flag);
        index += 1;
        break;
      case "freeze":
        options.freeze = takeValue(index, flag);
        index += 1;
        break;
      case "from-file":
        options.fromFile = takeValue(index, flag);
        index += 1;
        break;
      case "timeout": {
        const value = Number(takeValue(index, flag));
        index += 1;
        if (!Number.isFinite(value) || value < 1000) {
          fail("--timeout must be a number of milliseconds (>= 1000)");
        }
        options.timeoutMs = Math.trunc(value);
        break;
      }
      case "help":
        options.help = true;
        break;
      default:
        fail(`Unknown flag: --${flag}`);
    }
  }

  const known = new Set(LOCATIONS.map((location) => location.code));
  for (const code of options.cities) {
    if (!known.has(code)) {
      fail(`Unknown city "${code}". Known: ${[...known].join(", ")}`);
    }
  }

  return options;
}

/** Date-range checks that apply before any request is made. */
export function checkRange(from, to, today = todayInManila()) {
  if (!isIsoDate(from) || !isIsoDate(to)) {
    fail("--from and --to must be YYYY-MM-DD dates");
  }
  if (from > to) fail(`--from (${from}) is after --to (${to})`);
  if (from < ARCHIVE_START) {
    fail(
      `The historical forecast archive starts ${ARCHIVE_START}; ${from} predates it. ` +
        "For older days the ERA5 reanalysis in data/era5_recent_rainfall.py is the only source.",
    );
  }
  if (to > today) {
    fail(
      `--to (${to}) is in the future; today in Manila is ${today}. ` +
        "Future days belong to the forecast store, not the observed one.",
    );
  }
  const span = eachDate(from, to).length;
  if (span > MAX_RANGE_DAYS) {
    fail(
      `That range is ${span} days; one run is capped at ${MAX_RANGE_DAYS}. ` +
        "Split it, or ask for a shorter backfill.",
    );
  }
  return span;
}

// ---------------------------------------------------------------------------
// Provider: request, then normalise exactly like the live route
// ---------------------------------------------------------------------------

export function buildUrl(location, from, to, model) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("daily", DAILY_VARIABLES);
  url.searchParams.set("hourly", HOURLY_VARIABLES);
  // Not `past_days`: the archive is addressed by start/end date, and asking for
  // "the last 30 days" would silently shift the window every time it is run.
  url.searchParams.set("start_date", from);
  url.searchParams.set("end_date", to);
  url.searchParams.set("timezone", location.timezone);
  if (model) url.searchParams.set("models", model);
  return url;
}

async function requestOnce(url, timeoutMs) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Open-Meteo returned ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
    );
  }
  return response.json();
}

/** One retry: the archive occasionally 5xxs on a cold range, and a backfill is not urgent. */
async function request(url, timeoutMs) {
  try {
    return await requestOnce(url, timeoutMs);
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new Error(`Open-Meteo did not answer within ${timeoutMs} ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      return await requestOnce(url, timeoutMs);
    } catch (retryError) {
      throw new Error(
        `Open-Meteo request failed twice: ${retryError instanceof Error ? retryError.message : retryError}`,
      );
    }
  }
}

/**
 * Daily means of the hourly volumetric soil moisture, in percent.
 *
 * A copy of `dailyMeans` + `toPercent` from the live provider on purpose: the
 * backfilled day has to be the same number the live route would have stored for
 * the same payload, down to the sample threshold and the four-decimal rounding.
 */
export function dailySoilMeans(times, values) {
  const sums = new Map();
  if (!Array.isArray(times) || !Array.isArray(values)) return new Map();

  for (let index = 0; index < times.length; index += 1) {
    const value = values[index];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const date =
      typeof times[index] === "string" ? times[index].slice(0, 10) : null;
    if (!date) continue;
    const entry = sums.get(date) ?? { total: 0, count: 0 };
    entry.total += value;
    entry.count += 1;
    sums.set(date, entry);
  }

  const means = new Map();
  for (const [date, entry] of sums) {
    if (entry.count < MIN_SOIL_SAMPLES) continue;
    const fourDecimals =
      Math.round((entry.total / entry.count) * 10000) / 10000;
    means.set(date, round(Math.min(100, Math.max(0, fourDecimals * 100)), 1));
  }
  return means;
}

/**
 * Provider payload → validated days, plus the reasons any were dropped.
 *
 * Missing rainfall or temperature drops the day: the live route would substitute
 * a default, which is defensible for a running forecast and wrong for history.
 * Missing ET0 or soil moisture is kept as `null` — those columns are optional in
 * the store, and a null is honest where an invented number is not.
 */
export function toDays(payload, location, from, to) {
  const times = payload?.daily?.time;
  if (!Array.isArray(times) || times.length === 0) {
    fail(
      `${location.name}: the archive returned no daily data for ${from}..${to} (${payload?.reason ?? "no reason given"})`,
    );
  }

  const rain = payload.daily.precipitation_sum ?? [];
  const tmax = payload.daily.temperature_2m_max ?? [];
  const tmin = payload.daily.temperature_2m_min ?? [];
  const et0 = payload.daily.et0_fao_evapotranspiration ?? [];
  const soil = dailySoilMeans(
    payload.hourly?.time,
    payload.hourly?.soil_moisture_0_to_7cm,
  );

  const days = [];
  const dropped = [];

  for (let index = 0; index < times.length; index += 1) {
    const date = times[index];
    if (!isIsoDate(date)) {
      dropped.push({ date: String(date), reason: "unreadable date" });
      continue;
    }
    if (date < from || date > to) continue;

    const rainfall = num(rain[index]);
    const high = num(tmax[index]);
    const low = num(tmin[index]);

    if (rainfall === null) {
      dropped.push({ date, reason: "no rainfall value" });
      continue;
    }
    if (rainfall < 0 || rainfall > 500) {
      dropped.push({ date, reason: `implausible rainfall ${rainfall} mm` });
      continue;
    }
    if (high === null || low === null) {
      dropped.push({ date, reason: "no temperature value" });
      continue;
    }
    if (high < -5 || high > 45 || low < -5 || low > 45) {
      dropped.push({
        date,
        reason: `implausible temperature ${low}..${high} °C`,
      });
      continue;
    }
    if (low > high + 0.5) {
      dropped.push({
        date,
        reason: `minimum ${low} °C above maximum ${high} °C`,
      });
      continue;
    }

    const evapotranspiration = num(et0[index]);
    days.push({
      locationCode: location.code,
      locationName: location.name,
      date,
      rainfallMm: round(rainfall, 1),
      tmaxC: round(high, 1),
      tminC: round(low, 1),
      et0Mm:
        evapotranspiration === null ||
        evapotranspiration < 0 ||
        evapotranspiration > 15
          ? null
          : round(evapotranspiration, 1),
      soilMoisturePercent: soil.get(date) ?? null,
      soilMoistureSource: "open-meteo",
      rainfallSource: "provider",
    });
  }

  return { days, dropped };
}

/** Coverage per optional column, so a null-heavy range is visible before it is written. */
function coverage(days) {
  const total = days.length;
  const count = (pick) => days.filter((day) => pick(day) !== null).length;
  return {
    days: total,
    et0: `${count((day) => day.et0Mm)}/${total}`,
    soilMoisture: `${count((day) => day.soilMoisturePercent)}/${total}`,
  };
}

// ---------------------------------------------------------------------------
// Frozen artifacts: write once, replay offline
// ---------------------------------------------------------------------------

export function frozenArtifact({ daysByCity, from, to, model, fetchedAt }) {
  return {
    version: 1,
    endpoint: ENDPOINT,
    provider: PROVIDER,
    model: model ?? "best_match",
    from,
    to,
    fetchedAt,
    cities: Object.fromEntries(
      Object.entries(daysByCity).map(([code, days]) => [
        code,
        {
          locationName:
            LOCATIONS.find((location) => location.code === code)?.name ?? code,
          days,
        },
      ]),
    ),
  };
}

/** Re-validate a frozen file: a replay must not trust what it is handed. */
export function readFrozen(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail("--from-file is not valid JSON");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof parsed.cities !== "object"
  ) {
    fail("--from-file is not a backfill artifact (no `cities` object)");
  }
  if (!isIsoDate(parsed.from) || !isIsoDate(parsed.to)) {
    fail("--from-file has no valid from/to range");
  }
  if (parsed.endpoint && parsed.endpoint !== ENDPOINT) {
    fail(
      `--from-file was fetched from ${parsed.endpoint}, not the historical forecast archive (${ENDPOINT})`,
    );
  }

  const daysByCity = new Map();
  for (const [code, entry] of Object.entries(parsed.cities)) {
    const location = LOCATIONS.find((candidate) => candidate.code === code);
    if (!location) {
      fail(`--from-file contains an unknown city "${code}"`);
    }
    if (!entry || !Array.isArray(entry.days)) {
      fail(`--from-file: city "${code}" has no days array`);
    }
    const days = [];
    for (const day of entry.days) {
      const valid =
        day &&
        typeof day === "object" &&
        isIsoDate(day.date) &&
        day.date >= parsed.from &&
        day.date <= parsed.to &&
        typeof day.rainfallMm === "number" &&
        Number.isFinite(day.rainfallMm) &&
        day.rainfallMm >= 0 &&
        day.rainfallMm <= 500 &&
        typeof day.tmaxC === "number" &&
        typeof day.tminC === "number";
      if (!valid) {
        fail(
          `--from-file: city "${code}" has an invalid day ${JSON.stringify(day)}`,
        );
      }
      days.push({
        locationCode: code,
        locationName: location.name,
        date: day.date,
        rainfallMm: day.rainfallMm,
        tmaxC: day.tmaxC,
        tminC: day.tminC,
        et0Mm: num(day.et0Mm),
        soilMoisturePercent: num(day.soilMoisturePercent),
        soilMoistureSource: "open-meteo",
        rainfallSource: "provider",
      });
    }
    daysByCity.set(code, days);
  }
  return {
    daysByCity,
    from: parsed.from,
    to: parsed.to,
    model: parsed.model ?? null,
  };
}

// ---------------------------------------------------------------------------
// Local file backend — mirrors apps/web/src/lib/observation-store.ts
// ---------------------------------------------------------------------------

function localStorePath() {
  const override = process.env.OBSERVATION_STORE_PATH?.trim();
  if (override) return path.resolve(override);
  return path.join(ROOT, ".data", "observations.json");
}

async function readLocalStore() {
  const file = localStorePath();
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    if (!parsed || !Array.isArray(parsed.days)) {
      throw new Error("missing days array");
    }
    return parsed.days;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    fail(
      `The local observation store (${file}) could not be read: ${error.message}`,
    );
  }
}

function capDays(days) {
  const byCode = new Map();
  for (const day of days) {
    const bucket = byCode.get(day.locationCode) ?? [];
    bucket.push(day);
    byCode.set(day.locationCode, bucket);
  }
  const kept = [];
  for (const bucket of byCode.values()) {
    bucket.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    kept.push(...bucket.slice(0, MAX_DAYS_PER_LOCATION));
  }
  kept.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return kept.slice(0, MAX_DAYS);
}

async function writeLocalStore(fresh) {
  const file = localStorePath();
  const existing = await readLocalStore();
  const recordedAt = Date.now();
  const retrievedAt = new Date(recordedAt).toISOString();
  const rows = fresh.map((day) => ({
    ...day,
    provider: PROVIDER,
    retrievedAt,
    recordedAt,
  }));

  const key = (day) => `${day.locationCode}:${day.date}`;
  const replacement = new Map(rows.map((day) => [key(day), day]));
  const kept = existing.filter((day) => !replacement.has(key(day)));
  const next = capDays([...replacement.values(), ...kept]);

  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(
    temp,
    `${JSON.stringify({ version: STORE_VERSION, days: next }, null, 2)}\n`,
    "utf8",
  );
  await rename(temp, file);
  return rows.length;
}

async function existingDatesLocal(locationCode, from, to) {
  const days = await readLocalStore();
  return new Set(
    days
      .filter(
        (day) =>
          day.locationCode === locationCode &&
          day.date >= from &&
          day.date <= to,
      )
      .map((day) => day.date),
  );
}

// ---------------------------------------------------------------------------
// Convex backend — the same mutation the web route calls
// ---------------------------------------------------------------------------

async function existingDatesRemote(client, location, from, to, span) {
  const rows = await client.query(anyApi.observations.listWindow, {
    locationCode: location.code,
    fromDate: from,
    limit: Math.min(365, span + 1),
  });
  return new Set(
    (rows ?? [])
      .map((row) => row.date)
      .filter((date) => typeof date === "string" && date >= from && date <= to),
  );
}

/**
 * The mutation's argument shape, in one place.
 *
 * `null` becomes absent rather than `null`: the validator is `v.optional(v.number())`,
 * which rejects a null.
 */
export function recordWindowArgs(location, days, retrievedAt = Date.now()) {
  return {
    locationCode: location.code,
    locationName: location.name,
    provider: PROVIDER,
    degraded: false,
    retrievedAt,
    days: days.map((day) => ({
      date: day.date,
      rainfallMm: day.rainfallMm,
      tmaxC: day.tmaxC,
      tminC: day.tminC,
      ...(day.et0Mm === null ? {} : { et0Mm: day.et0Mm }),
      ...(day.soilMoisturePercent === null
        ? {}
        : { soilMoisturePercent: day.soilMoisturePercent }),
      soilMoistureSource: "open-meteo",
      rainfallSource: "provider",
    })),
  };
}

async function existingDates(client, target, location, from, to, span) {
  if (target === "convex")
    return existingDatesRemote(client, location, from, to, span);
  return existingDatesLocal(location.code, from, to);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(HELP);
    return 0;
  }

  // Deployment URL: environment first, then the file the web app already uses.
  const env = { ...process.env };
  for (const candidate of ["apps/web/.env.local", ".env.local", ".env"]) {
    applyEnvFile(path.join(ROOT, candidate), env);
  }
  const convexUrl = convexUrlFromEnv(env);

  let target = options.target;
  if (target === "auto") target = convexUrl ? "convex" : "local";
  if (target === "convex" && !convexUrl) {
    fail(
      "No deployment configured: set NEXT_PUBLIC_CONVEX_URL (apps/web/.env.local is read), or use --target local.",
    );
  }

  const client = target === "convex" ? new ConvexHttpClient(convexUrl) : null;
  const selected = LOCATIONS.filter((location) =>
    options.cities.includes(location.code),
  );

  // --- days: from a frozen artifact, or from the archive -------------------
  let from;
  let to;
  let model = options.model;
  const daysByCity = new Map();
  const droppedByCity = new Map();
  let fetchedAt = null;
  /** Whether a per-city progress line was printed, so the summary is not prefixed with a blank line. */
  let printedProgress = false;

  if (options.fromFile) {
    const file = path.resolve(process.cwd(), options.fromFile);
    let text;
    try {
      text = await readFile(file, "utf8");
    } catch {
      fail(`--from-file ${options.fromFile} could not be read`);
    }
    const frozen = readFrozen(text);
    from = options.from ?? frozen.from;
    to = options.to ?? frozen.to;
    model = options.model ?? frozen.model;
    checkRange(from, to);
    for (const location of selected) {
      const days = (frozen.daysByCity.get(location.code) ?? []).filter(
        (day) => day.date >= from && day.date <= to,
      );
      daysByCity.set(location.code, days);
      droppedByCity.set(location.code, []);
    }
  } else {
    if (!options.from || !options.to) {
      fail(
        "--from and --to are required (or pass --from-file to replay a frozen run)",
      );
    }
    from = options.from;
    to = options.to;
    checkRange(from, to);
    fetchedAt = new Date().toISOString();

    for (const location of selected) {
      const days = [];
      const dropped = [];
      // Ranges over the mutation's cap are fetched and written in chunks.
      let chunkStart = from;
      while (chunkStart <= to) {
        const chunkEnd = [
          addDays(chunkStart, MAX_DAYS_PER_CALL - 1),
          to,
        ].sort()[0];
        const url = buildUrl(location, chunkStart, chunkEnd, model);
        let payload;
        try {
          payload = await request(url, options.timeoutMs);
        } catch (error) {
          fail(`${location.name} ${chunkStart}..${chunkEnd}: ${error.message}`);
        }
        const parsed = toDays(payload, location, chunkStart, chunkEnd);
        days.push(...parsed.days);
        dropped.push(...parsed.dropped);
        chunkStart = addDays(chunkEnd, 1);
      }
      days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      daysByCity.set(location.code, days);
      droppedByCity.set(location.code, dropped);
      printedProgress = true;
      process.stdout.write(
        `${location.name}: ${days.length} day(s) ${from}..${to}` +
          `${dropped.length ? `, ${dropped.length} dropped` : ""}\n`,
      );
    }
  }

  const span = eachDate(from, to).length;

  // --- write ---------------------------------------------------------------
  const report = {};
  let wrote = 0;
  let skipped = 0;
  const failures = [];

  for (const location of selected) {
    const days = daysByCity.get(location.code) ?? [];
    const dropped = droppedByCity.get(location.code) ?? [];
    let toWrite = days;

    if (!options.overwrite && days.length > 0) {
      let existing;
      try {
        existing = await existingDates(
          client,
          target,
          location,
          from,
          to,
          span,
        );
      } catch (error) {
        fail(
          `Could not read ${target === "convex" ? "the deployment" : "the local store"} to skip days that already exist ` +
            `(${error instanceof Error ? error.message : String(error)}). ` +
            "Re-run with --overwrite to write every requested day without the lookup.",
        );
      }
      toWrite = days.filter((day) => !existing.has(day.date));
      skipped += days.length - toWrite.length;
    }

    let written = 0;
    if (!options.dryRun && toWrite.length > 0) {
      try {
        if (target === "convex") {
          for (
            let index = 0;
            index < toWrite.length;
            index += MAX_DAYS_PER_CALL
          ) {
            const batch = toWrite.slice(index, index + MAX_DAYS_PER_CALL);
            const result = await client.mutation(
              anyApi.observations.recordWindow,
              recordWindowArgs(location, batch),
            );
            written += result.written;
          }
        } else {
          written = await writeLocalStore(toWrite);
        }
      } catch (error) {
        failures.push(
          `${location.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    wrote += written;

    report[location.code] = {
      requested: days.length,
      written,
      skippedExisting: days.length - toWrite.length,
      dropped,
      coverage: coverage(days),
      ...(options.dryRun ? { wouldWrite: toWrite.length } : {}),
    };
  }

  let frozenPath = null;
  if (options.freeze && !options.dryRun) {
    const artifactPath = path.resolve(process.cwd(), options.freeze);
    const artifact = frozenArtifact({
      daysByCity: Object.fromEntries(daysByCity),
      from,
      to,
      model,
      fetchedAt: fetchedAt ?? new Date().toISOString(),
    });
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(
      artifactPath,
      `${JSON.stringify(artifact, null, 2)}\n`,
      "utf8",
    );
    frozenPath = displayPath(artifactPath);
  }

  process.stdout.write(
    `${printedProgress ? "\n" : ""}${JSON.stringify(
      {
        endpoint: options.fromFile ? "frozen artifact" : ENDPOINT,
        provider: PROVIDER,
        model: model ?? "best_match",
        from,
        to,
        target,
        store:
          target === "convex"
            ? "Convex deployment · table observedWeather"
            : displayPath(localStorePath()),
        dryRun: options.dryRun,
        written: wrote,
        skippedExisting: skipped,
        frozen: frozenPath,
        cities: report,
      },
      null,
      2,
    )}\n`,
  );

  if (failures.length > 0) {
    for (const failure of failures) process.stderr.write(`\n${failure}\n`);
    return 1;
  }
  if (wrote === 0 && !options.dryRun && !skipped) {
    process.stderr.write(
      "\nNothing was written: every requested day was dropped or the range was empty.\n",
    );
    return 1;
  }
  return 0;
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      if (error?.userFacing) {
        process.stderr.write(`\n${error.message}\n`);
      } else {
        process.stderr.write(
          `\nUnexpected failure: ${error?.stack ?? error}\n`,
        );
      }
      process.exitCode = 1;
    });
}
