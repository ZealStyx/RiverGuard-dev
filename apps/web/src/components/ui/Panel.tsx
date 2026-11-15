import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/classnames";

const toneClasses = {
  canvas: "bg-canvas-soft text-ink",
  selection: "bg-brand-secondary text-white",
  primary: "bg-brand-primary text-white",
  outline: "border border-line bg-transparent text-ink",
};

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "compact" | "default" | "spacious";
  tone?: keyof typeof toneClasses;
}

const paddingClasses = {
  compact: "p-3",
  default: "p-4",
  spacious: "p-6",
};

export function Panel({
  children,
  className,
  padding = "default",
  tone = "canvas",
  ...props
}: PanelProps) {
  return (
    <div
      {...props}
      className={cx(
        "rounded-panel",
        toneClasses[tone],
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
