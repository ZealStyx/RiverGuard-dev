"use client";

import { MagnifyingGlass, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

export interface SearchItem {
  href: string;
  label: string;
  meta: string;
  icon?: ReactNode;
}

export interface SearchDialogProps {
  items: SearchItem[];
  onClose: () => void;
  placeholder?: string;
  /** Where the results come from, shown in the footer. */
  footnote: string;
}

/**
 * The search overlay, shared by the workspace shell and the research dashboard.
 *
 * Mounted only while open (`{open ? <SearchDialog …/> : null}`), so the query
 * starts empty every time without a reset effect, and it is a plain filter over
 * items the caller has already resolved — pages, cities, and stored runs. No
 * search index, no network call: what it shows is what the caller can navigate
 * to.
 */
export function SearchDialog({
  items,
  onClose,
  placeholder = "Search pages, cities, and stored runs…",
  footnote,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? items.filter((item) =>
        `${item.label} ${item.meta}`.toLowerCase().includes(needle),
      )
    : items;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/25 px-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-panel border border-line bg-canvas shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <MagnifyingGlass
            size={19}
            className="text-muted"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h2 id="search-title" className="sr-only">
              Search RiverGuard
            </h2>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              className="text-body w-full border-0 bg-transparent py-1 text-ink outline-none placeholder:text-muted"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="inline-flex size-7 items-center justify-center rounded-control hover:bg-canvas-soft"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length ? (
            filtered.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-control px-3 py-2.5 hover:bg-canvas-soft"
              >
                <span className="text-brand-secondary-ink" aria-hidden="true">
                  {item.icon ?? <MagnifyingGlass size={16} />}
                </span>
                <span>
                  <span className="text-button block">{item.label}</span>
                  <span className="text-metadata block text-muted">
                    {item.meta}
                  </span>
                </span>
              </Link>
            ))
          ) : (
            <p className="text-body px-3 py-8 text-center text-muted">
              Nothing matches “{query.trim()}”. Search covers the places this
              workspace can open, not free text.
            </p>
          )}
        </div>

        <p className="text-metadata border-t border-line bg-canvas-soft px-4 py-2 text-muted">
          {footnote} Press Esc to close.
        </p>
      </section>
    </div>
  );
}
