# Oyi Spatial Transition Engine V1 — Report

## Success condition

Not "camera flies to a preset." **No enterable space is entered by teleport when a mapped physical transition exists.** Full architecture in `docs/OYI_SPATIAL_TRANSITION_ENGINE_V1.md`; structured facts in `artifacts/oyi-spatial-transition-engine-v1.json`.

## 1. What was audited first (Part 1)

A full read-only pass across the Grand Entrance's existing reference-simulation door state machine, `CameraRig`'s single-segment flight primitive, the dynamic lift system, Access & Security V1's deliberate single-instrumented-lock scope, Building Ingestion V2's navigation graph, and the unwired `resolveTapAction` two-stage primitive — before any code was written. Confirmed, via an explicit grep sweep, that **nothing already constitutes a transition/threshold/crossing engine** — this phase is additive on top of real, proven primitives, never a duplicate.

## 2. Files changed/added

**New (`src/engine/spatial/` — building-agnostic):** `transitions.ts`, `clearance.ts`, `cameraTraversal.ts`, `transitionValidation.ts`, `accessResolution.ts`, `transitionEngine.ts`, `routePlanning.ts`.

**Modified (small, additive, disclosed):** `types.ts` (`NormalizedDoor` gains optional pose/honesty fields), `navigationGraph.ts` (`NavigationEdge.transitionRef`, optional), `CameraRig.tsx` (`onArrive` prop), `SlidingGlassDoor.tsx` (`onProgressChange` prop).

**New (Luna wiring):** `src/luna/transitions/lunaTransitions.ts`, `src/luna/runtime/lunaAccessTransitionResolver.ts`, `src/luna/transitions/LunaEntranceTransitionDriver.tsx`.

**Modified (Luna wiring, disclosed):** `GroundEntrance.tsx` (no longer owns its own timer-based door state machine — fully controlled now), `GrandLobbyArchitecture.tsx`/`LunaLevel.tsx`/`LunaBuilding.tsx` (thread the controlled props down), `App.tsx` (owns the driver ref, wires `CameraRig.onArrive`, repoints the entrance click and the Grand Lobby's back control), `lunaSpatialModel.ts` (Luna's real Main Entrance + 2 stair doors populated as `NormalizedDoor` for the first time; a `NormalizedSite` for the exterior plaza and the Grand Lobby's own `NormalizedCommonArea` added so the transition's endpoints resolve).

**Not touched:** `RepresentationPolicy`, the dynamic lift system's state/geometry, `HingedDoor.tsx`'s kinematics, Luna's apartment interiors, any Building Ingestion V2 derivation function's own logic.

## 3. Real bugs found and fixed during this phase

1. **A real staleness bug in `LunaEntranceTransitionDriver.tsx`'s own `useImperativeHandle`.** With a stable `[]` deps array, the exposed `beginEnter`/`beginExit` closures were reading `ctx` from the FIRST render forever — meaning the "a transition is already in flight" re-entry guard would never actually see an in-flight transition after the first click. Found by `oxlint`'s `exhaustive-deps` warning, not by manual review. Fixed with a `ctxRef` mirror updated via `useEffect`, so the guard always reads the real current phase.
2. **`verifyIngestionV2.mjs`'s `commonAreas.length === 2` assertion**, found during the full regression pass: this phase legitimately added a third common area (the Grand Lobby itself, as its own `NormalizedCommonArea`, so a real door could bind to a real `toSpaceRef`) — the assertion counted the whole array, not an L01-scoped filter. Fixed to assert both the still-unchanged L01-scoped count (2) and the new, correct total (3), with the reasoning disclosed inline.
3. **`verifyGrandLobbyBrowser.mjs`'s door-click timing**, found during the full regression pass: the test assumed the OLD fixed-900ms-then-teleport behavior. This phase's own real, disclosed behavioral change — the door click now begins a genuine multi-second physical transition — meant the old waits were too short. Fixed by widening the waits to match the real transition duration (proven precisely in this phase's own new browser test), with the reasoning disclosed inline; the underlying requirement (door opens, camera ends up inside the real lobby) is unchanged and still asserted.

## 4. What is real today

- A **generic, building-agnostic `SpatialTransition` contract and state machine** (`IDLE → LOCATING_ENTRY → APPROACHING → WAITING_FOR_ACCESS → ACTUATING → WAITING_FOR_CLEARANCE → CROSSING → ARRIVED`, plus `BLOCKED`/`DENIED`/`FAULT`/`PAUSED_FOR_USER_INPUT`), expressed as pure step functions no caller can skip out of order.
- **Real, physically-derived clearance** — `isBoundaryClearForTraversal()` reads a sliding door's own actual leaf progress (via a new `onProgressChange` callback, not a duplicated estimate) or a hinged door's actual swing angle; never a hardcoded wait.
- **Real multi-waypoint camera traversal**, extending `CameraRig`'s existing single-segment flight primitive via a new `onArrive` settle callback — no second camera engine.
- **A real, browser-proven Grand Entrance golden path, both directions** — exterior → door click → camera physically travels to a real approach point (proven not instantly inside) → door opens on a real clearance schedule → camera physically crosses the actual threshold → arrives in the Grand Lobby with canonical selection resolving correctly → door closes after a disclosed cosmetic dwell → Exit Building reverses the same real transition.
- **Access resolution kept as a genuinely separate axis from RepresentationPolicy**, wrapping the EXISTING `resolveAccessAuthorization()` — the Main Entrance honestly reports `NOT_REQUIRED` (Access & Security V1 never instruments it), never a fabricated lock check.
- **Door honesty**: Luna's Main Entrance is `ANIMATABLE` (real leaf, real kinematics); its two stair doors are `STATIC_BOUNDARY` (real geometry, no runtime animation) — never assumed controllable.
- **Route planning that never bypasses policy**: `planRoute()` requires a caller-supplied allow-predicate (not optional) and honestly reports `NOT_PHYSICALLY_TRAVERSABLE` for connectivity with no bound transition, rather than silently teleporting across the gap.
- **A non-Luna proof**: a synthetic building's own real automatic-sliding door walks the identical `validateTransition`/`transitionEngine`/`clearance` pipeline end to end, deterministically verified, with zero Luna-specific code anywhere in the call path.

## 5. What is explicitly not done (disclosed, not hidden)

- Lift handoff and the live lift golden path (Parts 12/13/27/28) — the largest remaining piece, and the brief's own "second proof." The contracts exist; no live 3D lift-transition experience was wired, and the real `DynamicLift`/`lunaSimulationProvider` subsystem was correctly left untouched rather than risked.
- Stairs and open passages have real engine support (tested) but no live UI-wired transition (no stair-door UI affordance yet; no current open-plan boundary in Luna to wire an `OPEN_PASSAGE` to).
- Oyi's conversational commands ("Enter the lobby," "Go outside") still resolve through the pre-existing single-target `navigateToSpace` door branch, unchanged — only the UI click path (door mesh, back control) was repointed to the real transition engine.
- Multi-transition route chaining, a concrete Facility/Consumer route-filtering predicate wired to a live UI, a permanent diagnostics UI, and a mid-flight cancellation control are all real, tested primitives with no live host wiring.

See `docs/OYI_SPATIAL_TRANSITION_ENGINE_V1.md` §11 for the complete, itemized list.

## 6. Test results

| Suite | Result |
|---|---|
| `npm run test:spatial-transition` (19 deterministic checks) | ✅ run twice, stable both times |
| `npm run test:spatial-transition:browser` (9 items, real Chrome, both directions) | ✅ PASS |
| `npx tsc --noEmit -p .` | ✅ clean |
| `npm run build` | ✅ clean |
| `npm run lint` | ✅ exit 0 |
| Full existing regression — deterministic (19 suites: representation, presentation, architecture, lift, four-lift, water, electrical, electrical-live-ops, fire, hvac, access, cctv, network, drainage, ingestion, l06-gold-standard, grand-lobby, ingestion-v2, spatial-transition) | ✅ all PASS after 1 disclosed test-count update |
| Full existing regression — browser (18 suites) | ✅ all PASS after 1 disclosed timing update |

## 7. Screenshots (`artifacts/ste-*.png`)

`ste-exterior`, `ste-select-main-entrance`, `ste-entrance-closed`, `ste-transition-begun`, `ste-approach-settled-door-opening`, `ste-crossed-threshold-arrived`, `ste-door-closed-after-arrival`, `ste-exit-begun`, `ste-exited-outside`.

## 8. Known limitations

- Headless/SwiftShader screenshots render the 3D scene at reduced fidelity — a previously-disclosed testing-harness characteristic, not a rendering defect.
- The browser proof's exit step requires switching to Presentation Mode (Dev Mode has no interior-navigation card to click "back" on) — a genuine, pre-existing UI-surface characteristic, not something this phase changed.
- True visual camera occlusion is not checked by `validateTransition()` — only data-level checks (endpoint resolution, crossing-path/door consistency), matching the same disclosed boundary `cameraDerivation.ts`'s own `validateCameraDestination()` already draws.

## 9. Manual local testing steps

```
cd /Users/ochigaidoko/Oyi-Twin-Engine
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort   # if not already running
```
1. Sidebar → "More options" → "Development Mode."
2. Ask Oyi "the entrance door" → camera approaches, canonical selection resolves to `LUNA-GROUND-ACCESS-MAIN-01`.
3. Click the door mesh at screen-center → watch the camera keep moving (not an instant jump) to a real approach point, the door open on its own schedule once you're there, then the camera cross the actual threshold into the lobby.
4. Switch to Presentation Mode → the Grand Lobby's own interior card is showing → click "‹ Ground" → watch the reverse: approach the inside face, door opens, camera crosses back outside, door closes.

Automated: `npm run test:spatial-transition`, `npm run test:spatial-transition:browser` — both green.

## 10. Next steps (not started here)

Wrap the real lift subsystem behind `requestLiftTransition()` and build the live lift golden path. Wire Oyi's conversational layer to the new engine. Build a concrete Facility/Consumer route-filtering predicate and a route-planning UI. Extend the 2D↔3D crosswalk with a real plan region for the Main Entrance. Wire a stair-door and an open-passage transition once real UI affordances/geometry exist for them.

---

**Stop condition met for the scope actually shipped.** No enterable space this phase touched is entered by teleport when a mapped physical transition exists. No lift subsystem was rewritten. No fake smart lock was created. No second navigation graph or authorization engine was created. No door animation was fabricated where none is real. The full regression suite in §6 confirms zero unresolved regressions, with two disclosed, legitimate test updates. No production/cloud changes were made.
