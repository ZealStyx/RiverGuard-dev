import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/classnames";

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label"
> {
  children: ReactNode;
  label: string;
  tone?: "light" | "dark";
}

export function IconButton({
  children,
  className,
  label,
  tone = "light",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      className={cx(
        "inline-flex size-8 items-center justify-center rounded-control border transition-colors motion-reduce:transition-none",
        "disabled:cursor-not-allowed disabled:opacity-45",
        tone === "dark"
          ? "border-white/15 bg-brand-primary text-white hover:bg-brand-secondary"
          : "border-line bg-canvas-soft text-ink hover:bg-white",
        className,
      )}
    >
      <span aria-hidden="true" className="text-section leading-none">
        {children}
      </span>
    </button>
  );
}
