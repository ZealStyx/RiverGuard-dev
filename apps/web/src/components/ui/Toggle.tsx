"use client";

import { useState } from "react";

import { cx } from "@/lib/classnames";

export interface ToggleProps {
  className?: string;
  defaultPressed?: boolean;
  description?: string;
  disabled?: boolean;
  label: string;
  onPressedChange?: (pressed: boolean) => void;
  pressed?: boolean;
}

export function Toggle({
  className,
  defaultPressed = false,
  description,
  disabled = false,
  label,
  onPressedChange,
  pressed,
}: ToggleProps) {
  const [internalPressed, setInternalPressed] = useState(defaultPressed);
  const isControlled = pressed !== undefined;
  const isPressed = isControlled ? pressed : internalPressed;

  function handleClick() {
    const nextPressed = !isPressed;
    if (!isControlled) setInternalPressed(nextPressed);
    onPressedChange?.(nextPressed);
  }

  return (
    <div className={cx("flex items-center justify-between gap-4", className)}>
      <div>
        <p className="text-button text-ink">{label}</p>
        {description ? (
          <p className="text-metadata mt-0.5 text-muted">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPressed}
        aria-label={label}
        disabled={disabled}
        onClick={handleClick}
        className={cx(
          "relative h-6 w-10 shrink-0 rounded-full border transition-colors motion-reduce:transition-none",
          "disabled:cursor-not-allowed disabled:opacity-45",
          isPressed
            ? "border-brand-secondary bg-brand-secondary"
            : "border-line bg-canvas",
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            "absolute top-1/2 left-0 size-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none",
            isPressed ? "translate-x-5" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}
