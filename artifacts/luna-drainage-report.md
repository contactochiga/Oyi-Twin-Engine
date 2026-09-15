# Luna Drainage V1 — Implementation Report

**Principle enforced throughout: represent what's real, disclose what isn't. No fabricated pipe sizes, gradients, invert levels, pump capacity, or discharge authority anywhere.**

## 1. Screenshots

| File | What it shows |
|---|---|
| `luna-drainage-engineering-board.png` | Engineering → Drainage opens the Control Board (B1 Discharge tab, default); status summary; building stays visible (translucent, not hidden) |
| `luna-drainage-wastewater-backbone.png` | 6A Stack Connection tab: real fixture drains (kitchen + 3 bathrooms) listed |
| `luna-drainage-apartment-6a-route.png` | "Show me the drainage from Apartment 6A." resolved through Oyi |
| `luna-drainage-vent.png` | Vent Termination tab: single-stack disclosure |
| `luna-drainage-stormwater.png` | Roof Drain tab: genuinely separate stormwater chain, DD10 disclosed |
| `luna-drainage-blockage.png` | drainage-blockage reference scenario applied live |
| `luna-drainage-recovery.png` | Reset returns stack connection to NORMAL |
| `luna-all-systems-view.png` | Engineering → All Systems, no errors |
| `luna-structure-view.png` | Engineering → Structure, no errors |
| `luna-structure-information-card-attempt.png` | Structure view at the point of a best-effort structural-element click (see Known Limitations) |
| `luna-drainage-facility-view.png` | Facility Drainage Control Board: exactly 8 tabs |
| `luna-regression-water-board.png` / `luna-regression-electrical-board.png` | Regression proof: prior boards still open correctly |

## 2. What existed before this phase

A complete, real wastewater chain (Phase 10): fixture drains → 6A stack connection → L06 branch → riser → B1 discharge reference, entirely via `parentRef`. Vent and stormwater did not exist in any form; EQ-STORM had zero registered instances.

## 3. What was added

4 new canonical assets: single-stack vent roof termination, and the roof drain/downpipe/site discharge stormwater chain. Zero new capabilities. 5 new geometry components + 5 new pipe visuals. 9th `SystemControlBoard` consumer (8 tabs). Full Oyi vocabulary/intent coverage for all 6 of the brief's example questions. `resolveDrainageState()` with a 6-state vocabulary (4 actually assigned, honestly). One reference scenario (`drainage-blockage`). A real, separately-confirmed gap fixed along the way: structural elements previously had no Information Card at all.

## 4. What was reused

The entire wastewater backbone, the shared `parentRef`/`buildServiceRoute()` mechanism, the existing `EngineeringRelationshipType` vocabulary (deliberately left `drains_to`/`routed_through` unused rather than adding redundant edges), the existing `SystemControlBoard`/`WaterAssetPanel`-style patterns, RepresentationPolicy (unmodified).

## 5. What was deliberately NOT fabricated

- No pipe diameter, gradient, invert level anywhere.
- No sump/lifting pump equipment (EQ-SUMP still has zero registered instances — correctly disclosed, not invented).
- No treatment or municipal discharge authority claimed.
- No valves/actuators for a passive gravity system.
- No second vent riser — single-stack reuses the real soil/waste riser.
- No continuous downpipe-to-grade geometry (would mix floor-local and building-fixed transforms without a real coordinated route).
- No `drains_to` edges duplicating the real parentRef chain.

## 6. Tests run

- `scripts/verifyDrainage.mjs`: 18/18 checks, run twice for deterministic stability.
- `scripts/verifyDrainageBrowser.mjs`: all journeys/assertions passing, 13 screenshots captured.
- Full regression: `test:representation`, `test:architecture`, `test:lift`, `test:four-lift`, `test:water`, `test:electrical`, `test:electrical-live-ops`, `test:fire`, `test:hvac`, `test:access`, `test:cctv`, `test:network` — all green.
- `test:presentation` and `test:cctv:browser` re-run as spot-check regression proof — green.
- `tsc -b`, `vite build`, `oxlint` — clean.
- Canonical asset-count baseline updated honestly: 82 → 86 in `scripts/verifyLift.mjs`, with the same disclosed-growth comment style the 76→82 update used.

## 7. Browser verification

Full journey: Engineering discovery → wastewater backbone → Oyi apartment-route investigation → vent → stormwater → no-fake-controls check → deterministic blockage scenario (live against the running provider) → recovery → All Systems → Structure → Facility privacy view → 8-system regression sweep (Elevator/Water/Electrical/Fire/HVAC/Access/CCTV/Network all still auto-open correctly).

## 8. Known limitations

See `docs/LUNA_DRAINAGE_REFERENCE_SPEC.md` §10 in full. Summary:
- DD10 remains fully open beyond the registered reference chain.
- The downpipe's roof-to-grade run is not continuous geometry.
- A literal route-trace listing for drainage reads discharge-first (the shared engine's own correct-for-other-systems convention) — Oyi's spoken narrative is correctly fixture-first instead, via a dedicated intent path.
- The structural-element Information Card fix is real and type-checked, but a live screen-space click could not reach a structural element in the headless test harness (architecture doesn't fade for Structure mode, and section clipping is visual-only, not raycast-aware — both pre-existing, unmodified characteristics). Disclosed, not silently claimed as verified.

## 9. Next recommended phase

Engineering Wrap-Up status summary and Architectural Reality V2 / Building Ingestion V1 prerequisites are documented separately: `artifacts/luna-engineering-wrap-up-status.md` and `docs/LUNA_ARCHITECTURAL_REALITY_V2_PREREQUISITES.md`.
