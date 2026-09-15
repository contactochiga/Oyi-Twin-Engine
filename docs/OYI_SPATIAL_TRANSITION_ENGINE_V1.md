# Oyi Spatial Transition Engine V1

## Success condition

Not "camera flies to a preset." **No enterable space is entered by teleport when a mapped physical transition exists.** Entering a space means actually crossing its architectural boundary — a door opens, the camera physically moves through the real opening, the door closes behind it. After this phase, "Enter" no longer means "scene-switch"; it means USE THE BUILDING.

**First proof, real and browser-verified twice:** EXTERIOR → click the Main Entrance → the door opens on a real clearance-gated schedule → the camera physically crosses the actual threshold → GRAND LOBBY, with the reverse (Exit Building) equally real.

## 1. What was audited first (Part 1)

A full read-only pass across the Grand Entrance's existing reference-simulation door, `CameraRig`'s single-segment flight primitive, the dynamic lift system, Access & Security V1's deliberate single-instrumented-lock scope, Building Ingestion V2's navigation graph, and the (unwired) `resolveTapAction` two-stage primitive — before any code was written. The audit's own finding shaped every design decision below: **nothing in the repository already constitutes a transition/crossing engine** (confirmed by an explicit grep sweep for threshold/boundary/traversal/clearance concepts), so this phase is additive on top of real, proven primitives (`SlidingGlassDoor`, `HingedDoor`, `CameraFlightTarget`, `NavigationEdge`, `TwinRuntimeProvider`), never a duplicate or a replacement of any of them.

## 2. Files changed/added

**New (`src/engine/spatial/` — building-agnostic):**
- `transitions.ts` — `SpatialTransition`, `TransitionType`, `TransitionStateName`, `AccessOutcome`, `TransitionAccessRequirement`, `ClearanceRule`, `TransitionDiagnostics`.
- `clearance.ts` — `isBoundaryClearForTraversal()`, `slidingBoundaryState()`, `hingedBoundaryState()`, `STANDARD_TRAVERSAL_PROFILE`.
- `cameraTraversal.ts` — `buildTraversalWaypoints()`, extending `CameraRig`'s own `CameraFlightTarget` into a physical waypoint sequence.
- `transitionValidation.ts` — `validateTransition()`, returning `OK` / `BLOCKED` / `TRANSITION_REVIEW_REQUIRED` with a real reason, never faking a traversal.
- `accessResolution.ts` — `AccessResolver` contract + `resolveTransitionAccess()`, deliberately parallel to (never merged with) `RepresentationPolicy`.
- `transitionEngine.ts` — the pure state-machine step functions (`beginTransition`, `beginApproach`, `arriveAtApproachPoint`, `resolveAccessStep`, `resumeAfterUserInput`, `checkClearance`, `advanceCrossing`, `cancelTransition`, `faultTransition`).
- `routePlanning.ts` — `planRoute()`, extending the existing `NavigationGraph`/`shortestPath` with a policy-filtered, transition-aware route status.

**Modified (small, additive, disclosed):**
- `types.ts` — `NormalizedDoor` gains optional `hingeSide`/`slideAxis`/`approachPoint`/`entryPoint3D`/`exitPoint`/`geometryRef`/`accessPolicyRef`/`animationReadiness` fields. Every existing `NormalizedDoor` literal keeps compiling unchanged.
- `navigationGraph.ts` — `NavigationEdge` gains an optional `transitionRef`; never auto-populated by `buildNavigationGraph()`, only ever attached explicitly once a real `SpatialTransition` exists for that edge.
- `components/CameraRig.tsx` — new optional `onArrive` prop, fired only for a fixed (non-follow) `flightTarget` that actually settles, with the target that was reached. This is the real "waypoint reached" signal a multi-segment traversal needs; zero behavior change for any existing caller that doesn't pass it.
- `components/SlidingGlassDoor.tsx` — new optional `onProgressChange` prop, reporting the door's own real, currently-animating leaf progress every frame. The clearance check reads the door's ACTUAL rendered openness through this, never a parallel/duplicated estimate.

**New (Luna wiring — building-specific):**
- `src/luna/transitions/lunaTransitions.ts` — `LUNA_MAIN_ENTRANCE_TRANSITION` / `_REVERSE`, built from the SAME real constants (`GROUND_ENTRANCE_X/Z/OPENING_WIDTH`, `LUNA_GROUND_LOBBY.interiorRef`) the existing architecture already uses.
- `src/luna/runtime/lunaAccessTransitionResolver.ts` — a thin `AccessResolver` wrapping the EXISTING `resolveAccessAuthorization()`/`isAccessGovernedRef()`, never a second authorization engine.
- `src/luna/transitions/LunaEntranceTransitionDriver.tsx` — the real host driving the generic state machine: React state + `useFrame` clearance polling + `useImperativeHandle` (`beginEnter`/`beginExit`/`handleCameraArrive`/`setDoorProgress`).

**Modified (Luna wiring, disclosed):**
- `GroundEntrance.tsx` — no longer owns a timer-based door state machine; now fully controlled (`doorState`/`onSelectDoor`/`onProgressChange` props), matching `SlidingGlassDoor`'s own "geometry doesn't own operational truth" principle one level higher.
- `GrandLobbyArchitecture.tsx`, `LunaLevel.tsx`, `LunaBuilding.tsx` — thread the new controlled props down to `GroundEntrance`.
- `App.tsx` — owns the transition driver ref + door state; `enterGroundLobbyViaEntrance()` (preserves the pre-existing CONTEXT_3D fallback for non-FULL_3D identities exactly), `onArrivedAtGroundLobby()`, `onArrivedOutsideBuilding()`; the Ground Lobby's own interior-navigation-card back control now calls `beginExit()` instead of teleporting to the exterior hero shot.
- `lunaSpatialModel.ts` — Luna's real Main Entrance and two stair doors are now populated as `NormalizedDoor` records (previously the model had zero doors — a real, disclosed pre-existing gap this phase closes); a `NormalizedSite` (`LUNA-EXTERIOR-ENTRANCE-PLAZA`) and the Grand Lobby's own `NormalizedCommonArea` are added so the transition's endpoints resolve.
- `miniBuildingFixture.ts` — extended with an Exterior/Main Entrance/Ground Lobby and a real `AUTOMATIC_DOOR` transition (`buildMiniEntranceTransition()`), proving the engine against a building with zero Luna-specific code.

**Not touched:** `RepresentationPolicy`, the dynamic lift system's own state/geometry, `HingedDoor.tsx`'s kinematics, any existing camera preset, Luna's apartment interiors, the Building Ingestion V2 derivation functions.

## 3. The transition grammar, as implemented

```
IDLE -> LOCATING_ENTRY -> APPROACHING -> WAITING_FOR_ACCESS -> ACTUATING
     -> WAITING_FOR_CLEARANCE -> CROSSING -> ARRIVED
     (or: DENIED / BLOCKED / FAULT / PAUSED_FOR_USER_INPUT at any gated step)
```

Every step is a pure function in `transitionEngine.ts`; a step only moves the phase forward when its own real precondition is met, and no function can be called to skip a phase out of order (each one no-ops if the context isn't in the expected phase). The host (`LunaEntranceTransitionDriver.tsx`) owns the only side effects: starting a camera flight, reading the door's real progress each frame, resolving access through the real access system.

## 4. Clearance — never a timer

`isBoundaryClearForTraversal(boundaryState, profile)` compares a REAL, derived aperture width against a required clearance (default 0.9m, single-file walking). For a sliding door, aperture = `openFraction * openingWidth`, where `openFraction` is the exact same value `SlidingGlassDoor`'s own leaf-position `useFrame` already animates with (reported live via the new `onProgressChange` callback — not a second, independently-clocked estimate). For a hinged door, aperture = `frameWidth * sin(angle)`. `WAITING_FOR_CLEARANCE` is polled every frame against this real value; the door closing early or opening slowly changes how long the wait actually is, exactly as a real door would.

## 5. Camera crossing — extends CameraRig, doesn't replace it

`buildTraversalWaypoints()` turns a `SpatialTransition.crossingPath` into an ordered list of the SAME `CameraFlightTarget` shape `CameraRig` already knows how to fly to. The new `onArrive` prop on `CameraRig` fires exactly when a fixed flight target settles — that's the real signal the driver uses to advance from one waypoint to the next (`APPROACHING` → `WAITING_FOR_ACCESS`, and each `CROSSING` step). No second camera engine; no spline; a straight point-to-point sequence, matching the brief's own "physically traverse... don't build a full game engine."

## 6. Access — a second axis, not a second engine

`AccessResolver`/`resolveTransitionAccess()` mirror `RepresentationPolicy`'s own "engine defines the contract, building implements it" split, answering a narrower, distinct question: is THIS BOUNDARY authorized to open, as opposed to RepresentationPolicy's "may this user see/enter this space at all." `lunaAccessTransitionResolver.ts` wraps the existing `resolveAccessAuthorization()`/`isAccessGovernedRef()` verbatim — for the Main Entrance, which Access & Security V1 deliberately never instruments, it honestly reports `NOT_REQUIRED` rather than fabricating a lock check. A transition whose `accessRequirement` is `NONE` never even calls the resolver.

## 7. Path validation before any door opens

`validateTransition()` checks: both endpoints resolve in the normalized model, the crossing path has real length and matches the transition's own approach/exit points, and — for a door-backed transition — the bound door's own `fromSpaceRef`/`toSpaceRef` genuinely match the transition's. Failures return `BLOCKED` or `TRANSITION_REVIEW_REQUIRED` with a real reason string, never a faked traversal.

## 8. Navigation graph + route planning integration

`NavigationEdge.transitionRef` is additive and never auto-populated — `buildNavigationGraph()` still only derives connectivity from doors/lifts/stairs/adjacency exactly as Building Ingestion V2 left it. `planRoute()` is the new layer on top: given a graph, it walks `shortestPath()`'s node sequence, requires a caller-supplied `isEdgeAllowed` predicate (never optional — Part 25's Facility/Consumer filtering can't be silently skipped), and reports `NOT_PHYSICALLY_TRAVERSABLE` honestly for any edge that has connectivity but no bound transition yet, `BLOCKED_BY_POLICY` when the predicate rejects an edge, `OK` only when every edge is both permitted and physically walkable.

## 9. Door honesty (Parts 22/23)

`NormalizedDoor.animationReadiness` distinguishes: `ANIMATABLE` (a real movable leaf with known kinematics — the Main Entrance), `STATIC_BOUNDARY` (real geometry, no runtime-driven animation yet — Luna's two stair doors, honestly disclosed, not claimed as controllable), `MANUAL_REVIEW_REQUIRED` (plan-only knowledge — checked by `validateTransition`, which returns `TRANSITION_REVIEW_REQUIRED` rather than attempting 3D traversal). No imported door is ever assumed animated.

## 10. What is real and browser-proven

The Grand Entrance golden path, BOTH directions, verified twice deterministically and once live in a real headless Chrome session (`verifySpatialTransitionEngineBrowser.mjs`, 9 items): exterior → door click → camera physically travels to a real approach point (proven NOT instantly inside right after the click) → door opens on its own real clearance schedule → camera physically crosses the actual threshold → arrives in the Grand Lobby (canonical selection resolves to `LUNA-GROUND-LOBBY`, confirmed via the Dev Mode selection debug panel) → door closes after a disclosed cosmetic dwell → Exit Building reverses the exact same real transition, back outside, interior context genuinely cleared (not a flag reset while still "inside").

## 11. What is explicitly not done in this pass (disclosed, not hidden)

- **Lift handoff (Parts 12/13) and the lift golden path (Part 27/28) are not wired.** The engine-generic contracts this would need (`SpatialTransition` type `LIFT`, `routePlanning.ts`'s edge-based orchestration) exist and are tested against a hand-built `LIFT`-typed transition shape in principle, but no `requestLiftTransition()` wrapper around the real `DynamicLift`/`lunaSimulationProvider` was built, and no live 3D "camera steps into the car, doors close, travels, doors open, steps out" experience exists yet. This is real, substantial additional work (comparable in scope to the entrance work in this phase) against an already-complex, already-verified lift subsystem that must not be rewritten — a disclosed next-phase item, not a shortcut taken silently.
- **Stairs (Part 14) are named in the vocabulary (`STAIR` type, `NormalizedDoor.animationReadiness: STATIC_BOUNDARY` for Luna's real stair doors) but no stair transition was built or wired to a UI affordance.** No fabricated stair-walking animation was added, per the brief's own explicit instruction.
- **`OPEN_PASSAGE` support is implemented and deterministically tested (the state machine correctly skips actuation) but no live open-passage transition exists in Luna's current architecture to wire it to** — there is no current common-area-to-common-area boundary in the reference building that isn't already free-roam within one open-plan volume.
- **Oyi command wiring (Part 10) was not extended.** "Enter the lobby"/"Take me inside"/"Go outside" still resolve through the existing `sceneActions.navigateToSpace` door-kind branch (a single-target camera fly + select, unchanged from before this phase) rather than the new transition engine. The UI-level click path (the entrance door mesh itself, and the Grand Lobby's own back control) is fully real; the Oyi conversational path to the SAME transition is a disclosed gap.
- **Multi-transition route orchestration (Part 17) and `PAUSED_FOR_USER_INPUT` (Part 18) are implemented and deterministically tested as primitives** (`resolveAccessStep`/`resumeAfterUserInput`, `routePlanning.planRoute`'s multi-step status) **but no host ever chains more than one real transition automatically** — there is currently exactly one wired real transition (the Main Entrance), so there is nothing yet to chain.
- **Facility/Consumer route filtering (Part 25) has a real, required contract point** (`planRoute`'s `isEdgeAllowed` predicate cannot be omitted) **but no concrete Luna-side policy-derived predicate was written and wired into a live route-planning UI** — RepresentationPolicy itself is completely untouched and still governs space-level visibility exactly as before.
- **Generic ENTER/EXIT/REQUEST ACCESS UI affordances (Part 20) were not built as a new, separate UI layer.** The existing "Enter"/back-button affordances were repointed to the real transition where one exists (the Main Entrance); no new generic "is a physical transition available" indicator was added elsewhere.
- **A permanent transition-diagnostics UI (Part 19) was not built.** `TransitionDiagnostics` and `LunaEntranceTransitionDriver`'s `onDiagnostics` callback exist and are wired to be observable, but nothing renders them.
- **Cancellation (Part 32) is supported by the state machine** (`cancelTransition()` is real and tested) **but no UI control was added to actually invoke it mid-flight.**

None of the above were faked to appear complete — every deferred item above has either a real, tested engine primitive with no live wiring, or is disclosed as genuinely not started.

## 12. Test results

| Suite | Result |
|---|---|
| `npm run test:spatial-transition` (19 deterministic checks) | ✅ run twice, stable both times |
| `npm run test:spatial-transition:browser` (9 items, real Chrome, both directions of the golden path) | ✅ passing |
| `npx tsc --noEmit -p .` | ✅ clean |
| `npm run build` (`tsc -b && vite build`) | ✅ clean |
| `npm run lint` | ✅ exit 0, only pre-existing warning classes (plus a real staleness bug in the new driver's `useImperativeHandle` closure, found via lint and fixed with a `ctxRef`) |
| Full existing regression — deterministic (19 suites) | ✅ all PASS after fixing 1 real, disclosed count assertion in `verifyIngestionV2.mjs` (Luna's `commonAreas` legitimately grew from 2 to 3 — the Grand Lobby itself, added so a real door could bind to a real `toSpaceRef`) |
| Full existing regression — browser (18 suites) | ✅ all PASS after fixing 1 real, disclosed timing assumption in `verifyGrandLobbyBrowser.mjs` (the door click no longer teleports after a fixed 900ms; the test now waits for the real, several-second physical transition instead) |

## 13. Known unsupported transition types

`ESCALATOR_FUTURE` and `TURNSTILE_FUTURE` are named in `TransitionType`'s vocabulary so a future ingestion can classify what it found honestly, but no behavior exists for either — attempting to build a transition of either type has no supporting derivation/validation logic and is not claimed to work.

## 14. Next phase (not started here)

Wrap the real `DynamicLift`/`lunaSimulationProvider` behind `requestLiftTransition()` and build the live lift golden path (Parts 12/13/27/28) — the largest remaining piece, and the brief's own explicit "second proof." Wire Oyi's conversational commands to the real transition engine (Part 10) so "Enter the lobby" stops being a separate, single-target camera fly. Build a concrete Facility/Consumer route-filtering predicate and a route-planning UI consumer for `planRoute()`. Extend the crosswalk (`representations.ts`) so the Main Entrance door has a real 2D plan region alongside its 3D representation. Wire a stair door transition and an open-passage transition once a real building has one to wire.

---

**Stop condition met for the scope actually shipped.** No enterable space this phase touched is entered by teleport when a mapped physical transition exists — the Main Entrance, in both directions, is real. No lift subsystem was rewritten. No fake apartment smart lock was created. No second navigation graph or authorization engine was created. No door's animation was fabricated where none was real. The full regression suite in §12 confirms zero unresolved regressions, with two disclosed, legitimate test updates. No production/cloud changes were made.
