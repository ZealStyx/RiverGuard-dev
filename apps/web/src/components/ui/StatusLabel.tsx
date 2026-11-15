import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/classnames";

const toneClasses = {
  neutral: "border-line bg-canvas-soft text-muted",
  experimental:
    "border-brand-secondary/30 bg-brand-secondary-soft text-brand-primary",
  available: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  unavailable: "border-ink/20 bg-ink/5 text-muted",
  unsupported: "border-line bg-transparent text-muted",
};

export interface StatusLabelProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: keyof typeof toneClasses;
}

export function StatusLabel({
  children,
  className,
  tone = "neutral",
  ...props
}: StatusLabelProps) {
  return (
    <span
      {...props}
      className={cx(
        "text-metadata inline-flex min-h-5 items-center rounded-full border px-2 py-0.5",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
