/**
 * LGU review decisions, as records.
 *
 * The review queue linked to a form that could never be submitted: reviews
 * attach to a stored run, and the prototype had nowhere to put the decision, so
 * the form rendered "No run selected" under every id. A decision is now a small
 * record written next to the runs it refers to (`.data/reviews.json`), which is
 * enough for the queue to show a status, for the run page to show its history
 * and for the overview to count what is still open.
 *
 * Nothing here imports Node APIs: the browser needs these shapes too.
 */

export type ReviewDecision = "approved" | "changes-requested" | "escalated";

export interface RunReview {
  reviewId: string;
  /** The stored run being assessed. */
  runId: string;
  decision: ReviewDecision;
  /** Free-text rationale. Required for anything but a plain approval. */
  note: string;
  /** Who recorded it. Unauthenticated, so this is a typed name. */
  reviewer: string;
  createdAt: number;
}

export const REVIEW_DECISION_LABEL: Record<ReviewDecision, string> = {
  approved: "Approved for internal use",
  "changes-requested": "Changes requested",
  escalated: "Escalated",
};

/** Short label for a table cell. */
export function reviewDecisionLabel(decision: ReviewDecision): string {
  return REVIEW_DECISION_LABEL[decision];
}

export function isReviewDecision(value: unknown): value is ReviewDecision {
  return (
    value === "approved" ||
    value === "changes-requested" ||
    value === "escalated"
  );
}

/** Newest first, one entry per run: the latest decision is the current state. */
export function latestReviewByRun(
  reviews: RunReview[],
): Map<string, RunReview> {
  const latest = new Map<string, RunReview>();
  for (const review of reviews) {
    const current = latest.get(review.runId);
    if (!current || review.createdAt > current.createdAt) {
      latest.set(review.runId, review);
    }
  }
  return latest;
}
