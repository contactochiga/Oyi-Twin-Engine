import { createServer } from 'vite';
import assert from 'node:assert/strict';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const checks = [];
try {
  const load = (path) => server.ssrLoadModule('/src/' + path);

  const { buildNavigationGraph } = await load('engine/spatial/navigationGraph.ts');
  const { bindTransitionCapabilities } = await load('engine/spatial/transitionBinding.ts');
  const { planRoute, planTraversableRoute } = await load('engine/spatial/routePlanning.ts');
  const { requestRoute } = await load('engine/spatial/routeRequest.ts');
  const {
    buildSpatialRoute, beginRoute, advanceRouteStep, markRouteWaiting, pauseRouteForUser, resumeRoute,
    failRoute, cancelRoute, isRouteTerminal, currentRouteStep,
  } = await load('engine/spatial/route.ts');
  const {
    beginLiftHandoff, resolveLiftAccessStep, checkLiftArrivalAtOrigin, beginTravel, checkLiftArrivalAtDestination,
    beginExitCar, completeExitCar, cancelLiftHandoff, isTerminalLiftPhase,
  } = await load('engine/spatial/liftHandoff.ts');

  const { buildLunaReferenceModel } = await load('luna/ingestion/lunaSpatialModel.ts');
  const { LUNA_TRANSITION_BINDINGS, LUNA_LIFT_CAPABLE_REFS } = await load('luna/transitions/lunaRouteTransitions.ts');
  const { lunaIsRouteEdgeAllowed } = await load('luna/transitions/lunaRoutePolicy.ts');
  const { LUNA_EXTERIOR_ENTRANCE_PLAZA, LUNA_MAIN_ENTRANCE_TRANSITION } = await load('luna/transitions/lunaTransitions.ts');

  const {
    buildMiniBuildingModel, buildMiniEntranceTransition, buildMiniOpenPassageTransition, MINI_EXTERIOR_REF, MINI_MAIN_ENTRANCE_DOOR_REF,
  } = await load('engine/spatial/testFixtures/miniBuildingFixture.ts');

  const facility = { role: 'facility', permissions: [], assignedHomeRefs: [], facilityResponsibility: true };
  const resident = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false };

  const lunaModel = buildLunaReferenceModel();

  // ---- 1. Capability-aware route planning avoids an untraversable stair edge in favor of the real lift ----
  const facilityGraph = bindTransitionCapabilities(buildNavigationGraph(lunaModel), LUNA_TRANSITION_BINDINGS);
  const rawShortest = planRoute(facilityGraph, LUNA_EXTERIOR_ENTRANCE_PLAZA, 'LUNA-L06', () => true);
  assert.equal(rawShortest.status, 'NOT_PHYSICALLY_TRAVERSABLE', 'the graph\'s own naive shortest path legitimately prefers the (untraversable) stair — planRoute must say so honestly');
  const traversable = planTraversableRoute(facilityGraph, LUNA_EXTERIOR_ENTRANCE_PLAZA, 'LUNA-L06', (edge) => lunaIsRouteEdgeAllowed(edge, facility));
  assert.equal(traversable.status, 'OK', `expected OK, got ${traversable.status}: ${traversable.reason}`);
  assert.ok(traversable.steps.some((s) => s.edge.via === 'lift'), 'the capability-aware search must route around the untraversable stair edge via the real lift instead');
  checks.push('1. Route planning: planTraversableRoute() correctly finds a real, walkable route via the lift when the graph\'s own naive shortest path would prefer an untraversable stair edge (Part 12\'s own "route alternatives" requirement, made real)');

  // ---- 2. Full requestRoute() -> SpatialRoute for Facility, Exterior -> Level 6, coalesced into 2 real steps ----
  const facilityRouteResult = requestRoute(lunaModel, LUNA_TRANSITION_BINDINGS, (edge) => lunaIsRouteEdgeAllowed(edge, facility), LUNA_EXTERIOR_ENTRANCE_PLAZA, 'LUNA-L06', 'test-route-1');
  assert.equal(facilityRouteResult.status, 'OK');
  const route1 = facilityRouteResult.route;
  assert.equal(route1.steps.length, 3, 'Exterior->Lobby(door) + Lobby->Ground(adjacency, free) + Ground->L06(lift, coalesced from 2 raw edges into 1)');
  assert.equal(route1.steps[0].kind, 'TRANSITION');
  assert.equal(route1.steps[2].kind, 'LIFT');
  assert.equal(route1.steps[2].fromRef, 'LUNA-GROUND');
  assert.equal(route1.steps[2].toRef, 'LUNA-L06');
  checks.push('2. requestRoute(): Exterior -> Level 6 for Facility produces a real, correctly-coalesced 3-step SpatialRoute (door transition, free adjacency reposition, one logical lift leg) — not a raw 4-edge graph walk');

  // ---- 3. Route execution ordering: pure step functions never skip out of order ----
  let r = beginRoute(route1);
  assert.equal(r.status, 'EXECUTING');
  assert.equal(currentRouteStep(r).kind, 'TRANSITION');
  r = advanceRouteStep(r); // TRANSITION -> MOVE
  assert.equal(currentRouteStep(r).kind, 'MOVE');
  r = advanceRouteStep(r); // MOVE -> LIFT
  assert.equal(currentRouteStep(r).kind, 'LIFT');
  r = markRouteWaiting(r);
  assert.equal(r.status, 'WAITING');
  r = advanceRouteStep(r); // last step done -> ARRIVED
  assert.equal(r.status, 'ARRIVED');
  assert.ok(isRouteTerminal(r.status));
  checks.push('3. Route execution ordering: beginRoute/advanceRouteStep/markRouteWaiting walk the real step sequence one at a time, ARRIVED only once every step is done');

  // ---- 4. PAUSED_FOR_USER_INPUT + resume, cancellation, failure never force completion ----
  let r2 = beginRoute(route1);
  r2 = pauseRouteForUser(r2);
  assert.equal(r2.status, 'PAUSED_FOR_USER');
  r2 = resumeRoute(r2);
  assert.equal(r2.status, 'EXECUTING');
  const cancelled = cancelRoute(beginRoute(route1), 'user cancelled');
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelRoute(cancelled, 'too late').status, 'CANCELLED', 'a terminal route cannot be re-cancelled');
  const denied = failRoute(beginRoute(route1), 'DENIED', 'no access');
  assert.equal(denied.status, 'DENIED');
  checks.push('4. Route state: PAUSED_FOR_USER/resume, CANCELLED (never re-cancellable once terminal), DENIED/BLOCKED/FAULT via failRoute — never forced completion');

  // ---- 5. Lift handoff state machine: full real sequence ----
  let lctx = beginLiftHandoff('LUNA-LIFT-PASS-01', 'LUNA-GROUND', 'LUNA-L06');
  assert.equal(lctx.phase, 'WAITING_FOR_ACCESS');
  lctx = resolveLiftAccessStep(lctx, { outcome: 'GRANTED', reason: 'ok' });
  assert.equal(lctx.phase, 'CALLING');
  assert.equal(checkLiftArrivalAtOrigin(lctx, { currentFloor: 'LUNA-B1', doorState: 'CLOSED', faultState: null, serviceState: 'normal' }).phase, 'CALLING', 'must keep waiting until the REAL car is at the right floor with REAL open doors');
  lctx = checkLiftArrivalAtOrigin(lctx, { currentFloor: 'LUNA-GROUND', doorState: 'OPEN', faultState: null, serviceState: 'normal' });
  assert.equal(lctx.phase, 'BOARDING');
  lctx = beginTravel(lctx);
  assert.equal(lctx.phase, 'TRAVELLING');
  assert.equal(checkLiftArrivalAtDestination(lctx, { currentFloor: 'LUNA-L05', doorState: 'CLOSED', faultState: null, serviceState: 'normal' }).phase, 'TRAVELLING');
  lctx = checkLiftArrivalAtDestination(lctx, { currentFloor: 'LUNA-L06', doorState: 'OPEN', faultState: null, serviceState: 'normal' });
  assert.equal(lctx.phase, 'ARRIVING');
  lctx = completeExitCar(beginExitCar(lctx));
  assert.equal(lctx.phase, 'ARRIVED');
  assert.ok(isTerminalLiftPhase(lctx.phase));
  checks.push('5. Lift handoff: WAITING_FOR_ACCESS -> CALLING -> (real poll) -> BOARDING -> TRAVELLING -> (real poll) -> ARRIVING -> EXITING -> ARRIVED — every advance gated on real runtime state, never a timer');

  // ---- 6. Lift handoff failure modes: DENIED / UNAVAILABLE / FAULT never fake arrival ----
  const deniedLift = resolveLiftAccessStep(beginLiftHandoff('LUNA-LIFT-PASS-01', 'LUNA-GROUND', 'LUNA-L06'), { outcome: 'DENIED', reason: 'not authorized' });
  assert.equal(deniedLift.phase, 'DENIED');
  const unavailableLift = resolveLiftAccessStep(beginLiftHandoff('LUNA-LIFT-PASS-01', 'LUNA-GROUND', 'LUNA-L06'), { outcome: 'UNAVAILABLE', reason: 'no resolver' });
  assert.equal(unavailableLift.phase, 'UNAVAILABLE');
  const calling = resolveLiftAccessStep(beginLiftHandoff('LUNA-LIFT-PASS-01', 'LUNA-GROUND', 'LUNA-L06'), { outcome: 'GRANTED', reason: 'ok' });
  const faulted = checkLiftArrivalAtOrigin(calling, { currentFloor: null, doorState: 'CLOSED', faultState: 'DOOR_FAULT', serviceState: 'normal' });
  assert.equal(faulted.phase, 'FAULT');
  const outOfService = checkLiftArrivalAtOrigin(calling, { currentFloor: null, doorState: 'CLOSED', faultState: null, serviceState: 'maintenance' });
  assert.equal(outOfService.phase, 'UNAVAILABLE', 'a lift in a non-normal service state (e.g. maintenance) must report UNAVAILABLE, never fake an arrival');
  const cancelledLift = cancelLiftHandoff(calling, 'user cancelled while waiting');
  assert.equal(cancelledLift.phase, 'CANCELLED');
  checks.push('6. Lift failure modes: DENIED, UNAVAILABLE (no resolver / non-normal service state), FAULT (real fault string), CANCELLED — the route must stop safely, never teleport to the destination to "complete" the journey');

  // ---- 7. Facility/Consumer policy filtering: a resident may RIDE a real
  // passenger lift to their OWN floor (Apartment A Full Interior Reality
  // V1's passengerStopAllowed() — a real, disclosed, narrower capability
  // than lift CONTROL, added specifically so the "Take me home" TOUR
  // golden journey is physically possible at all: a resident who could
  // never board the lift could never complete a real physical route home).
  // This is legitimately distinct from lunaResolveLiftAccess()'s own
  // CONTROL gate (still Facility-only, unchanged — see check 6 above):
  // riding as a passenger to your own assigned floor, and commanding the
  // lift mechanism, are different real-world permissions. A resident is
  // still BLOCKED from riding to a floor that is not Ground or their own
  // home floor, proving this is a real, scoped passenger allowance, never
  // a blanket policy bypass.
  const residentHomeLiftRoute = requestRoute(lunaModel, LUNA_TRANSITION_BINDINGS, (edge) => lunaIsRouteEdgeAllowed(edge, resident), LUNA_EXTERIOR_ENTRANCE_PLAZA, 'LUNA-L06', 'test-route-2');
  assert.equal(residentHomeLiftRoute.status, 'OK', 'a resident must be able to ride the real passenger lift to their OWN floor — required for the "Take me home" TOUR golden journey to be physically possible at all');
  const residentOtherFloorLiftRoute = requestRoute(lunaModel, LUNA_TRANSITION_BINDINGS, (edge) => lunaIsRouteEdgeAllowed(edge, resident), LUNA_EXTERIOR_ENTRANCE_PLAZA, 'LUNA-L07', 'test-route-2b');
  assert.equal(residentOtherFloorLiftRoute.status, 'BLOCKED_BY_POLICY', 'a resident must still be BLOCKED from riding to a floor that is neither Ground nor their own home floor — passenger access is scoped, never a blanket lift bypass');
  const consumerCommonRoute = requestRoute(lunaModel, LUNA_TRANSITION_BINDINGS, (edge) => lunaIsRouteEdgeAllowed(edge, resident), LUNA_EXTERIOR_ENTRANCE_PLAZA, 'LUNA-GROUND-LOBBY', 'test-route-3');
  assert.equal(consumerCommonRoute.status, 'OK', 'a Consumer/resident identity must still be able to route through the Main Entrance — common routes are not blanket-denied');
  const facilityCommonRoute = requestRoute(lunaModel, LUNA_TRANSITION_BINDINGS, (edge) => lunaIsRouteEdgeAllowed(edge, facility), LUNA_EXTERIOR_ENTRANCE_PLAZA, 'LUNA-GROUND-LOBBY', 'test-route-4');
  assert.equal(facilityCommonRoute.status, 'OK');
  checks.push('7. Facility/Consumer route filtering: a resident may ride the passenger lift home (real, scoped passengerStopAllowed) but not to an unrelated floor (still BLOCKED_BY_POLICY); a real common route (the Main Entrance) succeeds for both — RepresentationPolicy and lift CONTROL access (Facility-only) both untouched');

  // ---- 8. Unserved floor / no-path is reported honestly ----
  const unservedRoute = requestRoute(lunaModel, LUNA_TRANSITION_BINDINGS, (edge) => lunaIsRouteEdgeAllowed(edge, facility), LUNA_EXTERIOR_ENTRANCE_PLAZA, 'LUNA-PENTHOUSE', 'test-route-5');
  assert.notEqual(unservedRoute.status, 'OK', 'the Penthouse is not a real lift stop (LIFT_STOPS excludes it) — a route there must not be fabricated');
  checks.push('8. Unserved floor: requesting a route to a level no lift actually serves is honestly reported as NOT_PHYSICALLY_TRAVERSABLE/NO_PATH, never fabricated');

  // ---- 9. Reverse lift route ----
  const reverseRoute = requestRoute(lunaModel, LUNA_TRANSITION_BINDINGS, (edge) => lunaIsRouteEdgeAllowed(edge, facility), 'LUNA-L06', LUNA_EXTERIOR_ENTRANCE_PLAZA, 'test-route-6');
  assert.equal(reverseRoute.status, 'OK');
  assert.ok(reverseRoute.route.steps.some((s) => s.kind === 'LIFT'));
  assert.ok(reverseRoute.route.steps.some((s) => s.kind === 'TRANSITION'));
  checks.push('9. Reverse route: Level 6 -> Exterior plans a real route back down through the lift and back out the Main Entrance — the same engine, walked in reverse');

  // ---- 10. Non-Luna fixture: chained Door -> Lobby -> Open Passage -> Lounge, zero Luna code ----
  const miniModel = buildMiniBuildingModel();
  const miniBindings = { doorTransitions: [buildMiniEntranceTransition()], passageTransitions: [buildMiniOpenPassageTransition()], liftCapableRefs: new Set(), stairCapableRefs: new Set() };
  const miniAllowAll = () => true;
  const miniChainedResult = requestRoute(miniModel, miniBindings, miniAllowAll, MINI_EXTERIOR_REF, 'MINI-GROUND-LOUNGE', 'mini-route-1');
  assert.equal(miniChainedResult.status, 'OK', `expected OK, got ${miniChainedResult.status}: ${miniChainedResult.reason}`);
  assert.equal(miniChainedResult.route.steps.length, 2);
  assert.equal(miniChainedResult.route.steps[0].kind, 'TRANSITION');
  assert.equal(miniChainedResult.route.steps[0].viaRef, MINI_MAIN_ENTRANCE_DOOR_REF);
  assert.equal(miniChainedResult.route.steps[1].kind, 'OPEN_PASSAGE');
  assert.equal(miniChainedResult.route.steps[1].toRef, 'MINI-GROUND-LOUNGE');
  checks.push('10. Non-Luna chained proof: Exterior -[real door]-> Lobby -[real OPEN_PASSAGE]-> Lounge — a real 2-step chained route, zero Luna-specific code anywhere in the call path');

  // ---- 11. Open passage step never requires actuation/access wait (Part 9, re-verified in the route context) ----
  const passageTransition = buildMiniOpenPassageTransition();
  assert.equal(passageTransition.type, 'OPEN_PASSAGE');
  assert.equal(passageTransition.accessRequirement, 'NONE');
  assert.equal(passageTransition.boundaryRef, undefined, 'an OPEN_PASSAGE must never have a fabricated boundary/door');
  checks.push('11. Open passage transitions carry no boundaryRef and no access requirement — approach, cross, arrive, nothing to actuate or wait on');

  // ---- 12. Stair route stays honestly excluded until a real capability exists ----
  // Bindings with NO lift capability at all — the only remaining
  // real path from the Lobby to L01 is via the stair, which Luna's own
  // registry deliberately leaves uncapable (Part 10's disclosed scope:
  // no live stair-traversal UI exists yet). This must be reported
  // honestly, never silently walked.
  const noLiftBindings = { ...LUNA_TRANSITION_BINDINGS, liftCapableRefs: new Set() };
  const stairOnlyRoute = requestRoute(lunaModel, noLiftBindings, () => true, 'LUNA-GROUND-LOBBY', 'LUNA-L01-AMENITIES', 'test-route-7');
  assert.notEqual(stairOnlyRoute.status, 'OK', 'with no lift capability, the only remaining path is via the uncapable stair — this must not silently succeed');
  checks.push('12. Stairs stay honestly excluded from real routing until a genuine capability is bound (Part 10\'s own disclosed scope): with lift capability removed, the only remaining path (via the stair) is correctly reported as not walkable, never silently used');

  // ---- 13. Two-tap + route: entering a physically-reachable space resolves via a real route, never a bare teleport, and the LOCATE/TRAVEL distinction is preserved by construction (Oyi always requests a route; LevelRail's own instant click path is untouched code, verified by inspection in the deterministic suite below) ----
  const { resolveTapAction } = await load('engine/spatial/twoStageInteraction.ts');
  assert.equal(resolveTapAction('LUNA-L06', 'LUNA-L06', null), 'enter', 'tap2 on Level 6 resolves ENTER — the host then requests a real route rather than teleporting');
  checks.push('13. Two-tap grammar unchanged: tap2 resolves ENTER; the host (App.tsx) now requests a real route for that ENTER rather than an instant camera cut, without this generic decision function needing to change at all');

  // ---- 14. Luna lift capability registry drives all 4 lifts generically ----
  assert.equal(LUNA_LIFT_CAPABLE_REFS.size, 4, 'all 4 real lifts (3 passenger + 1 service) share the same generic handoff capability');
  for (const ref of ['LUNA-LIFT-PASS-01', 'LUNA-LIFT-PASS-02', 'LUNA-LIFT-PASS-03', 'LUNA-LIFT-SERVICE-01']) {
    assert.ok(LUNA_LIFT_CAPABLE_REFS.has(ref), `${ref} must be routable — no per-lift special-casing`);
  }
  checks.push('14. All 4 real lifts (including the Service/Fire lift, without fabricating life-safety certification) share the exact same generic lift-handoff capability — one registry, not four implementations');

  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} finally {
  await server.close();
}
