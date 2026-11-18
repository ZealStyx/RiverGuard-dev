/**
 * GET  /api/reviews?limit=50&runId=  — recorded LGU decisions, newest first
 * POST /api/reviews                 — record one decision against a stored run
 *
 * A review is only accepted when the run it refers to can be shown: with the
 * local store that means the run id exists in `.data/runs.json`. When a Convex
 * deployment is configured the runs live there, so the id is taken as given and
 * the deployment's own referential check applies.
 *
 * The decision is written before the audit entry; a failed audit write is
 * reported in the response rather than failing the review the operator already
 * made.
 */

import { NextResponse } from "next/server";

import { LOCAL_ACTOR } from "@/lib/audit";
import { recordAuditEvent } from "@/lib/audit-store";
import { convexUrl } from "@/lib/convex-functions";
import {
  isReviewDecision,
  REVIEW_DECISION_LABEL,
  type ReviewDecision,
} from "@/lib/reviews";
import { listReviews, listReviewsForRun, saveReview } from "@/lib/review-store";
import { getLocalRun } from "@/lib/run-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");
  const requested = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(Math.trunc(requested), 1), 200)
    : 50;

  try {
    const reviews = runId
      ? await listReviewsForRun(runId)
      : await listReviews(limit);
    return NextResponse.json({ reviews });
  } catch (error) {
    return NextResponse.json(
      {
        error: "The review store could not be read.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}

interface ReviewBody {
  runId?: unknown;
  decision?: unknown;
  note?: unknown;
  reviewer?: unknown;
}

export async function POST(request: Request) {
  let body: ReviewBody;
  try {
    body = (await request.json()) as ReviewBody;
  } catch {
    return NextResponse.json(
      { error: "The request body must be JSON." },
      { status: 400 },
    );
  }

  const runId = typeof body.runId === "string" ? body.runId.trim() : "";
  const reviewer =
    typeof body.reviewer === "string" ? body.reviewer.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!runId) {
    return NextResponse.json(
      { error: "A review needs the stored run it assesses." },
      { status: 400 },
    );
  }
  if (!isReviewDecision(body.decision)) {
    return NextResponse.json(
      {
        error: "Choose a decision: approved, changes requested, or escalated.",
      },
      { status: 400 },
    );
  }
  const decision: ReviewDecision = body.decision;
  if (reviewer.length < 2 || reviewer.length > 80) {
    return NextResponse.json(
      { error: "Record a reviewer name (2–80 characters)." },
      { status: 400 },
    );
  }
  if (decision !== "approved" && note.length < 10) {
    return NextResponse.json(
      {
        error:
          "A note of at least 10 characters is required when requesting changes or escalating.",
      },
      { status: 400 },
    );
  }
  if (note.length > 2000) {
    return NextResponse.json(
      { error: "Keep the note under 2000 characters." },
      { status: 400 },
    );
  }

  if (!convexUrl) {
    const run = await getLocalRun(runId);
    if (!run) {
      return NextResponse.json(
        { error: "No stored run with that identifier.", runId },
        { status: 404 },
      );
    }
  }

  try {
    const review = await saveReview({ runId, decision, note, reviewer });
    const audited = await recordAuditEvent({
      actor: LOCAL_ACTOR,
      action: "review.recorded",
      target: runId,
      outcome: "success",
      detail: `${REVIEW_DECISION_LABEL[decision]} by ${reviewer}.`,
    });

    return NextResponse.json(
      {
        review,
        warnings: audited
          ? []
          : ["The review was saved, but the audit entry could not be written."],
      },
      { status: 201 },
    );
  } catch (error) {
    await recordAuditEvent({
      actor: LOCAL_ACTOR,
      action: "review.recorded",
      target: runId,
      outcome: "failure",
      detail: `Review could not be saved: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    });
    return NextResponse.json(
      {
        error: "The review could not be saved.",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
