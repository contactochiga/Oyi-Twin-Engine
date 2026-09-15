# Luna Four-Lift System Generalization — Report

Generalized the verified Lift 02 pattern into one reusable elevator subsystem operating all four canonical lift assets. Lift 02 was preserved exactly — re-verified via its own full deterministic and browser suites after every structural change, with zero regressions at any point.

Full audit (boundary between generic/reusable, Lift-02-specific configuration, and hardcoded logic) is in `artifacts/luna-four-lift-audit.md`, written before any code changed.

## 1. Files changed

**Generalized (no duplication — one implementation now serving four lifts):**
- `src/luna/lift/lunaLift.ts` — added the `LiftDefinition` registry (`LIFT_DEFINITIONS`, `isLiftRef`, `liftDefinition`, `coreFor`), generalized `liftCamera()` to accept a shaft-X offset. `LIFT_STOPS`/`liftStop`/`nearestLiftFloor` unchanged (already shared).
- `src/luna/lift/liftSimulation.ts` — **zero changes**. Already fully generic (pure functions over a `LiftState` object, no ref hardcoded anywhere) — confirmed by the audit, not touched.
- `src/luna/runtime/lunaSimulationProvider.ts` — `buildRow`/`setAssetState`/`execute` now branch on `isLiftRef(ref)` instead of `ref === LIFT_02_REF`; `advanceLiftClock` now loops all four `LIFT_DEFINITIONS`, each with its own fixed-step remainder in a `Map` (was one hardcoded remainder for one ref) — this is the one change that makes true concurrent, independent motion possible.
- `src/luna/lift/DynamicLift.tsx` — takes a `def: LiftDefinition` prop instead of hardcoding Lift 02; geometry (shaft/car/doors/landing) scales to each lift's own real width/depth from `LUNA_CORES`. One component, instanced four times.
- `src/luna/lift/LiftContextCard.tsx` / `LiftLevelRail.tsx` — take a `liftRef`/`def` prop; title/labels read from the definition instead of a hardcoded string.
- `src/luna/LunaBuilding.tsx` — renders `LIFT_DEFINITIONS.map(def => <DynamicLift def={def} .../>)`; the static `CoreShaft` fallback now excludes all four lift refs (`isLiftRef`), not just Lift 02.
- `src/luna/LunaContextCard.tsx` — routes to `LiftContextCard` for any `isLiftRef(selected.ref)`, passing the actual ref.
- `src/App.tsx` — the one real state-shape change: `liftView: LiftView | null` became `activeLift: { ref: string; view: LiftView } | null`. Every lift interaction (`showLiftView`, `endLiftView`, `followTarget`, both `useEffect`s, `sceneActions.assetView`/`navigateToAsset`, the selection effect) now takes/uses a ref instead of assuming Lift 02.
- `src/luna/intelligence/lunaIntentParser.ts` — `matchLift` resolves which of the four lifts a phrase names (service/fire, or digit 1/2/3) instead of only recognizing "2"; added plural "elevators"/"lifts" routing to the existing `vertical-transport` system mode for "show all elevators"-style phrasing.

**Small, necessary fixes surfaced by generalizing (not scope creep — each is a direct consequence of Lifts 01/03/Service moving onto the real dynamic runtime):**
- `src/luna/operational/ElevatorCabinLayer.tsx` — this pre-existing, always-invisible (`opacity: 0`) lerped cabin indicator excluded only Lift 02 from its render list. Left as-is, it would have kept an invisible but still click-raycastable duplicate hitbox at the same position as each of the other three lifts' new real geometry. Now excludes all four via `isLiftRef`.
- `src/luna/runtime/lunaScenarios.ts` — the "Elevator Fault" scenario patched `LUNA-LIFT-PASS-01` with the *old* static-behavior field names (`fault`, `door`). Once Lift 01 moved to the v2 schema those fields are dead; the patch now sets `faultState`/`motionState`/`doorState`, the fields `advanceLift`/`requestLift` and every lift UI surface actually read.

**New (tests only):**
- `scripts/verifyFourLift.mjs`, `scripts/verifyFourLiftBrowser.mjs` — deterministic and real-browser multi-lift suites (`npm run test:four-lift`, `test:four-lift:browser`).

**Not touched:** `RepresentationPolicy`, `TwinRuntimeProvider` interface, `TwinIntelligenceController`, camera architecture (`CameraRig`), Cutaway/Explode logic, `FloorPlan2D`, the Ground asset loader, Facility/Consumer UI shells, production/cloud config.

## 2. Reusable lift architecture

One `LiftDefinition` per lift (`ref`, `label`, `shortLabel`, shaft `x`/`z`/`width`/`depth` from the real `LUNA_CORES` entries, `kind: "passenger" | "service"`). One provider clock ticks all four every 40ms, each with its own fixed-step remainder — not four timers, not four React state systems, not four copies of `liftSimulation.ts`. One `DynamicLift` component instanced four times. One `activeLift` state slot in `App.tsx` — "one navigation owner at a time" is structural, not enforced by extra code.

## 3. Canonical IDs (unchanged, no new identities created)

`LUNA-LIFT-PASS-01`, `LUNA-LIFT-PASS-02` (reference), `LUNA-LIFT-PASS-03`, `LUNA-LIFT-SERVICE-01`.

## 4. Shaft/core placement

Taken directly from the existing `LUNA_CORES` entries — never invented:
| Lift | X | Z | Width | Depth |
|---|---|---|---|---|
| Passenger 01 | −3 | 0 | 3 | 3 |
| Passenger 02 (reference) | 0 | 0 | 3 | 3 |
| Passenger 03 | 3 | 0 | 3 | 3 |
| Service/Fire | 6.5 | 0 | 3.2 | 3.4 |

## 5. Served reference stops

All four lifts share the same 14-stop reference matrix as Lift 02 (B1, Ground, L01–L12) — DD06 defines one matrix for the whole system; PH/Roof are not admitted for any lift, verified explicitly for the Service lift too.

## 6. Runtime/state behavior

Identical v2 schema for all four (`positionY`, `currentFloor`/`targetFloor`, `direction`, `speed`, `motionState`, `doorState`/`doorProgress`, `faultState`/`serviceState`, `requestIds`). Verified independent by construction: each lift's row lives under its own canonical ref in the provider's `Map`; a command to one ref only ever reads/writes that ref. Proven directly — Lift 01 → L03, Lift 02 → L10, Lift 03 → Ground, Service → B1, requested together, advanced together, converged on four distinct elevations with zero cross-talk (`test:four-lift`).

## 7. Commands

Same four (`callLift`, `setPosition`, `open`, `close`), same busy guard, same Facility-only authorization gate — now branching on `isLiftRef(ref)` for any of the four instead of one hardcoded ref.

## 8. Camera behavior

`liftCamera(view, y, shaftX)` — the exact offsets tuned for Lift 02 (shaft X=0), now re-centered per lift via its real shaft X. All six modes (shaft/follow/lobby/interior/engineering/structure) verified working for Lift 01/02/03 in the browser suite; Service lift gets the same modes with a DD-required note for special fire/service behavior (see §14).

## 9. LevelRail behavior

Tracks exactly one lift at a time, carrying its canonical ref (`data-tracking-lift-ref`). Verified live: Follow Lift 01 → rail tracks Lift 01 → Follow Lift 03 → rail cleanly transfers to Lift 03 (not both, no stale ref) → Exit lift view → rail returns to static floor navigation.

## 10. Engineering group view

Selecting "Elevators" from Engineering Layers exposes all four lifts simultaneously — each becomes `visible=true` with its shaft walls dropping to 12% opacity, verified directly against the live Three.js scene graph for all four refs in one check. This is the existing per-instance `activeSystem`/`isolatedLevelRef` logic working "for free" once four instances exist — no new dashboard, no new permanent panel; selecting one still opens only that lift's own contextual card via its own `onClick`.

## 11. Independent-state proof

Deterministic (`test:four-lift`): two isolation checks (command to Lift 01/03 leaves the other three byte-identical), one concurrent-motion check (two cars moving within the same shared clock ticks), the exact brief §8 scenario (four simultaneous distinct destinations, verified with zero shared position). Browser (`test:four-lift:browser`): Lift 01 and Lift 03 commanded independently via real Oyi text, observed both with non-zero speed simultaneously in the live app; Lift 02 confirmed untouched (still Ground/idle) throughout every other lift's interaction.

## 12. Test results

All run serially, all green:

| Suite | Result |
|---|---|
| `npm run build` | ✅ clean |
| `npm run lint` | ✅ exit 0, unchanged pre-existing warnings only |
| `npm run test:representation` | ✅ all 16 plans, privacy boundaries intact |
| `npm run test:presentation` | ✅ `"result": "PASS"` |
| `npm run test:architecture` | ✅ `"result": "PASS"` — Ground asset pipeline/procedural fallback unaffected |
| `npm run test:lift` (Lift 02 golden path, deterministic) | ✅ all 9 checks, unchanged |
| `npm run test:four-lift` (new, deterministic) | ✅ all 12 checks |
| `npm run test:lift:browser` (Lift 02 golden path, real Chrome) | ✅ full acceptance list, run twice, stable |
| `npm run test:four-lift:browser` (new, real Chrome) | ✅ all 8 checks, run twice, stable |

`lunaRepresentationPolicy.ts` reconfirmed byte-for-byte identical to the recorded baseline hash (`a8b0e655eafd12fc14498f3470ab31ae4a6ee8f8dd583fc2da378c633a79b499`) at the end of this pass.

## 13. Known limitations

- The pre-existing "ghosted structural slab" raycast characteristic documented in `luna-dynamic-lift-report.md` §9 (opacity doesn't affect Three.js raycasting) applies equally to all four lifts now — not solved here, per this phase's explicit instruction not to broaden into an app-wide picking rewrite. Discoverability via Engineering Layers → Elevators and via Oyi text remain the two verified working routes for all four lifts.
- Word-form lift references ("elevator one") remain unsupported — this was already true for Lift 02 (digit-only convention) and is preserved consistently across all four rather than fixed as a new capability.

## 14. Unresolved DD06/DD11/DD20 items — Service Lift specifically

**Explicitly not implemented, disclosed both in the code (the Service Lift's own context card carries a visible note) and here:** fire recall inspection mode, firefighter operation, protected-lobby logic, emergency-power sequencing, service-loading rules. The Service Lift currently exposes only normal reference simulation — same movement/doors/state/views as the two passenger lifts, nothing more. No certified fire-elevator behavior was fabricated.

## 15. Does the Service Lift differ from passenger lifts yet?

**Only in disclosure, not in behavior.** Structurally it runs through the identical provider/runtime/camera/representation code as Lifts 01–03 (proven by `test:four-lift`'s Ground→B1→L06 journey and the same isolation/independence checks). The one difference is presentational: its `LiftDefinition.kind === "service"` triggers a visible note on its own contextual card disclosing which fire/service-specific modes remain DD-required. This was a deliberate, minimal choice — building distinct special-mode behavior now would mean fabricating unresolved DD06/DD11/DD20 decisions, which this phase was explicitly told not to do.

## 16. Manual local testing steps

```
cd /Users/ochigaidoko/Oyi-Twin-Engine
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort   # if not already running
```
Open `http://127.0.0.1:5173/` (Presentation Mode is the default).
1. Open Engineering Layers → Elevators — all four shafts/cars become visible with transparent walls.
2. Ask Oyi: "Take Passenger Lift 01 to Level 10." then immediately "Take Passenger Lift 03 to Level 6." — watch both cars move independently at the same time.
3. While both are moving, switch Architecture → All Systems → Structure via Engineering Layers — neither lift's destination resets.
4. Ask "Follow Passenger Lift 01." — the level rail starts tracking Lift 01. Then ask "Follow Passenger Lift 03." — tracking cleanly transfers.
5. Ask "Show the Service Lift." — its card opens with the DD-required disclosure note visible.
6. Ask "Show all elevators." — the building switches to the integrated vertical-transport representation.

Automated: `npm run test:four-lift` (deterministic) and `npm run test:four-lift:browser` (real Chrome) — both green; `npm run test:lift` / `test:lift:browser` re-confirm Lift 02 is untouched.

## 17. Recommended next phase

Not started here, per instruction: real per-passenger group dispatch logic (call assignment, priority/service rules, fire/service overrides) — a `LiftGroup` concept can be defined in documentation once a dispatch strategy is chosen, but no dispatch controller exists yet; each of the four lifts remains an independently-commanded canonical asset, exactly as scoped. Resolving the Service Lift's DD06/DD11/DD20 items would be the natural next step if fire/service behavior becomes a priority before dispatch.

---

**Stop condition met.** No group dispatch was built. No fire-elevator certification was fabricated. No other building system was started. No production/cloud changes were made.
