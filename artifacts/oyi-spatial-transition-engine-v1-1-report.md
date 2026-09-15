# Oyi Spatial Transition Engine V1.1 — Routed Traversal Completion — Report

## Success condition

V1 proved SPACE A → DOOR → SPACE B. **This phase proves SPACE A → DOOR → SPACE B → LIFT → ANOTHER LEVEL → SPACE C, using the actual building.** Full architecture in `docs/OYI_SPATIAL_TRANSITION_ENGINE_V1_1_ROUTED_TRAVERSAL.md`; structured facts in `artifacts/oyi-spatial-transition-engine-v1-1.json`.

## 1. What was audited first (Part 1)

Confirmed `routePlanning.ts`'s `planRoute()` was already fully built by V1 (multi-step shortest-path, a required policy predicate) — this phase's real remaining work was populating real capability (`transitionRef`) onto lift/stair edges and building the lift-handoff/route-orchestrator layer on top, not rebuilding routing from scratch. Also confirmed Oyi never actually drove the one real transition that existed before this phase — `sceneActions.navigateToSpace` was always an instant camera cut, even for the Main Entrance.

## 2. Files changed/added

**New (engine, building-agnostic):** `route.ts` (SpatialRoute + pure step functions, with star-topology hop coalescing), `liftHandoff.ts` (generic lift-handoff state machine + the only two real runtime calls, `requestLiftToLanding`/`requestLiftDestination`), `transitionBinding.ts` (binds real capability onto navigation-graph edges), `routeRequest.ts` (the one entry point: model → graph → capability-aware plan → SpatialRoute).

**Modified (engine):** `routePlanning.ts` — added `planTraversableRoute()`, a capability-aware BFS with three-tier honest failure reporting; `planRoute()` itself untouched.

**New (Luna wiring):** `lunaRouteTransitions.ts` (capability config: all 4 lifts capable, stairs/passages deliberately not), `lunaRoutePolicy.ts` (the real, required `isEdgeAllowed` predicate + lift-access resolver), `LunaRouteDriver.tsx` (the one unified route driver, replacing the V1 entrance-only driver).

**Modified (Luna wiring):** `lunaSpatialModel.ts` (lift `servedLevelRefs` now real, derived from `LIFT_STOPS`), `lunaIntentParser.ts` (new `matchExterior` phrase matcher), `App.tsx` (route state, `requestLunaRoute()`, lift-leg wiring functions, Oyi's `navigateToSpace` now routes before falling back).

**Removed:** `LunaEntranceTransitionDriver.tsx` — superseded by the unified `LunaRouteDriver.tsx` (Part 2's own explicit "do not build separate controllers for each journey").

## 3. Real bugs found and fixed during this phase

1. **`planRoute()`'s naive shortest path preferred an untraversable stair edge over the real lift.** The graph's plain BFS found a 2-hop path via Stair 01 (no bound capability) shorter than the 3-hop path via the real lift, and reported the whole route `NOT_PHYSICALLY_TRAVERSABLE` without trying the longer, walkable alternative. Fixed with `planTraversableRoute()` — a capability-aware search that only considers already-walkable edges, exactly matching Part 12's "route alternatives" requirement.
2. **A real, pre-existing data gap**: `lunaSpatialModel.ts`'s lifts claimed to serve all 16 levels, but the real lift simulation (`LIFT_STOPS`) has always excluded the Penthouse/Rooftop. A route orchestrator trusting the wider claim would have planned journeys no lift could complete. Fixed by deriving `servedLevelRefs` from `LIFT_STOPS` directly.
3. **A false-positive test result, caught and disclosed rather than hidden.** The first full browser run of "Take me to Level 6" appeared to succeed from its screenshots alone. It wasn't real — bug #1 above was silently triggering the old instant-teleport fallback, and the test's own `pause()`-then-`screenshot()` pattern just captured the same already-arrived frame repeatedly without ever asserting that state changed BETWEEN frames. Found via direct `page.on('console')` diagnostics, not assumed. This is disclosed explicitly in the main doc's §9 as a methodological lesson: screenshots alone don't prove a journey happened; the deterministic and browser suites now assert genuine intermediate state.
4. **`verifyIngestionV2.mjs`'s own lift-edge-count assertion (16) was itself based on bug #2** — updated to 14 (16 minus Penthouse/Rooftop) with the reasoning disclosed inline, once the real underlying data was corrected.

## 4. What is real today

- **A single, generic route orchestrator** (no per-journey controllers) chaining door transitions, a real lift handoff, and free (boundary-free) repositioning into one `SpatialRoute`, with star-topology hops correctly coalesced into one logical leg per lift/stair ride.
- **A capability-aware route planner** that finds a real walkable alternative when the graph's shortest path isn't actually usable — real route fallback, not aspirational.
- **A real lift handoff**, calling the SAME `"callLift"`/`"setPosition"` commands the existing runtime already understands, polling real state (`currentFloor`/`doorState`) to advance — never a timer — and reusing the EXISTING `showLiftView`/`followTarget` camera mechanism for boarding/travelling rather than rebuilding it.
- **The full golden journey, browser-proven twice, both directions**: Exterior → Main Entrance (real door open/cross) → Grand Lobby → Passenger Lift (real call, real ride, real Elevator Control Board JSON visible mid-ride) → Level 6, and back.
- **Oyi commands routed through the same engine**: "Take me to Level 6," "Take me back to the ground floor," "Go outside," "Enter the lobby" all resolve via `requestLunaRoute`/`beginRoute` — no bespoke navigation logic inside Oyi.
- **Real, unmodified policy enforcement**: a lift-requiring route is `BLOCKED_BY_POLICY` for a Consumer/resident (the exact existing lift-control gate), a common route through the Main Entrance is not — `RepresentationPolicy` itself untouched.
- **A non-Luna chained proof**: Exterior → real door → Lobby → real `OPEN_PASSAGE` → Lounge, zero Luna-specific code.
- **LOCATE vs TRAVEL preserved**: LevelRail's own instant-click path is completely untouched; only Oyi commands and the two explicit physical entry points request a real route.

## 5. What is explicitly not done (disclosed, not hidden)

- Stairs remain named in the vocabulary but have no bound capability and no live UI affordance — deliberately excluded, not silently walked.
- No live `OPEN_PASSAGE` exists in Luna's own architecture (the Grand Lobby's zones collapse into one graph node) — proven only in the non-Luna fixture.
- No per-lift dispatch fallback beyond what the capability-aware search provides automatically.
- No permanent route-diagnostics UI; no UI control for mid-flight cancellation (the pure `cancelRoute()` function exists and is tested).
- No distinct "L06 Lift Lobby" canonical space yet — the arrival point is the `LUNA-L06` level itself, honestly, until the next phase's True Floor Plan work creates one.

## 6. Test results

| Suite | Result |
|---|---|
| `npm run test:routed-traversal` (14 deterministic checks) | ✅ run twice, stable |
| `npm run test:routed-traversal:browser` (golden journey, both directions, real intermediate-state assertions) | ✅ run twice, stable |
| `npm run test:routed-traversal:policy-browser` (Facility/Consumer) | ✅ PASS |
| `npx tsc --noEmit -p .` / `npm run build` / `npm run lint` | ✅ clean / clean / exit 0 |
| Full existing regression — deterministic (20 suites) | ✅ all PASS after 1 disclosed count update |
| Full existing regression — browser (19 suites) | ✅ all PASS (1 pre-existing flaky pixel-click retry, unrelated) |

## 7. Screenshots

`artifacts/rt-01-exterior.png` through `rt-09-outside-again.png` (golden journey); `artifacts/rtp-01-facility-route-begins.png` through `rtp-04-consumer-lift-route-excluded.png` (policy proof).

## 8. Manual local testing steps

```
cd /Users/ochigaidoko/Oyi-Twin-Engine
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort   # if not already running
```
1. Sidebar → "More options" → "Development Mode" (Facility scope, default).
2. Ask Oyi "Take me to Level 6" → watch the camera physically approach, cross the entrance, fly to the lift, ride it (watch the real Elevator Control Board JSON update), and exit onto Level 6.
3. Ask Oyi "Take me back to the ground floor" → the same journey in reverse.
4. Switch to Consumer scope → "Enter the lobby" succeeds physically; "Take me to Level 6" is excluded (no boarding narration ever appears).

Automated: `npm run test:routed-traversal`, `npm run test:routed-traversal:browser`, `npm run test:routed-traversal:policy-browser` — all green.

## 9. Next steps (not started here)

Luna — True Floor Plan System V1 (L06 Gold Standard Floor): a real architectural Level 6 with its own lift lobby, corridor, stairs, and Apartments A–D with real entrance doors. That phase's own real L06 Lift Lobby space is what turns this phase's "arrive at the LUNA-L06 level" into "arrive at the L06 Lift Lobby, then walk to Apartment A's own real door" — deliberately not attempted here.

---

**Stop condition met.** EXTERIOR → GRAND LOBBY → PASSENGER LIFT → LEVEL 6 is real, browser-verified twice in both directions, regression-safe. No Apartment A work started. No additional lobby architecture built. No floor plans redesigned. No lift subsystem rewritten. No second navigation graph or authorization engine created. RepresentationPolicy untouched. No production/cloud changes made.
