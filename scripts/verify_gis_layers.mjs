#!/usr/bin/env node
/**
 * Verify the local GIS layers declared in `data/gis/manifest.json`.
 *
 * The map refuses to draw anything that has not been through this check, so the
 * check has to be real. It confirms, per layer:
 *
 *   - complete provenance: publisher, HTTPS source URL, licence, retrieval date,
 *     who verified it and when (dates real and not in the future);
 *   - the file exists inside `data/gis` and its sha256 matches the manifest, so
 *     the geometry on disk is the geometry that was reviewed;
 *   - it is a GeoJSON FeatureCollection whose geometry type matches the
 *     declaration, with finite WGS84 coordinates (longitude ±180, latitude ±90);
 *   - polygon rings are closed and have at least four positions;
 *   - every coordinate falls inside the declared bounding box;
 *   - every feature carries the declared required properties, and every value of
 *     the class property has a colour in `classColors`.
 *
 * What it cannot prove: that the data is scientifically correct, current, or
 * licensed for redistribution. Those claims live in `verifiedBy` / `verifiedAt`,
 * which a human fills in.
 *
 * Usage:
 *   node scripts/verify_gis_layers.mjs                  # check
 *   node scripts/verify_gis_layers.mjs --write-hashes   # fill in sha256, then check
 *   node scripts/verify_gis_layers.mjs --manifest <path> --artifact <path>
 *
 * Writes `apps/web/src/generated/gis-layers.json` — the only thing the web app
 * reads. Layers that fail are written to `rejected` with their problems and are
 * never served.
 *
 * Exit code 0 = every declared layer verified (or none declared),
 *           1 = at least one layer rejected, 2 = the manifest itself is unusable.
 */

import { createHash } from "node:crypto";
import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const GEOMETRY_TYPES = {
  polygon: ["Polygon", "MultiPolygon"],
  line: ["LineString", "MultiLineString"],
  point: ["Point", "MultiPoint"],
};

const CLASSIFICATIONS = ["hazard", "boundary", "stations"];

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LAYER_ID = /^[a-z0-9][a-z0-9-]*$/;
const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.geojson$/;

function parseArgs(argv) {
  const options = {
    manifest: path.join(REPO_ROOT, "data", "gis", "manifest.json"),
    artifact: path.join(
      REPO_ROOT,
      "apps",
      "web",
      "src",
      "generated",
      "gis-layers.json",
    ),
    writeHashes: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write-hashes") options.writeHashes = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--manifest") options.manifest = path.resolve(argv[++index]);
    else if (arg === "--artifact") options.artifact = path.resolve(argv[++index]);
    else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }

  return options;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/** Today's date in UTC, `YYYY-MM-DD`, so "not in the future" is unambiguous. */
function today() {
  return new Date().toISOString().slice(0, 10);
}

function checkDate(value, field, problems) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    problems.push(`${field} must be a YYYY-MM-DD date`);
    return;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    problems.push(`${field} is not a real date`);
    return;
  }
  // Round-trip catches 2026-02-31 and friends, which Date quietly rolls over.
  if (parsed.toISOString().slice(0, 10) !== value) {
    problems.push(`${field} is not a real date`);
    return;
  }
  if (value > today()) {
    problems.push(`${field} (${value}) is in the future`);
  }
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/** All [lon, lat] positions of a geometry, whatever its type. */
function positionsOf(geometry) {
  const positions = [];
  const walk = (coordinates) => {
    if (!Array.isArray(coordinates)) return;
    if (typeof coordinates[0] === "number") {
      positions.push(coordinates);
      return;
    }
    for (const child of coordinates) walk(child);
  };
  walk(geometry?.coordinates);
  return positions;
}

function ringsOf(geometry) {
  const rings = [];
  if (geometry?.type === "Polygon") rings.push(...geometry.coordinates);
  if (geometry?.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) rings.push(...polygon);
  }
  return rings;
}

function samePosition(a, b) {
  return a?.[0] === b?.[0] && a?.[1] === b?.[1];
}

/**
 * Structural and geographic checks for one FeatureCollection.
 * Returns { problems, featureCount, computedBbox }.
 */
function checkFeatureCollection(collection, layer, bbox) {
  const problems = [];
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const epsilon = 1e-9;
  const computed = { minLon: Infinity, minLat: Infinity, maxLon: -Infinity, maxLat: -Infinity };
  let featureCount = 0;
  let coordinateProblems = false;

  const expand = (position) => {
    const [lon, lat] = position;
    computed.minLon = Math.min(computed.minLon, lon);
    computed.minLat = Math.min(computed.minLat, lat);
    computed.maxLon = Math.max(computed.maxLon, lon);
    computed.maxLat = Math.max(computed.maxLat, lat);
  };

  for (const [index, feature] of collection.features.entries()) {
    const where = `feature ${index}`;
    if (!feature || feature.type !== "Feature" || !feature.geometry) {
      problems.push(`${where} is not a GeoJSON Feature with a geometry`);
      continue;
    }
    featureCount += 1;

    const allowed = GEOMETRY_TYPES[layer.geometry];
    if (!allowed.includes(feature.geometry.type)) {
      problems.push(
        `${where} is ${feature.geometry.type}, which contradicts geometry "${layer.geometry}"`,
      );
      continue;
    }

    const positions = positionsOf(feature.geometry);
    if (positions.length === 0) {
      problems.push(`${where} has no coordinates`);
      continue;
    }

    let badCoordinate = false;
    for (const position of positions) {
      const [lon, lat] = position;
      if (!isFiniteNumber(lon) || !isFiniteNumber(lat)) {
        problems.push(`${where} has a non-numeric coordinate`);
        badCoordinate = true;
        break;
      }
      if (lon < -180 || lon > 180) {
        problems.push(
          `${where} has longitude ${lon} — the file is not WGS84 (EPSG:4326)`,
        );
        badCoordinate = true;
        break;
      }
      if (lat < -90 || lat > 90) {
        problems.push(
          `${where} has latitude ${lat} — the file is not WGS84 (EPSG:4326)`,
        );
        badCoordinate = true;
        break;
      }
      if (
        lon < minLon - epsilon ||
        lat < minLat - epsilon ||
        lon > maxLon + epsilon ||
        lat > maxLat + epsilon
      ) {
        problems.push(
          `${where} has a coordinate (${lon}, ${lat}) outside the declared bbox`,
        );
        badCoordinate = true;
        break;
      }
      expand(position);
    }
    if (badCoordinate) {
      coordinateProblems = true;
      continue;
    }

    for (const [ringIndex, ring] of ringsOf(feature.geometry).entries()) {
      if (!Array.isArray(ring) || ring.length < 4) {
        problems.push(
          `${where} ring ${ringIndex} needs at least four positions (a closed triangle)`,
        );
        continue;
      }
      if (!samePosition(ring[0], ring[ring.length - 1])) {
        problems.push(`${where} ring ${ringIndex} is not closed`);
      }
    }

    const properties = feature.properties ?? {};
    for (const name of layer.requiredProperties ?? []) {
      const value = properties[name];
      if (value === undefined || value === null || value === "") {
        problems.push(`${where} is missing the required property "${name}"`);
      }
    }
    if (layer.classProperty) {
      const value = properties[layer.classProperty];
      if (value !== undefined && value !== null) {
        if (!Object.hasOwn(layer.classColors ?? {}, String(value))) {
          problems.push(
            `${where} has ${layer.classProperty}="${value}", which has no colour in classColors`,
          );
        }
      }
    }
  }

  if (featureCount === 0) {
    problems.push("the FeatureCollection contains no features");
  }

  if (featureCount > 0 && layer.geometry === "polygon" && !coordinateProblems) {
    if (
      computed.maxLon - computed.minLon <= 0 ||
      computed.maxLat - computed.minLat <= 0
    ) {
      problems.push("the polygons cover no area (degenerate bounding box)");
    }
  }

  return {
    problems,
    featureCount,
    computedBbox: Number.isFinite(computed.minLon)
      ? [computed.minLon, computed.minLat, computed.maxLon, computed.maxLat]
      : null,
  };
}

/** Validate the manifest entry itself, before touching geometry. */
function checkMetadata(layer, index) {
  const problems = [];
  const where = `layers[${index}]`;

  if (typeof layer.id !== "string" || !LAYER_ID.test(layer.id)) {
    problems.push(`${where}.id must be kebab-case`);
  }
  if (typeof layer.title !== "string" || layer.title.trim() === "") {
    problems.push(`${where}.title is required`);
  }
  if (!CLASSIFICATIONS.includes(layer.classification)) {
    problems.push(
      `${where}.classification must be one of ${CLASSIFICATIONS.join(", ")}`,
    );
  }
  if (!Object.hasOwn(GEOMETRY_TYPES, layer.geometry)) {
    problems.push(
      `${where}.geometry must be one of ${Object.keys(GEOMETRY_TYPES).join(", ")}`,
    );
  }
  if (typeof layer.file !== "string" || !FILE_NAME.test(layer.file)) {
    problems.push(
      `${where}.file must be a bare .geojson filename inside data/gis (no folders or "..")`,
    );
  }
  if (layer.description !== undefined && typeof layer.description !== "string") {
    problems.push(`${where}.description must be a string`);
  }

  const bbox = layer.bbox;
  if (
    !Array.isArray(bbox) ||
    bbox.length !== 4 ||
    !bbox.every(isFiniteNumber)
  ) {
    problems.push(`${where}.bbox must be [minLon, minLat, maxLon, maxLat]`);
  } else {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
      problems.push(`${where}.bbox is outside world bounds`);
    }
    if (minLon >= maxLon || minLat >= maxLat) {
      problems.push(`${where}.bbox must satisfy min < max on both axes`);
    }
  }

  if (
    layer.requiredProperties !== undefined &&
    (!Array.isArray(layer.requiredProperties) ||
      layer.requiredProperties.some((name) => typeof name !== "string"))
  ) {
    problems.push(`${where}.requiredProperties must be an array of strings`);
  }

  if (layer.classColors !== undefined) {
    if (typeof layer.classProperty !== "string" || layer.classProperty === "") {
      problems.push(`${where}.classProperty is required when classColors is set`);
    }
    if (
      typeof layer.classColors !== "object" ||
      layer.classColors === null ||
      Array.isArray(layer.classColors)
    ) {
      problems.push(`${where}.classColors must be an object of value → colour`);
    } else {
      const entries = Object.entries(layer.classColors);
      if (entries.length < 2) {
        problems.push(`${where}.classColors needs at least two classes`);
      }
      for (const [key, colour] of entries) {
        if (typeof colour !== "string" || !HEX_COLOR.test(colour)) {
          problems.push(`${where}.classColors["${key}"] is not a hex colour`);
        }
      }
    }
  }

  if (layer.fillOpacity !== undefined) {
    if (
      !isFiniteNumber(layer.fillOpacity) ||
      layer.fillOpacity < 0 ||
      layer.fillOpacity > 1
    ) {
      problems.push(`${where}.fillOpacity must be a number between 0 and 1`);
    }
  }
  if (layer.strokeColor !== undefined && !HEX_COLOR.test(layer.strokeColor)) {
    problems.push(`${where}.strokeColor is not a hex colour`);
  }

  const source = layer.source;
  if (!source || typeof source !== "object") {
    problems.push(`${where}.source is required`);
  } else {
    if (typeof source.publisher !== "string" || source.publisher.trim() === "") {
      problems.push(`${where}.source.publisher is required`);
    }
    if (typeof source.url !== "string" || !source.url.startsWith("https://")) {
      problems.push(`${where}.source.url must be an https:// URL`);
    }
    if (typeof source.license !== "string" || source.license.trim() === "") {
      problems.push(`${where}.source.license is required`);
    }
    checkDate(source.retrievedAt, `${where}.source.retrievedAt`, problems);
    if (source.note !== undefined && typeof source.note !== "string") {
      problems.push(`${where}.source.note must be a string`);
    }
  }

  if (typeof layer.verifiedBy !== "string" || layer.verifiedBy.trim() === "") {
    problems.push(`${where}.verifiedBy is required — say who checked the file`);
  }
  checkDate(layer.verifiedAt, `${where}.verifiedAt`, problems);

  return problems;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(
      "Usage: node scripts/verify_gis_layers.mjs [--write-hashes] [--manifest <path>] [--artifact <path>]",
    );
    return 0;
  }

  const dataDir = path.dirname(options.manifest);
  let manifest;
  try {
    manifest = JSON.parse(await readFile(options.manifest, "utf8"));
  } catch (error) {
    console.error(
      `✗ ${path.relative(REPO_ROOT, options.manifest)} could not be read: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    return 2;
  }

  if (manifest?.version !== 1) {
    console.error("✗ manifest.version must be 1");
    return 2;
  }
  if (!Array.isArray(manifest.layers)) {
    console.error("✗ manifest.layers must be an array");
    return 2;
  }

  console.log(`manifest  ${path.relative(REPO_ROOT, options.manifest)}`);
  if (manifest.layers.length === 0) {
    console.log(
      "  (no layers declared — the map will show the basemap only, which is the honest state)",
    );
  }

  const seen = new Set();
  const layers = [];
  const rejected = [];
  let hashesWritten = 0;

  for (const [index, layer] of manifest.layers.entries()) {
    const problems = checkMetadata(layer, index);
    const id = typeof layer.id === "string" ? layer.id : `layers[${index}]`;

    if (typeof layer.id === "string") {
      if (seen.has(layer.id)) problems.push(`duplicate layer id "${layer.id}"`);
      seen.add(layer.id);
    }

    let filePath = null;
    if (typeof layer.file === "string" && FILE_NAME.test(layer.file)) {
      filePath = path.join(dataDir, layer.file);
      // FILE_NAME already forbids separators and "..", but resolve and re-check
      // so a symlink or unusual name cannot escape the directory either.
      if (!filePath.startsWith(dataDir + path.sep)) {
        problems.push(`${layer.file} resolves outside data/gis`);
        filePath = null;
      }
    }

    let summary = null;
    let buffer = null;
    if (filePath) {
      try {
        const info = await stat(filePath);
        if (!info.isFile() || info.size === 0) {
          problems.push(`${layer.file} is empty`);
        } else {
          buffer = await readFile(filePath);
        }
      } catch {
        problems.push(
          `${layer.file} is not in data/gis — add the file or remove the entry`,
        );
        filePath = null;
      }
    }

    if (buffer) {
      const digest = sha256(buffer);

      if (options.writeHashes) {
        if (layer.sha256 !== digest) {
          layer.sha256 = digest;
          hashesWritten += 1;
        }
      } else if (typeof layer.sha256 !== "string" || !SHA256.test(layer.sha256)) {
        problems.push("sha256 is missing — run with --write-hashes after review");
      } else if (layer.sha256 !== digest) {
        problems.push(
          `sha256 does not match the file (manifest ${layer.sha256.slice(0, 12)}…, file ${digest.slice(0, 12)}…)`,
        );
      }

      let collection = null;
      try {
        collection = JSON.parse(buffer.toString("utf8"));
      } catch {
        problems.push(`${layer.file} is not valid JSON`);
      }

      if (collection) {
        if (collection.type !== "FeatureCollection") {
          problems.push(
            `${layer.file} is a ${collection.type ?? "unknown object"}, not a FeatureCollection`,
          );
        } else if (!Array.isArray(collection.features)) {
          problems.push(`${layer.file} has no features array`);
        } else if (Array.isArray(layer.bbox) && layer.bbox.length === 4) {
          const result = checkFeatureCollection(collection, layer, layer.bbox);
          problems.push(...result.problems);
          if (result.problems.length === 0 && result.computedBbox) {
            summary = {
              id: layer.id,
              title: layer.title,
              classification: layer.classification,
              description: layer.description ?? "",
              geometry: layer.geometry,
              file: layer.file,
              url: `/api/gis/layers/${layer.id}`,
              sha256: layer.sha256,
              bbox: layer.bbox,
              computedBbox: result.computedBbox,
              featureCount: result.featureCount,
              classProperty: layer.classProperty ?? null,
              classColors: layer.classColors ?? null,
              fillOpacity: layer.fillOpacity ?? 0.45,
              strokeColor: layer.strokeColor ?? "#334155",
              source: {
                publisher: layer.source.publisher,
                url: layer.source.url,
                license: layer.source.license,
                retrievedAt: layer.source.retrievedAt,
                note: layer.source.note ?? "",
              },
              verifiedBy: layer.verifiedBy,
              verifiedAt: layer.verifiedAt,
            };
          }
        }
      }
    }

    if (problems.length === 0 && summary) {
      layers.push(summary);
      console.log(
        `  ✓ ${id}  (${layer.geometry}, ${summary.featureCount} feature${summary.featureCount === 1 ? "" : "s"}, sha256 ok)`,
      );
    } else if (problems.length === 0) {
      // Metadata and checksum are fine but the geometry did not produce a
      // summary; treat that as a rejection rather than publishing half a layer.
      problems.push("the geometry could not be summarised");
      console.log(`  ✗ ${id}`);
      for (const problem of problems) console.log(`      ${problem}`);
      rejected.push({ id, problems });
    } else {
      console.log(`  ✗ ${id}`);
      for (const problem of problems) console.log(`      ${problem}`);
      rejected.push({ id, problems });
    }
  }

  if (hashesWritten > 0) {
    await writeFile(
      options.manifest,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    console.log(
      `\nwrote ${hashesWritten} sha256 value${hashesWritten === 1 ? "" : "s"} into ${path.relative(REPO_ROOT, options.manifest)}`,
    );
  }

  const artifact = {
    version: 1,
    generatedAt: new Date().toISOString(),
    manifest: path.relative(REPO_ROOT, options.manifest),
    layers,
    rejected,
  };
  await mkdir(path.dirname(options.artifact), { recursive: true });
  await writeFile(
    options.artifact,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `\n${layers.length} verified, ${rejected.length} rejected → ${path.relative(REPO_ROOT, options.artifact)}`,
  );

  if (rejected.length > 0) {
    console.log(
      "\nRejected layers are not drawn. Fix the problems above and re-run.",
    );
    return 1;
  }
  return 0;
}

process.exitCode = await main();
