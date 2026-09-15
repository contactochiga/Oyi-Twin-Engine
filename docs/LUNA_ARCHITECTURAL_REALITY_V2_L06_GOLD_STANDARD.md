# Luna Architectural Reality V2 — L06 Apartment A Gold Standard

## ARCHITECTURAL GOLD STANDARD SOURCE PENDING

**No real architectural source (RVT, IFC, Archicad, SketchUp, GLB/glTF-as-source-model, CAD, or PDF) exists anywhere in this repository for L06 Apartment A.** This was confirmed by a full repository search before any code was written (`find . -iname "*.rvt" -o -iname "*.ifc" -o -iname "*.skp" -o -iname "*.fbx" -o -iname "*.obj" -o -iname "*.dwg" -o -iname "*.dxf" -o -iname "*.pdf"` — zero matches outside the pre-existing Asset Pipeline Foundation's own `tests/architecture/assets/ground-fixture.glb`, which is a Ground-envelope test fixture, not an L06 Apartment A source).

Per this phase's own instruction for that case, no source was fabricated. This document records a **foundation**: the coordinate frame contract, the canonical room/door registry, the structural/MEP coordination checks, and the ingestion pathway a real architect-produced source will bind into. Everything below is built from Luna's own existing, already-accepted procedural data, explicitly disclosed as `PROCEDURAL_REFERENCE`, never claimed as architectural truth.

---

## 1. Source

| Field | Value |
|---|---|
| Source type | None (real). Procedural reference fixture only. |
| Source revision | N/A |
| Adapter | `luna-l06-apt-a-procedural-reference` (`src/luna/ingestion/lunaL06AptAAdapter.ts`) |
| What it reads | `LUNA_L06_APT_A` (`src/luna/interiors/lunaInteriors.ts`) — Luna's own real, already-rendered, already-camera-framed, already-device-populated interior data (Phase 3/10/12/13) |
| Source limitations | No wall thickness, door assembly (width/threshold/swing/hardware), window objects, or fixture models exist anywhere in this codebase's procedural data. Every one of these is either derived honestly from what does exist (doorSide → door opening) or left explicitly unresolved (windows). |

## 2. Coordinate frame contract

`src/luna/architecture/l06AptAFrame.ts`, versioned (`L06_APT_A_FRAME_CONTRACT.version = 1`). Chain: `source → building → level → apartment-massing / apartment-plan`.

Two pre-existing, legitimately different representations of Apartment A's position — **not reconciled, both disclosed**:

| Frame | Origin (x, z) | Extent (w × d) | Used by |
|---|---|---|---|
| **Massing** (what actually renders) | (-8.182, -6.364) | 15.65 × 12.17 | The real `UnitVolume` placeholder box (`LunaLevel.tsx`), every room's local coordinates, every per-room camera preset, every apartment-device position |
| **Plan** (2D operational footprint) | (-10.5, -9) | 15 × 10 | `FloorPlan2D` only (Facility's 2D floor plan) — never the 3D scene |

The divergence (`MASSING_TO_PLAN_OFFSET`: offsetX ≈ -2.318, offsetZ ≈ -2.636) is **computed live from both frames' own real values**, not a second hand-typed constant — so it can never silently drift out of sync with either one. Neither frame was moved by this phase. The **source frame** is an explicit `PENDING` placeholder (`L06_APT_A_SOURCE_FRAME.status`); `sourceToBuildingFrame()` is today's honest identity transform, replaced with a real, versioned transform only once an actual source is registered.

The shared massing-box formula was extracted out of `LunaLevel.tsx`'s inline JSX into `lunaProgramme.ts`'s `l06UnitMassingBox()` so rendering and this frame contract share exactly one source of truth — a necessary, disclosed refactor (Part 28), not a rewrite.

## 3. Canonical mappings

Building on Building Ingestion V1's real pipeline (`docs/OYI_BUILDING_INGESTION_V1.md`), not a parallel one — `lunaL06AptAAdapter.ts` extracts, `lunaL06AptANormalizer.ts` (`src/luna/ingestion/`) proposes mappings, registered as a **second `BuildingSource`** on the existing `LUNA` project (`lunaL06AptASeed.ts`'s `ensureL06AptAGoldStandardSource()`).

- The apartment itself (`LUNA-L06-APT-A`) and all 12 rooms map to their **own, pre-existing, already-canonical refs** — `alreadyCanonicalIdentity: true`, confidence 1.0. These refs have been load-bearing across `RepresentationPolicy`, MEP, and camera presets since Phase 3; this phase reads them faithfully, never renames them.
- Doors are the disclosed opposite case: **newly proposed** identities (first time ever proposed in this codebase), `alreadyCanonicalIdentity: false`, real sub-1.0 confidence (0.75, from real evidence: stable deterministic ref scheme + already-confirmed parent room, no exact-name-match since no prior door name exists to match), status `PROPOSED` — never auto-confirmed.
- Cross-source duplicate protection proven live: the whole-building adapter and this apartment-scoped adapter BOTH independently propose `LUNA-L06-APT-A` — publishing converges to exactly one canonical record, the second confirmation explicitly skipped and disclosed (`test:l06-gold-standard` check 16).

## 4. Rooms (12 real rooms, unchanged from Phase 3)

| Room | Type (read from ref, not invented) | Doors |
|---|---|---|
| Utility | utility | 1 |
| Entry / Foyer | entry | 1 |
| Bathroom 3 | bathroom | 1 |
| Bedroom 3 | bedroom | 1 |
| Kitchen | kitchen | 1 |
| Bathroom 2 | bathroom | 1 |
| Primary Bathroom | bathroom | 1 |
| Bedroom 2 | bedroom | 1 |
| Dining Room | dining | 1 |
| Living Room | living | 1 |
| Primary Bedroom | bedroom | 1 |
| Balcony | balcony | 1 |

No room type was invented — every classification is read verbatim off the room's own pre-existing ref/label (`roomSourceType()`). No master/guest/pantry/utility distinctions were fabricated beyond what Phase 3 already authored. Each room record (`src/luna/architecture/l06AptAGoldStandard.ts`'s `CanonicalRoomRecord`) carries: canonical ref, source ID, source adapter, name, room type, parent apartment ref, level ref, geometry ref (massing-frame rect), boundary, area (computed), centroid (= boundary center), doors, windows (always empty, disclosed), service interfaces, representation status (`PROCEDURAL_REFERENCE`), confidence, review status (`PROPOSED`).

## 5. Doors (12 real openings, all newly canonical)

Every room's existing `doorSide` flag (Phase 12) now has a real, selectable canonical identity: `<room-ref>-DOOR-01`. This is an **honest opening, not a fabricated assembly** — real wall gap, real wall side, real room parent; no width/threshold/swing/hardware claimed. Selectable live in the 3D scene via an invisible hit-target (`InteriorRoom.tsx`'s new optional `doorRef` prop, additive and backward-compatible — every other interior besides L06 Apartment A leaves it `undefined`, zero behavior change). `LunaContextCard.tsx` gained a `door` selection branch (Information Card, no runtime state, no commands — same discipline as structural elements).

`CanonicalTargetKind` and `TwinNodeKind` (both engine-level, building-agnostic) gained `"door"` (and `CanonicalTargetKind` gained `"window"` for future use) — a small, disclosed, additive extension; neither type had any exhaustive switch depending on their previous member lists.

## 6. Windows

**Unresolved, honestly.** No window objects exist anywhere in this codebase's per-room interior data — glazing is only modeled on the exterior facade (`LevelFacade.tsx`), never tied to a specific apartment room. The adapter's own extraction warnings disclose this explicitly rather than fabricating a window object. Every room's `windows` field is an empty array by design.

## 7. Structural coordination

`src/luna/architecture/l06AptAStructuralCoordination.ts`'s `checkL06AptAStructuralCoordination()` — a pure function, real geometry only. Checked all 6 real LUNA-L06 perimeter columns (`LUNA_STRUCTURAL_ELEMENTS`) against Apartment A's real massing box.

**Result: CLEAR.** No column overlaps the apartment volume; minimum real clearance ≈ 0.106m (computed, not asserted). If a future change ever produced an overlap, the function returns `COORDINATION_REVIEW_REQUIRED` with the specific conflicting element ref and overlap amount — nothing is ever silently moved to make a conflict disappear (Part 12's own explicit instruction).

## 8. MEP interfaces

`src/luna/architecture/l06AptAServiceInterfaces.ts`'s `deriveL06AptARoomServiceInterfaces()` — associates each room with the **real, already-existing** Apartment A devices (water meter, electrical meter, drainage, fire smoke detector, network ONT, HVAC AC units, curtains, sensors — all seeded across Phases 4/10/13) whose real position falls within that room's real boundary, corroborated by the device's own `locationLabel` text where available. **No new device, route, or MEP infrastructure was created** — this only makes an existing, real association explicit and queryable. 11 of 12 rooms have at least one associated device (Balcony has none — honest, not padded).

Existing MEP systems (Water/Drainage/Electrical/Fire/HVAC/Network) were not rebuilt, not touched, and remain fully authoritative for runtime state — architecture only provides spatial context and connection points, per Part 11's own instruction.

## 9. Asset binding

The **Asset Pipeline Foundation** (`src/luna/architecture/groundAsset.ts`) was read, not modified — it remains scoped to exactly one bounded case (the Ground envelope, `role: 'envelope'`) and there is still nothing real to bind for L06 Apartment A. The real, generalized "binding pathway" this phase establishes is the **Building Ingestion V1 SourceAdapter/ProjectStore architecture itself** — already fully building-agnostic, already proven at whole-building scale, now proven at apartment/room granularity too (this document's own adapter/normalizer/seed). A future real architectural source for L06 A would implement a new `SourceAdapter`, following `groundAsset.ts`'s validated pattern for GLB/glTF specifically, or a new adapter for whatever format the real source arrives in — never require touching `RepresentationPolicy`, the runtime, or the intelligence layer to do it.

## 10. Navigation

**Camera-preset-based room navigation is the real, existing mechanism** (Phase 12's `LUNA_ROOM_CAMERA_PRESETS`) — approach the apartment's exterior (Facility scope), enter (Consumer/resident scope only, per `RepresentationPolicy`), then fly between any of the 12 real rooms via the real room list. No teleport-only stub: every transition uses the existing, tuned per-room camera choreography. **True continuous walk-through movement (WASD/physics) does not exist and was not built here** — out of scope, consistent with "use existing navigation mechanisms" (Part 15) and no prior phase in this codebase has ever implemented free camera movement.

## 11. Selection

Rooms were already individually selectable (floor mesh `onClick`, pre-existing). Doors are now individually selectable (§5). Selection respects `RepresentationPolicy` identically for both — a door inside a private room inherits the exact same mode the room itself resolves to, via the pre-existing `ref.startsWith(unitRef-)` prefix rule (no policy change needed or made).

## 12. Facility representation

**Unchanged.** Facility identity resolves Apartment A (and everything inside it, including every new door ref) to `OPERATIONAL_2D` — confirmed both by the deterministic suite (`resolveMode` check) and live in the browser (Facility never reaches the interior room list; `enterInterior()`'s own pre-existing guard bounces to an exterior-only view). No RepresentationPolicy code was touched.

## 13. Consumer representation

**Unchanged, and now demonstrated at full depth.** The assigned resident (Consumer scope) reaches real `FULL_3D` entry into Apartment A and every one of its 12 rooms, proven live in the browser: Level 6 → Apartment A → Living Room → Primary Bedroom → Kitchen (+ door selection) → Primary Bathroom → Entry/Foyer, each one resolving to its own real canonical ref via the live selection-debug readout. A different resident (not assigned to Apartment A) remains denied, confirmed in the deterministic suite.

## 14. Unresolved items

- No real architectural source for L06 Apartment A (see top of document).
- Window objects (per room) — none exist, disclosed as an extraction warning, not fabricated.
- Fixture-level detail (WC/basin/shower/appliance models) — furniture placeholders only, unchanged from Phase 3/12.
- Door assembly detail (width, threshold, swing direction, hardware) — only existence and wall side are known.

## 15. Design decisions required

- Which real architectural source format to obtain for L06 Apartment A first (IFC/RVT most likely, per Building Ingestion V1's own support-level ranking — see `docs/OYI_BUILDING_INGESTION_V1.md` §B.3).
- Whether the massing frame or the plan frame (or neither) should become the anchor a real source binds against — deliberately left open here, to be resolved when a real source's own origin is known, not guessed.

## 16. Screenshots / tests

- Deterministic: `npm run test:l06-gold-standard` (`scripts/verifyL06GoldStandard.mjs`) — 16 checks, run twice, stable both times.
- Browser: `npm run test:l06-gold-standard:browser` (`scripts/verifyL06GoldStandardBrowser.mjs`) — 17 checks, run twice, stable both times. Screenshots in `artifacts/luna-l06-*.png`: level/apartment selection, apartment entry, living room, primary bedroom, kitchen, door selection (with live selection-debug proof: `LUNA-L06-APT-A-KITCHEN-DOOR-01`), bathroom, entry/circulation, Facility exterior-only view, Engineering Layers drawer, existing operational systems, Oyi identity.
- Full existing regression suite (every prior phase, deterministic + browser) re-run clean — zero regressions (see `artifacts/luna-architectural-reality-v2-report.md` §5).

## 17. Known limitations

- Headless/SwiftShader screenshots render the 3D scene as a flat, low-detail gradient — a known, previously-disclosed testing-harness characteristic (see `docs/LUNA_DRAINAGE_REFERENCE_SPEC.md`'s own note), not evidence of a rendering defect. Selection/interaction correctness is proven via the live selection-debug readout and deterministic tests, not screenshot pixel inspection.
- Door hit-target click position in the browser test was computed via real perspective-projection math from the room's own camera preset — correct today, but a real click position is now coupled to that preset; if a future phase re-tunes `LUNA_ROOM_CAMERA_PRESETS`, the test's computed click point should be recomputed alongside it (disclosed, not hidden).
- True continuous walkthrough movement remains unbuilt (§10).
