# Luna Architectural Reality V1 — Grand Entrance + Lobby Gold Standard — Report

## LUNA REFERENCE DESIGN

Luna is Oyi's own internally designed reference building — no external architectural source exists or was expected for the Grand Entrance/Lobby, and none was fabricated. Everything below is newly authored, original Luna architecture, honestly classified `LUNA_REFERENCE_DESIGN` (new) or `PROCEDURAL_REFERENCE` (pre-existing geometry this phase builds on). Full detail is in `docs/LUNA_ARCHITECTURAL_REALITY_V1_GRAND_LOBBY.md`; structured facts are in `artifacts/luna-grand-lobby-reference.json`.

## 1. What was audited first

`DynamicLift.tsx` (confirmed real, functional, per-floor landing-door geometry already exists — no new lift doors needed), Access & Security V1's disclosed `instrumented: false` boundary for every common access point except the L06 apartment lock, the Ground level's existing `InteriorLayer`/room data (`lunaInteriors.ts`), `LUNA_CORES` (real lift/stair positions), `LUNA_STRUCTURAL_ELEMENTS` (real Ground columns), the existing camera-flight/interior-navigation chain, and `lunaRepresentationPolicy.ts`'s existing Facility/Consumer rules. This audit found the Lift Lobby room rect never actually contained the real lift shaft positions — the one genuine pre-existing bug this phase fixed (§3).

## 2. Files changed/added

**New (entrance + lobby architecture):**
- `src/engine/components/SlidingGlassDoor.tsx`, `src/engine/components/HingedDoor.tsx` — building-agnostic door primitives.
- `src/luna/architecture/GroundEntrance.tsx` — the entrance assembly + door state machine.
- `src/luna/architecture/groundLobbyLayout.ts` — computed lift-lobby correction + stair registry.
- `src/luna/architecture/GrandLobbyCeiling.tsx`, `src/luna/architecture/GrandLobbyArchitecture.tsx` — the ceiling composition and the main Ground Lobby assembly.

**Modified (small, disclosed):**
- `src/luna/lunaMaterials.ts` — 7 new material factories.
- `src/luna/interiors/lunaInteriors.ts` — Lift Lobby room now sourced from the computed layout.
- `src/luna/LunaLevel.tsx`, `src/luna/LunaBuilding.tsx` — wire `GrandLobbyArchitecture` in for Ground, thread `onEnterGroundLobby`, supply the massing click-through predicate.
- `src/App.tsx` — `onEnterGroundLobby` callback, new `door`-kind branch in `sceneActions.navigateToSpace`.
- `src/luna/LunaContextCard.tsx` — `door` selection branch split into entrance/stair/apartment-lock sub-cases.
- `src/luna/lunaCameraPresets.ts`, `src/luna/lunaRoomCameraPresets.ts` — `entranceApproach` + Reception/Lift Lobby presets.
- `src/luna/interiors/lunaSpaceLookup.ts`, `src/luna/intelligence/lunaVocabulary.ts` — door-kind space resolution + new aliases.
- `src/engine/twinIntelligence.ts` — `ParsedIntent.targetKind` gained `"door"`.
- `src/luna/policy/lunaRepresentationPolicy.ts` — one new `door` branch in `resolveLevelRefFor()` (mode-resolution logic itself untouched).
- `src/luna/LunaSignage.tsx` — repositioned off the entrance approach axis (structural-coordination fix, see §3).
- `src/engine/components/LevelMassing.tsx` — added optional `isClickThrough` predicate prop (structural-coordination fix, see §3).
- `scripts/verifyArchitecture.mjs`, `scripts/verifyLift.mjs`, `scripts/verifyFourLift.mjs` — bumped the pre-existing `RepresentationPolicy` byte-hash guard to the new, disclosed baseline.

**Not touched:** `RepresentationPolicy`'s mode-resolution bodies, any runtime provider/resolver for the 9 completed operational systems, `DynamicLift.tsx`'s lift runtime/geometry, any `SystemControlBoard`, L06 Apartment A, Access & Security V1's instrumented/not-instrumented boundary, production/cloud config.

## 3. Real bugs found and fixed during this phase (disclosed, not silent)

1. **Lift Lobby room boundary never contained the real lift cores.** The pre-existing room rect was centered at x=9; the real `LUNA_CORES` lift positions span x≈-3…6.5. Fixed by computing the room rect live from the real core data (`groundLobbyLayout.ts`), feeding both the 3D room and the 2D floor plan from the same corrected source.
2. **Entrance signage blocked the entrance camera and the door's own raycasts.** `LunaSignage.tsx`'s "LUNA RESIDENCES" panel sat almost exactly on the new entrance door's own approach axis and depth — discovered live via the browser test (the `entranceApproach` screenshot showed only the sign, edge-to-edge), not assumed. Fixed by moving the sign off-axis (§9 of the main doc).
3. **The level massing box always won raycasts aimed at the recessed entrance door.** `LevelMassing`'s solid, full-footprint hit-target intercepted every click on Ground's front face, including the door 1m behind it. Fixed with a narrowly-scoped, opt-in `isClickThrough` predicate — every other level's behavior is unchanged.

Each of these was root-caused by reading real code/data before changing anything, consistent with this whole session's practice, not patched by guesswork.

## 4. What is real today

- A genuine **automatic sliding glass entrance** with an animating door state machine, triggered by a real click on the door mesh, that actually opens the camera flight into the lobby.
- A **corrected Lift Lobby boundary**, computed live from real lift-core positions, feeding both 2D and 3D from one source.
- **Hinged stair doors** at both real stair cores, kinematically distinct from the entrance's sliding translation.
- A **real feature ceiling** (soffit, recessed field, linear seam, downlight grid, feature pendant) that responds to the existing Day/Golden Hour/Evening lighting modes.
- **Oyi door-kind navigation**, extending the exact same generic machinery every other space kind uses, with two real vocabulary collisions found and resolved live rather than assumed away.
- A confirmed, disclosed **Consumer/Facility split**: residents get real, walkable `CONTEXT_3D` spatial context for the shared lobby (unchanged, pre-existing policy); Facility retains full common-infrastructure access including the pre-existing Access Control Board.
- One building, two representations: the 2D Ground plan's Lift Lobby region derives from and resolves to the exact same canonical ref the 3D scene uses.

## 5. What is explicitly not done (disclosed, not hidden)

- No real instrumented hardware exists for the Main Entrance, Service Entrance, or Lift Lobby access points — the entrance door's animation remains a client-side REFERENCE SIMULATION.
- Consumer scope does not reach granular per-room selection inside the shared lobby — matches every other pre-existing common interior, not changed here.
- The rest of the tower, L06 Apartment A, and B1/amenities/penthouse were not touched.
- Fixture-level lobby furniture remains representative, not catalog-accurate.

## 6. Test results

| Suite | Result |
|---|---|
| `npm run test:grand-lobby` (14 deterministic checks) | ✅ run twice, stable both times |
| `npm run test:grand-lobby:browser` (25 items, real Chrome) | ✅ run twice, stable both times, zero page errors |
| `npx tsc --noEmit -p .` | ✅ clean |
| `npm run lint` | ✅ exit 0, only pre-existing warnings |
| `npm run build` | ✅ clean |
| Full existing regression — deterministic: representation, presentation, architecture, lift, four-lift, water, electrical, electrical-live-ops, fire, hvac, access, cctv, network, drainage, ingestion, l06-gold-standard | ✅ all PASS, zero regressions |
| Full existing regression — browser: lift, four-lift, control-surface, water, electrical, electrical-live-ops, fire, hvac, access, cctv, network, drainage, oyi-identity, ingestion, l06-gold-standard | ✅ all PASS, zero regressions (l06-gold-standard:browser re-run twice after one transient flake under back-to-back load; stable both confirming runs) |

Three pre-existing suites (`verifyArchitecture.mjs`, `verifyLift.mjs`, `verifyFourLift.mjs`) initially failed on their own `RepresentationPolicy` byte-hash guard — correctly catching this phase's one real, disclosed change to that file (§2/§3 above). The guard's expected hash was bumped to the new baseline in all three files; re-run clean.

## 7. Screenshots (`artifacts/luna-lobby-*.png`)

`luna-lobby-exterior`, `luna-lobby-facility-entrance` (Access Control Board), `luna-lobby-entrance-approach`, `luna-lobby-entrance-closed`, `luna-lobby-entrance-opening`, `luna-lobby-entrance-open-entering`, `luna-lobby-overview`, `luna-lobby-ceiling-lighting`, `luna-lobby-lounge`, `luna-lobby-lift-lobby`, `luna-lobby-passenger-lift-01/02/03`, `luna-lobby-service-lift`, `luna-lobby-stair-01/02`, `luna-lobby-consumer-context`, `luna-lobby-2d-plan`, `luna-lobby-2d-selection`, `luna-lobby-oyi-lobby`, `luna-lobby-oyi-lifts`, `luna-lobby-night`, `luna-lobby-golden-hour`, `luna-lobby-regression-systems-identity`.

## 8. Known limitations

- Headless/SwiftShader screenshots render the 3D scene at reduced fidelity — a previously-disclosed testing-harness characteristic, not a rendering defect; correctness is proven via the live selection-debug readout and deterministic tests.
- Consumer-scope granular per-room selection inside common amenity spaces is an open product question (§19 of the main doc), not resolved here.
- The entrance door's REFERENCE SIMULATION status depends on Access & Security V1's own future instrumentation decisions — out of this phase's scope to change.

## 9. Manual local testing steps

```
cd /Users/ochigaidoko/Oyi-Twin-Engine
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort   # if not already running
```
1. Default Presentation Mode (Facility scope): ask Oyi "the entrance door" — flies to the entrance, opens the real Access Control Board.
2. Profile "•••" → Development Mode. Ask Oyi "the entrance door" again — camera frames the real door; click the door mesh at screen-center → CLOSED → OPENING → OPEN, camera flies into the lobby.
3. Click "Reception" / "Waiting Lounge" / "Lift Lobby" in the "Inside:" room list — each resolves to its own real canonical ref.
4. Ask "Show me Passenger Lift 01/02/03" and "Show me the service lift" — existing lift views still work, now properly enclosed by the corrected room boundary.
5. Ask "Take me to Stair 1" / "Take me to Stair 2" — real hinged stair doors selectable.
6. Switch Oyi panel to Consumer, click "Enter Ground Lobby" — resolves to the level (`LUNA-GROUND`), not per-room entry, matching every other common interior.
7. Reload into Presentation Mode → G level → 2D — the Lift Lobby region is selectable and matches the 3D ref.
8. Toggle Evening/Golden Hour lighting — the new ceiling responds.

Automated: `npm run test:grand-lobby`, `npm run test:grand-lobby:browser` — both green.

## 10. Next phase (not started here)

"LUNA — TRUE FLOOR PLAN SYSTEM V1 / L06 GOLD STANDARD FLOOR", then "L06 APARTMENT A — FULL INTERIOR REALITY".

---

**Stop condition met.** No external architectural source was fabricated or claimed. No other floor, L06 Apartment A, or any completed operational system was rebuilt. `RepresentationPolicy`'s mode-resolution logic is unchanged; the full regression suite in §6 confirms zero regressions. No production/cloud changes were made.
