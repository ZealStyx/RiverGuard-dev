/**
 * The theme key and the pre-paint script, with no client directive.
 *
 * Kept apart from `theme.ts` because `app/layout.tsx` is a server component: a
 * value imported from a `"use client"` module becomes a client reference, so the
 * script would never be inlined. Nothing here may import React or touch other
 * modules — it is inlined into the document head as written.
 */

/** Full `localStorage` key; the same namespace `lib/preferences.ts` writes. */
export const THEME_STORAGE_KEY = "riverguard.preference.theme";

/**
 * Runs before the body paints. Deliberately tiny and wrapped in `try`, because
 * storage can throw in a blocked partition.
 */
export const THEME_PREPAINT_SCRIPT = `(function(){try{if(window.localStorage.getItem("${THEME_STORAGE_KEY}")==="dark"){document.documentElement.dataset.theme="dark";}}catch(e){}})();`;
