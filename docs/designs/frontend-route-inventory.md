# RiverGuard Frontend Route Inventory

This document records the connected frontend prototype implemented from the RiverGuard UI/UX Design Cheat Sheet. The routes read the stores and services described in `docs/guides/forecast-pipeline.md`; where a capability is genuinely absent (verified GIS layers, alert publication, a credential store) the screen says so instead of simulating it. Appearance, search, and the workspace panels are implemented — see _Workspace chrome_ below.

## Public and account routes

| Route                        | Purpose                                                              |
| ---------------------------- | -------------------------------------------------------------------- |
| `/welcome`                   | Public project entry and role access information                     |
| `/about`                     | Purpose, coverage, and deployment scope                              |
| `/methodology`               | Definitions, evidence rules, and limitations                         |
| `/official-sources`          | Official-source reminder and verified-link area                      |
| `/auth/login`                | Provider-neutral login form                                          |
| `/auth/signup`               | Resident registration prototype                                      |
| `/auth/request-access`       | LGU operator access request; administrator access is invitation-only |
| `/auth/verify`               | Identity verification state                                          |
| `/auth/pending`              | Pending administrator approval                                       |
| `/auth/forgot-password`      | Neutral recovery request                                             |
| `/auth/reset-password`       | Reset form and completion state                                      |
| `/auth/mfa`                  | MFA challenge prototype                                              |
| `/auth/invitation`           | Invitation acceptance                                                |
| `/auth/rejected`             | Rejected access state                                                |
| `/auth/suspended`            | Suspended account state                                              |
| `/auth/locked`               | Locked account state                                                 |
| `/auth/unauthorized`         | Permission-required state                                            |
| `/auth/unavailable`          | Authentication-provider error state                                  |
| `/auth/session-expired`      | Session recovery state                                               |
| `/auth/invitation-expired`   | Expired invitation state                                             |
| `/auth/verification-expired` | Expired verification state                                           |
| `/auth/logout`               | Logout success                                                       |

About and Official Sources remain public information routes, but their navigation links are intentionally exposed only on `/welcome`. Authenticated role shells use the in-context Help & Limitations route and do not show About or Official Sources navigation.

## Onboarding routes

- `/onboarding/resident`
- `/onboarding/lgu`
- `/onboarding/admin`

Each route uses a role-specific connected flow: Resident (welcome, locations, preferences, safety), LGU (assignment, authority, review, notes, notifications, safety, ready), and Administrator (assignment, MFA, research tools, methodology, configuration, audit, security, ready).

## Administrator research workspace

| Route                                              | Purpose                                   |
| -------------------------------------------------- | ----------------------------------------- |
| `/`                                                | Public Welcome page                       |
| `/admin/research`                                  | Research tools overview                   |
| `/admin/research/map`                              | Map and accessible location list          |
| `/admin/locations/:slug?view=research`             | Location details and evidence             |
| `/admin/research/history`                          | Historical-data filters, chart, and table |
| `/admin/research/forecast/new`                     | Forecast configuration                    |
| `/admin/research/forecast/review`                  | Input review                              |
| `/admin/research/forecast/progress`                | Simulated progress                        |
| `/admin/research/runs`                             | Forecast history                          |
| `/admin/research/runs/RG-NCR-041`                  | Forecast result                           |
| `/admin/research/runs/RG-NCR-041/day/2026-11-11`   | Forecast-day detail                       |
| `/admin/research/compare`                          | Run comparison                            |
| `/admin/data-sources?view=research`                | Source catalogue and provenance           |
| `/admin/data-sources/daily-rainfall?view=research` | Source metadata                           |
| `/admin/data-sources/new?view=research`            | Metadata form                             |
| `/admin/models?view=research`                      | Models and evaluation                     |
| `/admin/models/rg-ncr-04?view=research`            | Model card                                |

## Resident workspace

- `/resident` — simplified outlook
- `/resident/locations` — saved sample locations
- `/resident/outlook` — seven-day outlook
- `/resident/hazard-context` — separately labeled static context
- `/resident/preferences` — location, notification, and accessibility preferences

## LGU workspace

- `/lgu` — assigned-area overview
- `/lgu/map` — assigned-area map
- `/lgu/locations` — approved locations
- `/lgu/outlook` — review-oriented outlook
- `/lgu/reviews` — review queue
- `/lgu/reviews/RG-NCR-041` — review form and escalation
- `/lgu/alerts` — future alert/notes area
- `/lgu/alerts/new` — controlled draft prototype with publication disabled
- `/lgu/alerts/approval` — approval decision prototype with publication disabled

## Administrator workspace

- `/admin` — system overview
- `/admin/requests` — access requests
- `/admin/requests/marco-santos` — role/location decision form
- `/admin/users` — users and roles
- `/admin/locations` — supported-location configuration; research detail tab
- `/admin/data-sources` — data-source configuration; source explorer tab
- `/admin/provider` — weather-provider configuration
- `/admin/models` — model-version configuration; evaluation tab
- `/admin/hazard-layers` — hazard-layer configuration
- `/admin/audit` — redacted audit history
- `/admin/settings` — safety and deferred-capability settings

Legacy `/researcher/*` URLs redirect to the corresponding administrator research or configuration route. They are compatibility aliases, not a separate role workspace.

## Shared settings

- `/settings/profile`
- `/settings/notifications`
- `/settings/accessibility`
- `/settings/security`
- `/settings/password`
- `/settings/account`

## Frontend-to-backend handoff boundary

The shared frontend data/service boundary should later replace fixture operations with:

1. A real identity provider and server-enforced permissions.
2. Convex queries/mutations for users, sources, locations, runs, reviews, alerts, and audit records.
3. A local Next.js route for weather-provider and FastAPI orchestration.
4. Verified local GIS assets rendered with MapLibre.
5. Stakeholder-approved alert governance before any publication capability.

Navigation visibility is a user-experience aid only. The backend must independently enforce every protected operation.

## Workspace chrome

The header and rail on the research dashboard control real state; nothing here is a placeholder.

| Control               | What it does                                                                                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sun / moon            | Switches the light and dark palettes, stored in this browser (`riverguard.preference.theme`) and applied to `<html data-theme>` before the first paint. The basemap keeps its own light tiles. Also on `/settings/accessibility`. |
| Search (header, rail) | Opens a filter over this page's sections, the admin screens, the four supported cities, and locally stored runs. No index and no network call of its own.                                                                         |
| Bell                  | Recent activity: the last six stored runs with their provider and how many days crossed the operating threshold, read from Convex when configured and from `.data/runs.json` otherwise.                                           |
| Avatar                | The signed-in Firebase account when there is one, the settings links, and a sign-out that ends the session. Without an account it says so rather than inventing a name.                                                           |
| Rail: map layers      | Shows or hides the map's layer panel and scrolls the map into view. The panel's unavailable rows explain what would enable them.                                                                                                  |
| Rail: station data    | Jumps to the data-provenance section, which always exists — it reports a failed dataset read rather than vanishing.                                                                                                               |
| Rail: settings        | `/settings/profile`.                                                                                                                                                                                                              |
| Rail (bottom)         | Help and limitations (`/methodology`). There is no sign-out icon: the account menu owns that, and the build has no local credential store to end.                                                                                 |

The two greyed-out rows in the map's layer panel are deliberate: a hazard overlay exists only after `npm run gis:verify` accepts a file listed in `data/gis/manifest.json`, and the model scores cities rather than shapes, so there is no outlook geometry to draw.
