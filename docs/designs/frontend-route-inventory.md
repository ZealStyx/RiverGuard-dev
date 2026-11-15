# RiverGuard Frontend Route Inventory

This document records the connected frontend prototype implemented from the RiverGuard UI/UX Design Cheat Sheet. The routes use clearly labeled sample data and simulated actions. Real authentication, authorization, Convex persistence, external weather retrieval, local ML inference, verified GIS layers, alert publication, and dark mode are deferred.

## Public and account routes

| Route | Purpose |
|---|---|
| `/welcome` | Public project entry and role access information |
| `/about` | Purpose, coverage, and deployment scope |
| `/methodology` | Definitions, evidence rules, and limitations |
| `/official-sources` | Official-source reminder and verified-link area |
| `/auth/login` | Provider-neutral login form |
| `/auth/signup` | Resident registration prototype |
| `/auth/request-access` | Researcher/LGU access request |
| `/auth/verify` | Identity verification state |
| `/auth/pending` | Pending administrator approval |
| `/auth/forgot-password` | Neutral recovery request |
| `/auth/reset-password` | Reset form and completion state |
| `/auth/mfa` | MFA challenge prototype |
| `/auth/invitation` | Invitation acceptance |
| `/auth/rejected` | Rejected access state |
| `/auth/suspended` | Suspended account state |
| `/auth/locked` | Locked account state |
| `/auth/unauthorized` | Permission-required state |
| `/auth/unavailable` | Authentication-provider error state |
| `/auth/session-expired` | Session recovery state |
| `/auth/invitation-expired` | Expired invitation state |
| `/auth/verification-expired` | Expired verification state |
| `/auth/logout` | Logout success |

## Onboarding routes

- `/onboarding/resident`
- `/onboarding/researcher`
- `/onboarding/lgu`
- `/onboarding/admin`

Each route uses a role-specific connected flow: Resident (welcome, locations, preferences, safety), Researcher (profile, coverage, models, tour, responsible use, ready), LGU (assignment, authority, review, notes, notifications, safety, ready), and Administrator (assignment, MFA, policy, configuration, audit, security, ready).

## Researcher workspace

| Route | Purpose |
|---|---|
| `/` and `/researcher` | Research dashboard |
| `/researcher/map` | Map and accessible location list |
| `/researcher/locations/marikina` | Location details and evidence |
| `/researcher/history` | Historical-data filters, chart, and table |
| `/researcher/forecast/new` | Forecast configuration |
| `/researcher/forecast/review` | Input review |
| `/researcher/forecast/progress` | Simulated progress |
| `/researcher/runs` | Forecast history |
| `/researcher/runs/RG-NCR-041` | Forecast result |
| `/researcher/runs/RG-NCR-041/day/2026-11-11` | Forecast-day detail |
| `/researcher/compare` | Run comparison |
| `/researcher/data-sources` | Source catalogue |
| `/researcher/data-sources/daily-rainfall` | Source metadata |
| `/researcher/data-sources/new` | Metadata form |
| `/researcher/models` | Models and evaluation |
| `/researcher/models/rg-ncr-04` | Model card |

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
- `/admin/locations` — supported-location configuration
- `/admin/data-sources` — data-source configuration
- `/admin/provider` — weather-provider configuration
- `/admin/models` — model-version configuration
- `/admin/hazard-layers` — hazard-layer configuration
- `/admin/audit` — redacted audit history
- `/admin/settings` — safety and deferred-capability settings

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
