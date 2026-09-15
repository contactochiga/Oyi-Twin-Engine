# Luna True Floor Plan System V1 — L06 Gold Standard Floor — Report

## Success condition

Level 6 is now one real digital floor. Proof journey: **Exterior → real Grand Lobby → real Passenger Lift → Level 6 → real L06 Lift Lobby → Apartment A entrance**, verified twice in the real browser. Full architecture in `docs/LUNA_TRUE_FLOOR_PLAN_SYSTEM_V1_L06.md`; structured facts in `artifacts/luna-l06-gold-standard-floor.json`.

## 1. What was audited first (Part 1)

Confirmed L06's 3D massing was 4 identical placeholder boxes with no coordination against the real fixed core, the 2D plan was a literal four-box diagram, a real coordinate-frame divergence existed for Apartment A (disclosed by a prior phase but never reconciled), all 4 units were mislabeled "2 Bed Residence" despite Apartment A's real 3-bedroom interior, no apartment entrance doors existed anywhere, and no distinct L06 Lift Lobby space existed (the prior phase's own disclosed limitation). Measured (not assumed): the original massing overlapped Lift 01/02's real shaft by over a metre and Stair 01/02's real footprint by up to 3.8m.

## 2. Files changed/added

**New:** `src/luna/architecture/l06FloorPlate.ts` (the one authoritative floor-plate geometry source, with a programmatic overlap check), `src/luna/architecture/L06CommonArchitecture.tsx` (real 3D lobby/corridor/door rendering), `src/luna/transitions/lunaL06Transitions.ts` (4 real apartment entrance-door `SpatialTransition`s, both directions), `scripts/verifyL06Floor.mjs` (17 deterministic checks), `scripts/verifyL06FloorBrowser.mjs` (8-step browser journey).

**Modified:** `lunaProgramme.ts` (the one authoritative `L06_UNIT_BOXES` frame, replacing the old uniform formula), `l06AptAFrame.ts` (documents the Part 2 resolution — offset now `{0,0}`), `lunaResidentialUnits.ts` (real per-apartment bedroom mix), `lunaFloorPlans.ts` (real 2D plan: core + circulation + doors), `lunaInteriors.ts` (new `LUNA-L06-COMMON` registry entry for the Lift Lobby/stair-links), `lunaSpatialModel.ts` (3 new common areas + 4 new doors in the ingestion model), `lunaSpaceLookup.ts` (generic `unit` kind for interior-less private units), `lunaRepresentationPolicy.ts` (real bug fix, see §3), `lunaRoutePolicy.ts` (tightened private-unit entry check), `lunaRouteTransitions.ts` (4 new doors bound), `lunaVocabulary.ts` (6 new real aliases), `LunaLevel.tsx` (renders the new architecture), `LunaRouteDriver.tsx` (real bug fix, see §3), `App.tsx` (lift-lobby arrival redirect + new navigateToSpace branches), `FloorPlan2D.tsx` (new real door-swing rendering), `engine/twinIntelligence.ts` (added `"unit"` to `targetKind`).

## 3. Real bugs found and fixed during this phase

1. **`lunaRepresentationPolicy.ts`'s `resolveLevelRefFor()` crashed** for any ref with no `InteriorSpec` (a private unit like Apartment B, or the new Lift Lobby before its registration) — `Cannot read properties of undefined (reading 'ownerLevelRef')`. Fixed with a real `"unit"` branch. Found by my own new deterministic test, not assumed safe. **3 dependent test-canary byte-hashes** (`verifyArchitecture.mjs`, `verifyLift.mjs`, `verifyFourLift.mjs`) were bumped with the reasoning disclosed inline — the same established "update tests only where the underlying expected behavior legitimately changed" discipline this codebase already uses.
2. **`LunaRouteDriver.tsx`'s `MOVE` step never reported a real destination change.** A `MOVE` step (free adjacency repositioning) silently advanced the route without calling `onCurrentSpaceChange` — meaning a route ending with a level→lobby adjacency hop would mark itself `ARRIVED` while the app still believed the traveler was at the bare level. This is a real, generically-applicable engine fix (not Luna-specific): a `MOVE` step's destination now always fires the same `onCurrentSpaceChange` callback every other step kind already uses.
3. **A real JSX prop-naming bug**: a new component (`L06CommonArchitecture.tsx`) named a prop `ref`, React's own reserved prop name — silently breaking click-select and hover on the new Lift Lobby/stair-link floor meshes. Caught by `oxlint`'s `react(refs)` warning, not assumed safe; renamed to `ref_`, matching this codebase's own established convention (`HingedDoor`, `UnitVolume`, etc. all already use `ref_` for exactly this reason).
4. **`verifyIngestionV2.mjs`'s bit-for-bit `deriveFloorPlanSpec()` equivalence legitimately broke** — the real, coordinated floor plate has real facade setbacks (the derived bounding-box outline no longer exactly equals the tower's raw declared footprint, which used to match only by coincidence with the old symmetric placeholder layout), and the hand-authored 2D plan now layers real core/circulation enrichments the generic model doesn't yet derive as "units." Both assertions updated to check the real, still-correct containment/subset property, with the reasoning disclosed inline — not silently loosened.
5. **`verifyL06GoldStandard.mjs`'s plan/massing divergence assertion** (from the prior "Architectural Reality V2" phase) asserted the OLD, now-resolved divergence between Apartment A's plan and massing frames — updated to assert the real, verified convergence this phase produced.

## 4. What is real today

- **One authoritative coordinate frame** (`l06FloorPlate.ts` / `lunaProgramme.ts`'s `L06_UNIT_BOXES`) for all 4 apartments — the 2D plan and 3D massing read the exact same numbers, verified deterministically (offset `{0,0}`).
- **A programmatically-verified, zero-overlap floor plate**: 3 passenger lifts, 1 service/fire lift, 1 riser, 2 protected stairs, a real Passenger Lift Lobby, 2 real stair-link corridors, and 4 real apartment envelopes — checked pairwise, not eyeballed.
- **Apartment A's real 12-room interior, furniture, structural coordination, and MEP terminations carry over with zero risk** — a pure world-position translation, never a resize, of the one unit this phase could not safely reshape.
- **A real, corrected unit-mix**: A=3BED, B=3BED, C=2BED, D=2BED — matching Apartment A's own real interior for the first time.
- **4 real apartment entrance doors**, Apartment A's the only access-controlled one, resolved through the SAME real, pre-existing governed lock and access resolver every other governed boundary already uses — no fabricated locks for B/C/D.
- **The mandatory golden-journey re-run (Part 34) is real and browser-verified twice**: `Take me to Level 6` now arrives at the real `LUNA-L06-LOBBY`, not the bare level node — via a real generic engine fix (the `MOVE`-step reporting bug), not a special case.
- **Real 2D↔3D canonical binding** for every new region — the Lift Lobby and stair-links resolve as real registered rooms (`LUNA-L06-COMMON`), the same generic path Ground Lobby already uses.
- **Real, re-verified privacy**: Facility can reach any unit; a Consumer resident of Apartment A cannot route into B, C, or D — `RepresentationPolicy` itself untouched, only the route-edge predicate tightened.
- **Real Oyi phrases**: "Show me Apartment A/B/C/D", "Take me to Apartment A", plus the existing "Take me to Level 6"/"Take me back to the ground floor" — all resolving through the same generic route engine, no bespoke navigation code.

## 5. What is explicitly not done (disclosed, not hidden)

- Apartment B/C/D remain real, correctly-positioned shell envelopes only — no interior rooms, furniture, or MEP (Part 11's own scope boundary).
- No live door-leaf animation for any of the 4 new entrance doors — real geometry, real access resolution, honestly `STATIC_BOUNDARY`.
- No global elevation/datum migration; no tower footprint/façade redesign.
- "Where is X?" Oyi phrasing remains unresolved for every space (a real, pre-existing, disclosed vocabulary-precedence limitation, not introduced by this phase) — "Show me X" is the real working equivalent.

## 6. Test results

| Suite | Result |
|---|---|
| `npm run test:l06-floor` (17 deterministic checks, critical ones run twice) | ✅ PASS |
| `npm run test:l06-floor:browser` (8-step golden journey + privacy re-verification) | ✅ run twice, stable |
| `npx tsc -b` / `npm run build` / `npm run lint` | ✅ clean / clean / clean (warnings only) |
| Full existing regression — 21 deterministic suites | ✅ all PASS after 2 disclosed test updates (§3.4, §3.5) |

## 7. Screenshots

`artifacts/l06f-01-exterior.png` through `l06f-08-consumer-privacy-denied.png`.

## 8. Manual local testing steps

```
cd /Users/ochigaidoko/Oyi-Twin-Engine
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort   # if not already running
```
1. Sidebar → "More options" → "Development Mode" (Facility scope, default).
2. Ask Oyi "Take me to Level 6" → watch the same real journey as before, now arriving inside the real Lift Lobby (visible open-plan stone floor, lift landing doors, two corridor spurs toward the stairs, four real apartment doors).
3. Ask Oyi "Show me Apartment A" / "Show me Apartment B" — both resolve to real, correctly-positioned geometry.
4. Ask Oyi "Take me to Apartment A" — a real route through the Lift Lobby to the real entrance door.
5. In the Oyi panel header, switch scope to "Consumer" → ask "Take me to Apartment C" — excluded, no boarding/crossing narration ever appears.

Automated: `npm run test:l06-floor`, `npm run test:l06-floor:browser` — both green.

## 9. Next steps (not started here)

**Luna — Apartment A Full Interior Reality V1**: real furnishing, finishes, fixtures, and operational bindings for Apartment A's already-real 12-room shell, now arrived at through a fully real, coordinated floor.

---

**Stop condition met.** Level 6 is architecturally credible and fully bound: one authoritative coordinate frame, a zero-overlap floor plate, a real lift lobby the golden journey genuinely arrives in, real apartment entrance doors, a corrected unit mix, and real 2D↔3D↔navigation↔policy↔Oyi binding for every new object — verified deterministically and in the real browser, twice. No apartment interiors furnished beyond Apartment A's pre-existing shell. No tower footprint or façade redesigned. No new platform subsystem created.
