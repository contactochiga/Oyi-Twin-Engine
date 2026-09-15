# Oyi Building Ingestion V2 — 2D↔3D Spatial Binding + Automatic Twin Generation — Report

## Success condition

Not "upload a building file." **Normalize a building into Oyi's spatial model, bind architect-supplied 2D and 3D representations to the same canonical objects, and automatically instantiate the interaction grammar Luna already proves.** Full architecture in `docs/OYI_BUILDING_INGESTION_V2_SPATIAL_BINDING.md`; structured facts in `artifacts/oyi-building-ingestion-v2-spatial-binding.json`.

## 1. What was audited first (Part 1)

A full read-only pass across LevelRail, floor-plan production, the two-stage interaction closures in `App.tsx`, camera presets, the `useSelection`/`RepresentationPolicy` contracts, and the whole of Building Ingestion V1, before any code was written. The audit's own findings (engine-generic vs Luna-specific boundary, and the live-verified discovery that Luna's region-click path never sets canonical selection) directly shaped every subsequent design decision — see the doc's §1.

## 2. Files changed/added

**New (`src/engine/spatial/` — building-agnostic):**
- `types.ts` — the normalized spatial model.
- `representations.ts` — plan/model representations + crosswalk.
- `levelRail.ts` — `deriveLevelRailItems`, `deriveShortLabel`.
- `floorControl.ts` — `deriveFloorPlanSpec`.
- `cameraDerivation.ts` — 8 destination kinds + `validateCameraDestination`.
- `navigationGraph.ts` — `buildNavigationGraph`, `shortestPath`, `connectedSpaces`.
- `twoStageInteraction.ts` — `resolveTapAction`, `handleSpatialTap`.
- `operationalBinding.ts` — `createOperationalBinding`, `twinConnectivityLevel`.
- `oyiAliasIndex.ts` — `buildSpatialAliasIndex`, `resolveSpatialAlias`, `findAliasCollisions`.
- `twinProjectDefinition.ts` — `buildTwinProjectDefinition`, `LOAD_STEPS`.
- `testFixtures/miniBuildingFixture.ts` — the non-Luna synthetic building.
- `index.ts` — barrel export.

**New (ingestion extension):**
- `src/engine/ingestion/sourceRoles.ts` — `SOURCE_ROLE_REGISTRY`.

**New (Luna reference fixture, disclosed as repackaging not new data):**
- `src/luna/ingestion/lunaSpatialModel.ts`.

**New (non-Luna live proof harness):**
- `tests/ingestion-v2/index.html`, `tests/ingestion-v2/harness.tsx`.

**Modified (small, disclosed):**
- `src/engine/ingestion/types.ts` — `SourceRole`, `BuildingSourceRecord.role`, extended `ExtractedObjectClass`/`CanonicalTargetKind`.
- `src/engine/ingestion/projectStore.ts` — `RegisterSourceInput.role`, persisted.
- `src/ui/ingestion/CreateProjectFlow.tsx` — role selector + badge.
- `src/engine/components/spatial/TopCommandBar.tsx` — identity-group wrapper (header spacing).
- `src/App.css` — `.identity-slot` flex-basis fix (root cause of the spacing bug).
- `scripts/verifyOyiIdentityBrowser.mjs` — header DOM-order check updated (see §5's disclosed regression).
- `package.json` — `test:ingestion-v2`, `test:ingestion-v2:browser` scripts.

**Not touched:** `RepresentationPolicy`'s mode-resolution logic, any runtime provider/resolver, `lunaVocabulary.ts`, any `SystemControlBoard`, Luna's own production LevelRail/FloorPlan2D/camera rendering path in `App.tsx`, Grand Lobby architecture, L06 Gold Standard.

## 3. Real bugs found and fixed during this phase

1. **`floorControl.ts`'s core-object filter only checked a direct `levelRef`.** A real lift/stair serves MULTIPLE levels (`servedLevelRefs`), so a naive `levelRef === levelRef` check would silently exclude every full-height core from every level's floor plan except one. Found and fixed before the Luna-equivalence test could pass, via `coreServesLevel()` checking both.
2. **`CanonicalTargetKind` was missing `common_area`/`service_space`**, even though `ExtractedObjectClass` (the source-classification vocabulary) already had them — a real, pre-existing V1 gap (an extracted common-area object had nowhere canonical to map to) surfaced by `npm run build`'s stricter `tsc -b` check (not caught by plain `tsc --noEmit`, the same class of gap found in a prior phase). Fixed by adding both to `CanonicalTargetKind`.
3. **A genuine regression in `verifyOyiIdentityBrowser.mjs`**, found during the full regression pass: its header-order check assumed `.identity-slot` was a direct child of `.top-command-glass`; the header-spacing fix's new `identity-group` wrapper changed nesting depth without changing the real invariant (identity mark first, hamburger immediately after). Fixed by checking document order via `querySelectorAll` instead of direct-children class names — the same real requirement, verified through the new (correct) structure.

## 4. What is real today

- A **normalized spatial model** extending, not duplicating, Building Ingestion V1's own contracts.
- A real **2D↔3D crosswalk** where every query — `resolvePlanToModel`/`resolveModelToPlan` — routes through `canonicalRef`, never a direct 2D-source-to-3D-node lookup.
- **`deriveLevelRailItems()`**, proven byte-for-byte identical to Luna's real, live `LUNA_LEVEL_RAIL_ITEMS` across all 16 levels, using a genuine mix of automatic short-label derivation and explicit overrides.
- **`deriveFloorPlanSpec()`**, proven byte-for-byte identical (outline, core band, all 4 unit positions) to Luna's real, live `LUNA_L06_FLOOR_PLAN`.
- **`resolveTapAction()`**, a pure, tested generalization of Luna's own real two-stage tap grammar, proven live on a building with zero Luna-specific code (the mini fixture harness).
- **Camera destination derivation** covering all 8 named kinds, generalizing three techniques the audit found already spatially derived in Luna, with real (not aspirational) safety validation that downgrades to `CAMERA_REVIEW_REQUIRED` rather than guessing.
- A **navigation graph** built only from confirmed relationships — verified live that a level never auto-connects directly to a private unit, only through a real door.
- **Operational binding** where `connected` is always derived from a real `TwinDataProvider` lookup, never asserted — proven with both a real Luna asset ref (`connected: true`) and a fake ref (`connected: false`).
- A **non-Luna synthetic building**, rendered live through the exact same generic `LevelRail`/`FloorPlan2D` components and derivation functions Luna's equivalence tests use — proving the generalization, not just asserting it.
- **Source roles**, declared explicitly in the real ingestion UI, never inferred from a file extension.

## 5. What is explicitly not done (disclosed, not hidden)

- Luna's own production `App.tsx` rendering path was **not** rewired to consume the generic engine — equivalence was proven independently, the live path is unchanged (per "do not rebuild Luna architecture").
- Luna's region-click path (`onFocusRegion`) still does not set canonical selection for common-area objects — a real, pre-existing limitation, disclosed, not retrofitted.
- No real IFC/BIM parser was built — the plan/model-role split and crosswalk architecture are proven against hand-authored (but real, structurally faithful) fixtures, not an actual external file.
- The Review UI was not redesigned — the crosswalk architecture Part 22 asks for exists and is tested, but live highlight-on-select wiring into the existing Accept/Edit/Reject list is a disclosed next step.
- True visual camera occlusion (a mesh literally blocking a derived shot) is not checked — only data-level validation (degenerate distance, solid-bounds collision) is implemented and claimed.

## 6. Test results

| Suite | Result |
|---|---|
| `npm run test:ingestion-v2` (17 deterministic checks) | ✅ run twice, stable both times |
| `npm run test:ingestion-v2:browser` (25 items, real Chrome, includes the non-Luna fixture harness) | ✅ run twice, stable both times, zero page errors |
| `npx tsc --noEmit -p .` | ✅ clean |
| `npm run lint` | ✅ exit 0, only pre-existing warnings |
| `npm run build` | ✅ clean (after fixing the `CanonicalTargetKind` gap `tsc -b` caught) |
| Full existing regression — deterministic (17 suites: representation, presentation, architecture, lift, four-lift, water, electrical, electrical-live-ops, fire, hvac, access, cctv, network, drainage, ingestion, l06-gold-standard, grand-lobby) | ✅ all PASS, zero regressions |
| Full existing regression — browser (16 suites: lift, four-lift, control-surface, water, electrical, electrical-live-ops, fire, hvac, access, cctv, network, drainage, oyi-identity, ingestion, l06-gold-standard, grand-lobby) | ✅ all PASS after fixing 1 real, disclosed regression (§3.3) |

## 7. Screenshots (`artifacts/iv2-*.png`)

`iv2-header-spacing`, `iv2-l06-2d-floor-control`, `iv2-apartment-a-located`, `iv2-apartment-a-entered`, `iv2-ground-lift-region-focus`, `iv2-ground-stair-region-focus`, `iv2-l01-club-plan`, `iv2-l01-pool-focus`, `iv2-l01-lounge-focus`, `iv2-create-project-open`, `iv2-source-roles`, `iv2-ingestion-step`, `iv2-review-step`, `iv2-publish-boundary`, `iv2-mini-fixture-l01`, `iv2-mini-fixture-two-stage`.

## 8. Known limitations

- Items 8-13 of the acceptance checklist (Lift Lobby/Stair 2D↔3D focus) are demonstrated against Ground's real common areas rather than L06's — L06's own real floor plan represents its core as a single unlabeled band, not individually clickable lift/stair regions, a genuine pre-existing characteristic of that specific level's data, not a defect this phase introduced.
- Headless/SwiftShader screenshots render the 3D scene at reduced fidelity — a previously-disclosed testing-harness characteristic, not a rendering defect.
- Presentation Mode has no Consumer-scope switcher of its own (only Dev Mode's `OyiPanel` toggle reaches Consumer scope) — a genuine, pre-existing UI constraint this phase worked around honestly (§9 of the main doc) rather than fabricating a switcher that doesn't exist.

## 9. Manual local testing steps

```
cd /Users/ochigaidoko/Oyi-Twin-Engine
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort   # if not already running
```
1. Header: confirm the Oyi logo and hamburger read as one tight group, clearly separated from the search field.
2. L06 → 2D toggle → click Apartment A → camera flies, selection resolves (Dev Mode selection-debug: `LUNA-L06-APT-A`).
3. Switch to Consumer scope (Dev Mode) → "Enter Apartment A (L06)" → real 12-room interior opens.
4. Ground → click "Lift Lobby"/a stair region in the 2D plan → camera flies and highlights.
5. L01 → click Pool/Lounge in the 2D plan → camera flies to each.
6. Profile "•••" → Create New Project → Sources tab → pick a real declared role before registering a file.
7. Open `http://127.0.0.1:5173/tests/ingestion-v2/index.html` directly — a small synthetic building, zero Luna code, click a unit twice to see locate-then-enter.

Automated: `npm run test:ingestion-v2`, `npm run test:ingestion-v2:browser` — both green.

## 10. Next steps (not started here)

Retrofit Luna's `onFocusRegion` to also set canonical selection; wire the crosswalk into live Review-UI highlighting; build a real IFC/BIM adapter against this phase's role/crosswalk architecture; consider migrating Luna's own LevelRail production onto `deriveLevelRailItems()` now that equivalence is proven.

---

**Stop condition met.** No Luna architecture was rebuilt. No fake parser support was claimed. No operational devices were fabricated. Three.js geometry was never treated as canonical. `RepresentationPolicy` was not bypassed or modified. No second intelligence system was created. The full regression suite in §6 confirms zero unresolved regressions. No production/cloud changes were made.
