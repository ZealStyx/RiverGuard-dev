# RiverGuard — UI/UX Audit and Progress Re-check

**Audit date:** 17 November 2026
**Branch / commit:** `arena/2504d92d-riverguard-dev` at `073479f` (merge of PR #11)
**Method:** static source review of every file under `apps/web/src` and `convex/`, plus a live
local run — `npm install`, `npm run typecheck`, `npm run lint`, `npm run format:check`,
`npm run build`, `npm run dev`, all 74 documented routes fetched and parsed, the Python ML
service started, 24 ML tests executed, and every route/API exercised over HTTP.
**No browser was available in this environment**, so layout, colour, and interaction findings are
derived from source, rendered HTML, and computed contrast ratios rather than screenshots. Every
finding below names the file and line where it can be reproduced.

---

## 1. Headline

The product is in far better shape than the 14 November progress report describes, and the
remaining UI/UX defects are **not** in the design system — they are in **routing, state feedback,
and data honesty**.

What is genuinely working today:

| Check                               | Result                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `npm run typecheck` (web + Convex)  | Pass                                                                           |
| `npm run lint` (`--max-warnings=0`) | Pass                                                                           |
| `npm run format:check`              | Pass                                                                           |
| `npm run build`                     | Pass — `/` statically prerendered, `/[section]/[[...slug]]` dynamic            |
| All 74 documented routes            | 200, and every one renders a distinct screen                                   |
| `services/ml` (24 pytest tests)     | **24 passed** — not an empty scaffold                                          |
| `POST /api/forecast` end-to-end     | Returns a real 7-day forecast from the gradient-boosted model                  |
| `GET /api/historical`               | Returns real rows from `data/daily_observations.csv` (2016-01-01 → 2026-11-14) |
| Backend                             | 14 Convex tables, 12 queries, 6 mutations, 1,226 lines                         |

The 14 November report described Phases 2, 4, and 5 as "not started" and `services/ml` as
"a 0-byte scaffold". As of this commit that is out of date: the FastAPI service is 1,183 lines
with 24 passing tests, `ml/artifacts/model.json` is a real 170 KB exported tree ensemble, the
forecast route orchestrates weather → ML → Convex, and MapLibre has replaced the illustrative
raster. Phase 2 and most of Phase 4 are functionally complete.

---

## 2. Severity summary

| #   | Severity       | Finding                                                                                                                                          | Where                                                                          |
| --- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 1   | **Fixed here** | Dev-server preview loaded unstyled HTML with no JS (blocked cross-origin dev assets)                                                             | `apps/web/next.config.ts`                                                      |
| 2   | **P1**         | Nearly every counterfactual link renders the wrong record — run, day, location, model, source, and request detail pages ignore their URL segment | `ResearcherScreens.tsx:195,698,718,1163`; `RoleScreens.tsx:992`                |
| 3   | **P1**         | Login failure message renders under the password field, not the email field, and clears only on retry                                            | `PublicScreens.tsx:191-199`                                                    |
| 4   | **P1**         | The live forecast path silently swaps in illustrative rainfall, and the UI never marks it degraded                                               | `lib/weather/index.ts`, `DashboardLayout.tsx:214`, `ResearcherScreens.tsx:116` |
| 5   | **P2**         | Settings popover is hover-opened, never closes after it is pinned, and inerts the sidebar while open                                             | `AppShell.tsx:299-356`                                                         |
| 6   | **P2**         | Two sidebar items highlight simultaneously on all Forecasts/Research routes                                                                      | `AppShell.tsx:96-113`                                                          |
| 7   | **P2**         | Sidebar "Help & limitations" always returns to `/admin`, even from Resident and LGU shells                                                       | `AppShell.tsx:288`                                                             |
| 8   | **P2**         | `/settings/account` renders a byte-identical copy of `/settings/security`                                                                        | `PublicScreens.tsx:1636`                                                       |
| 9   | **P2**         | One-time-code field cannot be pasted into or corrected                                                                                           | `PublicScreens.tsx:433-445`                                                    |
| 10  | **P2**         | Map: attribution is hidden behind the coverage strip; any single tile failure replaces the working map with a full error panel                   | `RiverMap.tsx:99-105,236`                                                      |
| 11  | **P3**         | `text-current/60`–`80` body and eyebrow text in Notices, SectionHeading, FeedbackState computes to 3.0–3.4:1                                     | `Primitives.tsx:211`, `ui/SectionHeading.tsx:27,33`, `ui/FeedbackState.tsx:50` |
| 12  | **P3**         | Unknown routes and unknown sub-routes silently render an unrelated screen with a 200 status                                                      | `PrototypeRouter.tsx:71`, `ResearcherScreens.tsx:1199`                         |
| 13  | **P3**         | Dead or wrong links: the hazard deep-link is ignored, Settings destinations are inconsistent, "Compare selected" has no selection UI             | see §4.12                                                                      |
| 14  | **P3**         | Buttons with no handler and no disabled state; demo credentials prefilled; internal "Tremor trial" wording in product copy                       | see §4.12                                                                      |

---

## 3. What changed in this audit

### 3.1 Fixed: the dev preview served unstyled HTML with no JavaScript (P0 for previewing)

Next.js 16 blocks cross-origin requests to dev-only resources by default. `allowedDevOrigins`
listed only `127.0.0.1`, and the dev server's own host, so a browser on any other origin got a
403 for `/_next/static/**` and the HMR socket. Verified before the fix:

```
GET /_next/static/chunks/….css   with Origin: https://3000-….e2b.app  → 403 "Unauthorized"
GET /_next/static/chunks/….js    with Origin: https://3000-….e2b.app  → 403 "Unauthorized"
```

`next.config.ts` now lists `*.e2b.app`. Both return 200. This is development-only and has no
effect on `next build` output.

---

## 4. UI/UX findings — interaction and state

### 4.1 P1 — Detail routes ignore their URL segment

Every "View" affordance leads to a page that shows the same hard-coded record, so the list-to-detail
relationship is false everywhere. Confirmed by fetching each URL and reading the rendered `<h1>`:

| URL                                                    | Renders                                                | Should render                                |
| ------------------------------------------------------ | ------------------------------------------------------ | -------------------------------------------- |
| `/admin/research/runs/RG-NCR-038` (status: **Failed**) | "Forecast results … created Nov 11, 2026 … RG-NCR-041" | The RG-NCR-038 record, or a failed-run state |
| `/admin/research/runs/RG-NCR-041/day/2026-11-15`       | "Marikina · November 11"                               | November 15                                  |
| `/admin/locations/quezon-city?view=research`           | "Marikina"                                             | Quezon City                                  |
| `/admin/models/does-not-exist?view=research`           | "RG-NCR v0.4"                                          | A not-found state                            |
| `/admin/data-sources/nope?view=research`               | "NCR daily rainfall sample"                            | A not-found state                            |
| `/admin/requests/dana-cruz`                            | "Marco Santos · Marikina DRRMO"                        | Dana Cruz                                    |
| `/lgu/reviews/RG-NCR-039` (Quezon City, **Escalated**) | "RG-NCR-041 · Marikina"                                | The escalated Quezon City run                |

The worst case is the LGU review path: an operator clicking the escalated Quezon City row is shown
a Marikina review form and an approve/escalate control, which is a data-integrity hazard in a
system whose entire premise is traceable evidence. `LocationDetails` (`ResearcherScreens.tsx:195`)
takes no props at all — the route segment is never passed down.

### 4.2 P1 — Login errors land on the wrong field

`PublicScreens.tsx:191-199` passes the auth error into `PasswordField`'s `error` slot:

```tsx
{email === "resident@riverguard.local" ? … : setError("Use a registered RiverGuard account …")}
…
<PasswordField … error={error} />
```

An invalid email therefore paints a red border and a red message under the **password** field,
telling the user their password is wrong when the account does not exist. It also persists through
retyping the email, since it is only cleared inside `submit()`.

### 4.3 P1 — The live forecast hides that its rainfall is illustrative

> **Correction, 2026-11-17.** This section originally said the offline fixture uses
> `Math.random()`. It does not. `lib/weather/fixture.ts` is a table of fixed constants, so a
> degraded run is deterministic. `grep -rn "Math.random"` over the TypeScript, Python, and
> script sources returns no matches. The finding below is otherwise accurate, and the
> misleading-parts are what matter.

`lib/weather/index.ts` falls back to `lib/weather/fixture.ts` whenever Open-Meteo fails. The API
surfaces this correctly as `weather.degraded: true` plus a `warnings[]` entry, and
`lib/outlook.ts` stores it in `snapshot.degraded` — but **nothing in the UI reads
`snapshot.degraded`**. Reproduced here with no outbound network:

```json
{ "provider": "fixture", "degraded": true,
  "warnings": ["Live provider failed (Open-Meteo request failed: fetch failed).
                Offline fixture in use: these rainfall numbers are illustrative, not a forecast."] }
```

The dashboard and the research workspace both show the warning only in a 10 px provenance line,
under a green-looking pass of day chips and a live-looking 7-day rainfall chart. A degraded run
needs an inline `Notice tone="warning"` next to the outlook, or the day chips must be visibly
marked. `WEATHER_ALLOW_FIXTURE=false` is the right production default and is currently `true` in
`.env.example`.

**Fixed in this branch.** The outlook panel now takes `degraded` and renders a warning under the
day chips, the run banner lists every warning the route returned, and `RiskSummary` refuses to
render a day grid at all until a run exists.

### 4.4 P2 — The settings popover cannot be dismissed cleanly

`AppShell.tsx:299-356`. The gear opens the popover on `onMouseEnter`; clicking the gear toggles
`settingsMenuPinned` but always calls `setSettingsMenuOpen(true)`, so a click can never close it.
Once pinned, `onMouseLeave` no longer closes it, and the only exits are Escape (which closes the
_search_ dialog, per the global handler at line 207) or navigating. Separately, the popover is
`fixed bottom-3 left-64` inside an `aside` that is 56 px wide and expands on `hover`/`focus-within`
— so while the menu is open the sidebar is forced to stay expanded, which prevents the hover-out
that would otherwise dismiss it. No outside-click or focus-escape handler exists, and `aria-expanded`
is set while there is no `aria-controls`/focus move into the dialog.

### 4.5 P2 — Two nav items active at once

`isActive` (`AppShell.tsx:96-113`) gives `/admin/research/runs` a prefix rule matching
`/admin/research/**`, and the earlier `/admin/research` rule matches the same paths off a shared
substring. Every Forecasts page therefore renders two `aria-current="page"` links:

```
/admin/research/runs              → title="Research", title="Forecasts"
/admin/research/runs/RG-NCR-041   → title="Research", title="Forecasts"
/admin/research/compare           → title="Research", title="Forecasts"
```

Only one should be current. `aria-current` duplication also breaks the "you are here" signal for
screen-reader navigation.

### 4.6 P2 — Role context is lost outside the role's own pages

`AppShell.tsx:288` hard-codes `/methodology?from=/${role}` where `role` is the shell's role —
which is correct for the Resident and LGU shells, but the return destination is then only rendered
as a back link if `PublicInfoScreen` accepts it (`PublicScreens.tsx:1112-1126`, regex-limited to
`/(resident|lgu|admin)`), and the label collapses to the generic "Back to dashboard". More
importantly, `PrototypeRouter.tsx:41` mounts `SettingsScreen` and `/researcher/*` inside
`AppShell role="admin"`, so an LGU or Resident user who reaches `/settings/*` or a legacy
`/researcher/*` URL sees Administrator navigation, including _Users & access_ and _Audit log_.

### 4.7 P2 — `/settings/account` is a clone of `/settings/security`

The two responses are **byte-identical**. `SettingsScreen` treats `security`, `password`, and
`account` in one branch (`PublicScreens.tsx:1636`), so the dedicated account-lifecycle screen —
the one the design QA record claims was rebuilt — is unreachable except through the "Account
access" block that also appears on the security page. Meanwhile the _sidebar gear_ entry "Security,
password & access" and the search result for account settings both point at only two of the six
settings URLs, so `/settings/account` is orphaned.

### 4.8 P2 — One-time code cannot be pasted

Each of the six digit boxes is `maxLength={1}` with `onChange` taking `.slice(-1)`
(`PublicScreens.tsx:433-445`). Pasting a 6-digit code from an email fills box 1 with the last
digit and discards the rest; there is no `onPaste` handler and no auto-submit on the sixth digit.
Arrow-key left/right navigation is also absent (only Backspace moves backwards). Backspace on a
filled box clears it without moving focus, requiring two presses per correction.

Related: the resend control reads "Code resent" only when the user typed nothing, while the
adjacent timer counts down from `60` labelled `Expires in 00:60` — invalid as a time display, and
after a resend it restarts at 60 while the button stays disabled, so the label and the control
disagree (`PublicScreens.tsx:453-468`).

### 4.9 P2 — Map chrome

`RiverMap.tsx`:

- The OSM attribution is added `bottom-right` (line 87) but the coverage strip occupies
  `bottom-0 left-0 right-0` (line 236) and the legend card sits at `bottom-28`. Attribution is
  therefore rendered underneath an opaque bar. OSM's tile policy requires visible attribution;
  this is also the one licence obligation the README explicitly calls out.
- `map.on("error")` (lines 99-105) treats **every** tile/source error as fatal: one failed
  `z/x/y` tile after panning replaces the whole interactive map with "Map tiles unavailable" and a
  Retry button. `mapStatus` is also never reset once set, so a transient error permanently masks a
  recovered map until the user clicks Retry.
- The legend card's bottom offset (`bottom-28`) is tuned to the one-line layer summary; when the
  summary wraps to two or three lines at narrower widths the card overlaps the coverage strip.
- The hazard-layer control is `hidden lg:block` (line 171), so below 1024 px there is no way to see
  which layer is active — only the "Basemap"/"RiverGuard overlay" label inside the summary card.

### 4.10 P3 — Contrast in tight, common surfaces

Computed against the tokens in `globals.css` (WCAG 2.1, normal text needs 4.5:1):

| Surface                      | Class                            | Ratio       |
| ---------------------------- | -------------------------------- | ----------- |
| Notice body text (warning)   | `text-current/80` on `warning/8` | **3.02**    |
| Notice body text (success)   | `text-current/80` on `success/8` | **3.08**    |
| Notice body text (danger)    | `text-current/80` on `danger/8`  | **3.42**    |
| `SectionHeading` eyebrow     | `text-current/60`                | **3.01**    |
| `FeedbackState` description  | `text-current/65`                | ~3.2        |
| `StatusBadge` warning, 10 px | `text-warning` on `warning/10`   | **4.10**    |
| `StatusBadge` success, 10 px | `text-success` on `success/10`   | **4.28**    |
| `muted` body text            | `#666` on white                  | 5.74 (pass) |

`Notice` is the component that carries every safety message in the product ("Publication disabled",
"Official advisories remain primary", "Review is not warning authority"), and its body copy is the
least legible text in the app. Raising it to full `text-current` gets warning to 4.21 — still short;
the `/8` background needs to be `/5` or the text colour darkened.

### 4.11 P3 — 404s that are not 404s

`PrototypeRouter.tsx:71` returns `<WelcomeScreen />` for any unknown top-level section, and
`AppShell` falls back to `/admin` for unknown admin sections. Consequently:

```
/nonexistent-page      → 200, renders "Evidence before assumptions." (the welcome page)
/admin/bogus           → 200, renders "System overview"
/admin/research/bogus  → 200, renders the research dashboard
/admin/requests/nope   → 200, renders "Review access request" for Marco Santos
```

There is no `not-found.tsx`, `error.tsx`, or `loading.tsx` anywhere in `app/`, so a mistyped URL
silently shows unrelated (and in one case, another person's) content. This also makes every one of
the mis-routed detail pages above look "successful" to a user.

### 4.12 P3 — Smaller defects

| Defect                                | Detail                                                                                                                                                                                                                                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hazard deep-link ignored              | `RoleScreens.tsx:153-159`: on `HazardContext`, `initialView="hazard"` wins even when `?view=hazard` is present, so arriving from `/resident` at `/resident/locations?view=hazard` shows the **Locations** tab with "Hazard context" unselected.                                                 |
| Duplicate settings links              | The gear popover lists four destinations (`AppShell.tsx:77-99`) while the search index has six (`AppShell.tsx:200-206`); `/settings/account` and `/settings/password` are unreachable from the popover.                                                                                         |
| Pointless tab pair                    | `LguWorkspaceViewSwitcher` links to `/lgu/outlook` and `/lgu/outlook?view=map`, so the "Map" tab is a query string on the _outlook_ route while a separate `/lgu/map` route renders the identical screen — three URLs, one screen, one tab highlighted.                                         |
| Multi-select without selection        | `/admin/research/compare` has no checkboxes and no inputs; it always compares RG-NCR-041 against RG-NCR-040, yet `/admin/research/runs` offers "Compare selected".                                                                                                                              |
| Filters that do not filter            | `/admin/research/runs`, `/admin/audit` render `SelectControl`s with no `value`/`onChange`; `/admin/requests` has no filter at all.                                                                                                                                                              |
| Buttons with no effect                | Eleven `Button`s have neither `onClick` nor `disabled`: Change image, Remove, Change email (twice), Log out other sessions, Request review (twice), Request deactivation (twice), Save note, "Use recovery code". They look fully enabled.                                                      |
| Demo credential prefill               | `PublicScreens.tsx:191,198,616` prefill `admin@riverguard.local` / `riverguard` / `123456`. Useful for a local demo, but it means the login screen ships a working administrator password in view.                                                                                              |
| Internal vocabulary in product copy   | `/admin/research/history` offers a "Tremor trial" chart toggle and describes "the Tremor Raw-style experiment" (`ResearcherScreens.tsx:403,422`) — a design spike exposed in a product surface.                                                                                                 |
| Stale prototype copy                  | "Nov 11, 2026 · current sample" (`ResearcherScreens.tsx:515`) is five days in the past relative to the app's own dataset, which runs to 2026-11-14. The nine onboarding flows and all detail screens are pinned to 11 November while `/api/historical` and `/api/forecast` return today's data. |
| `/admin/provider` says "Not selected" | `RoleScreens.tsx:1422` shows provider "Not selected" / "Disabled" while `WEATHER_PROVIDER` is actually configured and working.                                                                                                                                                                  |
| No favicon / 404 page                 | `/favicon.ico` and `/robots.txt` return the app HTML with status 200; `public/` contains only `maps/ncr-illustrative-background.png`, a 1.4 MB asset referenced by **nothing** (MapLibre replaced it).                                                                                          |
| Every route shares one title          | `<title>` is `RiverGuard workspace` or `RiverGuard` on all 74 routes; `/` and `/admin/research` are indistinguishable in history or a tab strip.                                                                                                                                                |
| Stepper percentage                    | `Primitives.tsx:507`: step 1 of 4 reports "0% complete".                                                                                                                                                                                                                                        |
| Onboarding dead-end grammar           | `PublicScreens.tsx:511` hard-codes "LGU operator access requested" on `/auth/pending` regardless of `?role=`.                                                                                                                                                                                   |

---

## 5. Dead code and drift

- **`DashboardLayout.tsx` (241 lines) is unreachable.** `app/page.tsx` renders `PrototypeRouter`,
  and no file imports `DashboardLayout`. It is a second, divergent copy of the admin dashboard
  (own nav, own dark-mode toggles that do nothing, own "Run forecast" button) and is the only
  consumer of `ui/Tooltip` and `ui/IconButton`.
- **Five zero-byte source files** are still tracked: `components/alerts/AlertList.tsx`,
  `components/charts/WaterLevelChart.tsx`, `components/dashboard/StationCard.tsx`,
  `lib/api.ts`, `lib/convex.ts`.
- **Nine of the twelve UI primitives are used only by `/design-system`**: `SelectField`
  (no caret icon, unlike the prototype copy), `Panel`, `Toggle`, `SectionHeading`, `Divider`,
  `Tooltip`, and all five feedback states. The prototype instead re-implements its own inputs and
  notices in `Primitives.tsx` and never uses `LoadingState`/`EmptyState`/`ErrorState`/
  `UnavailableState` — so the "eleven primitives" achievement in the progress report is a
  reference page, not the application's component layer.
- **`design-qa.md` claims `final result: passed`** with "browser console errors: none" and "no
  actionable P0, P1, or P2 differences". Findings 4.1–4.9 are all P1/P2 and reproducible from the
  rendered HTML alone, so that record should be reopened.
- **`docs/report/progress-report-2026-11-14.md` is stale** on the ML service (§1) and on Phase 4.

---

## 6. Recommended order of work

1. **Pass the route segment into the detail screens** (§4.1). One prop-plumbing change fixes seven
   routes and removes the LGU data-integrity hazard. Add `not-found.tsx` and make the catch-all
   segments 404 instead of falling back.
2. **Surface `snapshot.degraded`** as an inline warning next to the outlook and on the day chips
   (§4.3), and consider `WEATHER_ALLOW_FIXTURE=false` in the demo `.env.example`.
3. **Fix the auth error slot** (§4.2) and the OTP paste/backspace handling (§4.8).
4. **Rebuild the shell chrome**: single-active `isActive`, a click/Escape/outside-click dismissable
   settings popover with a consistent destination list, role-correct `from=` returns, and
   role-correct settings shells (§4.4–4.6).
5. **Map**: move attribution above the coverage strip, demote tile errors to non-fatal, and expose
   the layer control at every breakpoint (§4.9).
6. **Raise Notice/StatusBadge contrast** (§4.10), then delete `DashboardLayout.tsx`, the five empty
   files, and either promote the unused primitives into the prototype or retire them.
7. **Re-run `design-qa.md`** against this list and update the progress report's phase table.

---

## Appendix — Verification commands

```bash
npm install && npm run typecheck && npm run lint && npm run format:check && npm run build
npm run dev --workspace @riverguard/web -- --hostname 0.0.0.0 --port 3000
python3 -m venv .venv && .venv/bin/pip install -e "services/ml[dev]"
cd services/ml && python3 -m pytest -q            # 24 passed
curl -s -X POST -H 'content-type: application/json' \
     -d '{"locationCode":"marikina"}' http://127.0.0.1:3000/api/forecast | jq
curl -s 'http://127.0.0.1:3000/api/historical?location=Marikina&limit=14' | jq
```
