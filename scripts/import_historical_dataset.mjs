#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const datasetId = "riverguard-ncr-daily-v2";
const datasetVersion = "v2";
const csvPath = resolve(process.cwd(), "data/daily_observations.csv");
const eventsPath = resolve(process.cwd(), "data/flood_events.csv");
const stationsPath = resolve(process.cwd(), "data/stations.csv");
const locations = new Set(["Quezon City", "Marikina", "Manila", "Pasig"]);
const requiredColumns = [
  "Date",
  "Location",
  "Station_ID",
  "Latitude",
  "Longitude",
  "Rainfall_mm",
  "WaterLevel_m",
  "DataSource",
  "QualityStatus",
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((current) => current.some((cell) => cell.length > 0));
}

function asNumber(value, label, rowNumber) {
  if (value === "" || value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${label} at CSV row ${rowNumber}: ${value}`);
  }
  return parsed;
}

function toQualityStatus(value) {
  if (value === "observed-rain/derived-wl") return "provisional";
  if (value === "verified") return "verified";
  if (value === "missing") return "missing";
  return "unverified";
}

function parseStationMetadata(text) {
  const parsed = parseCsv(text);
  const [header, ...body] = parsed;
  const index = new Map(header.map((name, position) => [name, position]));
  const metadata = new Map();
  for (const cells of body) {
    const code = cells[index.get("Station_ID")] ?? "";
    if (code) {
      metadata.set(code, {
        name: cells[index.get("Station_Name")] ?? code,
        riverName: cells[index.get("River")] || undefined,
      });
    }
  }
  return metadata;
}

function validateRows(text, stationMetadata) {
  const parsed = parseCsv(text);
  const [header, ...body] = parsed;
  const columnIndex = new Map(header.map((name, index) => [name, index]));
  for (const column of requiredColumns) {
    if (!columnIndex.has(column)) {
      throw new Error(`Missing required CSV column: ${column}`);
    }
  }

  const seen = new Set();
  const records = [];
  let minDate = "9999-99-99";
  let maxDate = "0000-00-00";
  for (const [offset, cells] of body.entries()) {
    const rowNumber = offset + 2;
    const get = (name) => cells[columnIndex.get(name)] ?? "";
    const date = get("Date");
    const locationName = get("Location");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Invalid Date at CSV row ${rowNumber}: ${date}`);
    }
    if (!locations.has(locationName)) {
      throw new Error(
        `Unsupported location at CSV row ${rowNumber}: ${locationName}`,
      );
    }
    const key = `${date}|${locationName}`;
    if (seen.has(key)) throw new Error(`Duplicate date/location key: ${key}`);
    seen.add(key);
    if (date < minDate) minDate = date;
    if (date > maxDate) maxDate = date;

    const riskLabel = get("RiskLevel");
    const stationCode = get("Station_ID");
    const station = stationMetadata.get(stationCode);
    records.push({
      date,
      locationCode: locationName.toLowerCase().replaceAll(" ", "-"),
      locationName,
      stationCode,
      stationName: station?.name ?? stationCode,
      riverName: station?.riverName,
      latitude: asNumber(get("Latitude"), "Latitude", rowNumber),
      longitude: asNumber(get("Longitude"), "Longitude", rowNumber),
      elevationM: asNumber(get("Elevation_m"), "Elevation_m", rowNumber) ?? 0,
      rainfallMm: asNumber(get("Rainfall_mm"), "Rainfall_mm", rowNumber),
      waterLevelM: asNumber(get("WaterLevel_m"), "WaterLevel_m", rowNumber),
      soilMoisturePercent: asNumber(
        get("SoilMoisture_pct"),
        "SoilMoisture_pct",
        rowNumber,
      ),
      antecedentRain3dMm: asNumber(
        get("AntecedentRain_3d_mm"),
        "AntecedentRain_3d_mm",
        rowNumber,
      ),
      antecedentRain7dMm: asNumber(
        get("AntecedentRain_7d_mm"),
        "AntecedentRain_7d_mm",
        rowNumber,
      ),
      antecedentRain30dMm: asNumber(
        get("AntecedentRain_30d_mm"),
        "AntecedentRain_30d_mm",
        rowNumber,
      ),
      floodOccurrence:
        get("FloodOccurrence") === "1"
          ? true
          : get("FloodOccurrence") === "0"
            ? false
            : undefined,
      riskLabel: riskLabel || undefined,
      rainSource: get("RainSource") || undefined,
      split: get("Split") || undefined,
      dataSource: get("DataSource") || datasetId,
      qualityStatus: toQualityStatus(get("QualityStatus")),
      notes: get("Notes") || undefined,
    });
  }
  return {
    records,
    rowCount: records.length,
    dateMin: minDate,
    dateMax: maxDate,
  };
}

function validateEvents(text) {
  const parsed = parseCsv(text);
  const [header, ...body] = parsed;
  const index = new Map(header.map((name, position) => [name, position]));
  const get = (cells, name) => cells[index.get(name)] ?? "";
  return body.map((cells, offset) => ({
    eventDate: get(cells, "Date"),
    name: get(cells, "Event"),
    area: get(cells, "Area"),
    rainfallMm: asNumber(get(cells, "Rainfall_mm"), "Rainfall_mm", offset + 2),
    duration: get(cells, "Duration") || undefined,
    marikinaPeakM: asNumber(
      get(cells, "Marikina_Peak_m"),
      "Marikina_Peak_m",
      offset + 2,
    ),
    impact: get(cells, "Impact"),
    notes: get(cells, "Notes") || undefined,
  }));
}

const csv = await readFile(csvPath, "utf8");
const eventsCsv = await readFile(eventsPath, "utf8");
const stationsCsv = await readFile(stationsPath, "utf8");
const stationMetadata = parseStationMetadata(stationsCsv);
const { records, rowCount, dateMin, dateMax } = validateRows(
  csv,
  stationMetadata,
);
const events = validateEvents(eventsCsv);
const sourceSha256 = createHash("sha256").update(csv).digest("hex");

console.log(
  JSON.stringify(
    {
      datasetId,
      datasetVersion,
      sourceFile: "data/daily_observations.csv",
      sourceSha256,
      rowCount,
      dateMin,
      dateMax,
      locations: [...new Set(records.map((record) => record.locationName))],
      floodEvents: events.length,
      validated: true,
    },
    null,
    2,
  ),
);

if (process.argv.includes("--validate-only")) process.exit(0);

const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    "CONVEX_URL is required for import. Use --validate-only to run local validation without a deployment.",
  );
}

/**
 * The ingest mutations now refuse anonymous writes (`convex/ingest.ts`), so an
 * import has to prove it is allowed: either this secret, or a signed-in
 * administrator. Fail here, with the reason, rather than 200 times inside the
 * deployment.
 */
const ingestSecret = process.env.RIVERGUARD_INGEST_SECRET;
if (!ingestSecret) {
  throw new Error(
    "RIVERGUARD_INGEST_SECRET is required for import. Set it to the value configured on the deployment (npx convex env set RIVERGUARD_INGEST_SECRET ...).",
  );
}

const client = new ConvexHttpClient(convexUrl);
for (let index = 0; index < records.length; index += 200) {
  const batch = records.slice(index, index + 200);
  await client.mutation(anyApi.historical.upsertBatch, {
    datasetId,
    datasetVersion,
    sourceFile: "data/daily_observations.csv",
    sourceSha256,
    rowCount,
    dateMin,
    dateMax,
    records: batch,
    secret: ingestSecret,
  });
  console.log(
    `Imported ${Math.min(index + batch.length, records.length)}/${records.length}`,
  );
}

await client.mutation(anyApi.historical.upsertFloodEvents, {
  datasetId,
  source: "data/flood_events.csv",
  events,
  secret: ingestSecret,
});
console.log("Historical dataset import complete.");
