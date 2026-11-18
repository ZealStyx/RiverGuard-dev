/**
 * Local review store — where an LGU decision is kept.
 *
 * Same reasoning as `lib/run-store.ts`: with no Convex deployment the prototype
 * must still be able to record something the next screen can read, and the only
 * place it is allowed to run is this machine. One JSON file, newest first,
 * capped, atomic writes, and a corrupt file reads as empty rather than throwing
 * — losing review history must not break the queue.
 *
 * Server-only: `node:fs` is used here and nowhere in the client bundle.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { isReviewDecision, type RunReview } from "./reviews";

const STORE_VERSION = 1;
const MAX_REVIEWS = 500;

interface StoreFile {
  version: number;
  reviews: RunReview[];
}

export interface NewReview {
  runId: string;
  decision: RunReview["decision"];
  note: string;
  reviewer: string;
}

/** `<repo>/.data/reviews.json`, overridable with `REVIEW_STORE_PATH`. */
function storePath(): string {
  const override = process.env.REVIEW_STORE_PATH?.trim();
  if (override) return path.resolve(override);

  const cwd = process.cwd();
  const repoRoot =
    path.basename(cwd) === "web" && path.basename(path.dirname(cwd)) === "apps"
      ? path.resolve(cwd, "..", "..")
      : cwd;
  return path.join(repoRoot, ".data", "reviews.json");
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

function isReviewRecord(value: unknown): value is RunReview {
  if (typeof value !== "object" || value === null) return false;
  const review = value as Record<string, unknown>;
  return (
    typeof review.reviewId === "string" &&
    typeof review.runId === "string" &&
    isReviewDecision(review.decision) &&
    typeof review.note === "string" &&
    typeof review.reviewer === "string" &&
    typeof review.createdAt === "number"
  );
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (!parsed || !Array.isArray(parsed.reviews)) {
      throw new Error("missing reviews array");
    }
    return {
      version: STORE_VERSION,
      reviews: parsed.reviews.filter(isReviewRecord),
    };
  } catch (error) {
    if (isMissingFile(error)) return { version: STORE_VERSION, reviews: [] };
    console.warn(
      `[review-store] ignoring unreadable ${storePath()}: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    return { version: STORE_VERSION, reviews: [] };
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

/** Newest first. */
export async function listReviews(limit = 50): Promise<RunReview[]> {
  const store = await readStore();
  return [...store.reviews]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, Math.max(0, limit));
}

export async function listReviewsForRun(runId: string): Promise<RunReview[]> {
  const store = await readStore();
  return store.reviews
    .filter((review) => review.runId === runId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function countReviews(): Promise<number> {
  const store = await readStore();
  return store.reviews.length;
}

export async function saveReview(input: NewReview): Promise<RunReview> {
  const record: RunReview = {
    reviewId: `review-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`,
    runId: input.runId,
    decision: input.decision,
    note: input.note,
    reviewer: input.reviewer,
    createdAt: Date.now(),
  };

  return await enqueue(async () => {
    const store = await readStore();
    await writeStore({
      version: STORE_VERSION,
      reviews: [record, ...store.reviews].slice(0, MAX_REVIEWS),
    });
    return record;
  });
}
