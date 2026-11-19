import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/classnames";

export interface SectionHeadingProps extends HTMLAttributes<HTMLDivElement> {
  action?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}

export function SectionHeading({
  action,
  className,
  description,
  eyebrow,
  title,
  ...props
}: SectionHeadingProps) {
  return (
    <div
      {...props}
      className={cx("flex items-start justify-between gap-4", className)}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-metadata mb-1 uppercase tracking-[0.12em] text-current/60">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-section text-balance">{title}</h2>
        {description ? (
          <p className="text-body mt-1 max-w-2xl text-pretty text-current/65">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
