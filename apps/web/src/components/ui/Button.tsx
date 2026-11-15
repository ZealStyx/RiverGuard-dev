import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/classnames";

const variantClasses = {
  primary:
    "bg-brand-primary text-white hover:bg-brand-primary-hover active:bg-brand-primary-active",
  secondary:
    "bg-brand-secondary text-white hover:bg-brand-secondary-hover active:bg-brand-primary",
  quiet:
    "border border-line bg-transparent text-ink hover:bg-canvas-soft active:bg-line",
  danger: "bg-danger text-white hover:bg-danger/90 active:bg-danger/80",
};

const sizeClasses = {
  small: "min-h-7 px-2.5",
  medium: "min-h-8 px-3",
  large: "min-h-10 px-4",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  size?: keyof typeof sizeClasses;
  variant?: keyof typeof variantClasses;
}

export function Button({
  children,
  className,
  disabled,
  loading = false,
  loadingLabel = "Working",
  size = "medium",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "text-button inline-flex items-center justify-center gap-2 rounded-control transition-colors motion-reduce:transition-none",
        "disabled:cursor-not-allowed disabled:opacity-45",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        />
      ) : null}
      <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
        {loading ? loadingLabel : children}
      </span>
    </button>
  );
}
