# Oyi Visual Identity + Building Ingestion V1

Status: Part A (Visual Identity) is IMPLEMENTED and verified. Part B (Building Ingestion) is a FOUNDATION — the core architecture, the local reference persistence, one real end-to-end adapter (Luna, reading the codebase's own existing canonical data), and a working 5-step UI are implemented and tested. Real third-party file-format parsing (Revit/IFC/Archicad/SketchUp) is explicitly NOT implemented — see §7.

This is the one place in the repository documenting Oyi's own visual identity, since none existed before this phase.

---

## Part A — Oyi Visual Identity

### A.1 Source of truth

The Twin does not invent an Oyi identity. It reuses the two real assets already in production in the Facility system (`facility-oyi`), each mapped to the same role it already plays there:

| Facility asset | Facility usage | Twin usage |
|---|---|---|
| `public/oyi-logo-transparent.png` (real 1022×1024 PNG — blue rounded-square mark + white wave + "Oyi" wordmark) | Brand mark in `Sidebar.tsx`, 28×28 | Copied to `src/engine/assets/oyi-logo.png`; rendered at 22×22 in the top-bar identity slot |
| `.oyi-shell-orb` CSS treatment (`#06101d` dark glass, `sky-300/30` border, `sky-400/35` glow, literal "Oyi" text — no image) from `components/oyi-shell/OyiOrb.tsx` | The closed-state conversation launcher orb | Ported as constants (`OYI_ORB_BG`/`OYI_ORB_BORDER`/`OYI_ORB_BORDER_HOVER`/`OYI_ORB_GLOW`) into `src/engine/components/spatial/OyiOrb.tsx`'s closed-state button |

No SVG was traced, no logo was redrawn, and no screenshot was cropped into a production asset — both are the real files/styles already shipping in Facility.

### A.2 Top bar (`src/engine/components/spatial/TopCommandBar.tsx`)

The pre-existing `identity-slot` div (previously empty, with its own docstring "identity slot is left intentionally blank — no logo invented here") is now the bar's first child — before the hamburger, before "Ask Oyi...". It renders the 22×22 brand-mark PNG inside a button that opens the same conversation state as the closed orb (`onOpenOyi` prop). Layout order: `[Oyi mark][hamburger][Ask Oyi search field]`.

### A.3 Closed conversation orb (`src/engine/components/spatial/OyiOrb.tsx`)

The purple-gradient "✦" button was replaced with the Facility-matched dark-glass button showing the literal text "Oyi" (18px/600), matching `OyiOrb.tsx`'s own `<span aria-hidden="true">Oyi</span>` pattern in Facility.

### A.4 One shared conversation state

`OyiOrb` gained optional `expanded`/`onExpandedChange` props (falling back to internal `useState` when omitted, so any future uncontrolled usage still works). `App.tsx` now owns one `oyiConversationOpen` boolean, passed to both the top-bar identity button (`onOpenOyi={() => setOyiConversationOpen(true)}`) and the orb (`expanded={oyiConversationOpen} onExpandedChange={setOyiConversationOpen}`). Both are entry points into the same composer/conversation panel — no second AI session, no second state owner. This mirrors Facility's own `useFacilityAssistantStore` pattern (`open`/`openAssistant`/`closeAssistant` shared by `FacilityOyiHubLauncher` and every in-page `FacilityContextualOyiButton`).

### A.5 Verified

`scripts/verifyOyiIdentityBrowser.mjs` (`npm run test:oyi-identity:browser`) — all 7 checks: identity mark renders before the hamburger; closed orb shows "Oyi"; clicking the top-bar mark opens the same panel the orb opens; hamburger and search field remain unaffected; Oyi still answers a real query through the unchanged intelligence pipeline; the 3D canvas remains the dominant visual element. Re-confirmed as a live regression after every subsequent phase of work in this same pass (see §8).

---

## Part B — Building Ingestion V1

### B.1 Core principle

*"Oyi should do the hard interpretation. The human should do the confirmation."* An ingested/uploaded building model is a **source**, never a second source of truth. The architecture keeps four concerns separate at the type level, mirroring the boundary every other Oyi layer already enforces:

```
SOURCE DATA          -> BuildingSourceRecord / ExtractedBuildingModel   (src/engine/ingestion/types.ts)
OYI CANONICAL DATA    -> MappingProposal, promoted only once CONFIRMED  (src/engine/ingestion/types.ts)
RUNTIME STATE          -> untouched — twinRuntime.ts
REPRESENTATION         -> untouched — representationPolicy.ts
```

### B.2 Pipeline

```
BuildingSource -> SourceAdapter -> ExtractedBuildingModel -> Normalizer -> MappingProposal (review) -> Published Canonical Ref
   (intake)        (per-format)      (intermediate,           (proposes a    (DETECTED/PROPOSED/       (only CONFIRMED/
                                       source-identity           canonical ref, CONFIRMED/EDITED/         EDITED mappings
                                       preserved on              never invents  REJECTED/UNRESOLVED/      ever reach here)
                                       every object)              one)           DESIGN_DECISION_REQUIRED)
```

Every layer lives at the right level, matching every prior phase's engine-vs-Luna discipline:

- `src/engine/ingestion/` — building-agnostic. Never names "Luna". Types, format registry, adapter registry, normalization helpers, the local persistence store.
- `src/luna/ingestion/` — Luna's own adapter/normalizer/project seed. Depends on `engine/ingestion/`, never the reverse.
- `src/ui/ingestion/CreateProjectFlow.tsx` — the UI. Depends only on the engine's `ProjectStore`/`SourceAdapterRegistry` contracts, takes them as props — no Luna import.

### B.3 Source file contract (`engine/ingestion/formatRegistry.ts`)

Every format the intake UI offers has one real, disclosed support level — never aspirational:

| Format | Category | Support level | Why |
|---|---|---|---|
| IFC | primary | REQUIRES_CONVERSION | Best future target (structured BIM, real relationships) — no parser exists yet |
| Revit (RVT) | primary | REQUIRES_CONVERSION | Native format needs conversion first — no parser exists |
| Archicad | primary | REQUIRES_CONVERSION | Same class as RVT — no parser exists |
| SketchUp (SKP) | secondary | VISUAL_ONLY | Geometry-only, no reliable structured semantics — no adapter exists |
| GLB | secondary | PARTIALLY_SUPPORTED | `src/luna/architecture/groundAsset.ts` is a real, working, security-validated GLB/glTF loader — scoped to exactly one bounded case (the Ground envelope, one binding role) today, not general multi-object ingestion |
| glTF | secondary | PARTIALLY_SUPPORTED | Same pipeline/caveat as GLB |
| PDF plans | document | REQUIRES_REVIEW | Human interpretation required — every detected object must enter review as UNRESOLVED/DESIGN_DECISION_REQUIRED, never a confident proposal |
| CAD exports | document | REQUIRES_REVIEW | Same class as PDF |
| Image references | document | REQUIRES_REVIEW | Reference-only, never a source of extractable spatial data |

### B.4 The one real adapter: Luna Procedural

Rather than fabricating a parser for a format this codebase genuinely cannot read, the one complete adapter (`src/luna/ingestion/lunaProceduralAdapter.ts`) extracts from Luna's **own already-existing, already-accepted canonical data** — `LUNA_LEVELS`, `LUNA_CORES`, `LUNA_BUILDING_ROOT`, `LUNA_STRUCTURAL_ELEMENTS`, `LUNA_RESIDENTIAL_UNITS`, `lunaTwinDataProvider.listAssets()` — proving the full pipeline end-to-end against 100% real data with zero fabrication. It deliberately shows a confidence *gradient*, not uniform fake certainty: backend-seeded residential units (`isCanonicalBackendUnit === true`) score full confidence; Phase-16A-generated reference units score 0.65 — both are real, disclosed evidence flags, never invented numbers.

### B.5 Confidence (`engine/ingestion/normalize.ts`)

`computeConfidence()` is a small, disclosed, deterministic formula — base 0.5 plus fixed increments per real evidence flag (`exactNameMatch`, `stableSourceId`, `parentAlreadyConfirmed`), capped at 0.98 unless `alreadyCanonicalIdentity` is true (exactly 1.0) — never a black box, matching the "hardcoded honest value" pattern used throughout this codebase (e.g. Network V1's disclosed `edgeCoreConnected: false`). Zero evidence yields `UNKNOWN`, never a guessed number.

`proposeRefSlug()` is a small, disclosed regex heuristic (not claimed semantic/AI understanding) that turns source names like "Level 06" / "Apartment A" into plausible ref slugs. Anything it can't confidently pattern-match returns `null`, which resolves to `UNRESOLVED` — it never guesses.

### B.6 Review states and the publish boundary

`ReviewStatus`: `DETECTED | PROPOSED | CONFIRMED | EDITED | REJECTED | UNRESOLVED | DESIGN_DECISION_REQUIRED`. `LocalProjectStore.publish()` (`engine/ingestion/projectStore.ts`) promotes **only** `CONFIRMED`/`EDITED` mappings to a `PublishedCanonicalRecord`; every other mapping is explicitly enumerated in `PublishResult.skipped` with a human-readable reason — never silently dropped, never silently promoted. Duplicate canonical refs within one publish pass are also caught and skipped with a reason, never allowed to double-register.

### B.7 Persistence (`engine/ingestion/projectStore.ts`)

No backend exists in this codebase, so `LocalProjectStore` is an honest local/reference implementation (Part B13's own instruction) — backed by `localStorage`, falling back to an in-memory object outside the browser (tests, SSR). Source checksums are real SHA-256 (Web Crypto), computed only when real file bytes are supplied — never fabricated for an empty/missing source. Swapping in a real backend later means implementing the same `ProjectStore` interface, not rewriting call sites.

### B.8 Create New Project UI (`src/ui/ingestion/CreateProjectFlow.tsx`)

Reachable from the existing Profile "•••" overflow menu ("Create New Project") — no new floating chip, no separate admin dashboard shell. A 5-tab flow: Project / Sources / Ingestion / Review / Publish, all against the real store. Luna Residences (`LUNA`) is seeded as the first registered project via `ensureLunaProject()` — not hardcoded as the only possible project; any future project created through the same UI uses the identical code path.

### B.9 Luna as first project, not special-cased

`src/luna/ingestion/lunaProjectSeed.ts`'s `ensureLunaProject()` registers Luna, runs the procedural adapter, and normalizes the result — through the exact same `ProjectStore`/`SourceAdapterRegistry` contracts any future building would use. It is idempotent (repeat calls return existing records) and safe under React 19 StrictMode's double-effect-invocation in dev (an in-flight-promise guard ensures concurrent calls await one shared run, not two racing ones — see §7 for why this mattered).

---

## Part C — Non-negotiable truth rules (carried through, not restated per-section)

Never fabricated: source data, dimensions, rooms, apartment identities, engineering relationships, confidence. Geometry is never treated as canonical truth (source objects carry an optional `geometryRef`, entirely separate from `MappingProposal`/`PublishedCanonicalRecord`). No second runtime, no second intelligence layer, no Luna-specific code inside `src/engine/`. Unresolved objects stay `UNRESOLVED` — the publish boundary in §B.6 is the enforcement mechanism, not a policy statement alone.

---

## Next phase — Luna Architectural Reality V2

Not started here, per this phase's explicit instruction. See `docs/LUNA_ARCHITECTURAL_REALITY_V2_PREREQUISITES.md` for the full prerequisite audit (written during the prior Drainage phase). Restated as this phase's own closing contract:

1. Receive a real architect-produced source file for Luna (format TBD — IFC/RVT most likely, per §B.3's own support-level ranking).
2. Register it as a new `BuildingSource` on the existing `LUNA` project through this phase's own intake UI.
3. Build the first real (non-procedural) `SourceAdapter` for that format — the one piece of work every part of this V1 foundation was built to support, not to pre-empt.
4. Run it through the unchanged INGEST → NORMALIZE → REVIEW → PUBLISH pipeline built in this phase.
5. **L06 Apartment A is the Architectural Gold Standard** for the first real ingestion run — it already has real interior geometry, MEP termination, devices, and RepresentationPolicy coverage in this codebase; a real pipeline's first success should reproduce (or exceed) what already exists for that one unit.
6. Bind real geometry to the existing canonical refs incrementally — never replace `RepresentationPolicy`, the runtime, or the intelligence layer to do it.
7. Scale level-by-level and system-by-system only after L06 Apartment A is proven, using the same REVIEW/CONFIRM discipline at every step.
8. Every DD-numbered gap already on record (`docs/LUNA_MEP_COORDINATION_SPEC.md` and every system's own spec) should be re-checked against the real source as it's ingested — resolved gaps get closed with evidence, not assumption.
9. This is explicitly **not** "make the building prettier." It is: replace procedural building representation with real architectural source while preserving Oyi's canonical/runtime/policy architecture untouched.
