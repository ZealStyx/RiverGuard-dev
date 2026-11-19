import type { ReactNode } from "react";

import { cx } from "@/lib/classnames";

const positionClasses = {
  top: "bottom-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2",
  right: "top-1/2 left-[calc(100%+0.5rem)] -translate-y-1/2",
  bottom: "top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2",
  left: "top-1/2 right-[calc(100%+0.5rem)] -translate-y-1/2",
};

export interface TooltipProps {
  children: ReactNode;
  content: string;
  side?: keyof typeof positionClasses;
}

export function Tooltip({ children, content, side = "top" }: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        aria-hidden="true"
        role="tooltip"
        className={cx(
          "text-metadata pointer-events-none absolute z-30 w-max max-w-52 rounded-control bg-brand-primary px-2.5 py-1.5 text-left text-white opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none",
          positionClasses[side],
        )}
      >
        {content}
      </span>
    </span>
  );
}
