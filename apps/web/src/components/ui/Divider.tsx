import type { HTMLAttributes } from "react";

import { cx } from "@/lib/classnames";

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export function Divider({
  className,
  orientation = "horizontal",
  ...props
}: DividerProps) {
  return (
    <div
      {...props}
      role="separator"
      aria-orientation={orientation}
      className={cx(
        "shrink-0 bg-current/15",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}
