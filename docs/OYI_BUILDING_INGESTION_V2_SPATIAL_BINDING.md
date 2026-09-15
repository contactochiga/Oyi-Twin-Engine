# Oyi Building Ingestion V2 — 2D↔3D Spatial Binding + Automatic Twin Generation

## Success condition

Not "we can upload a building file." This phase's success condition is: **we can normalize a building into Oyi's spatial model, bind its architect-supplied 2D and 3D representations to the same canonical objects, and automatically instantiate the interaction grammar already proven by Luna.**

```
ARCHITECT 2D  ↘
            CANONICAL BUILDING
ARCHITECT 3D  ↗
```

The architect's plan remains the architectural source. The architect's 3D remains the architectural geometry source. Oyi creates the canonical semantic/spatial relationship between them. Nothing here redraws a plan or treats an imported mesh as identity.

---

## 1. Existing Luna behavior audited (Part 1)

A full read-only audit preceded any code change (see the session's own research pass). Findings, by area:

| Area | Verdict |
|---|---|
| `LevelRail.tsx` (render strip) | ENGINE-GENERIC |
| `lunaLevelRail.ts` (item production) | LUNA-SPECIFIC — hand-typed `SHORT_LABEL` table + `.reverse()`, no generic producer existed |
| `FloorPlan2D.tsx` | ENGINE-GENERIC |
| `lunaFloorPlans.ts` (spec production) | LUNA-SPECIFIC — three separate hand-coded strategies (L06, L10, generated, region-based) |
| Two-stage interaction (`selectUnitAndFly`/`enterInterior`/`focusRoom`) | LUNA-SPECIFIC — five bespoke closures in `App.tsx`, no reusable decision logic |
| 2D→3D / 3D→2D correspondence | `useSelection`/`UnitVolume` = ENGINE-GENERIC and real; `Representation2D3DToggle` = present but **presentational only**, wired to no actual mode-dependent rendering (self-disclosed in its own file comment) |
| Camera presets | `CameraRig.tsx` = ENGINE-GENERIC; `lunaCameraPresets.ts` = MIXED — most are hand-authored literals, but `unitExteriorFocusCamera()`'s radial-pullback and `roomFocusCamera()`'s 40%-corner-inset fallback were ALREADY spatially derived, not authored |
| `useSelection`/`useHover` hooks | ENGINE-GENERIC, no changes needed |
| `RepresentationPolicy` | ENGINE-GENERIC contract (`representationPolicy.ts`) + LUNA-SPECIFIC implementation (`lunaRepresentationPolicy.ts`) — already the correct split |
| Building Ingestion V1 (`src/engine/ingestion/*`) | ENGINE-GENERIC, most V2-ready area already in the codebase |
| `TwinNodeKind` / `CanonicalTargetKind` / `ExtractedObjectClass` | Three separate, only loosely-aligned vocabularies — a real reconciliation gap |
| `TwinDataProvider` | ENGINE-GENERIC contract, near-trivial Luna implementation |
| Top bar | ENGINE-GENERIC component; the spacing bug lived in a plain CSS rule, not Luna code |

A genuine, live-verified finding not visible from static code alone: Luna's own 2D floor-plan click behavior is **not uniform**. Unit-kind clicks (apartments) go through `selectUnitAndFly`, which sets canonical `selected` state and enables true 2D↔3D reverse sync. Region-kind clicks (lift lobbies, stairs, rooms on Ground/B1/L01/Penthouse/Rooftop) go through a *different*, pre-existing `onFocusRegion` callback that flies the camera and highlights, but never touches `selected` — so region objects do **not** get canonical reverse-sync today. This is a real, pre-existing Luna limitation, not something this phase broke; it is disclosed here rather than silently worked around (see §9).

## 2. Generic vs Luna-specific boundary (the target this phase builds toward)

Everything new in this phase lives in `src/engine/spatial/` (building-agnostic) or `src/engine/ingestion/` (extended, already building-agnostic). The one Luna-specific file added, `src/luna/ingestion/lunaSpatialModel.ts`, **repackages** Luna's own existing real data into the generic shape — it introduces no new data, no parallel source of truth.

## 3. Source roles (Part 3)

`src/engine/ingestion/sourceRoles.ts` — `SourceRole` (`ARCHITECTURAL_2D` / `ARCHITECTURAL_3D` / `BIM` / `STRUCTURAL` / `MEP` / `SITE` / `SCHEDULE` / `REFERENCE_IMAGE` / `SUPPLEMENTARY`), each with a `feedsPlanRepresentation`/`feedsModelRepresentation` flag. `BuildingSourceRecord.role` and `RegisterSourceInput.role` are additive optional fields — every V1 call site keeps compiling unchanged. The "Sources" step of Create New Project now asks explicitly what a registered file represents, never inferring it from the file extension, and displays the declared role as a badge next to the format badge.

## 4. Honest parser support (Part 4)

Audited, unchanged: `formatRegistry.ts`'s `SUPPORTED`/`PARTIALLY_SUPPORTED`/`VISUAL_ONLY`/`REQUIRES_CONVERSION`/`REQUIRES_REVIEW` vocabulary was already honest going into this phase (only GLB/glTF are `PARTIALLY_SUPPORTED`; IFC/RVT/Archicad are `REQUIRES_CONVERSION`; PDF/CAD/image are `REQUIRES_REVIEW`; nothing claims full `SUPPORTED`). `CreateProjectFlow.tsx`'s own wording was already free of overclaiming ("COMING NEXT — no working adapter is registered... Nothing is fabricated"). No changes were needed here beyond re-verifying it live.

## 5. Normalized spatial model (Part 5)

`src/engine/spatial/types.ts` extends — never duplicates — Building Ingestion V1's own `CanonicalTargetKind` (now also carrying `unit`, `riser`, `corridor`, `amenity`, `common_area`, `service_space`, reconciling a real pre-existing gap where `ExtractedObjectClass` already had "common_area"/"service_space" but the target-kind vocabulary a normalizer maps *into* didn't). `NormalizedSpatialObject` carries every field the brief specified (`canonicalRef`, `sourceRefs`, `source2DRefs`, `source3DRefs`, `parentRef`, `levelRef`, `spaceType`, `name`, `boundary`, `centroid`, `bounds`, `entryPoints`, `connectedSpaceRefs`, `representationRefs`, `confidence`, `reviewStatus`, `provenance`), with typed refinements for Building/Site/Level/Unit/Room/CommonArea/Door/Window/Lift/Stair/Riser/StructuralElement, plus `OperationalAssetBinding` as its own distinct shape (§13). `NormalizedBuildingModel` is the container every derivation function below consumes.

## 6/7/8. Plan representation, model representation, crosswalk (Parts 6/7/8)

`src/engine/spatial/representations.ts`. `PlanRepresentation` (canonicalRef + sourceRef + levelRef + boundary + origin: `"vector"` for BIM/vector-derived regions or `"reviewed_overlay"` for human-confirmed raster overlays — never claiming "vector" for a region nobody actually extracted from vector data). `ModelRepresentation` (canonicalRef + sourceRef + nodeRefs + optional bounds/transform — the imported mesh is a representation of the canonical object, never the identity itself). `SpatialRepresentationCrosswalk` indexes both; `resolvePlanToModel()`/`resolveModelToPlan()` are the ONLY two functions that cross between 2D and 3D, and both route exclusively through `canonicalRef` — there is no direct 2D-source-to-3D-node lookup anywhere in this codebase.

`deriveFloorPlanSpec()` (`floorControl.ts`) is the generic replacement for `lunaFloorPlans.ts`'s three hand-coded strategies: it reduces a `SpatialBoundary` polygon to its bounding rect when needed (disclosed simplification), computes a symmetric-about-origin outline matching `FloorPlan2D`'s own centering assumption, and unions lift/riser/stair boundaries into the core band — correctly checking BOTH a direct `levelRef` and a `servedLevelRefs` membership, since a real lift/stair genuinely serves multiple levels (a bug caught during Luna-equivalence testing and fixed before it shipped).

## 9. Generic floor control card + two-stage interaction (Parts 9/10/11)

`deriveFloorPlanSpec()` (§6-8) generalizes the card; `src/engine/spatial/twoStageInteraction.ts`'s `resolveTapAction()` generalizes the grammar as a pure, stateless function: tapping anything not already selected is always `"locate"`; tapping the already-selected-but-not-entered object is `"enter"`; re-tapping an already-entered object stays `"locate"` (never claims a fresh entry). This is Luna's own real `selectUnitAndFly`/`enterInterior` decision logic, extracted — the host still owns state and the RepresentationPolicy re-check, exactly as Luna's `enterInterior()` already does.

**Disclosed limitation, not fixed in this phase:** Luna's live region-click path (`onFocusRegion` in `LevelContextCard.tsx`, used by every common-area/core object on Ground/B1/L01/Penthouse/Rooftop) flies the camera and highlights but does not set canonical `selected` — so full bidirectional 2D↔3D reverse sync exists today only for unit-kind objects (proven live: Apartment A), not region-kind objects (Lift Lobby, Stair, Pool, Lounge). This is real, pre-existing Luna behavior this phase did not introduce and — per "do not rebuild Luna architecture" — did not retrofit. The generic engine primitives (`resolveTapAction`, the crosswalk) do not have this limitation; a newly ingested project wiring its own host through them would get full bidirectional sync from day one. Retrofitting Luna's own region-click path to also call `select()` is a reasonable, small, future follow-up, not attempted here.

## 12. Automatic LevelRail (Part 12)

`src/engine/spatial/levelRail.ts`. `deriveShortLabel()` is a small, disclosed pattern set (mirrors `normalize.ts`'s own `proposeRefSlug` discipline) — it correctly derives "G", "L02"–"L12", "PH" automatically, and falls back to the level's own ref tail or an explicit `NormalizedLevel.shortLabel` override for names it can't cleanly parse ("Basement (B1)", "Level 1 — Residents' Club", "Luna Sky (Rooftop)"). `deriveLevelRailItems()` sorts by `order` descending (matching Luna's own `[...LUNA_LEVELS].reverse()` convention) and is **verified live, byte-for-byte, against Luna's real `LUNA_LEVEL_RAIL_ITEMS`** using a genuine mix of the automatic heuristic and explicit overrides — proving both paths, not just the easy one.

## 13/14. Camera destination derivation + safety validation (Parts 13/14)

`src/engine/spatial/cameraDerivation.ts` generalizes the three techniques the audit found already spatially derived in Luna: `deriveSpaceExteriorCamera()` (radial pullback from building center — generalizes `unitExteriorFocusCamera`), `deriveSpaceInteriorCamera()` (40%-corner-inset — generalizes `roomFocusCamera`'s own fallback), `deriveAssetFocusCamera()` (opposite-corner pullback — generalizes `assetFocusCamera`). `deriveSpaceEntryCamera()`/`deriveLiftLobbyCamera()`/`deriveStairInterfaceCamera()`/`deriveLevelOverviewCamera()`/`deriveBuildingOverviewCamera()` cover every destination kind Part 13 names. `validateCameraDestination()` checks what can genuinely be answered from data alone (degenerate zero-distance shots; camera position falling inside another space's own solid `bounds3D`) and downgrades to `CAMERA_REVIEW_REQUIRED` rather than ever guessing — true visual occlusion (a mesh actually blocking the shot) is explicitly NOT claimed as checked, since that needs live scene geometry this data-only layer doesn't have.

## 15/16/17/18. Navigation graph, doors, lifts, stairs (Parts 15-18)

`src/engine/spatial/navigationGraph.ts`. Edges come ONLY from confirmed relationships: a door's `fromSpaceRef`/`toSpaceRef`; a lift/stair's `servedLevelRefs` (star topology through the transport node itself, matching how a real lift/stair actually works — you go TO it, not directly between floors); a common area's own `levelRef` (open-plan circulation is walkable without a door, matching real buildings and matching Grand Lobby's own precedent); and any space's explicit `connectedSpaceRefs`. **Private units are never auto-connected to their level** — verified live in both the deterministic and non-Luna-fixture tests: a level connects to a corridor, a corridor connects to a unit via its real door, but there is no direct level→unit edge. `shortestPath()` answers "where can a path go"; it never touches or implies authorization — `RepresentationPolicy` remains the sole answer to "may this user go there," completely unmodified by this phase.

Doors carry `doorKind` (`hinged`/`sliding`/`automatic_sliding`/`unknown`) and an optional `operationalAssetRef`, set only when a real access-control asset is actually mapped — an architectural door is never a smart lock by default. Lifts/stairs carry `servedLevelRefs` and (lifts only) an optional `operationalAssetRef` — a static imported building gets real navigation-graph connectivity, never a fabricated controllable elevator.

## 19. Oyi spatial language (Part 19)

`src/engine/spatial/oyiAliasIndex.ts`. `deriveAliasesFromName()` is deliberately minimal — a lowercase form and a "the X" variant, no speculative synonym dictionary. `resolveSpatialAlias()` does longest-pattern-first substring matching, the same collision-avoidance discipline `lunaVocabulary.ts`'s own `findByPattern()` already documents. `findAliasCollisions()` is real, working collision detection, verified two ways: zero collisions within each building's own scoped index (the real production usage), and a genuine, correctly-surfaced collision (`"ground"`) when Luna's and the non-Luna fixture's indices are deliberately merged — proving detection works, not just asserting it does. This does not replace Luna's own hand-tuned `lunaVocabulary.ts` (still real, still in production); it is the generic mechanism a NEW project's own thin vocabulary layer would use instead of hand-typing a pattern table from scratch.

## 20/21. Operational binding + Facility/Consumer (Parts 20/21)

`src/engine/spatial/operationalBinding.ts`. `createOperationalBinding()` is the only legitimate way to create an `OperationalAssetBinding` — `connected` is never a caller-supplied boolean, it is derived by actually resolving `operationalAssetRef` against a real `TwinDataProvider`. Verified live: binding to a real Luna asset ref resolves `connected: true`; binding to a nonexistent ref resolves `connected: false`, never fabricated. `twinConnectivityLevel()` returns `SPATIAL_TWIN` or `CONNECTED_OPERATIONAL_TWIN` — both fully valid, honest end states. `RepresentationPolicy` itself (`representationPolicy.ts`, `lunaRepresentationPolicy.ts`) was **not modified** — normalized spatial objects already carry `levelRef`/`parentRef`/`spaceType`, sufficient metadata for the existing policy to evaluate without any change to its own logic.

## 22/23/24. Review, publish, load (Parts 22-24)

The crosswalk (§6-8) IS the architecture Part 22 asks for — a mapping's proposed canonical identity can be highlighted against both its plan region and model representation via the same `canonicalRef`-mediated queries. The existing Review UI (Accept/Edit/Reject against `MappingProposal`) was not redesigned, per the brief's own instruction; deeper visual highlighting wiring between the review list and a live 2D/3D preview is disclosed as a real next step, not built here (see §10 of the report).

`src/engine/spatial/twinProjectDefinition.ts`'s `buildTwinProjectDefinition()` is the Part 23 publish output — one function assembling `levelRailItems`, `floorPlans`, `navigationGraph`, `cameraDestinations` (validated), `operationalBindings`, `aliasIndex`, `sourceProvenance`, and `reviewRequired`, purely from a `NormalizedBuildingModel`, using every derivation function above. `RepresentationPolicy` is deliberately NOT baked into this static package — it is evaluated per-identity at request time, so it can never go stale. `LOAD_STEPS` documents the full Part 24 sequence (`LOAD_PROJECT` → … → `START_TWIN`); `buildTwinProjectDefinition()` performs every step except applying policy (per-identity, not a data transform) and starting the Twin (host-side rendering).

## 25/26. Luna as reference fixture (Parts 25/26)

`src/luna/ingestion/lunaSpatialModel.ts` builds a `NormalizedBuildingModel` by **repackaging** Luna's own real data (`LUNA_LEVELS`, `LUNA_L06_UNITS`, `LUNA_L01_CLUB.rooms`, `LUNA_CORES`) — never re-authoring it. Verified byte-for-byte against Luna's real, live, hand-authored output:
- `deriveLevelRailItems(luna.levels)` === the real `LUNA_LEVEL_RAIL_ITEMS`, exactly.
- `deriveFloorPlanSpec(luna, "LUNA-L06")`'s outline/core/every unit position === the real, live `LUNA_L06_FLOOR_PLAN`, exactly (the computed symmetric outline independently equals the real `TOWER_FOOTPRINT`, confirming the values were never coincidentally matched).
- L01 Residents' Club's real Pool/Lounge rooms are present with their real `LUNA-L01-CLUB-POOL`/`LUNA-L01-CLUB-LOUNGE` refs, proving the generalization isn't apartment-only.

Live in the browser (not just deterministic): L06 selection, 2D floor control, Apartment A locate/enter (Consumer scope), return to L06, Ground's real Lift Lobby/Stair region focus, and L01's real Pool/Lounge focus — see the browser report for the honest substitution made for items 8-13 (§9 above).

**Luna's own production App.tsx rendering path was not rewired to consume the generic engine.** This phase proves equivalence and reuses the generic primitives where it was safe to do so (the header spacing fix, the test harness), but per "do not rebuild Luna architecture," Luna's live LevelRail/FloorPlan2D/camera wiring keeps using its own hand-authored data, now PROVEN equivalent to what the generic engine independently derives from the same underlying facts.

## 27. Non-Luna synthetic fixture (Part 27)

`src/engine/spatial/testFixtures/miniBuildingFixture.ts` — Ground/L01/L02, with Unit 101/102, a Corridor, and a Lift Lobby on L01, one lift, one stair, two real doors. Deliberately plain — round numbers, no architectural polish. Proven two ways:
- **Deterministic**: the exact same `deriveLevelRailItems`/`deriveFloorPlanSpec`/`buildNavigationGraph`/`resolveSpatialAlias`/crosswalk functions used for Luna produce correct real output for this building.
- **Live in the browser**: `tests/ingestion-v2/index.html` + `harness.tsx` mount ONLY generic `LevelRail`/`FloorPlan2D` engine components, fed by this fixture — clicking Unit 101 once resolves `resolveTapAction` to `"locate"`; clicking again resolves to `"enter"`; the navigation graph correctly reports the Lift Lobby connected to its own level. Zero Luna-specific code exists anywhere in this render path.

## 28. Truth vocabulary (Part 28)

`AUTO_PROPOSED`/`CAMERA_REVIEW_REQUIRED` (camera derivation), `CONFIRMED`/`PROPOSED`/`UNRESOLVED`/`DESIGN_DECISION_REQUIRED` (reused unchanged from V1's `ReviewStatus`), `SPATIAL_TWIN`/`CONNECTED_OPERATIONAL_TWIN` (operational binding). Nothing is silently promoted; a space with no boundary data appears in `reviewRequired`, never dropped or guessed.

## Deliverables

- This document.
- `artifacts/oyi-building-ingestion-v2-spatial-binding.json` — structured facts.
- `artifacts/oyi-building-ingestion-v2-report.md` — audit trail, files changed, test results, screenshots, known limitations, next steps.
