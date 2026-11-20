# RiverGuard Frontend Route Inventory

Historical prototype inventory. For current authentication, authorization, and implemented routes, see [Authentication and Routing](../AUTH_ROUTING.md).

## Public and account routes

| Route                        | Purpose                                                              |
| ---------------------------- | -------------------------------------------------------------------- |
| `/welcome`                   | Public project entry and role access information                     |
| `/about`                     | Purpose, coverage, and deployment scope                              |
| `/methodology`               | Definitions, evidence rules, and limitations                         |
| `/official-sources`          | Official-source reminder and verified-link area                      |
| `/auth/login`                | Provider-neutral login form                                          |
| `/auth/signup`               | Email or Google registration with requested role                                      |
| `/auth/request-access`       | LGU operator access request; administrator access is invitation-only |
| `/auth/verify`               | Identity verification state                                          |
| `/auth/pending`              | Pending administrator approval                                       |
| `/auth/forgot-password`      | Neutral recovery request                                             |
| `/auth/reset-password`       | Reset form and completion state                                      |
| `/auth/mfa`                  | Authenticator app enrollment                                              |
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
