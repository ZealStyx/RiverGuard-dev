"use client";

/**
 * Preferences that belong to this browser, not to an account.
 *
 * The settings screens used to accept input and then discard it: every toggle
 * wrote to component state and every "Save" button printed *saved for this
 * session*. With no identity service there is no server-side profile to write
 * to, so the honest place for these values is `localStorage`, and the honest
 * label is "saved in this browser".
 *
 * `useSyncExternalStore` is used instead of `useState` + `useEffect` because it
 * has a server snapshot: the server and the hydrating client both render the
 * fallback, and the stored value is adopted immediately afterwards, so markup
 * never mismatches. It also keeps every component that reads the same key in
 * step without prop drilling.
 *
 * Keys are namespaced; `clearPreference` removes a key so a reader can reset a
 * control to its default.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";

const PREFIX = "riverguard.preference.";

/** Values written in this tab, so a write is visible before `storage` fires. */
const overrides = new Map<string, string | null>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function storageKey(key: string) {
  return `${PREFIX}${key}`;
}

function readStored(key: string): string | null {
  const full = storageKey(key);
  const override = overrides.get(full);
  if (override !== undefined) return override;
  try {
    return window.localStorage.getItem(full);
  } catch {
    // Private mode or a blocked storage partition: fall back to the default.
    return null;
  }
}

export function writePreference(key: string, value: string | null) {
  const full = storageKey(key);
  overrides.set(full, value);
  try {
    if (value === null) window.localStorage.removeItem(full);
    else window.localStorage.setItem(full, value);
  } catch {
    // Keep the in-memory value so the control still behaves for this tab.
  }
  emit();
}

/** Stable module-level subscription: `useSyncExternalStore` re-subscribes otherwise. */
function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null) {
      overrides.clear();
    } else if (event.key.startsWith(PREFIX)) {
      // Another tab changed it; drop the cached copy so the next read is fresh.
      overrides.delete(event.key);
    } else {
      return;
    }
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** A stored string preference, with the default used until one is chosen. */
export function usePreference(
  key: string,
  fallback: string,
): [string, (next: string) => void] {
  const getSnapshot = useCallback(
    () => readStored(key) ?? fallback,
    [key, fallback],
  );
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setValue = useCallback(
    (next: string) => writePreference(key, next),
    [key],
  );
  return [value, setValue];
}

export function useBooleanPreference(
  key: string,
  fallback = false,
): [boolean, (next: boolean) => void] {
  const [raw, setRaw] = usePreference(key, fallback ? "true" : "false");
  const setValue = useCallback(
    (next: boolean) => setRaw(next ? "true" : "false"),
    [setRaw],
  );
  return [raw === "true", setValue];
}

/** The stored value or `null`: `undefined` never reaches the caller. */
export function readPreference(key: string): string | null {
  return readStored(key);
}

/**
 * Applies the preferences that have a visible effect.
 *
 * Only "reduce motion" is applied today: it sets `data-reduce-motion` on the
 * document element, and `globals.css` uses it to shorten transitions. Nothing
 * else is stored that the interface does not honour, so a toggle can always be
 * traced to something on screen.
 */
export function useAppliedPreferences() {
  const [reduceMotion] = useBooleanPreference("reduce-motion");
  useEffect(() => {
    const root = document.documentElement;
    if (reduceMotion) root.dataset.reduceMotion = "true";
    else delete root.dataset.reduceMotion;
  }, [reduceMotion]);
}
