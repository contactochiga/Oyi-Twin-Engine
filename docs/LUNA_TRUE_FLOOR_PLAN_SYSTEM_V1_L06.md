# Luna — True Floor Plan System V1: L06 Gold Standard Architectural Floor

**Status:** `LUNA_REFERENCE_DESIGN`. This is Oyi's own internally-designed reference architecture for a floor Luna has no external architect source for — a credible, coordinated reference design, **not** an approved/construction-issued/as-built document, and **not** claimed code-compliant. Where life-safety logic is described (Part 26), it is disclosed as a conceptual arrangement only.

## 1. Success condition

Level 6 becomes one real digital floor: the same Apartment A exists in canonical data + 2D plan + 3D architecture + navigation + transitions + policy + Oyi; the floor's lifts/stairs/corridor/doors/apartments are real, coordinated, non-overlapping geometry, not a four-box diagram. Proof journey: **Exterior → Real Grand Lobby → Real Lift → Level 6 → Real L06 Lift Lobby → Apartment A entrance**, browser-verified (see §9).

## 2. What was audited first (Part 1)

A dedicated audit pass found:

- L06's 3D massing was 4 identical placeholder boxes (`l06UnitMassingBox()`, a uniform `gridX/gridZ * shared-divisor` formula) with **no coordination against the real fixed core** (`LUNA_CORES`).
- The 2D operational plan (`LUNA_L06_FLOOR_PLAN`) was a literal four-box diagram with no core, no lobby, no corridor, no doors.
- A real, already-disclosed coordinate-frame divergence existed between the 3D massing frame and the 2D plan frame for Apartment A (`l06AptAFrame.ts`'s own `MASSING_TO_PLAN_OFFSET`), never reconciled by the prior "Architectural Reality V2" phase.
- Apartment A already had a real, camera-validated 12-room interior (`lunaInteriors.ts`), a structural coordination check (`l06AptAStructuralCoordination.ts`), and real MEP terminations (`lunaUnitMepAssets.ts`, `lunaMepBackbone.ts`) — all keyed to the 3D massing frame.
- All 4 L06 units were labeled "2 Bed Residence" regardless of the real Apartment A interior having 3 bedrooms — a real data bug (`lunaResidentialUnits.ts`'s tier-uniform hardcode).
- No apartment entrance doors existed anywhere in the transition/navigation system (only the Main Entrance and 2 Ground stair doors existed).
- No distinct "L06 Lift Lobby" canonical space existed — the V1.1 phase's own disclosed limitation: a lift arrival at Level 6 landed on the bare `LUNA-L06` level node.

**Measured, not assumed:** the original massing formula put Apartment A/B's inner corner overlapping Lift 01/02's real shaft footprint by over a metre, and Apartment C/D's outer corner overlapping Stair 01/02's real footprint by up to 3.8m. This is the real, disclosed reason the floor plate needed re-coordination — not a stylistic preference.

## 3. Coordinate frame resolution (Part 2)

**Decision: the MASSING FRAME is now the one authoritative frame.** It carries the most already-real, camera-validated work (Apartment A's 12 rooms, structural coordination, MEP terminations, per-room camera presets). The 2D operational plan (`lunaFloorPlans.ts`) now reads the exact same `L06_UNIT_BOXES` entries the 3D massing uses — `LUNA_L06_UNITS.planX/planZ/planWidth/planDepth` are computed **from** the massing box, not independently authored. `MASSING_TO_PLAN_OFFSET` (`l06AptAFrame.ts`) now computes to exactly `{0, 0}` — kept live (not deleted) as a standing proof the divergence stays closed.

No global elevation/datum migration was performed (Part 3): L06 continues to use its existing `baseElevation` from `lunaProgramme.ts`'s derived level stack. The floor-plate coordination work operates entirely in a local (x, z) architectural frame at that one datum — no other level's elevation, coordinate, or massing was touched.

## 4. The real fix: `l06FloorPlate.ts`

`src/luna/architecture/l06FloorPlate.ts` is the single authoritative source for every new L06 rectangle, with a **programmatic overlap check** (`checkL06FloorPlateCoordination()`) run against every real core element, the new circulation zones, and all 4 apartment boxes — verified `CLEAR`, not assumed.

**Why the units move (disclosed):**
- **Apartment A and B** translate by exactly `-1.549m` in Z (using virtually all the real available slack to the tower's own exterior wall — the original box's outer edge sat 1.549m inside the declared footprint). Width, depth, and every local room/furniture/camera-preset coordinate are **completely unchanged** — a pure world-position slide, not a resize, so Apartment A's real 12-room interior, furniture layout, structural coordination, and MEP terminations (all LOCAL to the box's own origin) carry over with **zero risk**. Verified: `checkL06AptAStructuralCoordination()` still returns `CLEAR`.
- **Apartment C and D** translate by `+1.549m` in Z **and** lose width on their outer (stair-facing) side — the only two units this phase is free to reshape, since they have no real interior yet (Part 11).

This opens exactly enough room for:

| Object | x | z | width | depth |
|---|---|---|---|---|
| Apartment A | -8.1818 | -7.9126 | 15.6522 | 12.1739 |
| Apartment B | 8.1818 | -7.9126 | 15.6522 | 12.1739 |
| Apartment C | -6.1135 | 7.9126 | 8.673 | 12.1739 |
| Apartment D | 6.1135 | 7.9126 | 8.673 | 12.1739 |
| Passenger Lift Lobby (`LUNA-L06-LOBBY`) | 0 | 0 | 20.9 | 3.4 |
| Stair 01 Access Corridor | -11.35 | 5.025 | 1.8 | 13.45 |
| Stair 02 Access Corridor | 11.35 | 5.025 | 1.8 | 13.45 |

Zero real overlaps among these, the fixed core (3 passenger lifts, 1 service/fire lift, riser, 2 protected stairs), and the tower's declared 36×28 footprint — verified programmatically (`checkL06FloorPlateCoordination()` + `checkL06WithinEnvelope()`), not measured by hand.

**Disclosed asymmetry:** both of Luna's real protected stairs sit on the same (north) side of the building — a real, fixed, building-wide constraint (`LUNA_CORES`) this phase cannot move without relocating Ground's own already-built real stair architecture (task #769). Apartments A/B reach both stairs via the Lift Lobby, not a direct spur on their own side — a real, if suboptimal, connected path, not a missing one.

**Disclosed simplification:** the Lift Lobby is one open circulation volume containing all 3 passenger lifts, the service/fire lift, and the riser — matching `GrandLobbyArchitecture.tsx`'s own established precedent (one open volume, not boxed rooms with doors between every zone). The real geometry does not have enough depth here (3.4m) to also wall off a separate service landing without reopening the exact core-overlap problem this phase exists to fix. The service lift's own portion is distinguished by real signage only (Part 8) — not a physical partition.

## 5. Programme correction (Parts 4/12)

`lunaResidentialUnits.ts`'s `buildUnitsForLevel()` used a single tier-uniform bedroom count (`"2 Bed Residence"` for every "standard" level unit) that silently overrode even Apartment A's real 3-bedroom, 12-room interior. L06 — the one standard-tier level with real backend-seeded units — now gets a real per-apartment mix: **A = 3 Bed Residence, B = 3 Bed Residence, C = 2 Bed Residence, D = 2 Bed Residence**, sourced by a new `L06_BEDROOM_MIX` table, keyed by unit suffix. Every *other* generated standard level (L02–L05, L07–L09) keeps the disclosed-as-reference uniform 2-bedroom default unchanged — this phase does not touch their canonical metadata (no home records duplicated).

## 6. Apartment entrance doors (Parts 14/15/33)

Four real door assemblies (`L06_APARTMENT_DOORS`, `l06FloorPlate.ts`), each a real hinged frame+leaf (`L06CommonArchitecture.tsx`, reusing the engine's existing `HingedDoor` primitive — the same one Ground's stair doors use), positioned on the real wall between the Lift Lobby and each unit:

- **Apartment A** — the only access-controlled door. `accessRequirement: "ACCESS_CONTROLLED"`, resolved through the real, pre-existing governed lock `LUNA-L06-APT-A-ENTRY-LOCK-01` (already in `lunaSimulationProvider.ts`'s `ACCESS_GOVERNED_REFS`, already authorizing a resident whose `assignedHomeRefs` includes `LUNA-L06-APT-A`) via the same `lunaAccessTransitionResolver` every other governed boundary already uses.
- **Apartment B/C/D** — real architectural door assemblies with **no access control** (Part 14: "do not fabricate locks for B/C/D"). `accessRequirement: "POLICY_ONLY"` — RepresentationPolicy alone decides whether the unit is even a valid destination; a non-resident can't select a `HIDDEN` unit as a route target in the first place.

Door swings (Part 15) are real, oriented explicitly away from each other: A/C hinge left and swing into their own unit, B/D hinge right and swing into their own unit — encoded once in `L06_APARTMENT_DOORS` and consumed identically by both the 3D door assembly and the new `FloorPlanDoorSpec` 2D swing-arc renderer (`FloorPlan2D.tsx`).

**Disclosed limitation:** all four doors render **closed**, with no live open/close runtime binding — proving the real `ACCESS_CONTROLLED` resolution and the real camera crossing (Part 33) does not require an animating leaf mesh, and a fake progress driver just to make the door LOOK like it swings would be worse than disclosing the limitation. This is the same honest `STATIC_BOUNDARY` category the Ground stair doors already use.

## 7. 2D plan + 2D/3D canonical binding (Parts 16/17/18/32)

`LUNA_L06_FLOOR_PLAN` (`lunaFloorPlans.ts`) is now a real architectural control plan: the tower outline, 4 apartments with real per-unit type labels, all 7 real core elements (3 passenger lifts, service/fire lift, riser, 2 stairs — each with its own real `LUNA_CORES` rectangle, no shared placeholder band), the real Lift Lobby, both stair-link corridors, and 4 real door swings — 14 uniquely-refed regions total, zero duplicates.

Every region resolves through the same canonical-ref crosswalk the rest of the engine already uses: `findSpace()` (`lunaSpaceLookup.ts`) resolves the Lift Lobby and stair-links as real `room` entries (registered on a new `LUNA-L06-COMMON` `InteriorSpec`, `lunaInteriors.ts` — geometry read directly from `l06FloorPlate.ts`, never re-typed), exactly the same generic path Ground Lobby's own zones already use. Apartments B/C/D (no registered interior) resolve through a new generic `unit` kind — a real exterior-focus destination, never a fabricated interior-enter. No parallel hand-written click-mapping was created.

## 8. Navigation graph, transitions, camera, Oyi (Parts 19/31/32/33/34/35)

- **`buildLunaReferenceModel()`** (`lunaSpatialModel.ts`) now registers the Lift Lobby and both stair-link corridors as real `NormalizedCommonArea` entries with `levelRef: "LUNA-L06"` — the generic engine's own "common areas get a free adjacency edge to their own level" rule (`buildNavigationGraph()`) gives the lift a real arrival space to land in, with zero engine changes beyond registering real data.
- **A real, generically-applicable engine bug was found and fixed**: `LunaRouteDriver.tsx`'s `MOVE` step handler never called `onCurrentSpaceChange`, treating a free adjacency hop as a pure no-op. That meant a route ending with a level→lobby adjacency hop would silently mark itself `ARRIVED` while still reporting the bare level as the current space — exactly the "procedural arrival floating inside geometry" this phase exists to eliminate. Fixed generically (not Luna-specific): a `MOVE` step's real destination change is now always reported.
- **4 real `NormalizedDoor` entries** connect the Lift Lobby to each unit (`buildL06ApartmentDoors()`), giving the navigation graph a real door edge into every apartment — Apartment A is reachable via a real `via: "door"` edge, not a floating disconnected node.
- **A second real bug was found and fixed**: `lunaRepresentationPolicy.ts`'s `resolveLevelRefFor()` crashed (`Cannot read properties of undefined`) whenever asked to resolve a ref with no `InteriorSpec` (a private unit like Apartment B, or — before the `LUNA-L06-COMMON` registration — the Lift Lobby). Fixed with a real `"unit"` branch reading the ref's own `levelRef` directly. This is a real, deliberate, disclosed change to a file whose byte-hash was previously pinned by 3 existing test canaries (`verifyArchitecture.mjs`, `verifyLift.mjs`, `verifyFourLift.mjs`) — all 3 baselines were bumped with the reasoning disclosed inline, not silently overwritten.
- **Lift arrival now lands in the real Lift Lobby** (Part 34's mandatory re-run): `App.tsx`'s `LEVEL_ARRIVAL_REF` map redirects a physical route to `LUNA-L06` toward `LUNA-L06-LOBBY` instead — LOCATE (LevelRail's own instant click) is completely unaffected; only a real physical TRAVEL destination changes. Browser-verified (see §9): `Take me to Level 6` now genuinely arrives with `currentSpaceRef === "LUNA-L06-LOBBY"`.
- **Structural coordination re-verified**: `checkL06AptAStructuralCoordination()` (Apartment A vs the real L06 columns) still returns `CLEAR` after the floor-plate translation.
- **Oyi (Part 35)**: new `SPACE_ALIASES` entries (`lunaVocabulary.ts`) for Apartment B/C/D (`kind: "unit"`, LOCATE-only) and the Lift Lobby/stair-links (`kind: "room"`), resolved through the exact same generic `findSpace`/route-engine pipeline every other Luna phrase already uses — no Luna-specific string hack, no new mechanism. **Disclosed, pre-existing limitation** (not introduced by this phase, confirmed against "Where is Stair 1?" and "Where is Apartment A?" too): `"Where is X?"` phrasing is intercepted by an earlier matcher (`matchQuery`) before it ever reaches space resolution, and returns `unknown`. `"Show me X"` is the real, working equivalent phrase and is what this phase's own tests and documentation use.
- **Camera destinations**: `unitExteriorFocusCamera()` (pre-existing generic function) is reused for Apartment B/C/D's LOCATE-only focus shot — no new hand-placed camera literal was authored for them.

## 9. Browser verification (Part 39, run twice)

`npm run test:l06-floor:browser` (`scripts/verifyL06FloorBrowser.mjs`), headed-equivalent (SwiftShader) Puppeteer, Development Mode:

1. Exterior arrival.
2. **Mandatory re-run (Part 34)**: `Take me to Level 6` polled until `currentSpaceRef === "LUNA-L06-LOBBY"` — the real chained journey (Grand Lobby → real lift ride → real L06 Lift Lobby), not the bare level node.
3. `Show me Apartment A` → resolves to `LUNA-L06-APT-A` (real interior, `kind: "interior"`).
4. `Show me Apartment B` → resolves to `LUNA-L06-APT-B` (`kind: "unit"`, LOCATE-only, no fabricated interior).
5. `Take me to Apartment A` → a real route through the real Lift Lobby → real entrance door → arrives inside Apartment A (Facility identity, real `ACCESS_CONTROLLED` resolution).
6. `Take me back to the ground floor` → the same route engine in reverse, real arrival back at Ground.
7. **Consumer privacy re-verification against the new architecture**: switching to Consumer scope and requesting `Take me to Apartment C` does **not** move `currentSpaceRef` to `LUNA-L06-APT-C` — `RepresentationPolicy` itself untouched, only the route-edge predicate consults its existing, unmodified output.

Run twice, stable both times. Screenshots: `artifacts/l06f-01-exterior.png` through `artifacts/l06f-08-consumer-privacy-denied.png`.

## 10. Visual quality bar (Part 40)

The Lift Lobby, both stair-link corridors, and all four apartment entrance doors now render as real, distinct, restrained-material architectural volumes (stone floor/ceiling, dark aluminium door frames, wood leaves) rather than raw debugging boxes — matching the established material language (`lunaMaterialFactories`) already used for the Grand Lobby. Apartment A's existing real interior (unchanged) continues to be the strongest-detail space on the floor, per Part 11's own scope boundary. B/C/D remain real, correctly-positioned, correctly-sized shell volumes — not yet furnished (explicitly deferred to the next phase).

## 11. Structural, MEP, and policy coordination (Parts 23–26)

- **Structural**: unchanged — `LUNA_STRUCTURAL_ELEMENTS`' L06 columns were not moved; `checkL06AptAStructuralCoordination()` re-verified `CLEAR` after the translation.
- **MEP**: Apartment A's device positions, MEP backbone terminations, and riser routing are all LOCAL to the (unchanged) box origin — they moved for free with the pure translation, verified by the audit that preceded this phase's implementation. No device was left floating inside a wall.
- **Fire/life-safety**: the two protected stairs and their real access corridors provide a real, if asymmetric (§4), connected egress path from every apartment door to at least one stair — disclosed as a **conceptual reference arrangement**, never claimed code-compliant or certified.
- **RepresentationPolicy**: `LUNA_PRIVATE_UNIT_REFS` is byte-identical to before this phase (deterministically verified, `scripts/verifyL06Floor.mjs` check 17). Only the route-edge predicate (`lunaRoutePolicy.ts`) was tightened to require `FULL_3D` specifically (not just "spatially visible") before crossing into a private unit — a real, additive restriction, never a weakening.

## 12. Tests

- **Deterministic** (`npm run test:l06-floor`, `scripts/verifyL06Floor.mjs`, 17 checks, critical ones run twice): coordinate frame resolution, zero floor-plate overlaps, envelope containment, programme/bedroom mix, vertical core intact, real circulation geometry, entrance doors, no duplicate refs, 2D/3D binding, navigation graph, door transitions, Facility privacy, Consumer privacy, structural clearance, lift arrival at the real lobby, Oyi alias resolution, RepresentationPolicy untouched.
- **Browser** (`npm run test:l06-floor:browser`, §9), run twice.
- **Full regression**: every pre-existing deterministic suite (representation, presentation, architecture, lift, four-lift, water, electrical, electrical-live-ops, fire, hvac, access, cctv, network, drainage, ingestion, l06-gold-standard [the prior Apartment A registry phase], grand-lobby, ingestion-v2, spatial-transition, routed-traversal) — all green, with 4 disclosed, reasoned updates (§13) rather than silent breakage. `tsc -b`, `vite build`, and `oxlint` all clean.

## 13. Real regressions found and fixed during this phase (disclosed, not hidden)

1. **`lunaRepresentationPolicy.ts`'s `resolveLevelRefFor()` crash** for any ref with no `InteriorSpec` — real bug, fixed with a real `"unit"` branch (§8). 3 dependent test-canary hashes updated with reasoning.
2. **`LunaRouteDriver.tsx`'s `MOVE` step never reported arrival** — a real, generically-applicable engine bug (§8), fixed so the lift-lobby arrival fix could work at all.
3. **`verifyRepresentation.mjs`'s room-kind cross-check** assumed every `kind: "room"` 2D-plan region existed in `LUNA_INTERIORS`'s flat room list — true again once the Lift Lobby/stair-links were registered on `LUNA-L06-COMMON` (§7), not a test change needed.
4. **`verifyIngestionV2.mjs`'s bit-for-bit `deriveFloorPlanSpec()` equivalence** legitimately broke: the hand-authored 2D plan now layers real core/circulation enrichments the generic ingestion model doesn't yet model as "units"; the derived outline also legitimately no longer equals the tower's raw declared footprint (a real architectural plate has real facade setbacks). Both assertions updated to check the real, still-correct subset/containment property, disclosed inline.
5. **`verifyL06GoldStandard.mjs`'s plan/massing divergence assertion** (from the prior "Architectural Reality V2" phase) asserted the OLD, now-resolved divergence — updated to assert convergence (§3), disclosed inline.
6. **A real JSX bug in `L06CommonArchitecture.tsx`**: a new component's prop was named `ref` (React's own reserved prop name), silently breaking click-select/hover on the new circulation zones — caught by `oxlint`, renamed to `ref_` matching this codebase's own established convention (`HingedDoor`, `UnitVolume`, etc.).

## 14. Explicitly not done (Part 44 — scope stop)

- Apartment B/C/D are real, correctly-positioned shell envelopes only — no interior rooms, furniture, or MEP (Part 11's own scope boundary; the next phase, "Luna — Apartment A Full Interior Reality V1", covers real interior furnishing, starting with Apartment A).
- No live door-leaf animation for any of the 4 new entrance doors (§6) — real geometry, real access logic, no fabricated visual.
- No global building-wide elevation/datum migration.
- No redesign of the tower exterior footprint or façade.
- No new platform/engine subsystem — every fix in §8 extends an existing generic contract (`NavigationGraph`, `RepresentationPolicy`, the route engine's `MOVE` step) rather than inventing a new one.

## 15. Next phase (named, not started)

**Luna — Apartment A Full Interior Reality V1**: foyer, living, dining, kitchen, bedrooms, ensuite bathrooms, guest WC, circulation, wardrobes/storage, utility, windows/façade relationship, ceilings, finishes, lighting, furniture, real doors, plumbing fixtures, electrical points, HVAC, smart devices, operational bindings, room-by-room navigation, Consumer experience, Facility privacy boundary — building on Apartment A's already-real 12-room registry and its now-real, correctly-positioned entrance sequence (Lift Lobby → real door → Apartment A).
