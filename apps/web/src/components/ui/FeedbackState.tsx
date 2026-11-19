import type { ReactNode } from "react";

import { cx } from "@/lib/classnames";

const toneClasses = {
  loading: "border-line bg-canvas-soft text-ink",
  empty: "border-line bg-transparent text-ink",
  unavailable: "border-warning/30 bg-warning/5 text-ink",
  error: "border-danger/30 bg-danger/5 text-ink",
};

export interface FeedbackStateProps {
  action?: ReactNode;
  description: string;
  title: string;
  tone: keyof typeof toneClasses;
}

export function FeedbackState({
  action,
  description,
  title,
  tone,
}: FeedbackStateProps) {
  const isLoading = tone === "loading";
  const isError = tone === "error";

  return (
    <div
      role={isError ? "alert" : isLoading ? "status" : undefined}
      aria-live={isLoading ? "polite" : undefined}
      className={cx(
        "flex min-h-40 flex-col items-start justify-between gap-6 rounded-panel border p-5",
        toneClasses[tone],
      )}
    >
      <div>
        <span
          aria-hidden="true"
          className={cx(
            "mb-4 block size-3 rounded-full",
            tone === "loading" &&
              "animate-pulse bg-brand-secondary motion-reduce:animate-none",
            tone === "empty" && "bg-muted",
            tone === "unavailable" && "bg-warning",
            tone === "error" && "bg-danger",
          )}
        />
        <h3 className="text-section">{title}</h3>
        <p className="text-body mt-1 max-w-sm text-current/65">{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function LoadingState() {
  return (
    <FeedbackState
      tone="loading"
      title="Loading evidence"
      description="Retrieving the available research context for this view."
    />
  );
}

export function EmptyState({ action }: { action?: ReactNode }) {
  return (
    <FeedbackState
      tone="empty"
      title="No forecast selected"
      description="Choose a supported city and forecast date to review evidence."
      action={action}
    />
  );
}

export function UnavailableState({ action }: { action?: ReactNode }) {
  return (
    <FeedbackState
      tone="unavailable"
      title="Model output unavailable"
      description="The required model or supporting inputs are not available for this request."
      action={action}
    />
  );
}

export function ErrorState({ action }: { action?: ReactNode }) {
  return (
    <FeedbackState
      tone="error"
      title="Evidence could not be loaded"
      description="Keep the current context visible and offer a controlled retry."
      action={action}
    />
  );
}
