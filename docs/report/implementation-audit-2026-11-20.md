# Implementation and website audit - 2026-11-20

## Summary

This update completes the first ML-tailored city-map milestone and audits
interactive controls across the website. It removes UI actions that appeared
to save or authenticate when no backend behavior existed.

## Map implementation

The existing MapLibre map component was extended rather than replaced.

### Added behavior

- City-level forecast markers for Quezon City, Marikina, Manila, and Pasig.
- Active-location marker selection.
- A forecast-day timeline synchronized with the marker and detail panel.
- Risk colours sourced from Lower, Moderate, and Elevated model labels.
- Detail values for probability, forecast rainfall, and derived water level.
- Live or stored outlook data passed from Researcher, LGU, Resident, and Admin
  surfaces.
- Empty and unavailable forecast states remain explicit.

### Files changed

- `apps/web/src/components/map/RiverMap.tsx`
- `apps/web/src/components/researcher/ResearcherWorkspaceDashboard.tsx`
- `apps/web/src/components/dashboard/DashboardLayout.tsx`
- `apps/web/src/components/prototype/ResearcherScreens.tsx`
- `apps/web/src/components/prototype/RoleScreens.tsx`

## Website audit fixes

### Authentication

- Desktop and mobile sign-out controls call Firebase `signOut`.
- Direct navigation to `/auth/logout` also signs out the current Firebase user.
- The sidebar no longer uses a sign-out link that only shows a status screen.

### Preferences

- Resident primary-city, default-view, outlook-update, and reduced-motion
  preferences persist in `localStorage` under
  `riverguard:resident-preferences`.
- Notification and accessibility settings remain disabled because no preference
  backend exists.

### Explicit unavailable workflows

The following controls no longer claim to save or succeed:

- Password-change forms direct users to the working Firebase password-reset
  email action.
- MFA setup and recovery-code controls are unavailable until Firebase MFA is
  configured.
- Account invitation processing is unavailable until invitation records and
  account provisioning exist.
- Access-review and deactivation actions are unavailable until Convex
  authorization mutations exist.
- LGU alert approval is unavailable until a governed draft and publication
  workflow exists.
- Source metadata and admin configuration editing are unavailable until
  persisted Convex mutations exist.

## Remaining backend requirements

The map must not be extended to finer spatial units until real data exists.
Required work includes:

- Verified, licensed hazard, boundary, river, and station GIS assets.
- Timestamped station observations with documented datum and units.
- Geographically attributed flood-event records for calibration.
- Per-location held-out and storm-event model evaluation.
- Probability calibration status and uncertainty methods.
- Convex mutations for preferences, access requests, alerts, audit records, and
  admin configuration.
- Firebase MFA configuration for real multi-factor authentication.

## Validation

The following commands pass:

- `npm run typecheck`
- `npm run build`

The following routes returned HTTP 200 during local checks:

- `/welcome`
- `/auth/logout`
- `/resident/settings`
- `/researcher/settings`
- `/researcher`
- `/researcher/runs`
- `/lgu`
- `/admin`

## Known limitations

- The probability is experimental and not an official warning.
- The water-level value is a model-derived proxy, not a gauge reading.
- The development model and labels are synthetic/derived in significant
  material.
- A clean checkout has no verified GIS geometry.
- No real-time station ingestion or official advisory feed is configured.
