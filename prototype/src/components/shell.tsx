import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const LINKS: { to: "/" | "/forecast" | "/prediction" | "/towns" | "/model" | "/alerts"; label: string }[] =
  [
    { to: "/", label: "Desk" },
    { to: "/forecast", label: "Forecast" },
    { to: "/prediction", label: "Prediction" },
    { to: "/towns", label: "Towns" },
    { to: "/model", label: "Model" },
    { to: "/alerts", label: "Alerts" },
  ];

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-card"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
          <Link to="/" className="shrink-0 rounded-lg">
            <span className="block font-display text-2xl leading-none tracking-tight">Baha</span>
            <span className="mt-1 block text-xs text-muted">Laguna flood desk</span>
          </Link>
          <nav className="flex gap-1 overflow-x-auto" aria-label="Pages">
            {LINKS.map((link) => {
              const active =
                link.to === "/"
                  ? path === "/"
                  : link.to === "/towns"
                    ? path === "/towns" || path.startsWith("/town/")
                    : path === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium transition-colors",
                    active ? "bg-ink text-card" : "text-muted hover:bg-card hover:text-ink",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <p className="border-b border-line bg-card text-sm text-muted">
        <span className="mx-auto block max-w-6xl px-4 py-2">
          Prototype desk. Type a forecast, read a flood call. Not an official warning.
        </span>
      </p>
      <main id="content" className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
      <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
        Scenarios, weights, and scales are on the page. Change them and every call follows.
      </footer>
    </div>
  );
}
