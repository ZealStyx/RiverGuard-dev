/**
 * Local run store — the fallback used when no Convex deployment is configured.
 *
 * Why it exists: without `NEXT_PUBLIC_CONVEX_URL` a completed run used to exist
 * only in the HTTP response that produced it, so run history, run detail and the
 * comparison screen had nothing to read. This keeps those records on the
 * developer's machine instead, which is also the only place this prototype is
 * allowed to run.
 *
 * Shape: one JSON file, newest run first, capped at `MAX_RUNS`. Writes are
 * serialised and atomic (temp file + rename) so a crash mid-write cannot leave a
 * half-parsed file behind. A corrupt file is treated as empty and reported, not
 * thrown at the caller — losing local history must not break a forecast.
 *
 * Server-only: `node:fs` is used here and nowhere in the client bundle.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StoredRun, StoredRunDay } from "./runs";

const STORE_VERSION = 1;
const MAX_RUNS = 200;

interface StoreFile {
  version: number;
  runs: Array<Omit<StoredRun, "source">>;
}

export interface NewLocalRun {
  locationCode: string;
  locationName: string;
  issueDate: string;
  provider: string;
  providerDegraded: boolean;
  retrievedAt: number;
  modelVersion: string;
  modelKind: string | null;
  featureSchemaVersion: string;
  operatingThreshold: number;
  warning: string;
  days: StoredRunDay[];
}

/**
 * `<repo>/.data/runs.json`.
 *
 * `next dev` runs with `apps/web` as its working directory, so the store has to
 * walk back up. `RUN_STORE_PATH` overrides the location for tests or for a
 * checkout where the repository root is somewhere else.
 */
function storePath(): string {
  const override = process.env.RUN_STORE_PATH?.trim();
  if (override) return path.resolve(override);

  const cwd = process.cwd();
  const repoRoot =
    path.basename(cwd) === "web" && path.basename(path.dirname(cwd)) === "apps"
      ? path.resolve(cwd, "..", "..")
      : cwd;
  return path.join(repoRoot, ".data", "runs.json");
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (!parsed || !Array.isArray(parsed.runs)) {
      throw new Error("missing runs array");
    }
    return {
      version: STORE_VERSION,
      runs: parsed.runs.filter(isStoredRunRecord),
    };
  } catch (error) {
    if (isMissingFile(error)) return { version: STORE_VERSION, runs: [] };
    console.warn(
      `[run-store] ignoring unreadable ${storePath()}: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    return { version: STORE_VERSION, runs: [] };
  }
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

function isStoredRunRecord(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const run = value as Record<string, unknown>;
  return (
    typeof run.runId === "string" &&
    typeof run.requestedAt === "number" &&
    Array.isArray(run.dayRows)
  );
}

async function writeStore(store: StoreFile): Promise<void> {
  const target = storePath();
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(temp, target);
}

// One writer at a time: two concurrent forecasts must not clobber each other.
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(work, work);
  writeQueue = next.catch(() => undefined);
  return next;
}

/** Newest first. */
export async function listLocalRuns(limit = 25): Promise<StoredRun[]> {
  const store = await readStore();
  return store.runs
    .slice(0, Math.max(0, limit))
    .map((run) => ({ ...run, source: "local" as const }));
}

export async function getLocalRun(runId: string): Promise<StoredRun | null> {
  const store = await readStore();
  const run = store.runs.find((row) => row.runId === runId);
  return run ? { ...run, source: "local" as const } : null;
}

export async function saveLocalRun(input: NewLocalRun): Promise<StoredRun> {
  const record: Omit<StoredRun, "source"> = {
    runId: `local-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`,
    requestedAt: Date.now(),
    completedAt: Date.now(),
    provider: input.provider,
    providerDegraded: input.providerDegraded,
    status: "completed",
    locations: [input.locationName],
    days: input.days.length,
    alerts: input.days.filter((day) => day.riskLevel === "elevated").length,
    modelVersion: input.modelVersion,
    issueDate: input.issueDate,
    retrievedAt: input.retrievedAt,
    featureSchemaVersion: input.featureSchemaVersion,
    operatingThreshold: input.operatingThreshold,
    warning: input.warning,
    modelKind: input.modelKind,
    dayRows: input.days,
  };

  return await enqueue(async () => {
    const store = await readStore();
    const runs = [record, ...store.runs].slice(0, MAX_RUNS);
    await writeStore({ version: STORE_VERSION, runs });
    return { ...record, source: "local" as const };
  });
}
