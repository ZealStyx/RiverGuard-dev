# RiverGuard Complete Frontend — Design QA

## Comparison target

- Dashboard density reference: `C:\Users\ta1yi\AppData\Local\Temp\codex-clipboard-46c5becd-727e-489c-85f7-aeb151144561.png`
- Settings and sidebar structure reference: `C:\Users\ta1yi\Downloads\original-62f9a1c33cd80ebda33507ec847ccddb.webp`
- Source state: researcher dashboard shown at 80% browser zoom; settings image used as structural inspiration with its outer presentation frame excluded
- Source pixels: 1885 × 990
- Implementation: `http://localhost:3000/`
- Implementation screenshot: Codex in-app browser capture of the root researcher dashboard at a 1885 × 990 viewport override
- Implementation CSS viewport after scrollbar normalization: 1870 × 975
- Density normalization: the source’s apparent 80% scale was implemented through compact typography, spacing, control-height, radius, panel, and shell tokens; CSS `zoom` and transform scaling were not used
- Theme: light
- Date checked: November 13, 2026

## Full-view comparison evidence

The sources and implementation were inspected at desktop and mobile sizes. The implementation preserves the approved compact dashboard density while adopting the settings reference’s clearer hierarchy: a full-width settings surface, grouped form sections, restrained dividers, and a gear-triggered settings popover.

Intentional product differences:

- The desktop top navigation, demo workspace selector, and prototype status strip were removed.
- Primary navigation now uses a 56 px icon rail that expands to 224 px on hover or keyboard focus without shifting the page.
- The settings reference’s information structure was retained without copying its outer frame, brand, or unrelated product categories.
- Dark-theme controls remain deferred while the complete light-theme frontend is stabilized.

These differences support the approved multi-role frontend plan and do not change the selected visual language.

## Focused-region evidence

- **Navigation and actions:** compact 28–36 px controls, 12 px navigation text, clear active states, and Phosphor icons match the target’s visual density. Sidebar search opens a functional page finder and the folded rail exposes labels on hover/focus.
- **Map controls:** layer card, city markers, legend, coverage note, and availability strip retain the target hierarchy while using smaller padding and type.
- **Evidence panels:** seven-day selector, chart, contribution bars, provenance rows, status labels, and evidence action use the approved white surfaces and compact rhythm.
- **Forms and tables:** forecast, review, catalogue, role, and configuration screens reuse the same control heights, border treatment, and type hierarchy.
- **Settings:** the former sparse layout was replaced with a full-width settings surface; Profile, Notifications, Accessibility, Security, Password, and Account access are opened from the sidebar gear popover.
- **Authentication:** every password field includes an accessible show/hide control.
- **Mobile:** 390 × 844 validation showed a working header menu, readable settings flow, stacked content, and no visible horizontal overflow.

## Required fidelity surfaces

### Fonts and typography

- Geist remains the single application family.
- Page title was normalized from 28 px to 22 px; major status to 18 px; section labels to 14 px; navigation/body/button text to 12 px; metadata to 10 px.
- Weight and line-height remain differentiated at compact sizes, with no observed truncation in the tested desktop and mobile routes.

### Spacing and layout rhythm

- Sidebar, page padding, card padding, control height, chart height, map overlays, and radii were reduced through reusable tokens/components.
- Wide dashboard retains a map/evidence split; narrower screens stack the evidence below the map.
- Browser checks found no horizontal overflow after the tooltip fix.

### Colors and visual tokens

- Brand primary: `#284B63`
- Brand secondary: `#3C6E71`
- Canvas: `#FFFFFF`
- Line/disabled: `#D9D9D9`
- Ink/stage: `#353535`
- Amber and red remain semantic warning/risk colors rather than brand colors.

### Image quality and asset fidelity

- The supplied local NCR illustrative raster remains the map asset.
- It retains its crop, city highlights, waterways, and boundary treatment.
- No placeholder drawings, handcrafted SVG illustrations, emoji, or CSS-generated map assets were introduced.
- Phosphor remains the shared UI icon family.

### Copy and content

- Development-only notes, demo-workspace language, and prototype status strips were removed from product-facing screens.
- Scientific and safety qualifiers remain only where they prevent experimental forecasts or unverified evidence from being mistaken for official warnings.
- Forecast results do not claim exact probability, real-time monitoring, barangay resolution, or official warning status.
- Resident and LGU pages include official-source reminders and escalation language.
- Administrative actions use clear product language without exposing implementation scaffolding.

## Interaction and route checks

- Dashboard refresh state
- Collapsible desktop sidebar and mobile navigation drawer
- Search dialog filtering and navigation, including settings/password results
- Password show/hide controls across login, signup, reset, invitation, and settings forms
- Map layer selection and location alternatives
- Forecast configuration → review → progress → results
- Result day detail, history, comparison, source metadata, and model card routes
- Resident outlook and mobile navigation
- LGU review and draft-alert paths
- Administrator requests, users, configuration, audit, and settings paths
- Login, verification, pending, recovery, MFA, invitation, account-state, logout, and onboarding paths
- Shared profile, notification, accessibility, security, password, and account-lifecycle paths
- Browser console errors checked: none

## Comparison history

### Pass 1

- **[P2] Right-edge tooltip caused desktop horizontal overflow.** The centered `Profile and settings` tooltip extended beyond the viewport, increasing `scrollWidth` from 1870 px to 1889 px.
- Fix: changed the rightmost tooltip placement from below/centered to left-aligned beside its trigger.

### Pass 2

- Post-fix evidence: desktop `clientWidth` and `scrollWidth` both measured 1870 px at the wide comparison viewport.
- Mobile evidence: `clientWidth` and `scrollWidth` both measured 375 px at the 390 × 844 browser viewport.
- No actionable P0, P1, or P2 differences remained.

### Pass 3

- Replaced the top navigation with a folding desktop sidebar and verified its expanded keyboard-focus state at 1200 × 900.
- Rebuilt account settings from the supplied structural reference and verified desktop and 390 × 844 mobile layouts.
- Verified the search dialog returns a connected password-settings route and every tested password form exposes an accessible visibility toggle.
- Removed remaining product-facing prototype, demo, mock-state, and development-fixture language.

### Pass 4

- Consolidated LGU, Resident, and Administrator sidebar items into task-level groups while retaining every detailed route in Search.
- Added grouped-route active states so child pages continue highlighting their correct sidebar section.
- Added a single styled Back to public view action to shared information pages that temporarily leave the role shell.
- Removed unauthenticated workspace shortcuts from the welcome page; role cards are now informational and protected roles show their access requirements.

### Pass 5

- Verified Researcher login → verification → pending approval → simulated approval → six-step onboarding → dashboard.
- Verified Resident signup → verification → four-step onboarding → resident outlook.
- Verified LGU and Administrator MFA paths reach their distinct seven-step onboarding flows.
- Verified settings gear popover opens all six settings destinations, closes after navigation, and removes the redundant inner settings sidebar.
- Corrected guest, change-email, and public-information return destinations.

## Follow-up polish

- P3: Real geospatial assets may require map-height and label-position tuning when MapLibre replaces the illustrative raster.
- P3: Final logo dimensions may require a small adjustment to the compact header lockup.

## Final result

final result: passed
