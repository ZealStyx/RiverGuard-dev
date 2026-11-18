"use client";

/**
 * The light/dark choice, stored in this browser.
 *
 * There is no account to hang a theme on, so the value lives under the same
 * `riverguard.preference.*` namespace the rest of the settings use. Three
 * places apply it, and they must agree:
 *
 * 1. `THEME_PREPAINT_SCRIPT` runs in `<head>` before the first paint and sets
 *    `data-theme` from storage, so a dark page does not flash white.
 * 2. `useTheme` keeps `<html data-theme>` in step with the control and with
 *    another tab changing the same key.
 * 3. `globals.css` maps `[data-theme="dark"]` onto the dark palette.
 *
 * The value is a plain `"light" | "dark"` rather than a tri-state: the header
 * control is two buttons, so "system" would be a choice the interface could not
 * show.
 */

import { useCallback, useEffect } from "react";

import { usePreference } from "./preferences";
import { THEME_STORAGE_KEY } from "./theme-script";

export type ThemeChoice = "light" | "dark";

/** Key inside the `riverguard.preference.` namespace. */
export const THEME_PREFERENCE_KEY = "theme";

/** Re-exported for callers that render a "stored in this browser" note. */
export { THEME_STORAGE_KEY };

function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  if (theme === "dark") root.dataset.theme = "dark";
  else delete root.dataset.theme;
}

export function useTheme() {
  const [stored, setStored] = usePreference(THEME_PREFERENCE_KEY, "light");
  const theme: ThemeChoice = stored === "dark" ? "dark" : "light";

  // The server renders "light" (there is no document to read), so the effect is
  // what adopts a stored dark choice. It is idempotent: several components can
  // call this hook without fighting over the attribute.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback(
    (next: ThemeChoice) => {
      setStored(next);
      // Apply immediately: the storage event that would update other readers is
      // asynchronous, and the click should not wait for it to repaint.
      applyTheme(next);
    },
    [setStored],
  );

  return { theme, setTheme };
}
