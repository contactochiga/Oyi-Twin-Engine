# OYI Spatial Card + 2D Plan Visual Convergence V1 Report

## Result

The Spatial Card / 2D Plan Visual Convergence phase is complete locally. Luna now uses one progressive contextual card for Level, Apartment, Room and Asset depth while keeping the 3D building dominant.

## Inherited Work Preserved

- Apartment A Full Interior Reality V1, including 14 rooms and accepted access/runtime behavior.
- Existing canonical refs, camera anchors, map transform and runtime provider.
- RepresentationPolicy behavior and source.
- Facility/Consumer shared projection model.
- Existing Oyi top-bar/controller path.
- Existing Engineering Layers, View/Section controls and Level Rail.

## Continuation Changes

- Completed the progressive same-card path through L06 -> Apartment A -> Living Room -> Curtain/device.
- Cleaned breadcrumbs so they use human labels and no longer expose duplicate level/apartment/room wording.
- Embedded TELEPORT/TOUR controls into Level, Apartment and Interior card states using shared session state.
- Embedded live-position rendering into `FloorPlan2D` so the dot shares the canonical plan coordinate system.
- Improved card-scale 2D plan fit, room label scale and restrained cyan selection emphasis.
- Reused the existing runtime `CommandControls` for in-room devices instead of creating a parallel control path.
- Suppressed the separate floating map in Presentation Mode while a primary Spatial Card is active.
- Extended the SCC browser proof to include asset depth, device command, back chain, compact viewport and Facility privacy projection.

## Verification Evidence

Screenshots:

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

Primary browser proof:

- `artifacts/spatial-card-convergence-results.json`

## Test Results

Green:

- typecheck, lint, build.
- spatial-card convergence browser proof.
- RepresentationPolicy, Presentation, lift, four-lift, water, electrical, electrical live ops, fire, HVAC, access, CCTV, network, drainage, ingestion, L06 deterministic, grand lobby, spatial transition, routed traversal, Apartment A deterministic/map/privacy/teleport/golden journey, route policy browser, L06 floor browser and Oyi identity browser.

Known pre-existing / disclosed:

- `npm run test:ingestion-v2` fails on the known L06 derived outline depth mismatch.
- `node scripts/verifyL06GoldStandardBrowser.mjs` fails on the known fragile Kitchen-door pixel-click assertion after completing relevant route/privacy sections.
- Apartment A internal multi-hop TOUR continuation can still stall after the outer `Take me home` route; the golden journey reports this honestly.

New failures:

- None identified.

## Production Boundary

No production deployment, cloud resources, Supabase writes, service-role keys, physical device commands or remote migrations were used.
