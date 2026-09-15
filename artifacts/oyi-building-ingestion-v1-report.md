# Oyi Visual Identity + Building Ingestion V1 — Report

Two parts, one pass: (A) gave Oyi a single, consistent, real visual identity across the Twin, reusing Facility's own existing assets — no logo invented, no logic duplicated. (B) established the source-independent architecture, local persistence, and first working UI for ingesting a real building into Oyi's canonical model, proven end-to-end against Luna's own existing data with zero fabrication. The building is still NOT declared architecturally complete — this phase is explicitly the foundation for Luna Architectural Reality V2, not that phase itself.

Full architecture is documented in `docs/OYI_BUILDING_INGESTION_V1.md`, written before this report. Structured facts/counts are in `artifacts/oyi-building-ingestion-v1.json`.

## 1. Files changed/added

**Part A — Identity:**
- `src/engine/assets/oyi-logo.png` (new) — real copy of Facility's `oyi-logo-transparent.png`.
- `src/engine/components/spatial/OyiOrb.tsx` — added `expanded`/`onExpandedChange` controlled props (falls back to internal state when omitted); replaced the purple gradient button with Facility-matched dark-glass styling and "Oyi" text.
- `src/engine/components/spatial/TopCommandBar.tsx` — the pre-existing (previously empty) `identity-slot` now renders the brand-mark image as the bar's first child, before the hamburger; added `onOpenOyi` prop.
- `src/App.tsx` — added shared `oyiConversationOpen` state wired to both entry points.
- `src/engine/components/spatial/ProfileSurface.tsx` — added `onNewProject?` prop and a "Create New Project" overflow-menu item.

**Part B — Ingestion (new):**
- `src/engine/ingestion/types.ts`, `formatRegistry.ts`, `adapters.ts`, `normalize.ts`, `projectStore.ts`, `index.ts` — the building-agnostic engine layer.
- `src/luna/ingestion/lunaProceduralAdapter.ts`, `lunaNormalizer.ts`, `lunaProjectSeed.ts` — Luna's own adapter/normalizer/seed.
- `src/ui/ingestion/CreateProjectFlow.tsx` — the 5-step Create New Project UI.
- `src/App.tsx` — wired `ensureLunaProject`, the adapter registry, and `CreateProjectFlow` into the existing app shell.

**Tests (new):**
- `scripts/verifyOyiIdentityBrowser.mjs`, `scripts/verifyIngestion.mjs`, `scripts/verifyIngestionBrowser.mjs`.
- `package.json` — `test:oyi-identity:browser`, `test:ingestion`, `test:ingestion:browser`.

**Not touched:** `RepresentationPolicy`, any `TwinRuntimeProvider`, `TwinIntelligenceController` vocabulary for the 9 completed operational systems, any `SystemControlBoard` consumer, `groundAsset.ts` (Asset Pipeline Foundation — read and reused for its support-level classification, not modified), production/cloud config.

## 2. Part A — visual identity, what actually changed on screen

`[Oyi mark][hamburger][Ask Oyi...]` — the identity mark sits immediately before the hamburger, 22×22, never competing with the building for visual weight. The closed conversation orb (bottom-right) now reads "Oyi" on the same dark-glass treatment Facility already uses for its own launcher. Clicking either one opens the exact same composer panel — verified live, not just asserted from source: `scripts/verifyOyiIdentityBrowser.mjs` opens via the top-bar mark and confirms the orb's own expanded content is what rendered.

## 3. Part B — ingestion pipeline, what is real today

```
BuildingSource -> SourceAdapter -> ExtractedBuildingModel -> Normalizer -> MappingProposal -> Published Canonical Ref
```

One adapter is real end-to-end: `luna-procedural-reference`, which extracts from Luna's own already-accepted canonical data (`LUNA_LEVELS`, `LUNA_CORES`, `LUNA_BUILDING_ROOT`, `LUNA_STRUCTURAL_ELEMENTS`, `LUNA_RESIDENTIAL_UNITS`, 86 operational assets) — 265 real objects, zero duplicates, zero fabricated confidence. Every other format (IFC/RVT/Archicad/SketchUp/PDF/CAD/image) is explicitly classified `REQUIRES_CONVERSION`/`VISUAL_ONLY`/`REQUIRES_REVIEW` with a one-sentence honest reason — no format claims support it doesn't have. GLB/glTF is `PARTIALLY_SUPPORTED`, correctly citing the existing `groundAsset.ts` Asset Pipeline Foundation as real but scoped to one bounded case.

The publish boundary is enforced in code, not just policy: `LocalProjectStore.publish()` only promotes `CONFIRMED`/`EDITED` mappings; everything else — 264 of 265 in the reference run when only one mapping is confirmed via the live UI — is explicitly skipped with a stated reason. Proven live end-to-end: confirming one real mapping ("Luna Residences Tower" → `LUNA-TOWER`) through the actual Review tab, then clicking Publish, produced exactly one real canonical ref, visible in the same UI.

## 4. Bugs found and fixed during this phase

Four distinct real bugs surfaced by the combination of deterministic testing and live browser inspection — none would have been caught by deterministic tests alone:

1. **Duplicate extraction** — the 4 lift core refs were extracted twice (once as `lift`, once as `equipment`). Caught by the deterministic duplicate-sourceId assertion. Fixed in `lunaProceduralAdapter.ts`.
2. **Missing canonical-ref checks** — "Luna Residences Tower" and its 4 core objects showed `UNRESOLVED` in the live Review tab despite being real, already-canonical objects. Caught only by screenshot inspection (a deterministic test asserting "some objects resolve" would have passed regardless). Fixed by adding `LUNA_BUILDING_ROOT`/`LUNA_CORES` checks to `lunaNormalizer.ts`'s `alreadyCanonicalRef()`.
3. **StrictMode double-mapping race** — React 19's dev-mode double-effect-invocation produced 530 mappings instead of 265, because two near-simultaneous `ensureLunaProject()` calls both ran normalization before either's extraction had registered. Diagnosed via the live Publish step ("1 of 530"). Fixed with two complementary changes: `recordMappings()` now replaces by source rather than upserting by mapping ID, and `lunaProjectSeed.ts` gained an in-flight-promise guard so concurrent calls await one shared run.
4. **Test-script button collision** — the browser test's Publish click matched a "Publish" tab button (identical text, earlier in DOM order) instead of the real action button, so `publishProject()` was silently never called even though the underlying data was already correct (confirmed via direct `localStorage` inspection before concluding this was a test bug, not a product bug). Fixed by adding a `data-publish-action` attribute to the real button.

A fifth issue — the regression script's "Close Engineering Layers" click failing after selecting "Drainage" first — was a test-harness selector issue, not a product bug; fixed by re-querying and exact-matching the close button by its own scoped text after the prior selection.

## 5. Test results

All run to completion, all green:

| Suite | Result |
|---|---|
| `npm run test:ingestion` (16 deterministic checks) | ✅ run twice, stable both times |
| `npm run test:ingestion:browser` (14 checks, real Chrome) | ✅ 11 screenshots, zero page errors |
| `npm run test:oyi-identity:browser` (7 checks) | ✅ |
| Full existing regression — deterministic: representation, presentation, architecture, lift, four-lift, water, electrical, electrical-live-ops, fire, hvac, access, cctv, network, drainage | ✅ all PASS, zero regressions |
| Full existing regression — browser: lift, four-lift, control-surface, water, electrical, electrical-live-ops, fire, hvac, access, cctv, network, drainage | ✅ all PASS, zero regressions, every "REGRESSION: ... still works correctly" checkpoint confirmed |

## 6. Known limitations (disclosed, not fixed here)

- No real third-party file-format parser exists (IFC/RVT/Archicad/SketchUp) — every format other than the Luna procedural source is honestly `REQUIRES_CONVERSION`/`VISUAL_ONLY`/`REQUIRES_REVIEW`, never a fabricated adapter.
- 36 of 265 Luna objects remain honestly `UNRESOLVED` after normalization (e.g. the site record, which has no canonical `ref` anywhere in this codebase) — correct behavior, not a gap to silently paper over.
- The Create New Project UI's later steps are real against the live store but intentionally minimal — no bulk review actions, no multi-file batch upload yet; V1 scope was the correct end-to-end skeleton, not full ergonomics.

## 7. Manual local testing steps

```
cd /Users/ochigaidoko/Oyi-Twin-Engine
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort   # if not already running
```
Open `http://127.0.0.1:5173/`.
1. Confirm `[Oyi mark][hamburger][Ask Oyi...]` in the top-left, and the "Oyi" closed orb bottom-right — click either to open the same conversation panel.
2. Open Profile "•••" → "Create New Project" → the overlay opens over the still-visible building.
3. Select "Luna Residences (LUNA)" → Sources tab shows the real `luna-procedural-reference` source, `PARTIALLY SUPPORTED`.
4. Ingestion tab shows real extraction counts. Review tab shows real `PROPOSED` mappings with real confidence percentages.
5. Accept one mapping → Publish tab → Publish → a real canonical ref count increments.
6. Close the overlay — the 3D Twin, Engineering Layers, and every Control Board still work exactly as before.

Automated: `npm run test:ingestion`, `npm run test:ingestion:browser`, `npm run test:oyi-identity:browser` — all green.

## 8. What remains — Luna Architectural Reality V2

Not started here, per explicit instruction. Full 9-step contract in `docs/OYI_BUILDING_INGESTION_V1.md`'s closing section: receive a real architect source for Luna, register it through this phase's own intake UI, build the first real (non-procedural) format adapter, run it through this phase's unchanged pipeline, treat L06 Apartment A as the Architectural Gold Standard for the first real run, bind geometry incrementally without touching `RepresentationPolicy`/runtime/intelligence, then scale level-by-level. This is replacing procedural representation with real architectural source — not "making the building prettier."

---

**Stop condition met.** No third-party format parser was fabricated. No architectural reconstruction was started. `RepresentationPolicy` and every completed operational system are byte-behaviorally unchanged, re-confirmed by the full regression suite in §5. No production/cloud changes were made.
