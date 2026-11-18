/**
 * Local audit store — `.data/audit.json`.
 *
 * Same conventions as the run and review stores: one JSON file, newest first,
 * capped, atomic writes, serialised writers, unreadable file treated as empty.
 *
 * Recording is best-effort by design: a failed audit write must never turn a
 * successful forecast or review into an error response. The caller gets a
 * boolean and decides what to say.
 *
 * Server-only.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  isAuditAction,
  isAuditOutcome,
  manilaDayEnd,
  manilaDayStart,
  type AuditAction,
  type AuditEvent,
  type AuditFilters,
  type AuditOutcome,
} from "./audit";

const STORE_VERSION = 1;
const MAX_EVENTS = 500;

interface StoreFile {
  version: number;
  events: AuditEvent[];
}

export interface NewAuditEvent {
  actor: string;
  action: AuditAction;
  target: string;
  outcome: AuditOutcome;
  detail: string;
}

/** `<repo>/.data/audit.json`, overridable with `AUDIT_STORE_PATH`. */
function storePath(): string {
  const override = process.env.AUDIT_STORE_PATH?.trim();
  if (override) return path.resolve(override);

  const cwd = process.cwd();
  const repoRoot =
    path.basename(cwd) === "web" && path.basename(path.dirname(cwd)) === "apps"
      ? path.resolve(cwd, "..", "..")
      : cwd;
  return path.join(repoRoot, ".data", "audit.json");
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

function isEventRecord(value: unknown): value is AuditEvent {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.eventId === "string" &&
    typeof event.at === "number" &&
    typeof event.actor === "string" &&
    isAuditAction(event.action) &&
    typeof event.target === "string" &&
    isAuditOutcome(event.outcome) &&
    typeof event.detail === "string"
  );
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (!parsed || !Array.isArray(parsed.events)) {
      throw new Error("missing events array");
    }
    return {
      version: STORE_VERSION,
      events: parsed.events.filter(isEventRecord),
    };
  } catch (error) {
    if (isMissingFile(error)) return { version: STORE_VERSION, events: [] };
    console.warn(
      `[audit-store] ignoring unreadable ${storePath()}: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    return { version: STORE_VERSION, events: [] };
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  const target = storePath();
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(temp, target);
}

let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(work, work);
  writeQueue = next.catch(() => undefined);
  return next;
}

/** Returns `false` when the event could not be written; never throws. */
export async function recordAuditEvent(input: NewAuditEvent): Promise<boolean> {
  const record: AuditEvent = {
    eventId: `event-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`,
    at: Date.now(),
    actor: input.actor,
    action: input.action,
    target: input.target,
    outcome: input.outcome,
    detail: input.detail,
  };

  try {
    await enqueue(async () => {
      const store = await readStore();
      await writeStore({
        version: STORE_VERSION,
        events: [record, ...store.events].slice(0, MAX_EVENTS),
      });
    });
    return true;
  } catch (error) {
    console.warn(
      `[audit-store] could not record ${record.action}: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    return false;
  }
}

/** Newest first, filtered here rather than in the screen. */
export async function listAuditEvents(
  filters: AuditFilters = {},
): Promise<AuditEvent[]> {
  const store = await readStore();
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), MAX_EVENTS);
  const actor = filters.actor?.trim().toLowerCase() ?? "";
  const from = filters.from ? manilaDayStart(filters.from) : null;
  const to = filters.to ? manilaDayEnd(filters.to) : null;
  const action =
    filters.action && filters.action !== "all" ? filters.action : null;
  const outcome =
    filters.outcome && filters.outcome !== "all" ? filters.outcome : null;

  return store.events
    .filter((event) => {
      if (actor && !event.actor.toLowerCase().includes(actor)) return false;
      if (action && event.action !== action) return false;
      if (outcome && event.outcome !== outcome) return false;
      if (from !== null && event.at < from) return false;
      if (to !== null && event.at > to) return false;
      return true;
    })
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

export async function countAuditEvents(): Promise<number> {
  const store = await readStore();
  return store.events.length;
}
