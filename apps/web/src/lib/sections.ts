/**
 * The sections the routed prototype can render.
 *
 * Lives outside `PrototypeRouter` (a `"use client"` module) so the server-side
 * page can validate the URL segment before anything is rendered. Without that
 * check the catch-all route answered every unknown path with the welcome page
 * and HTTP 200, which told browsers and crawlers that
 * `/this-page-does-not-exist` really existed.
 */

export const KNOWN_SECTIONS = [
  "welcome",
  "about",
  "official-sources",
  "methodology",
  "auth",
  "onboarding",
  "settings",
  "lgu",
  "resident",
  "researcher",
  "admin",
] as const;

export type KnownSection = (typeof KNOWN_SECTIONS)[number];

export function isKnownSection(value: string): value is KnownSection {
  return (KNOWN_SECTIONS as readonly string[]).includes(value);
}
