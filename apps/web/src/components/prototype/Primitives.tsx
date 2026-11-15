"use client";

import {
  ArrowRight,
  CaretDown,
  CheckCircle,
  Eye,
  EyeSlash,
  Info,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cx } from "@/lib/classnames";

type ActionVariant = "primary" | "secondary" | "quiet" | "danger";

const actionClasses: Record<ActionVariant, string> = {
  primary: "bg-brand-primary text-white hover:bg-brand-primary-hover",
  secondary: "bg-brand-secondary text-white hover:bg-brand-secondary-hover",
  quiet: "border border-line bg-canvas text-ink hover:bg-canvas-soft",
  danger: "bg-danger text-white hover:bg-danger/90",
};

export function ActionLink({
  children,
  className,
  href,
  variant = "primary",
}: {
  children: ReactNode;
  className?: string;
  href: string;
  variant?: ActionVariant;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "text-button inline-flex min-h-8 items-center justify-center gap-1.5 rounded-control px-3 transition-colors",
        actionClasses[variant],
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function PageHeading({
  actions,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-metadata mb-1 font-semibold uppercase tracking-[0.12em] text-brand-secondary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-page-title tracking-[-0.03em]">{title}</h1>
        <p className="text-body mt-1 max-w-2xl text-muted">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Surface({
  children,
  className,
  title,
  description,
  action,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  title?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-panel border border-line bg-canvas p-4",
        className,
      )}
    >
      {title || action ? (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title ? <h2 className="text-section">{title}</h2> : null}
            {description ? (
              <p className="text-metadata mt-0.5 text-muted">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Metric({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  detail: string;
  label: string;
  tone?: "neutral" | "primary" | "secondary" | "warning" | "danger";
  value: string;
}) {
  const toneClasses = {
    neutral: "text-ink",
    primary: "text-brand-primary",
    secondary: "text-brand-secondary",
    warning: "text-warning",
    danger: "text-danger",
  };

  return (
    <div className="rounded-panel border border-line bg-canvas p-3.5">
      <p className="text-metadata text-muted">{label}</p>
      <p className={cx("text-major-status mt-1", toneClasses[tone])}>{value}</p>
      <p className="text-metadata mt-1 text-muted">{detail}</p>
    </div>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const classes = {
    neutral: "border-line bg-canvas-soft text-muted",
    success: "border-success/25 bg-success/10 text-success",
    warning: "border-warning/25 bg-warning/10 text-warning",
    danger: "border-danger/25 bg-danger/10 text-danger",
    info: "border-brand-secondary/25 bg-brand-secondary-soft text-brand-primary",
  };
  return (
    <span
      className={cx(
        "text-metadata inline-flex items-center gap-1 rounded-full border px-2 py-1",
        classes[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Notice({
  children,
  className,
  title,
  tone = "info",
}: {
  children: ReactNode;
  className?: string;
  title: string;
  tone?: "info" | "warning" | "danger" | "success";
}) {
  const toneClasses = {
    info: "border-brand-secondary/25 bg-brand-secondary-soft text-brand-primary",
    warning: "border-warning/25 bg-warning/8 text-warning",
    danger: "border-danger/25 bg-danger/8 text-danger",
    success: "border-success/25 bg-success/8 text-success",
  };
  const Icon =
    tone === "danger"
      ? WarningCircle
      : tone === "warning"
        ? Warning
        : tone === "success"
          ? CheckCircle
          : Info;
  return (
    <div
      className={cx(
        "flex items-start gap-2.5 rounded-control border px-3 py-2.5",
        toneClasses[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" size={17} className="mt-0.5 shrink-0" />
      <div>
        <p className="text-button">{title}</p>
        <div className="text-metadata mt-0.5 text-current/80">{children}</div>
      </div>
    </div>
  );
}

export function TextField({
  error,
  hint,
  id,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  hint?: string;
  id: string;
  label: string;
}) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-button">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-describedby={descriptionId}
        aria-invalid={error ? true : undefined}
        className={cx(
          "text-body min-h-9 w-full rounded-control border bg-canvas px-3 text-ink placeholder:text-muted/70",
          error ? "border-danger" : "border-line hover:border-muted",
          props.className,
        )}
      />
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

export function PasswordField({
  error,
  hint,
  id,
  label,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  error?: string;
  hint?: string;
  id: string;
  label: string;
}) {
  const [visible, setVisible] = useState(false);
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-button">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={id}
          type={visible ? "text" : "password"}
          aria-describedby={descriptionId}
          aria-invalid={error ? true : undefined}
          className={cx(
            "text-body min-h-9 w-full rounded-control border bg-canvas px-3 pr-10 text-ink placeholder:text-muted/70",
            error ? "border-danger" : "border-line hover:border-muted",
            props.className,
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 inline-flex w-9 items-center justify-center text-muted hover:text-ink"
        >
          {visible ? <EyeSlash size={16} /> : <Eye size={16} />}
        </button>
      </div>
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

export function TextAreaField({
  error,
  hint,
  id,
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  hint?: string;
  id: string;
  label: string;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-button">
        {label}
      </label>
      <textarea
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cx(
          "text-body min-h-24 w-full resize-y rounded-control border bg-canvas px-3 py-2 text-ink placeholder:text-muted/70",
          error ? "border-danger" : "border-line hover:border-muted",
          props.className,
        )}
      />
      {error ? (
        <p className="text-metadata text-danger">{error}</p>
      ) : hint ? (
        <p className="text-metadata text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function SelectControl({
  children,
  id,
  label,
  hint,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
  hint?: string;
  id: string;
  label: string;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-button">
        {label}
      </label>
      <div className="relative">
        <select
          {...props}
          id={id}
          className={cx(
            "text-body min-h-9 w-full appearance-none rounded-control border border-line bg-canvas px-3 pr-9",
            props.className,
          )}
        >
          {children}
        </select>
        <CaretDown
          aria-hidden="true"
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
      {hint ? <p className="text-metadata text-muted">{hint}</p> : null}
    </div>
  );
}

export function CheckControl({
  id,
  label,
  description,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  description?: string;
  id: string;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-2 rounded-control border border-line bg-canvas px-3 py-2.5"
    >
      <input
        {...props}
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 accent-brand-secondary"
      />
      <span>
        <span className="text-button block">{label}</span>
        {description ? (
          <span className="text-metadata mt-0.5 block text-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function DataTable({
  columns,
  rows,
  actions,
}: {
  actions?: (row: Record<string, string>, index: number) => ReactNode;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string>>;
}) {
  return (
    <div className="overflow-x-auto rounded-control border border-line">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead className="bg-canvas-soft">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="text-metadata border-b border-line px-3 py-2 font-semibold text-muted"
              >
                {column.label}
              </th>
            ))}
            {actions ? (
              <th
                scope="col"
                className="text-metadata border-b border-line px-3 py-2 text-right font-semibold text-muted"
              >
                Action
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${Object.values(row)[0]}-${index}`}
              className="border-b border-line last:border-b-0 hover:bg-canvas-soft/70"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="text-body px-3 py-2.5 align-top text-ink"
                >
                  {row[column.key]}
                </td>
              ))}
              {actions ? (
                <td className="px-3 py-2 text-right">{actions(row, index)}</td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyPanel({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  title: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-panel border border-dashed border-line bg-canvas-soft/50 p-6 text-center">
      <Info size={24} className="text-brand-secondary" />
      <h2 className="text-section mt-3">{title}</h2>
      <p className="text-body mt-1 max-w-md text-muted">{description}</p>
      {actionHref && actionLabel ? (
        <ActionLink href={actionHref} className="mt-4">
          {actionLabel} <ArrowRight size={14} />
        </ActionLink>
      ) : null}
    </div>
  );
}

export function Stepper({
  current,
  steps,
}: {
  current: number;
  steps: string[];
}) {
  return (
    <ol className="grid gap-2 sm:grid-cols-4" aria-label="Progress">
      {steps.map((step, index) => {
        const complete = index < current;
        const active = index === current;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={cx(
                "text-metadata inline-flex size-6 shrink-0 items-center justify-center rounded-full border",
                complete
                  ? "border-brand-secondary bg-brand-secondary text-white"
                  : active
                    ? "border-brand-primary bg-brand-primary text-white"
                    : "border-line bg-canvas-soft text-muted",
              )}
            >
              {complete ? <CheckCircle size={13} weight="fill" /> : index + 1}
            </span>
            <span
              className={cx(
                "text-metadata",
                active || complete ? "text-ink" : "text-muted",
              )}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
