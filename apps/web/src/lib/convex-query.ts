"use client";

/**
 * A Convex query that reports failure instead of throwing.
 *
 * `useQuery` throws while rendering when the deployment rejects the query — for
 * example, right after a pull when `convex/` has a new function but the
 * deployment has not been pushed yet:
 *
 *     Uncaught Error: [CONVEX Q(forecasts:latestOutlook)] Server Error
 *     Could not find public function for 'forecasts:latestOutlook'.
 *
 * That throw unmounts the subtree (and, with no error boundary, the whole
 * screen), so a stale deployment turned the dashboard blank instead of saying
 * what was wrong. This wrapper uses Convex's state-returning query form, so the
 * failure is data a screen can render, and `throwOnError` stays off.
 *
 * Use it for queries whose absence is survivable. A screen that cannot work
 * without the query should still show the error, not hide it.
 */

import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import { useQuery_experimental } from "convex/react";

export interface ConvexQueryState<T> {
  /** `undefined` until the first result arrives. */
  data: T | undefined;
  /** Set when the deployment rejected the query. */
  error: Error | null;
}

export function useConvexQueryResult<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query>,
): ConvexQueryState<FunctionReturnType<Query>> {
  const result = useQuery_experimental({ query, args, throwOnError: false });

  if (result.status === "success") {
    return { data: result.data, error: null };
  }
  if (result.status === "error") {
    return { data: undefined, error: result.error };
  }
  return { data: undefined, error: null };
}
