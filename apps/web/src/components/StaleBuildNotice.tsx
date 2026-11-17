"use client";

import { Warning } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { appBuild } from "./BuildStamp";

/**
 * Says out loud what a hydration mismatch only hints at.
 *
 * A tab keeps the JavaScript it loaded. When the server moves to a newer build —
 * you pull, rebuild, restart `next dev` — that tab is running older code, and
 * React reports the disagreement as "Hydration failed" on whatever element
 * changed. This compares the bundle's build stamp with `GET /api/version` and,
 * when they differ, offers the one action that fixes it.
 *
 * It renders nothing until the comparison has actually happened, so it can never
 * cause the mismatch it exists to explain.
 */
export function StaleBuildNotice() {
  const [serverBuild, setServerBuild] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { build?: string | null };
        if (!cancelled) setServerBuild(data.build?.trim() || null);
      } catch {
        // Offline or the route is unavailable: nothing to compare against, and
        // guessing would be worse than silence.
      }
    };

    void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void check(), 60_000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  if (!appBuild || !serverBuild || serverBuild === appBuild) return null;

  return (
    <div
      role="status"
      className="text-metadata fixed inset-x-0 bottom-0 z-[80] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-warning/40 bg-canvas-soft/95 px-4 py-2 text-ink shadow-lg backdrop-blur-sm"
    >
      <Warning aria-hidden="true" size={15} className="text-warning" />
      <span>
        This tab is running build <strong>{appBuild}</strong>; the server is on{" "}
        <strong>{serverBuild}</strong>.
      </span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="text-button rounded-control border border-line px-2 py-1 hover:bg-canvas"
      >
        Reload to update
      </button>
    </div>
  );
}
