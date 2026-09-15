# OYI Spatial Card + 2D Plan Visual Convergence V1

Status: implemented and verified locally.

## Purpose

This phase converges Luna's contextual spatial UI into one progressive Spatial Card grammar:

Building / Level -> Apartment or Space -> Room -> Asset.

The 3D Twin remains the dominant interface. The card is a compact contextual surface that embeds the relevant 2D plan, selection state, navigation mode, live position and authorized runtime controls without creating separate level, map, room or device dashboards.

## Takeover State

The inherited worktree already contained substantial Claude Code work around `InteriorNavigationCard`, the Apartment A 14-room interior, map privacy, room/device selection and the shared navigation-mode path. The repository folder available in this environment has no `.git` metadata, so the requested `git status`/`git diff` audit cannot produce a working-tree diff. A non-destructive baseline snapshot was treated as inherited state, and all current modified/untracked files were preserved.

The last visible handoff edit added a level-label lookup in `InteriorNavigationCard`. Fresh typecheck passed before additional changes were made.

## Implemented Behavior

The final card progression is:

- Level 6 shows one level card with a rich L06 plan, correct `4 Units` badge, lifecycle status, common-area rows and embedded TELEPORT/TOUR control.
- Selecting Apartment A keeps the same contextual card model, showing the apartment summary and restrained plan highlight.
- Entering Apartment A switches the same card to the 14-room interior navigator with the Apartment A plan embedded in-card.
- Selecting Living Room updates the same card to room depth, keeps the plan and live position visible, and shows real authorized devices.
- Selecting a device updates the same card to asset depth and exposes runtime state/capabilities through the existing Twin runtime controls.
- Back navigation returns through asset -> room -> home -> apartment summary -> level without spawning a separate card surface.

## Breadcrumbs

Breadcrumbs now use human labels and avoid duplicated parent labels:

- `Level 6`
- `Level 6 > Apartment A`
- `Level 6 > Apartment A > Living Room`
- `Level 6 > Apartment A > Living Room > Curtain`

Device titles remain full labels, such as `Living Room Curtain`; only the breadcrumb segment is shortened when the asset label already starts with the room label.

## 2D Plan Presentation

`FloorPlan2D` remains the shared canonical plan renderer. This phase improved its presentation without inventing architecture:

- viewBox bounds now derive from real rendered unit extents plus padding, so the Apartment A plan is not cropped by the older declared outline.
- selected regions use a restrained cyan outline/tint instead of a heavy opaque fill.
- room labels are capped to a compact size for card-scale rendering.
- the live position dot is rendered inside the same SVG coordinate system as the plan.

Apartment A plan richness is source-backed by existing canonical geometry: 14 rooms, 27 door-swing paths and 68 furniture/fixture silhouettes in the browser verification.

## Live Position

The live dot continues to derive from:

actual camera/world position -> `resolveSpatialMapContext` -> local 2D plan coordinate.

It is not tied to selected room state. If the camera is off the relevant plan, the card reports `Off floor` instead of snapping the dot to selection.

## Navigation Mode

The TELEPORT/TOUR control is embedded in the Spatial Card and uses the shared `navigationMode` state from `App.tsx`.

Room click/tap is LOCATE behavior: select/focus/highlight without claiming travel. The explicit `Enter` button uses the active shared navigation mode. This preserves the distinction between locating a destination and entering/travelling to it.

## Runtime Controls

Room assets use the existing operational asset catalog and Twin runtime provider. The card reuses the existing `CommandControls` component, so parameter-aware commands such as AC temperature/mode controls and curtain presets continue to run through the existing runtime, actor identity and policy gates.

## Facility / Consumer Projection

The same card architecture is used for Facility and Consumer contexts. Visibility is still derived from the unchanged RepresentationPolicy:

- Facility can see the common L06 plan and operational/common context.
- Facility cannot open the private Apartment A 14-room interior card/map through the new embedded card path.
- Assigned Consumer can enter Apartment A and see the private interior plan and permitted room/device controls.
- Unrelated/private access remains denied by the existing policy and route checks.

## Evidence

Visual browser screenshots:

- `artifacts/scc-01-l06-level-card.png`
- `artifacts/scc-02-apartment-a-selected.png`
- `artifacts/scc-03-apartment-a-interior.png`
- `artifacts/scc-04-living-room-selected.png`
- `artifacts/scc-05-actual-device-selected.png`
- `artifacts/scc-05-device-command.png`
- `artifacts/scc-06-facility-view.png`
- `artifacts/scc-07-assigned-consumer.png`
- `artifacts/scc-08-apartment-overview.png`
- `artifacts/scc-09-compact-card.png`

Machine-readable browser result:

- `artifacts/spatial-card-convergence-results.json`

## Validation Summary

Green:

- `npx tsc -b --pretty false`
- `npm run lint` (warning-only)
- `npm run build`
- `node scripts/verifySpatialCardConvergence.mjs`
- `npm run test:representation`
- `npm run test:presentation`
- `npm run test:lift`
- `npm run test:four-lift`
- `npm run test:water`
- `npm run test:electrical`
- `npm run test:electrical-live-ops`
- `npm run test:fire`
- `npm run test:hvac`
- `npm run test:access`
- `npm run test:cctv`
- `npm run test:network`
- `npm run test:drainage`
- `npm run test:ingestion`
- `npm run test:l06-gold-standard`
- `npm run test:grand-lobby`
- `npm run test:spatial-transition`
- `npm run test:routed-traversal`
- `npm run test:l06-floor`
- `npm run test:apt-a-interior`
- `npm run test:apt-a-graph`
- `npm run test:apt-a-oyi-semantics`
- `npm run test:apt-a-map-policy`
- `node scripts/verifyApartmentAMapPrivacyBrowser.mjs`
- `node scripts/verifyApartmentATeleportBrowser.mjs`
- `node scripts/verifyApartmentAGoldenJourneyBrowser.mjs`
- `node scripts/verifyRoutedTraversalBrowser.mjs`
- `npm run test:routed-traversal:policy-browser`
- `node scripts/verifyL06FloorBrowser.mjs`
- `node scripts/verifyOyiIdentityBrowser.mjs`

Known pre-existing / disclosed:

- `npm run test:ingestion-v2` still fails on the known L06 derived outline depth mismatch.
- `node scripts/verifyL06GoldStandardBrowser.mjs` still fails on the fragile old Kitchen-door pixel-click assertion after completing the route/privacy sections.

Other known issue retained:

- Apartment A internal multi-hop TOUR after the outer `Take me home` route can still stall; the golden journey reports it honestly while still proving the access journey, map activation and device command path.

## Production Boundary

No production deployment, cloud writes, Supabase writes, service-role keys, physical device commands or remote migrations were performed.
