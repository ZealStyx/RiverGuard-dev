/**
 * Server-side access to the verified local GIS layers.
 *
 * Reads only two things:
 *
 *   1. `apps/web/src/generated/gis-layers.json` — produced by
 *      `npm run gis:verify`, so the list of drawable layers is a code-reviewed
 *      artefact rather than something discovered at runtime;
 *   2. the geometry files themselves in `data/gis` (or `GIS_DATA_DIR`), which
 *      `GET /api/gis/layers/<id>` streams after re-checking the checksum.
 *
 * Nothing leaves the machine: no tile service, no geocoder, no "GIS API". That
 * is deliberate — a hazard polygon that came from nowhere is worse than no
 * polygon.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  GisLayerSummary,
  GisLayersResponse,
  GisRejectedLayer,
} from "./gis-types";

const ARTIFACT_FILE = path.join("src", "generated", "gis-layers.json");

interface GisArtifact {
  version?: number;
  generatedAt?: string;
  manifest?: string;
  layers?: GisLayerSummary[];
  rejected?: GisRejectedLayer[];
}

/** Repository root, judged from the working directory the server was started in. */
function repoRoot(): string {
  const cwd = process.cwd();
  return cwd.endsWith(path.join("apps", "web"))
    ? path.resolve(cwd, "..", "..")
    : cwd;
}

export function gisDataDir(): string {
  const override = process.env.GIS_DATA_DIR?.trim();
  if (override) return path.resolve(override);
  return path.join(repoRoot(), "data", "gis");
}

function artifactPath(): string {
  // `GIS_ARTIFACT_PATH` exists so verification can be exercised against a
  // scratch artifact without editing the committed one.
  const override = process.env.GIS_ARTIFACT_PATH?.trim();
  if (override) return path.resolve(override);
  // The artifact lives beside the source; when the server runs from the repo
  // root (tests, scripts) it is still reachable from there.
  return path.join(repoRoot(), "apps", "web", ARTIFACT_FILE);
}

let cached: { at: number; response: GisLayersResponse } | null = null;

/**
 * The verified layers, as the API and the screens see them.
 *
 * Cached for a second so a page that asks twice does not re-read the file, and
 * so dropping in a new layer only needs a reload rather than a restart.
 */
export async function loadGisLayers(): Promise<GisLayersResponse> {
  const now = Date.now();
  if (cached && now - cached.at < 1000) return cached.response;

  const unavailable = (error: string): GisLayersResponse => ({
    status: "unavailable",
    layers: [],
    rejected: [],
    error,
  });

  let artifact: GisArtifact;
  try {
    artifact = JSON.parse(
      await readFile(artifactPath(), "utf8"),
    ) as GisArtifact;
  } catch (error) {
    const response = unavailable(
      `No verified GIS layer list at apps/web/src/generated/gis-layers.json. Run npm run gis:verify. (${
        error instanceof Error ? error.message : "unknown error"
      })`,
    );
    cached = { at: now, response };
    return response;
  }

  const layers = Array.isArray(artifact.layers) ? artifact.layers : [];
  const rejected = Array.isArray(artifact.rejected) ? artifact.rejected : [];
  const response: GisLayersResponse = {
    status: "ok",
    generatedAt: artifact.generatedAt,
    manifest: artifact.manifest,
    layers,
    rejected,
  };
  cached = { at: now, response };
  return response;
}

export interface GisLayerFile {
  body: string;
  layer: GisLayerSummary;
}

export class GisLayerError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409 | 503,
  ) {
    super(message);
    this.name = "GisLayerError";
  }
}

/**
 * The geometry for one verified layer, checksum-checked at serve time.
 *
 * The artifact proves the file was verified when the verifier ran. Re-hashing
 * here proves the file on disk is still that file — the map will not silently
 * draw geometry that changed after review.
 */
export async function readGisLayer(id: string): Promise<GisLayerFile> {
  const { layers } = await loadGisLayers();
  const layer = layers.find((candidate) => candidate.id === id);
  if (!layer) {
    throw new GisLayerError(
      `Layer "${id}" is not in the verified layer list.`,
      404,
    );
  }

  // `layer.file` comes from the verifier, which only accepts a bare .geojson
  // filename; resolve anyway and refuse escapes so a crafted artifact cannot
  // read outside data/gis.
  const dataDir = gisDataDir();
  const filePath = path.resolve(dataDir, layer.file);
  if (!filePath.startsWith(dataDir + path.sep)) {
    throw new GisLayerError(`Layer "${id}" points outside data/gis.`, 409);
  }

  let body: Buffer;
  try {
    body = await readFile(filePath);
  } catch {
    throw new GisLayerError(
      `Layer "${id}" is listed as verified but ${layer.file} is missing from data/gis. Re-run npm run gis:verify.`,
      409,
    );
  }

  const digest = createHash("sha256").update(body).digest("hex");
  if (digest !== layer.sha256) {
    throw new GisLayerError(
      `Layer "${id}" changed after verification (sha256 ${digest.slice(0, 12)}… ≠ ${layer.sha256.slice(0, 12)}…). Re-run npm run gis:verify.`,
      409,
    );
  }

  return { body: body.toString("utf8"), layer };
}
