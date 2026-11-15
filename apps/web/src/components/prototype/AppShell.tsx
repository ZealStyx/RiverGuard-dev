"use client";

import {
  Brain,
  ChartLineUp,
  CheckCircle,
  ClockCounterClockwise,
  Database,
  EnvelopeSimple,
  GearSix,
  House,
  LockKey,
  List,
  MagnifyingGlass,
  MapTrifold,
  Play,
  Question,
  ShieldCheck,
  SignOut,
  SlidersHorizontal,
  UserCircle,
  UsersThree,
  WaveSine,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { type ProductRole, roleDefinitions } from "@/data/prototype";
import { cx } from "@/lib/classnames";

interface AppShellProps {
  children: ReactNode;
  role: ProductRole;
}

const supplementalSearchItems: Record<
  ProductRole,
  { href: string; label: string }[]
> = {
  researcher: [
    { label: "Run forecast", href: "/researcher/forecast/new" },
    { label: "Forecast runs", href: "/researcher/runs" },
    { label: "Map and locations", href: "/researcher/map" },
    { label: "Historical data", href: "/researcher/history" },
    { label: "Data sources", href: "/researcher/data-sources" },
  ],
  lgu: [
    { label: "Risk map", href: "/lgu/map" },
    { label: "Assigned locations", href: "/lgu/locations" },
    { label: "Forecast outlook", href: "/lgu/outlook" },
    { label: "Review queue", href: "/lgu/reviews" },
    { label: "Alerts and notes", href: "/lgu/alerts" },
  ],
  resident: [
    { label: "Locations", href: "/resident/locations" },
    { label: "Seven-day outlook", href: "/resident/outlook" },
    { label: "Hazard context", href: "/resident/hazard-context" },
    { label: "Resident preferences", href: "/resident/preferences" },
    { label: "About RiverGuard", href: "/about" },
  ],
  admin: [
    { label: "User requests", href: "/admin/requests" },
    { label: "Users and roles", href: "/admin/users" },
    { label: "Supported locations", href: "/admin/locations" },
    { label: "Data sources", href: "/admin/data-sources" },
    { label: "Provider configuration", href: "/admin/provider" },
    { label: "Model versions", href: "/admin/models" },
    { label: "Hazard layers", href: "/admin/hazard-layers" },
    { label: "System settings", href: "/admin/settings" },
  ],
};

const settingsNavigation = [
  {
    href: "/settings/profile",
    label: "Profile",
    icon: <UserCircle size={16} />,
  },
  {
    href: "/settings/notifications",
    label: "Notifications",
    icon: <EnvelopeSimple size={16} />,
  },
  {
    href: "/settings/accessibility",
    label: "Accessibility",
    icon: <CheckCircle size={16} />,
  },
  {
    href: "/settings/security",
    label: "Security & sessions",
    icon: <ShieldCheck size={16} />,
  },
  {
    href: "/settings/password",
    label: "Password",
    icon: <LockKey size={16} />,
  },
  {
    href: "/settings/account",
    label: "Account access",
    icon: <SignOut size={16} />,
  },
];

function isActive(pathname: string, href: string) {
  if (pathname === "/" && href === "/researcher") return true;
  if (
    href === "/researcher/runs" &&
    (pathname.startsWith("/researcher/runs") ||
      pathname.startsWith("/researcher/forecast") ||
      pathname.startsWith("/researcher/compare"))
  )
    return true;
  if (
    href === "/lgu/outlook" &&
    ["/lgu/map", "/lgu/locations", "/lgu/outlook"].some((route) =>
      pathname.startsWith(route),
    )
  )
    return true;
  if (
    href === "/lgu/reviews" &&
    ["/lgu/reviews", "/lgu/alerts"].some((route) => pathname.startsWith(route))
  )
    return true;
  if (
    href === "/resident/locations" &&
    ["/resident/locations", "/resident/hazard-context"].some((route) =>
      pathname.startsWith(route),
    )
  )
    return true;
  if (
    href === "/admin/users" &&
    ["/admin/users", "/admin/requests"].some((route) =>
      pathname.startsWith(route),
    )
  )
    return true;
  if (
    href === "/admin/locations" &&
    [
      "/admin/locations",
      "/admin/data-sources",
      "/admin/provider",
      "/admin/models",
      "/admin/hazard-layers",
      "/admin/settings",
    ].some((route) => pathname.startsWith(route))
  )
    return true;
  if (
    href === "/researcher/map" &&
    (pathname.startsWith("/researcher/map") ||
      pathname.startsWith("/researcher/locations") ||
      pathname.startsWith("/researcher/history") ||
      pathname.startsWith("/researcher/data-sources"))
  )
    return true;
  if (href.split("/").filter(Boolean).length === 1) return pathname === href;
  return pathname.startsWith(href);
}

function navigationIcon(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("map") || normalized.includes("location"))
    return <MapTrifold size={18} />;
  if (normalized.includes("overview") || normalized.includes("outlook"))
    return <House size={18} />;
  if (normalized === "run forecast") return <Play size={18} />;
  if (
    normalized.includes("forecast") ||
    normalized.includes("run") ||
    normalized.includes("history")
  )
    return <ClockCounterClockwise size={18} />;
  if (normalized.includes("data") || normalized.includes("source"))
    return <Database size={18} />;
  if (normalized.includes("model")) return <Brain size={18} />;
  if (normalized.includes("user") || normalized.includes("request"))
    return <UsersThree size={18} />;
  if (normalized.includes("review") || normalized.includes("alert"))
    return <ShieldCheck size={18} />;
  if (normalized.includes("official")) return <ShieldCheck size={18} />;
  if (normalized.includes("audit")) return <ChartLineUp size={18} />;
  return <SlidersHorizontal size={18} />;
}

export function AppShell({ children, role }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsMenuPinned, setSettingsMenuPinned] = useState(false);
  const [query, setQuery] = useState("");
  const roleDefinition = roleDefinitions[role];

  const searchItems = useMemo(
    () => [
      ...roleDefinition.navigation,
      ...supplementalSearchItems[role],
      { label: "Profile and account settings", href: "/settings/profile" },
      { label: "Notification preferences", href: "/settings/notifications" },
      { label: "Accessibility preferences", href: "/settings/accessibility" },
      { label: "Security and sessions", href: "/settings/security" },
      { label: "Change password", href: "/settings/password" },
      { label: "Account access", href: "/settings/account" },
      { label: "Methodology and limitations", href: "/methodology" },
      { label: "Official sources", href: "/official-sources" },
    ],
    [role, roleDefinition.navigation],
  );

  const filteredItems = searchItems.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function openSearch() {
    setQuery("");
    setSearchOpen(true);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className="group/sidebar fixed inset-y-0 left-0 z-50 hidden w-14 overflow-hidden border-r border-line bg-canvas shadow-sm transition-[width] duration-200 hover:w-56 focus-within:w-56 md:flex md:flex-col">
        <Link
          href={`/${role}`}
          className="flex min-h-16 items-center gap-3 border-b border-line px-[17px]"
          aria-label="RiverGuard home"
        >
          <WaveSine
            aria-hidden="true"
            size={24}
            weight="bold"
            className="shrink-0"
          />
          <span className="text-section whitespace-nowrap opacity-0 transition-opacity group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
            RiverGuard
          </span>
        </Link>

        <nav
          aria-label={`${roleDefinition.label} navigation`}
          className="flex-1 overflow-x-hidden overflow-y-auto px-2 py-3"
        >
          <button
            type="button"
            onClick={openSearch}
            className="text-navigation mb-2 flex min-h-9 w-full items-center gap-3 rounded-control px-3 text-muted hover:bg-canvas-soft hover:text-ink"
          >
            <MagnifyingGlass size={18} className="shrink-0" />
            <span className="whitespace-nowrap opacity-0 transition-opacity group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
              Search
            </span>
          </button>
          <div className="grid gap-1">
            {roleDefinition.navigation.map((item) => {
              const active = isActive(pathname, item.href);
              const itemHref =
                item.href === "/official-sources"
                  ? `/official-sources?from=/${role}`
                  : item.href;
              return (
                <Link
                  key={item.href}
                  href={itemHref}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  className={cx(
                    "text-navigation flex min-h-9 items-center gap-3 rounded-control px-3 transition-colors",
                    active
                      ? "bg-brand-primary text-white"
                      : "text-muted hover:bg-canvas-soft hover:text-ink",
                  )}
                >
                  <span aria-hidden="true" className="shrink-0">
                    {navigationIcon(item.label)}
                  </span>
                  <span className="whitespace-nowrap opacity-0 transition-opacity group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="grid gap-1 border-t border-line p-2">
          <Link
            href={`/methodology?from=/${role}`}
            title="Help and limitations"
            className="text-navigation flex min-h-9 items-center gap-3 rounded-control px-3 text-muted hover:bg-canvas-soft hover:text-ink"
          >
            <Question size={18} className="shrink-0" />
            <span className="whitespace-nowrap opacity-0 transition-opacity group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
              Help & limitations
            </span>
          </Link>
          <div
            className="relative"
            onMouseEnter={() => setSettingsMenuOpen(true)}
            onMouseLeave={() => {
              if (!settingsMenuPinned) setSettingsMenuOpen(false);
            }}
          >
            <button
              type="button"
              title="Settings"
              aria-label="Open settings menu"
              aria-expanded={settingsMenuOpen}
              onClick={() => {
                setSettingsMenuPinned((pinned) => !pinned);
                setSettingsMenuOpen(true);
              }}
              className={cx(
                "text-navigation flex min-h-10 w-full items-center gap-3 rounded-control px-3 hover:bg-canvas-soft",
                pathname.startsWith("/settings")
                  ? "bg-brand-secondary-soft text-brand-primary"
                  : "text-muted hover:text-ink",
              )}
            >
              <GearSix size={19} className="shrink-0" />
              <span className="whitespace-nowrap opacity-0 transition-opacity group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
                Settings
              </span>
            </button>
            {settingsMenuOpen ? (
              <div
                role="dialog"
                aria-label="Settings menu"
                className="fixed bottom-3 left-64 z-[80] w-64 rounded-panel border border-line bg-canvas p-2 shadow-xl"
              >
                <p className="text-metadata px-2 pb-2 font-semibold uppercase tracking-[0.12em] text-muted">
                  Settings
                </p>
                <nav className="grid gap-1" aria-label="Settings menu items">
                  {settingsNavigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={pathname === item.href ? "page" : undefined}
                      onClick={() => {
                        setSettingsMenuOpen(false);
                        setSettingsMenuPinned(false);
                      }}
                      className={cx(
                        "text-navigation flex items-center gap-2.5 rounded-control px-2.5 py-2",
                        pathname === item.href
                          ? "bg-brand-primary text-white"
                          : "text-muted hover:bg-canvas-soft hover:text-ink",
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ) : null}
          </div>
          <Link
            href="/auth/logout"
            title="Sign out"
            className="text-navigation flex min-h-9 items-center gap-3 rounded-control px-3 text-muted hover:bg-canvas-soft hover:text-ink"
          >
            <SignOut size={18} className="shrink-0" />
            <span className="whitespace-nowrap opacity-0 transition-opacity group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
              Sign out
            </span>
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex min-h-14 items-center border-b border-line bg-canvas px-3 md:hidden">
        <Link
          href={`/${role}`}
          aria-label="RiverGuard home"
          className="flex items-center gap-2"
        >
          <WaveSine size={25} weight="bold" />
          <span className="text-section">RiverGuard</span>
        </Link>
        <div className="ml-auto flex gap-1.5">
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search RiverGuard"
            className="inline-flex size-9 items-center justify-center rounded-control border border-line"
          >
            <MagnifyingGlass size={17} />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            className="inline-flex size-9 items-center justify-center rounded-control border border-line"
          >
            {mobileOpen ? <X size={18} /> : <List size={18} />}
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-x-0 top-14 z-40 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-line bg-canvas p-3 shadow-lg md:hidden">
          <p className="text-metadata mb-2 px-2 font-semibold uppercase tracking-[0.12em] text-muted">
            {roleDefinition.label}
          </p>
          <nav aria-label="Mobile navigation" className="grid gap-1">
            {roleDefinition.navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cx(
                  "text-navigation flex items-center gap-3 rounded-control px-3 py-2.5",
                  isActive(pathname, item.href)
                    ? "bg-brand-primary text-white"
                    : "hover:bg-canvas-soft",
                )}
              >
                {navigationIcon(item.label)} {item.label}
              </Link>
            ))}
            <Link
              href="/settings/profile"
              onClick={() => setMobileOpen(false)}
              className="text-navigation flex items-center gap-3 rounded-control px-3 py-2.5 hover:bg-canvas-soft"
            >
              <GearSix size={18} /> Settings
            </Link>
            <Link
              href="/auth/logout"
              onClick={() => setMobileOpen(false)}
              className="text-navigation flex items-center gap-3 rounded-control px-3 py-2.5 hover:bg-canvas-soft"
            >
              <SignOut size={18} /> Sign out
            </Link>
          </nav>
        </div>
      ) : null}

      <div className="min-w-0 md:pl-14">{children}</div>

      {searchOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/25 px-4 pt-[12vh] backdrop-blur-[2px]"
          onMouseDown={() => setSearchOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-title"
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-panel border border-line bg-canvas shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <MagnifyingGlass size={19} className="text-muted" />
              <div className="min-w-0 flex-1">
                <h2 id="search-title" className="sr-only">
                  Search RiverGuard pages
                </h2>
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search pages and settings…"
                  className="text-body w-full border-0 bg-transparent py-1 outline-none placeholder:text-muted"
                />
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="inline-flex size-7 items-center justify-center rounded-control hover:bg-canvas-soft"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredItems.length ? (
                filteredItems.map((item) => (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-3 rounded-control px-3 py-2.5 hover:bg-canvas-soft"
                  >
                    <span className="text-brand-secondary">
                      {navigationIcon(item.label)}
                    </span>
                    <span>
                      <span className="text-button block">{item.label}</span>
                      <span className="text-metadata block text-muted">
                        {item.href}
                      </span>
                    </span>
                  </Link>
                ))
              ) : (
                <p className="text-body px-3 py-8 text-center text-muted">
                  No matching RiverGuard page.
                </p>
              )}
            </div>
            <p className="text-metadata border-t border-line bg-canvas-soft px-4 py-2 text-muted">
              Search navigates between available pages. Press Esc to close.
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
