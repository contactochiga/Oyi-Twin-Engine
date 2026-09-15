# Prerequisites for LUNA ARCHITECTURAL REALITY V2 + OYI BUILDING INGESTION V1

Status: DOCUMENTATION ONLY. Nothing in this file is implemented. This records the exact technical prerequisites discovered while auditing the codebase for Drainage V1 / Engineering Wrap-Up, per that phase's own instruction to identify — not build — what the next phase needs.

Governing principle for the next phase, restated from the brief: **"Oyi should do the hard interpretation. The human should do the confirmation." The external model must never become a second source of truth.**

## 1. What already exists that V2 can build on directly

**A building-agnostic engine layer already exists and has been proven across 12+ systems.** `src/engine/` never names "Luna" — every contract below is already reusable by a different building without modification:

- `twinData.ts` — `OperationalAssetRecord` (ref, label, kind, system, type, locationLabel, ownerLevelRef, unitRef?, parentRef?, classification, capabilities, seededState, position) and `TwinDataProvider`. This is the target shape for ingested equipment/devices.
- `structuralCatalog.ts` — `StructuralElementRecord`, deliberately separate from operational assets (no runtime state, no commands). This is the target shape for ingested structural elements.
- `twinRuntime.ts` — `TwinRuntimeProvider` contract (state/commands/subscribe), building-agnostic. A real ingested building still needs a Luna-style simulation/live-data provider behind this same contract.
- `representationPolicy.ts` — `RepresentationPolicy`/`RepresentationQuery`/`RepresentationMode` (FULL_3D/CONTEXT_3D/OPERATIONAL_2D/CONTEXT_2D/HIDDEN) and `RepresentationIdentity` (role: facility/resident/public + assignedHomeRefs). **This contract is the single most important thing to preserve unchanged** — every future building's own policy module implements it the way `lunaRepresentationPolicy.ts` does, never the other way around.
- `serviceRoute.ts` / `engineeringRelationships.ts` — the parentRef-walk + typed-edge-supplement pattern. Proven across 9 systems as sufficient for real service topology without a parallel graph.
- `geo/` (from the Site/Phase 15 work) — `types.ts`/`projection.ts` already provide coordinate-frame primitives; a real building's georeferenced survey data would extend these, not replace them.

**A real canonical-identity precedent already exists.** `OYI_DIGITAL_TWIN_ASSET_CONTRACT.md` (Phase 3C) already defines how backend database rows bind to twin canonical refs. V2's own MAP step should extend this contract, not invent a second identity scheme.

**A real "gap ledger" format already exists.** The DD-numbered design-decision registry (`docs/LUNA_CANONICAL_BUILDING_SPEC.md`, `docs/LUNA_MEP_COORDINATION_SPEC.md`, every system's own spec) is exactly the artifact an automated AUDIT step should produce for a real ingested building — one entry per unresolved engineering fact, never a fabricated default.

**"Ground + L06 Apartment A" as the Gold Standard is not a new proposal — it is what already exists.** Every phase in this codebase has used Apartment 6A as the one fully-detailed reference unit precisely because it already has real interior geometry, real MEP termination, real devices, and real RepresentationPolicy coverage. A real ingestion pipeline's first successful run should be judged against reproducing (or exceeding) what this codebase already treats as "real" for that one unit — a concrete, already-built acceptance target, not an abstraction.

## 2. What does NOT exist yet and must be designed fresh

- **No upload/ingest/normalize/map/review/approve/publish pipeline UI or backend exists anywhere in this codebase.** This is entirely new work.
- **No format parser exists** for Revit `.rvt`, IFC, Archicad, SketchUp `.skp`, GLB/glTF-as-source-model (distinct from GLB-as-rendered-output, which this codebase already produces), PDF plans, CAD, or survey data.
- **No automated audit/gap-detection tool exists.** Every DD-numbered gap in this codebase was found by human/Oyi read-through of code and docs, not by a program comparing an ingested model against a schedule.
- **No canonical-ref auto-generation exists.** Every `LUNA-*` ref in this codebase was hand-authored. A real ingestion pipeline needs a deterministic, collision-free ref-minting strategy from source-model IDs (IFC GUIDs, Revit element IDs, etc.) — the crosswalk field already anticipated in `LUNA_MEP_COORDINATION_SPEC.md`'s routeSpec schema ("source crosswalk: IFC/native IDs and drawing revision") but never implemented.
- **No per-unit termination-registry generator exists.** `UNIT_SYSTEM_TERMINATION` (`lunaServiceRoutes.ts`) is hand-authored for exactly one unit (Apartment 6A) across 5 systems. Scaling to 43 units × N systems by hand is the wrong approach; V2 needs this derived from ingested MEP connectivity data.
- **No vocabulary/alias auto-generation exists.** Every Oyi phrase alias in `lunaVocabulary.ts` was hand-authored per asset. A real ingested building of any scale cannot have every asset manually aliased — V2 needs either a generated-alias strategy (from asset labels/room names) with human review, or an acceptance that unaliased assets remain reachable only via direct 3D selection until reviewed.
- **No structural-element interactivity fix for the finding in this phase's own Known Limitations (§10 of `docs/LUNA_DRAINAGE_REFERENCE_SPEC.md`).** If V2's ingested structural elements need to be clickable from typical exterior camera angles, the pre-existing "architecture doesn't fade for Structure mode" / "section clipping is visual-only" characteristics should be revisited then — out of scope for this phase, but worth carrying forward as a known blocker for structural-element discoverability at scale.

## 3. Architectural implications for the MAP step specifically

Ingested data must map into the existing hierarchy — not a new one:

```
Building → Levels → Spaces → Homes → Rooms → Doors → Core → Stairs → Lifts
         → Structural elements → MEP interfaces → Operational assets
```

Every one of these already has a real, proven target contract in this codebase (`lunaProgramme.ts`'s `LUNA_LEVELS`, `lunaInteriors.ts`'s `InteriorSpec`/`RoomLayoutSpec`, `lunaResidentialUnits.ts`, `LUNA_CORES`, the lift/structural/operational-asset catalogs above). V2's MAP step should target these existing shapes, not define parallel ones — exactly the same "reuse the existing abstraction, never build a second graph" discipline every phase from Phase 10 onward has already followed for MEP, relationships, and now drainage.

## 4. Verification implications

Every phase in this codebase has shipped with: a deterministic Node test asserting canonical-ref uniqueness and structural invariants, a Puppeteer browser test proving the real running app behaves correctly, and an explicit RepresentationPolicy re-verification (often via byte-hash, confirming the file was never touched). V2's own REVIEW/APPROVE step should produce the equivalent for an ingested building: a machine-checkable diff against the target schema (duplicate refs, missing parents, orphaned relationships, DD-gap coverage) before PUBLISH — the human "confirmation" step the brief's own principle calls for should be reviewing a structured diff, not re-deriving the whole audit by hand.

## 5. Explicitly NOT resolved by this document

No schema, API, UI, parser, or pipeline code was written. No decision was made about which source format to support first, how canonical refs will actually be minted from source IDs, or what the human review UI looks like. This document only records what the audit performed during Drainage V1 / Engineering Wrap-Up found to already exist and be reusable, and what gaps a future planning phase for Architectural Reality V2 / Building Ingestion V1 will need to design from scratch.
