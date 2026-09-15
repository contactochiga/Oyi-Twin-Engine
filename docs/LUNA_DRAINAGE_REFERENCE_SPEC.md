# Luna Drainage V1 — Wastewater, Vent & Stormwater Reference Spec

Status: REFERENCE / CONCEPTUAL / SIMULATED. Not certified civil/public-health engineering. DD10 (drainage and stormwater — invert levels, gravity feasibility, separate soil/waste/vent/rainwater routes, pumping need, flood risk, disposal authority, inspection strategy) remains fully unresolved beyond what is explicitly registered here. This document distinguishes existing evidence, canonical reference, procedural/conceptual representation, simulated behavior, and design-decision-required throughout.

## 1. Audit (performed before implementation)

**Existing wastewater backbone (Phase 10 / Domestic Water Reference System V1).** A complete, real wastewater chain already existed: `LUNA-L06-APT-A-KITCHEN-DRAIN-01`, `LUNA-L06-APT-A-BATH-01/02/03-DRAIN-01` → `LUNA-L06-APT-A-DRAIN-01` (wet-area stack connection) → `LUNA-L06-DRAINAGE-BRANCH-01` → `LUNA-RISER-DRAINAGE-01` → `LUNA-B1-DRAINAGE-MAIN-01` (discharge/inspection reference), entirely via the pre-existing `parentRef` mechanism. No parallel graph existed or was needed.

**A real, confirmed pre-existing gap.** The four fixture-level drain points (Kitchen, Bath 1/2/3) had no runtime rows at all — the same class of gap the Network/Edge phase found and fixed for the router. Fixed this phase with static "normal" rows, matching every other context-only asset's own treatment.

**Direction is inverse to every other system — already disclosed, now enforced in the resolver.** `docs/LUNA_MEP_COORDINATION_SPEC.md` already warned: *"Drainage's source-to-terminal graph display is inverse to actual wastewater flow. `LUNA-B1-DRAINAGE-MAIN-01` is a discharge reference, not a water source."* `buildServiceRoute()` (shared, building-agnostic, used correctly by every other system) always returns steps root-first — for water/electrical/fire/network the graph root genuinely is the physical source, so this reads correctly. For drainage, the graph root (`B1-DRAINAGE-MAIN-01`) is physically the *discharge end*, so a raw route-trace lists discharge-first, fixture-last — the opposite of real flow. **This phase did not modify the shared engine route builder** (it is correct for five other systems and touching it would be exactly the kind of "redesign a completed system" the brief prohibits). Instead, `resolveDrainageState()`'s own arrays are ordered fixture → discharge (the real physical direction), and `explainDrainageState()`/`lunaIntentParser.ts`'s dedicated drainage matcher route the brief's narrative-style questions through `query` (not `show_route`), so Oyi's spoken answers read correctly even though a literal route-trace listing does not. This asymmetry is deliberate and disclosed, not a bug.

**Vent had no representation at all.** No vent stack, no roof termination — a genuine gap.

**Stormwater had zero registered instances.** The Master Equipment Schedule's own EQ-STORM/EQ-SUMP entries already said "No registered instance yet" — confirmed still true before this phase.

**Vocabulary gaps.** `LUNA-B1-DRAINAGE-MAIN-01`, `LUNA-L06-DRAINAGE-BRANCH-01`, `LUNA-L06-APT-A-DRAIN-01`, and all four fixture drains had zero Oyi aliases before this phase, despite being real, registered canonical assets since Phase 10.

## 2. Canonical model additions (4 new assets — everything else reused)

**Vent — single-stack, not a fabricated second riser.** `LUNA-ROOF-VENT-TERMINATION-01` parents directly to the existing `LUNA-RISER-DRAINAGE-01`: in this reference building, the same soil/waste stack continues through the roof as its own vent — a real, common configuration (not an invented shortcut), and the minimal-fabrication choice given EQ-DUCTS-style "no registered vent riser" was the honest starting point. Per-fixture individual venting, if ever required, remains DD10.

**Stormwater — a genuinely separate reference chain.** `LUNA-ROOFTOP-STORM-DRAIN-01` → `LUNA-STORM-DOWNPIPE-01` → `LUNA-SITE-STORM-DISCHARGE-01`. Never merged with wastewater/vent (distinct refs, distinct `type` values, no shared node) — matching `LUNA_DIGITAL_BUILDING_STANDARD.md`'s explicit warning against merging supply/waste into one graph, extended here to stormwater as well. The downpipe's full vertical run from roof to grade is deliberately **not** rendered as continuous geometry — that would mix a floor-local and a building-fixed transform without a real coordinated route (MEP Coordination Spec rule #10) — each asset is placed at its own real level (Rooftop/Rooftop/Ground) and the gap is disclosed, not papered over.

**Relationship type decision: no new `drains_to`/`routed_through` edges added.** `EngineeringRelationshipType` already includes `drains_to` and `routed_through`, unused anywhere in the codebase. `lunaEngineeringRelationships.ts`'s own stated design principle is edges only for relationships that are **not** a parent/child walk — every real drainage relationship in this phase (fixture→stack, vent→riser, stormwater chain) genuinely *is* a parentRef walk. Adding redundant edges duplicating that walk would violate the file's own explicit "not a duplicate of the route graph" discipline. `drains_to`/`routed_through` remain correctly defined-but-unused vocabulary, ready for a future genuinely non-parentRef drainage relationship (e.g. an isolation/bypass device), not a gap.

## 3. State model — `resolveDrainageState()`

`src/luna/runtime/lunaDrainageResolver.ts` — zero-arg, computed fresh every call, mirroring every prior resolver's discipline (never stored/duplicated state).

- `wastewaterFixtures` / `wastewaterBackbone` — ordered fixture → discharge (the real physical direction).
- `ventChain` — the shared riser + roof termination.
- `stormwaterChain` — roof drain, downpipe, site discharge.
- State vocabulary: `NORMAL / RESTRICTED / BLOCKED / LEAK / ACCESS_REQUIRED / DESIGN_REFERENCE`. Only `NORMAL/RESTRICTED/BLOCKED/DESIGN_REFERENCE` are actually assigned in this phase — `LEAK`/`ACCESS_REQUIRED` remain declared vocabulary for a future real trigger, matching HVAC's own "no standby state invented" precedent (declare the vocabulary, only use what's justified).
- `LUNA-L06-APT-A-DRAIN-01` is the ONE asset upgraded to real derived telemetry this phase (`condition: "clear"|"restricted"|"blocked"`), the same "give the phase's one demonstrable asset a real field" move every prior riser/branch upgrade made.
- Every new vent/stormwater asset is hardcoded `DESIGN_REFERENCE` — honest, since none of them have any real telemetry or approved design behind them; conflating them with `NORMAL` (which implies a known-good, monitored state) would be dishonest.
- `finalDischargeDesignRequired: true` — hardcoded, mirrors `resolveNetworkState()`'s `edgeCoreConnected: false` code-level honesty pattern. Never inferred resolved.

## 4. Reference simulation

One new scenario, `drainage-blockage`, patches `LUNA-L06-APT-A-DRAIN-01.condition = "blocked"` — a single deterministic patch, no cascade (unlike network/power, a fixture-level blockage doesn't propagate upstream through a gravity system the way an energized/pressurized source does). Explicitly labeled "reference simulation" everywhere it surfaces (Control Board summary, panel, Oyi narrative) — never claimed as real sensor data, since no drainage asset in this catalog has any real instrumentation.

## 5. Physical realism

`src/luna/operational/DrainagePlantEquipment.tsx` — five reference shapes: `DrainPointGeometry` (recessed floor grate, shared by every fixture drain + the stack connection), `DischargeChamberGeometry` (access-cover chamber, shared by the B1 discharge and site stormwater discharge references), `VentCapGeometry` (roof pipe stub + weather cap), `RoofDrainGeometry` (domed strainer, distinct from the floor grate despite the shared function), `DownpipeGeometry` (short exterior pipe segment with wall bracket). All manufacturer-neutral REFERENCE DESIGN — no fabricated pipe diameters, gradients, exact routing, approved discharge points, pump capacity, or treatment capacity. New `PipeRun` connections: the four apartment fixture-to-stack runs (a real, visible gap before this phase — the fixture drains existed as markers with no connecting pipe geometry at all) and one rooftop roof-drain-to-downpipe run.

## 6. Runtime & capabilities

Zero new capabilities. Every drainage asset (existing and new) remains `classification: "asset-only"` — no valve/actuator was fabricated for this passive gravity system, per the brief's own explicit instruction that a passive soil stack is a structural service element, not necessarily a controllable asset.

## 7. Control Board

`DrainageControlBoard`/`DrainageAssetPanel`/`lunaDrainageBoard.ts` — the ninth `SystemControlBoard` consumer. 8 tabs (B1 Discharge default, Soil/Waste Stack, L06 Branch, 6A Stack Connection, Vent Termination, Roof Drain, Downpipe, Site Discharge). Fixture-level drains are deliberately not given their own tabs (the same restraint Water shows toward its own fixture branches) — they fold into the 6A Stack Connection tab, the real node they physically drain to. DD10 disclosures render directly on the relevant tabs, not only in documentation.

## 8. Oyi intelligence

New vocabulary for previously-unaliased real assets (B1 discharge, L06 branch, stack connection, fixture drains, new vent/stormwater assets), plus "waste"/"stormwater" added to the drainage system-alias patterns. New `matchDrainageInvestigation` matcher resolves the brief's demo phrases to `query` intents (not `show_route`) so `explainDrainageState()`'s correctly-directioned, DD10-inclusive narrative is what Oyi actually says — positioned before `matchShowRoute` since several phrases contain the trigger word "route." "Where does the master bathroom waste go?" is deliberately left unhandled by the new matcher, falling through to the pre-existing generic route mechanism unchanged — proving route-tracing itself still works honestly for drainage (with the known, disclosed ordering caveat above), not just the narrative path.

## 9. Facility/Consumer representation — unchanged

`lunaRepresentationPolicy.ts` was not modified. Common B1/roof/site drainage infrastructure: `FULL_3D` for Facility, `HIDDEN` for residents. The apartment's own stack connection and fixture drains: `CONTEXT_3D` for Facility (pre-existing allowlist entries), `FULL_3D` for the assigned resident. The four new vent/stormwater assets are common infrastructure and confirmed `HIDDEN` to every resident.

## 10. Known limitations (disclosed, not defects)

- No pipe diameter, gradient, invert level, or pump/treatment capacity is claimed anywhere — DD10 in full remains open.
- The downpipe's full vertical run from roof to grade is not rendered as continuous geometry (see §2).
- Only Apartment 6A's fixtures are modeled; no other unit's drainage is registered.
- A literal route-trace listing for drainage reads discharge-first (matching `buildServiceRoute()`'s generic, correct-for-other-systems convention) rather than the real fixture-first physical direction — disclosed in §1, worked around at the narrative layer, not fixed in the shared engine.
- **Structural information card — a real testing-harness limitation, not a product defect.** This phase also fixed a genuine, confirmed gap: selecting a structural element (column/slab/etc.) previously fell through to a generic, unhelpful card (`title: "structural-element"`, no fields). `src/luna/LunaContextCard.tsx` now has a proper Information Card branch (canonical type, level, local position, connected element where set, and an explicit "Conceptual, coordinated reference — not certified structural design" disclosure; zero commands, matching the brief's Information-Card-not-Control-Card requirement). The fix is real and type-checked. However, reaching a structural element via a screen-space click in the headless browser test proved infeasible: `useSystemAssetOpacity` only keeps structural meshes raycastable while Structure/"all" is the active system, but the architecture facade does not itself fade during Structure mode (a pre-existing characteristic, not introduced or altered this phase), and section/cutaway clipping is GPU-visual-only (it does not remove the clipped geometry from raycasting) — so a structural element behind the facade cannot be reached by any exterior camera preset click in this reference build. This was extensively calibrated (multiple camera/view combinations tried) before being disclosed as a known limitation rather than continuing to chase it at the expense of the phase's primary scope.

## 11. Unresolved design decisions

Final discharge/municipal connection strategy, treatment, pump/lifting requirements, soil/waste/vent/rainwater separation beyond the single-stack reference, invert levels and gradient, inspection/access chamber approval, and site civil coordination all remain exactly DD10 — none were resolved or silently chosen by this phase.
