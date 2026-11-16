"use client";

import { convexUrl } from "@/lib/convex-functions";
import { useStoredOutlook, type OutlookSnapshot } from "@/lib/outlook";

export const convexConfigured = Boolean(convexUrl);

/**
 * Renders nothing. Its only job is to subscribe to the latest stored outlook and
 * hand it to the dashboard, which lets a page reload show the previous run
 * without spending another weather or ML call.
 *
 * Mounted only when a Convex deployment URL exists, because `useQuery` requires
 * a ConvexProvider — and ConvexClientProvider deliberately renders its children
 * bare when the URL is missing.
 */
export function OutlookBridge({
  locationCode,
  onSnapshot,
}: {
  locationCode: string;
  onSnapshot: (snapshot: OutlookSnapshot) => void;
}) {
  useStoredOutlook(locationCode, onSnapshot);
  return null;
}
