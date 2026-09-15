# Oyi Spatial Transition Engine V1.1 — Routed Traversal Completion

## Success condition

V1 proved: SPACE A → DOOR → SPACE B. **V1.1 proves: SPACE A → DOOR → SPACE B → LIFT → ANOTHER LEVEL → SPACE C, using the actual building.** A user can say "Take me to Level 6" and Oyi responds by physically walking to the entrance, opening the door, entering the lobby, calling the real lift, riding it, and exiting on Level 6 — never a direct camera cut.

## 1. What was audited first (Part 1)

A full audit of the four-lift dynamic system, `App.tsx`'s lift-view/camera state, `LiftLevelRail`, Building Ingestion V2's navigation graph and `routePlanning.ts` (already fully built by V1 — `planRoute()`, `RouteStep`, `RoutePlanResult`, a **required** policy predicate), the Oyi intent pipeline, RepresentationPolicy, and the current state of open passages/stairs. Two findings shaped everything that followed:

- **Oyi never actually drove the one real transition that existed.** `sceneActions.navigateToSpace`/`navigateToAsset` were always an instant `setFlightTarget`, even for the Main Entrance door — the only place `LunaEntranceTransitionDriver` was ever invoked was a direct 3D mesh click. Closing this gap was the core of Part 13.
- **`routePlanning.ts`'s `planRoute()` was more complete than expected** (multi-step shortest-path routing, a required `isEdgeAllowed` predicate, a distinct `NOT_PHYSICALLY_TRAVERSABLE` status) — but its own shortest-path search doesn't consider walkability *while* searching, only after. This turned out to be a real, load-bearing gap once more than one graph edge had a `transitionRef` (see §4).

## 2. The route orchestrator (Part 2)

One generic orchestrator, not one controller per journey:

- `src/engine/spatial/route.ts` — `SpatialRoute`, `SpatialRouteStep` (`MOVE | TRANSITION | LIFT | STAIR | OPEN_PASSAGE | WAIT_FOR_USER | ARRIVE`), `RouteStatus`, and pure step functions (`buildSpatialRoute`, `beginRoute`, `advanceRouteStep`, `markRouteWaiting`, `pauseRouteForUser`, `resumeRoute`, `failRoute`, `cancelRoute`, `isRouteTerminal`) — the same "pure decision, host owns effects" discipline as V1's `transitionEngine.ts`.
- `buildSpatialRoute()` **coalesces star-topology hops**: a lift/stair produces two raw graph edges (landing → node, node → destination) that a rider experiences as ONE logical leg — coalesced into a single `LIFT`/`STAIR` step rather than exposing the graph's own internal node as a spurious intermediate arrival.
- `src/engine/spatial/liftHandoff.ts` — the generic lift-handoff contract: `LiftHandoffPhase` (`WAITING_FOR_ACCESS → CALLING → BOARDING → TRAVELLING → ARRIVING → EXITING → ARRIVED`, plus `DENIED/UNAVAILABLE/FAULT/CANCELLED`), `LiftRuntimeSnapshot` (a minimal generic shape Luna's real `LiftState` already structurally satisfies), and `requestLiftToLanding()`/`requestLiftDestination()` — which call the EXISTING `"callLift"`/`"setPosition"` `CommandName` values, never a second lift command surface.
- `src/luna/transitions/LunaRouteDriver.tsx` — **one** React driver replacing V1's entrance-only driver, dispatching by step kind to the shared pure functions above. A single-step "walk through the Main Entrance" journey and a multi-step "Exterior to Level 6 via the lift" journey run through the identical component.

## 3. Multi-transition chaining (Part 3) — a real bug found and fixed

The first attempt at "Take me to Level 6" silently teleported. The real cause: `planRoute()`'s naive shortest-path search found `Lobby → Stair 01 (door) → L06 (stair)` — two hops — shorter than the real lift path — three hops — and reported it `NOT_PHYSICALLY_TRAVERSABLE` (correctly: Luna's stairs have no bound transition), **without trying the longer, actually-walkable lift path**. This is exactly the gap Part 12 ("route alternatives") describes.

Fixed with a new function, **`planTraversableRoute()`** (`routePlanning.ts`), which searches using ONLY edges that are already both permitted and physically walkable — so it naturally routes around an untraversable stair edge toward the real lift, the same way a person would. When no walkable path exists, it reports honestly across three tiers: `BLOCKED_BY_POLICY` (a walkable path exists but this identity isn't permitted on it), `NOT_PHYSICALLY_TRAVERSABLE` (connectivity exists but nothing anywhere along it has a real capability bound), `NO_PATH` (no connectivity at all). `routeRequest.ts` (V1.1's own single entry point tying `buildNavigationGraph` → `bindTransitionCapabilities` → `planTraversableRoute` → `buildSpatialRoute`) uses this new function; `planRoute()` itself is untouched and still used by V1's own tests unmodified.

A second real, pre-existing bug surfaced by the same investigation: `lunaSpatialModel.ts`'s lifts claimed `servedLevelRefs: ALL_LEVEL_REFS` (all 16 levels) — but the REAL lift simulation (`liftSimulation.ts`'s `LIFT_STOPS`) has always excluded the Penthouse/Rooftop. Fixed by deriving `servedLevelRefs` from `LIFT_STOPS` directly, so the normalized model can never claim a lift reaches a floor it actually can't.

## 4. Lift handoff (Parts 4–8) — the main proof

`requestLiftToLanding()`/`requestLiftDestination()` are the ONLY two calls into the real runtime, reusing `"callLift"`/`"setPosition"` verbatim. The driver:
1. Resolves access (`lunaResolveLiftAccess()` — mirrors the EXACT rejection message `lunaSimulationProvider.execute()` already gives a non-Facility identity).
2. Flies the camera to the real landing (`liftCamera("lobby", ...)`, already-existing function).
3. Calls the lift, then **polls the real runtime state** (`currentFloor === fromLevelRef && doorState === "OPEN"`) — never a timer.
4. Steps into the car by calling the EXISTING `showLiftView(ref, "interior")` — reusing App.tsx's own precondition-gated function and its own `followTarget` camera-follow mechanism verbatim; the car's real motion is never re-simulated.
5. Polls for real arrival at the destination the same way, then exits via a new `onExitLiftCar()` that deliberately bypasses `endLiftView()`'s "restore the pre-lift camera" behavior (a routed exit continues the journey, it doesn't undo it).

All 4 real lifts (3 passenger + the Service/Fire lift) share this ONE capability (`LUNA_LIFT_CAPABLE_REFS`, Part 8) — no per-lift implementation, and no life-safety certification is claimed for the Service/Fire lift beyond being routable.

**Browser-proven, twice, with genuine intermediate state** (not just a final screenshot — see §9's own account of a false-positive this phase caught and fixed): camera physically approaches the entrance, the door opens on a real clearance schedule, camera crosses the threshold into the Grand Lobby, flies to the lift landing, the Elevator Control Board shows real live JSON (`door: "closing"`, real per-floor `landingDoors`), camera steps into the car, travels, steps out, and canonical selection resolves to `LUNA-L06`.

## 5. Current-space semantics (Part 17)

`currentSpaceRef` (new `App.tsx` state, starts at the real exterior plaza ref) updates ONLY when `LunaRouteDriver` reports a step's real completion (`onCurrentSpaceChange`) — never optimistically, never before the user has actually exited the lift. This is what makes `requestLunaRoute()` correctly plan the NEXT journey from wherever the user really is, not from a stale/asserted position.

## 6. Policy-aware route filtering (Parts 11/25/26)

`lunaIsRouteEdgeAllowed()` (`lunaRoutePolicy.ts`) is the required `isEdgeAllowed` predicate: the exterior plaza is never restricted; a `"lift"` edge is only walkable when `RepresentationPolicy.resolveMode(liftRef) === "FULL_3D"` — the EXACT same gate `execute()` already enforces (currently Facility-only); every other edge is walkable unless `RepresentationPolicy` already hides the destination. **RepresentationPolicy itself was never modified.**

Browser-proven: Facility completes the full lift journey; a Consumer/resident identity completes a real physical route through the Main Entrance ("Enter the lobby" — approach, door opens, threshold crossed) but a lift-requiring route is excluded before any boarding/travelling narration ever appears — never a fabricated ride.

## 7. Oyi command wiring (Parts 10/13/14)

`sceneActions.navigateToSpace` now attempts a real route FIRST for any level/interior destination (and a new `matchExterior` phrase for "go outside"/"exterior"), falling back to the pre-existing instant camera behavior only when `requestLunaRoute()` genuinely can't produce one (`NO_PATH`/`NOT_PHYSICALLY_TRAVERSABLE`/`BLOCKED_BY_POLICY`). Oyi contains no bespoke navigation logic — it resolves language to a canonical ref exactly as before, then calls the same `requestLunaRoute`/`beginRoute` any other entry point uses. A lightweight narration pill ("Approaching the entrance.", "Waiting for the lift.", "Travelling.", "Arrived — stepping out.") reflects the route's real current phase — not a verbose narration engine.

## 8. LOCATE vs TRAVEL preserved (Parts 18–20)

LevelRail's own direct-click path (`isolateLevelAndFly`) is completely untouched — a LevelRail click is still an instant presentational LOCATE. Only Oyi's own "take me to X" commands and the two explicit physical entry points (the entrance door mesh, the Grand Lobby's own back control) request a real route. Two-tap's own decision function (`resolveTapAction`) needed no changes at all — tap2 still resolves `"enter"`; the HOST now responds to that `"enter"` by requesting a route instead of teleporting.

## 9. A false positive this phase caught and fixed (disclosed)

The first full browser run of "Take me to Level 6" appeared to succeed — screenshots showed intermediate lift-lobby framing and a final `LUNA-L06` selection. It was **not real**: a direct diagnostic (`page.on('console')` + a temporary debug log) proved `requestLunaRoute()` was failing immediately (`NOT_PHYSICALLY_TRAVERSABLE`, via the untraversable stair edge described in §3) and silently falling back to the old instant teleport — and the test script's own `pause()`-then-`screenshot()` calls had simply captured the same already-arrived frame repeatedly, never actually verifying an intermediate state changed. This is disclosed here explicitly: **a screenshot sequence proves nothing on its own without an assertion that state genuinely changed between frames** — the fix in §3, plus the deterministic and browser suites in §11, now actually verify the intermediate states (canonical selection at the lift car during travel, real Elevator Control Board JSON, a route status that is provably NOT yet `ARRIVED` immediately after the command).

## 10. What is explicitly not done in this pass (disclosed, not hidden)

- **Stairs remain named and honestly excluded** (`LUNA_STAIR_CAPABLE_REFS` is an empty set, deliberately) — no live UI affordance triggers a multi-level stair journey; Luna's stair doors are still `STATIC_BOUNDARY`, no runtime leaf animation.
- **No live OPEN_PASSAGE exists in Luna's own architecture** (confirmed by audit: the Grand Lobby's three zones collapse into one graph node) — `OPEN_PASSAGE` is real and generically tested, proven end-to-end only in the non-Luna fixture (Door → Lobby → Open Passage → Lounge).
- **Route fallback (Part 12) is the capability-aware search itself** (`planTraversableRoute` naturally finds an alternate walkable path when the shortest one is blocked) — no per-lift dispatch logic (e.g., "if Lift 02 specifically is broken, try Lift 01") was built beyond what that search already provides for free.
- **A permanent transition/route diagnostics UI (Part 19) was not built** — the narration pill (§7) is the only user-facing status surface; no debug panel exists.
- **Mid-flight cancellation (Part 15) has a real, tested pure function** (`cancelRoute`) but no UI control invokes it yet.
- **L06's "Lift Lobby" as its own canonical common-area object does not exist** — the arrival point for a lift journey to Level 6 is the level itself (`LUNA-L06`), using the real `liftCamera("lobby", ...)` shot. A distinct L06 Lift Lobby space is explicitly the next phase's own stated deliverable.

## 11. Test results

| Suite | Result |
|---|---|
| `npm run test:routed-traversal` (14 deterministic checks) | ✅ run twice, stable both times |
| `npm run test:routed-traversal:browser` (golden journey, both directions) | ✅ run twice, stable both times, with genuine intermediate-state verification (not just a final screenshot) |
| `npm run test:routed-traversal:policy-browser` (Facility/Consumer) | ✅ passing |
| `npx tsc --noEmit -p .` | ✅ clean |
| `npm run build` | ✅ clean |
| `npm run lint` | ✅ exit 0 |
| Full existing regression — deterministic (20 suites) | ✅ all PASS after 1 disclosed count update (`verifyIngestionV2.mjs`'s lift-edge count, 16 → 14, reflecting the real `servedLevelRefs` fix in §3) |
| Full existing regression — browser (19 suites) | ✅ all PASS (one pre-existing pixel-perfect-click test flaked once on a narrow door hit-target, passed cleanly on immediate retry — unrelated to this phase's changes, a known class of headless/SwiftShader timing sensitivity already disclosed in prior phases) |

## 12. Screenshots (`artifacts/rt-*.png`, `artifacts/rtp-*.png`)

`rt-01-exterior` through `rt-09-outside-again` (forward + reverse golden journey); `rtp-01-facility-route-begins` through `rtp-04-consumer-lift-route-excluded` (policy proof).

## 13. Next phase (not started here)

**Luna — True Floor Plan System V1 (L06 Gold Standard Floor)**: a real architectural Level 6 (lift lobby, common corridor, stairs, risers, service circulation, Apartments A–D with real entrance doors, canonical 2D plan matching a real 3D floor). Once that exists, this phase's own lift-arrival point can become a real "L06 Lift Lobby" space instead of the level itself, and Part 18's multi-transition example ("Exterior → Lobby → Lift → L06 → L06 Lift Lobby → Apartment A") becomes literally completable — this phase deliberately stops at "exit into L06" per its own explicit stop condition.

---

**Stop condition met.** The journey EXTERIOR → GRAND LOBBY → PASSENGER LIFT → LEVEL 6 is real, browser-verified twice in both directions, and regression-safe. No Apartment A work was started. No additional lobby architecture was built. No floor plans were redesigned. No additional systems were created. No lift subsystem was rewritten — every real motion is still owned by the pre-existing, unmodified lift provider. No second navigation graph or authorization engine was created. RepresentationPolicy was not modified. No production/cloud changes were made.
