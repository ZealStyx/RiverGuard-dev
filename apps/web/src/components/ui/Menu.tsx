"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { cx } from "@/lib/classnames";

export interface MenuProps {
  /** Accessible name for the trigger button. */
  label: string;
  /** Trigger icon; rendered at 18px. */
  icon: ReactNode;
  /**
   * Panel contents. `close` dismisses the panel, for links and actions that
   * should not leave it open behind the page they navigate to.
   */
  children: (close: () => void) => ReactNode;
  /** Which edge of the panel lines up with the trigger. */
  align?: "start" | "end";
  /** Panel width, as a Tailwind class. */
  width?: string;
  /** Draws the trigger as engaged, e.g. while a count is waiting. */
  active?: boolean;
}

/**
 * An icon button with an attached panel.
 *
 * Written rather than pulled in because the whole workspace has to keep working
 * with no new dependency, and because the two panels that need it (recent
 * activity, account) are plain lists of links and buttons — not a menu that
 * needs arrow-key roving. `aria-expanded`/`aria-controls` describe the trigger
 * honestly, and Escape closes the panel and returns focus to the button.
 */
export function Menu({
  label,
  icon,
  children,
  align = "end",
  width = "w-72",
  active = false,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={cx(
          "inline-flex size-8 items-center justify-center rounded-control border transition-colors motion-reduce:transition-none",
          active || open
            ? "border-brand-secondary/40 bg-brand-secondary-soft text-brand-primary-ink"
            : "border-line bg-canvas-soft text-ink hover:bg-canvas",
        )}
      >
        <span aria-hidden="true" className="text-section leading-none">
          {icon}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          aria-label={label}
          className={cx(
            "absolute z-50 mt-2 max-h-[min(70vh,28rem)] overflow-y-auto rounded-panel border border-line bg-canvas p-2 text-ink shadow-xl",
            width,
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
