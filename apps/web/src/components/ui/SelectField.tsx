import type { ReactNode, SelectHTMLAttributes } from "react";

import { cx } from "@/lib/classnames";

export interface SelectFieldProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "id"
> {
  children: ReactNode;
  error?: string;
  hint?: string;
  id: string;
  label: string;
}

export function SelectField({
  children,
  className,
  error,
  hint,
  id,
  label,
  ...props
}: SelectFieldProps) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-button text-ink">
        {label}
      </label>
      <select
        {...props}
        id={id}
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        className={cx(
          "text-body min-h-9 w-full appearance-none rounded-control border bg-canvas-soft px-3 pr-9 text-ink",
          "disabled:cursor-not-allowed disabled:opacity-45",
          error ? "border-danger" : "border-line hover:border-muted",
          className,
        )}
      >
        {children}
      </select>
      {error ? (
        <p id={`${id}-error`} className="text-metadata text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-metadata text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
