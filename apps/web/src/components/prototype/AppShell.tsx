"use client";

import {
  Brain,
  ChartLineUp,
  ClockCounterClockwise,
  Database,
  GearSix,
  House,
  List,
  MapTrifold,
  Play,
  Question,
  ShieldCheck,
  SignOut,
  SlidersHorizontal,
  SquaresFour,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import Image from "next/image";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { can, type ProductRole, roleDefinitions } from "@/data/prototype";
import { cx } from "@/lib/classnames";
import { useFirebaseAuth } from "@/components/auth/FirebaseAuthProvider";

interface AppShellProps {
  children: ReactNode;
  role: ProductRole;
  variant?: "default" | "research" | "resident";
}

function isActive(pathname: string, href: string) {
  if (pathname === "/" && href === "/admin") return true;
  if (
    href === "/researcher" &&
    [
      "/researcher",
      "/researcher/forecast",
      "/researcher/map",
      "/researcher/locations",
      "/researcher/history",
    ].some((route) =>
      route === "/researcher" ? pathname === route : pathname.startsWith(route),
    )
  )
    return true;
  if (
    href === "/researcher/runs" &&
    (pathname.startsWith("/researcher/runs") ||
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
  if (href.split("/").filter(Boolean).length === 1) return pathname === href;
  return pathname.startsWith(href);
}

/**
 * Sidebar glyphs.
 *
 * Order matters. "Forecast workspace" and "Forecast history" both contain
 * "forecast", so the broad test used to give them the same clock glyph and the
 * workspace entry was indistinguishable from run history. The specific words
 * are matched first and the broad fallback comes last.
 */
function navigationIcon(label: string) {
  const normalized = label.toLowerCase();
  if (normalized === "forecast workspace") return <ChartLineUp size={18} />;
  if (normalized.includes("workspace")) return <SquaresFour size={18} />;
  if (normalized.includes("map") || normalized.includes("location"))
    return <MapTrifold size={18} />;
  if (normalized.includes("research")) return <Brain size={18} />;
  if (normalized.includes("overview") || normalized.includes("outlook"))
    return <House size={18} />;
  if (normalized === "run forecast") return <Play size={18} />;
  if (normalized.includes("history"))
    return <ClockCounterClockwise size={18} />;
  if (normalized.includes("forecast") || normalized.includes("run"))
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

function SidebarItemContent({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <>
      <span className="role-sidebar-icon" aria-hidden="true">
        <span className="role-sidebar-icon-glyph">{icon}</span>
      </span>
      <span className="role-sidebar-label">{label}</span>
    </>
  );
}

export function AppShell({
  children,
  role,
  variant = "default",
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useFirebaseAuth();
  async function handleSignOut() {
    await signOut();
    setMobileOpen(false);
    router.replace("/auth/logout");
  }
  const researchShell = variant === "research";
  const residentShell = variant === "resident";
  const structuredShell = researchShell || residentShell;
  const [mobileOpen, setMobileOpen] = useState(false);
  const roleDefinition = roleDefinitions[role];
  const navigationItems = roleDefinition.navigation.filter(
    (item) => !item.capability || can(role, item.capability),
  );

  return (
    <div
      className={cx(
        "app-shell workspace-shell min-h-screen bg-[#edf5f9] text-ink",
        residentShell ? "resident-shell" : undefined,
        structuredShell ? "structured-shell" : undefined,
      )}
    >
      <aside className="group/sidebar fixed top-4 bottom-4 left-4 z-50 hidden w-[4.5rem] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#092847] text-white shadow-[0_18px_50px_rgba(7,42,76,0.22)] transition-[width] duration-200 hover:w-[15rem] focus-within:w-[15rem] md:flex md:flex-col">
        <Link
          href={`/${role}`}
          className="flex min-h-[4.5rem] items-center gap-3 border-b border-white/10 px-[10px]"
          aria-label="RiverGuard home"
        >
          <span className="relative block size-11 shrink-0 overflow-hidden bg-white ring-1 ring-[#0b3358]/10">
            <Image
              src="/images/riverguard-sidebar.jpg"
              alt=""
              width={1024}
              height={1024}
              priority
              className="h-full w-full object-contain p-1"
            />
          </span>
          <span className="text-section whitespace-nowrap opacity-0 transition-opacity group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
            RiverGuard
          </span>
        </Link>

        <nav
          aria-label={`${roleDefinition.label} navigation`}
          className="flex-1 overflow-x-hidden overflow-y-auto px-2 py-3"
        >
          <div className="grid gap-1">
            {navigationItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  className={cx(
                    "role-sidebar-item text-navigation transition-colors",
                    "unified-nav-item",
                    active
                      ? "bg-[#168191] text-white"
                      : "text-white/65 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <SidebarItemContent
                    icon={navigationIcon(item.label)}
                    label={item.label}
                  />
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="grid gap-1 border-t border-white/10 p-2">
          <Link
            href={`/${role}/help`}
            title="Help and limitations"
            className={cx(
              "role-sidebar-item text-navigation",
              "text-white/65 hover:bg-white/10 hover:text-white",
            )}
          >
            <SidebarItemContent
              icon={<Question size={18} />}
              label="Help & limitations"
            />
          </Link>
          <Link
            href={`/${role}/settings`}
            title="Settings"
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
            className={cx(
              "role-sidebar-item text-navigation",
              pathname.startsWith("/settings")
                ? "bg-[#168191] text-white"
                : "text-white/65 hover:bg-white/10 hover:text-white",
            )}
          >
            <SidebarItemContent icon={<GearSix size={19} />} label="Settings" />
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            title="Sign out"
            className={cx(
              "role-sidebar-item text-navigation",
              "text-white/65 hover:bg-white/10 hover:text-white",
            )}
          >
            <SidebarItemContent icon={<SignOut size={18} />} label="Sign out" />
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex min-h-14 items-center border-b border-line bg-canvas px-3 md:hidden">
        <Link
          href={`/${role}`}
          aria-label="RiverGuard home"
          className="flex items-center gap-2"
        >
          <span className="relative block size-9 overflow-hidden rounded-lg bg-white ring-1 ring-[#0b3358]/10">
            <Image
              src="/images/riverguard-logo.jpg"
              alt=""
              width={1024}
              height={1024}
              priority
              className="absolute left-1/2 top-[68%] w-[68px] max-w-none -translate-x-1/2 -translate-y-1/2"
            />
          </span>
          <span className="text-section">RiverGuard</span>
        </Link>
        <div className="ml-auto flex gap-1.5">
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
            {navigationItems.map((item) => (
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
              href={`/${role}/help`}
              onClick={() => setMobileOpen(false)}
              className="text-navigation flex items-center gap-3 rounded-control px-3 py-2.5 hover:bg-canvas-soft"
            >
              <Question size={18} /> Help & limitations
            </Link>
            <Link
              href={`/${role}/settings`}
              onClick={() => setMobileOpen(false)}
              className="text-navigation flex items-center gap-3 rounded-control px-3 py-2.5 hover:bg-canvas-soft"
            >
              <GearSix size={18} /> Settings
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="text-navigation flex items-center gap-3 rounded-control px-3 py-2.5 hover:bg-canvas-soft"
            >
              <SignOut size={18} /> Sign out
            </button>
          </nav>
        </div>
      ) : null}

      <div className="min-w-0 md:pl-[5.75rem]">{children}</div>
    </div>
  );
}
