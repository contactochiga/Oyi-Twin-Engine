import { createServer } from 'vite';
import assert from 'node:assert/strict';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const checks = [];
try {
  const load = (path) => server.ssrLoadModule('/src/' + path);

  const {
    isBoundaryClearForTraversal, slidingBoundaryState, hingedBoundaryState, OPEN_BOUNDARY_STATE, STANDARD_TRAVERSAL_PROFILE,
  } = await load('engine/spatial/clearance.ts');
  const { buildTraversalWaypoints } = await load('engine/spatial/cameraTraversal.ts');
  const { validateTransition } = await load('engine/spatial/transitionValidation.ts');
  const { resolveTransitionAccess } = await load('engine/spatial/accessResolution.ts');
  const {
    beginTransition, beginApproach, arriveAtApproachPoint, resolveAccessStep, resumeAfterUserInput,
    checkClearance, advanceCrossing, cancelTransition, faultTransition, isTerminalPhase,
  } = await load('engine/spatial/transitionEngine.ts');
  const { buildNavigationGraph } = await load('engine/spatial/navigationGraph.ts');
  const { planRoute } = await load('engine/spatial/routePlanning.ts');
  const { resolveTapAction } = await load('engine/spatial/twoStageInteraction.ts');

  const { LUNA_MAIN_ENTRANCE_TRANSITION, LUNA_MAIN_ENTRANCE_TRANSITION_REVERSE, LUNA_EXTERIOR_ENTRANCE_PLAZA } = await load('luna/transitions/lunaTransitions.ts');
  const { lunaAccessTransitionResolver } = await load('luna/runtime/lunaAccessTransitionResolver.ts');
  const { buildLunaReferenceModel } = await load('luna/ingestion/lunaSpatialModel.ts');
  const { GROUND_ENTRANCE_REF } = await load('luna/architecture/GroundEntrance.tsx');
  const {
    buildMiniBuildingModel, buildMiniEntranceTransition, MINI_EXTERIOR_REF, MINI_MAIN_ENTRANCE_DOOR_REF,
  } = await load('engine/spatial/testFixtures/miniBuildingFixture.ts');
  const { isAccessGovernedRef, resolveAccessAuthorization } = await load('luna/runtime/lunaAccessResolver.ts');

  const lunaModel = buildLunaReferenceModel();
  const miniModel = buildMiniBuildingModel();

  // ---- 1. SpatialTransition contract shape (real Grand Entrance data) ----
  assert.equal(LUNA_MAIN_ENTRANCE_TRANSITION.type, 'AUTOMATIC_DOOR');
  assert.equal(LUNA_MAIN_ENTRANCE_TRANSITION.boundaryRef, GROUND_ENTRANCE_REF, 'the transition must bind to the REAL Grand Entrance canonical ref, not an invented one');
  assert.ok(LUNA_MAIN_ENTRANCE_TRANSITION.crossingPath.length >= 2, 'a real transition must have at least an approach and an arrival waypoint');
  assert.ok(LUNA_MAIN_ENTRANCE_TRANSITION.clearanceRule.requiredClearWidthMeters > 0, 'clearance requirement must be a real positive value, never zero/omitted');
  assert.equal(LUNA_MAIN_ENTRANCE_TRANSITION.accessRequirement, 'NONE', 'the Main Entrance is not Access & Security-governed in this reference build — this must be disclosed, not silently upgraded');
  checks.push('1. SpatialTransition contract: the real Grand Entrance transition carries real geometry, a real boundary ref, a positive clearance requirement, and an honest accessRequirement');

  // ---- 2. Reverse transition mirrors forward with swapped endpoints (Part 11) ----
  assert.equal(LUNA_MAIN_ENTRANCE_TRANSITION_REVERSE.fromSpaceRef, LUNA_MAIN_ENTRANCE_TRANSITION.toSpaceRef);
  assert.equal(LUNA_MAIN_ENTRANCE_TRANSITION_REVERSE.toSpaceRef, LUNA_MAIN_ENTRANCE_TRANSITION.fromSpaceRef);
  assert.deepEqual(LUNA_MAIN_ENTRANCE_TRANSITION_REVERSE.crossingPath, [...LUNA_MAIN_ENTRANCE_TRANSITION.crossingPath].reverse());
  checks.push('2. Reverse transition (Exit Building): same real boundary, endpoints and crossing path reversed — not a separately hand-authored one-way path');

  // ---- 3. Path validation: the real Grand Entrance transition validates OK against Luna's own normalized model ----
  const lunaValidation = validateTransition(LUNA_MAIN_ENTRANCE_TRANSITION, lunaModel);
  assert.equal(lunaValidation.status, 'OK', `expected OK, got ${lunaValidation.status}: ${lunaValidation.reason}`);
  checks.push('3. Path validation: the real Grand Entrance transition validates OK against Luna\'s own normalized spatial model (endpoints resolve, door belongs to the correct spaces)');

  // ---- 4. Path validation: BLOCKED when a door is bound to the wrong spaces ----
  const wrongDoorTransition = { ...LUNA_MAIN_ENTRANCE_TRANSITION, fromSpaceRef: 'LUNA-L01-AMENITIES', toSpaceRef: 'LUNA-GROUND-LOBBY' };
  const wrongValidation = validateTransition(wrongDoorTransition, lunaModel);
  assert.equal(wrongValidation.status, 'BLOCKED');
  checks.push('4. Path validation correctly BLOCKS a transition whose fromSpaceRef/toSpaceRef don\'t match the bound door\'s own real spaces, rather than faking traversal');

  // ---- 5. Path validation: TRANSITION_REVIEW_REQUIRED for an unknown boundary ----
  const unknownDoorTransition = { ...LUNA_MAIN_ENTRANCE_TRANSITION, boundaryRef: 'LUNA-DOES-NOT-EXIST' };
  assert.equal(validateTransition(unknownDoorTransition, lunaModel).status, 'TRANSITION_REVIEW_REQUIRED');
  checks.push('5. Path validation reports TRANSITION_REVIEW_REQUIRED (never BLOCKED-as-crash) for a boundaryRef that doesn\'t resolve to any known door');

  // ---- 6. Clearance — sliding door, never a fixed timer ----
  assert.equal(isBoundaryClearForTraversal(slidingBoundaryState(0, 3.6), STANDARD_TRAVERSAL_PROFILE), false, 'a fully closed sliding door must never be reported clear');
  assert.equal(isBoundaryClearForTraversal(slidingBoundaryState(0.2, 3.6), STANDARD_TRAVERSAL_PROFILE), false, 'barely-opening (0.72m clear) is still below the 0.9m walking profile');
  assert.equal(isBoundaryClearForTraversal(slidingBoundaryState(1, 3.6), STANDARD_TRAVERSAL_PROFILE), true, 'fully open (3.6m clear) must be reported clear');
  checks.push('6. Clearance (sliding): openness is derived from the door\'s own real leaf-progress fraction against its real opening width — never a hardcoded delay');

  // ---- 7. Clearance — hinged door + open passage ----
  assert.equal(isBoundaryClearForTraversal(hingedBoundaryState(0, Math.PI / 2, 1.0), STANDARD_TRAVERSAL_PROFILE), false);
  assert.equal(isBoundaryClearForTraversal(hingedBoundaryState(Math.PI / 2, Math.PI / 2, 1.0), STANDARD_TRAVERSAL_PROFILE), true, 'a hinged door swung fully open (1.0m frame) must clear a 0.9m profile');
  assert.equal(isBoundaryClearForTraversal(OPEN_BOUNDARY_STATE, STANDARD_TRAVERSAL_PROFILE), true, 'an OPEN_PASSAGE (no boundary) is always clear by definition');
  checks.push('7. Clearance (hinged + open passage): a hinged door\'s clear aperture derives from its real swing angle; a passage with no boundary object is always clear');

  // ---- 8. Camera traversal waypoints ----
  const waypoints = buildTraversalWaypoints(LUNA_MAIN_ENTRANCE_TRANSITION);
  assert.equal(waypoints.length, LUNA_MAIN_ENTRANCE_TRANSITION.crossingPath.length);
  assert.deepEqual(waypoints[0].position, [LUNA_MAIN_ENTRANCE_TRANSITION.approachPoint.x, LUNA_MAIN_ENTRANCE_TRANSITION.approachPoint.y, LUNA_MAIN_ENTRANCE_TRANSITION.approachPoint.z]);
  assert.deepEqual(waypoints[waypoints.length - 1].position, [LUNA_MAIN_ENTRANCE_TRANSITION.exitPoint.x, LUNA_MAIN_ENTRANCE_TRANSITION.exitPoint.y, LUNA_MAIN_ENTRANCE_TRANSITION.exitPoint.z]);
  checks.push('8. Camera traversal: buildTraversalWaypoints() extends CameraRig\'s own real CameraFlightTarget shape into a physical waypoint sequence (approach -> threshold -> arrival), not a single teleport target');

  // ---- 9. Transition state machine — the full golden path grammar ----
  let ctx = beginTransition(LUNA_MAIN_ENTRANCE_TRANSITION, waypoints.length);
  assert.equal(ctx.phase, 'LOCATING_ENTRY');
  ctx = beginApproach(ctx);
  assert.equal(ctx.phase, 'APPROACHING');
  ctx = arriveAtApproachPoint(ctx);
  assert.equal(ctx.phase, 'WAITING_FOR_ACCESS');
  const access = resolveTransitionAccess(ctx.transition, lunaAccessTransitionResolver, { role: 'public', permissions: [], assignedHomeRefs: [], facilityResponsibility: false });
  assert.equal(access.outcome, 'NOT_REQUIRED', 'the Main Entrance must resolve NOT_REQUIRED honestly rather than asking Access & Security a question it was never wired to answer');
  ctx = resolveAccessStep(ctx, access);
  assert.equal(ctx.phase, 'ACTUATING');
  ctx = checkClearance(ctx, false);
  assert.equal(ctx.phase, 'WAITING_FOR_CLEARANCE', 'must WAIT, never cross, while the boundary is not yet physically clear');
  ctx = checkClearance(ctx, true);
  assert.equal(ctx.phase, 'CROSSING');
  assert.equal(ctx.waypointIndex, 1);
  ctx = advanceCrossing(ctx);
  assert.equal(ctx.phase, 'CROSSING');
  assert.equal(ctx.waypointIndex, 2);
  // Phase 2 adds real intermediate points around the retained entrance column.
  // Arrival must wait for EVERY physical waypoint, rather than assuming three.
  for (let i = 2; i < waypoints.length; i++) {
    assert.equal(ctx.phase, 'CROSSING');
    assert.equal(ctx.waypointIndex, i);
    ctx = advanceCrossing(ctx);
  }
  assert.equal(ctx.phase, 'ARRIVED');
  assert.ok(isTerminalPhase(ctx.phase));
  checks.push('9. Transition state machine: IDLE-less golden path LOCATING_ENTRY -> APPROACHING -> WAITING_FOR_ACCESS -> ACTUATING -> WAITING_FOR_CLEARANCE -> CROSSING -> ARRIVED walks step by step, never skipping a phase out of order');

  // ---- 10. Access DENIED / REQUIRES_CREDENTIAL / UNAVAILABLE branches ----
  let deniedCtx = arriveAtApproachPoint(beginApproach(beginTransition(LUNA_MAIN_ENTRANCE_TRANSITION, waypoints.length)));
  deniedCtx = resolveAccessStep(deniedCtx, { outcome: 'DENIED', reason: 'test' });
  assert.equal(deniedCtx.phase, 'DENIED');
  assert.ok(isTerminalPhase(deniedCtx.phase));

  let pausedCtx = arriveAtApproachPoint(beginApproach(beginTransition(LUNA_MAIN_ENTRANCE_TRANSITION, waypoints.length)));
  pausedCtx = resolveAccessStep(pausedCtx, { outcome: 'REQUIRES_CREDENTIAL', reason: 'test' });
  assert.equal(pausedCtx.phase, 'PAUSED_FOR_USER_INPUT', 'must pause for real user input, never fake credential entry');
  pausedCtx = resumeAfterUserInput(pausedCtx, { outcome: 'GRANTED', reason: 'credential supplied' });
  assert.equal(pausedCtx.phase, 'ACTUATING', 'resuming with a real subsequent GRANTED outcome must proceed to actuation');

  let unavailableCtx = arriveAtApproachPoint(beginApproach(beginTransition(LUNA_MAIN_ENTRANCE_TRANSITION, waypoints.length)));
  unavailableCtx = resolveAccessStep(unavailableCtx, { outcome: 'UNAVAILABLE', reason: 'test' });
  assert.equal(unavailableCtx.phase, 'BLOCKED');
  checks.push('10. Access resolution branches: DENIED terminates as DENIED, REQUIRES_CREDENTIAL pauses for real input (never fabricated), UNAVAILABLE reports BLOCKED — never forced completion');

  // ---- 11. OPEN_PASSAGE skips actuation entirely ----
  const passageTransition = { ...LUNA_MAIN_ENTRANCE_TRANSITION, type: 'OPEN_PASSAGE', boundaryRef: undefined, accessRequirement: 'NONE' };
  let passageCtx = arriveAtApproachPoint(beginApproach(beginTransition(passageTransition, waypoints.length)));
  passageCtx = resolveAccessStep(passageCtx, { outcome: 'NOT_REQUIRED', reason: 'open passage' });
  assert.equal(passageCtx.phase, 'CROSSING', 'an OPEN_PASSAGE must go straight to CROSSING — there is no boundary to actuate or wait on');
  checks.push('11. OPEN_PASSAGE transitions skip ACTUATING/WAITING_FOR_CLEARANCE entirely — approach then cross, no fabricated boundary');

  // ---- 12. Cancellation never forces completion ----
  let cancelCtx = beginApproach(beginTransition(LUNA_MAIN_ENTRANCE_TRANSITION, waypoints.length));
  cancelCtx = cancelTransition(cancelCtx, 'user cancelled mid-approach');
  assert.equal(cancelCtx.phase, 'IDLE');
  const arrivedCancelAttempt = cancelTransition(ctx, 'too late'); // ctx is already ARRIVED from check 9
  assert.equal(arrivedCancelAttempt.phase, 'ARRIVED', 'a terminal ARRIVED transition cannot be retroactively cancelled');
  const faulted = faultTransition(beginApproach(beginTransition(LUNA_MAIN_ENTRANCE_TRANSITION, waypoints.length)), 'door fault while opening');
  assert.equal(faulted.phase, 'FAULT');
  checks.push('12. Cancellation/fault handling: cancelling mid-flight stops cleanly at IDLE, a terminal phase cannot be re-cancelled, and a fault reports FAULT with a real reason — never forced completion');

  // ---- 13. Access integration: NONE short-circuits, ACCESS_CONTROLLED with no resolver is UNAVAILABLE ----
  const noneAccess = resolveTransitionAccess({ ...LUNA_MAIN_ENTRANCE_TRANSITION, accessRequirement: 'NONE' }, undefined, { role: 'public', permissions: [], assignedHomeRefs: [], facilityResponsibility: false });
  assert.equal(noneAccess.outcome, 'NOT_REQUIRED');
  const unavailableAccess = resolveTransitionAccess({ ...LUNA_MAIN_ENTRANCE_TRANSITION, accessRequirement: 'ACCESS_CONTROLLED' }, undefined, { role: 'public', permissions: [], assignedHomeRefs: [], facilityResponsibility: false });
  assert.equal(unavailableAccess.outcome, 'UNAVAILABLE');
  checks.push('13. resolveTransitionAccess(): NONE never even calls a resolver; ACCESS_CONTROLLED with no resolver supplied honestly reports UNAVAILABLE, never a guessed GRANTED');

  // ---- 14. lunaAccessTransitionResolver wraps the REAL existing access system, no second engine ----
  assert.equal(isAccessGovernedRef(GROUND_ENTRANCE_REF), false);
  const mainEntranceAccess = lunaAccessTransitionResolver.resolveAccess(GROUND_ENTRANCE_REF, { role: 'facility', permissions: [], assignedHomeRefs: [], facilityResponsibility: true });
  assert.equal(mainEntranceAccess.outcome, 'NOT_REQUIRED', 'must honestly report NOT_REQUIRED for the un-instrumented Main Entrance, not fabricate a lock check');
  const LOCK = 'LUNA-L06-APT-A-ENTRY-LOCK-01';
  assert.equal(isAccessGovernedRef(LOCK), true);
  // Apartment A Full Interior Reality V1 (Part 6) — lunaAccessTransitionResolver
  // now opts into the simulated-credential step (requireCredential=true) that
  // resolveAccessAuthorization() only added this phase: an assigned resident
  // with no credential yet presented gets REQUIRES_CREDENTIAL, not an
  // immediate GRANTED — a real, disclosed behavior change for the ONE real
  // physical entry sequence, not a regression (the underlying identity check
  // is unchanged: still the same assignedHomeRefs match, still the same
  // single resolveAccessAuthorization() function, no second engine).
  const residentNoCredential = lunaAccessTransitionResolver.resolveAccess(LOCK, { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false });
  assert.equal(residentNoCredential.outcome, 'REQUIRES_CREDENTIAL', 'an assigned resident with no code yet presented must be asked for one, never granted instantly');
  const residentValidCredential = lunaAccessTransitionResolver.resolveAccess(LOCK, { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false }, '4127');
  assert.equal(residentValidCredential.outcome, 'GRANTED', 'the matching SIMULATED code must grant entry through the same resolver');
  const residentInvalidCredential = lunaAccessTransitionResolver.resolveAccess(LOCK, { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false }, '0000');
  assert.equal(residentInvalidCredential.outcome, 'DENIED', 'a wrong code must be denied, never silently accepted');
  const residentDenied = lunaAccessTransitionResolver.resolveAccess(LOCK, { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-B'], facilityResponsibility: false });
  assert.equal(residentDenied.outcome, 'DENIED', 'a resident of a different home is denied before the credential step is ever reached');
  // The pre-existing direct command path (a resident tapping "unlock" on the
  // lock device itself) intentionally keeps its ORIGINAL instant-grant
  // behavior — requireCredential defaults to false there, so it still agrees
  // with the transition resolver in the one case that never diverges (a
  // mismatched home is denied either way).
  const directCheck = resolveAccessAuthorization({ role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false }, LOCK);
  assert.equal(directCheck.granted, true, 'the direct command path (no requireCredential) still grants an assigned resident instantly, unchanged from before this phase');
  checks.push('14. lunaAccessTransitionResolver: a thin, honest wrapper over the EXISTING resolveAccessAuthorization() — same underlying identity check, no second authorization engine, no fabricated lock at the Main Entrance; the physical entry sequence now adds a real, disclosed simulated-credential step (Part 6)');

  // ---- 15. Door honesty (Part 22/23) ----
  const mainDoor = lunaModel.doors.find((d) => d.canonicalRef === GROUND_ENTRANCE_REF);
  assert.equal(mainDoor.animationReadiness, 'ANIMATABLE', 'the Main Entrance has a real movable leaf with known kinematics — condition (A)');
  const stairDoor = lunaModel.doors.find((d) => d.canonicalRef === 'LUNA-STAIR-01-DOOR-01');
  assert.equal(stairDoor.animationReadiness, 'STATIC_BOUNDARY', 'the stair doors are real geometry with no runtime-driven animation yet — condition (B), never claimed as automatically animated');
  checks.push('15. Door honesty: the normalized model correctly distinguishes an animatable real leaf (Main Entrance) from a static, non-actuated boundary (stair doors) — no imported door is assumed animated');

  // ---- 16. Navigation graph carries a real door edge; transitionRef is additive, not auto-fabricated ----
  const lunaGraph = buildNavigationGraph(lunaModel);
  const lunaEntranceEdge = lunaGraph.edges.find((e) => e.viaRef === GROUND_ENTRANCE_REF);
  assert.ok(lunaEntranceEdge, 'the navigation graph must derive a real door edge from the normalized Main Entrance door');
  assert.equal(lunaEntranceEdge.transitionRef, undefined, 'a navigation edge never gets a transitionRef fabricated automatically — it must be explicitly attached once a real SpatialTransition exists for it');
  checks.push('16. Navigation graph integration: the Main Entrance produces a real "door" edge; transitionRef stays additive/optional, never silently assumed present');

  // ---- 17. Route planning: honest NOT_PHYSICALLY_TRAVERSABLE, then OK once a real transitionRef is attached ----
  const untraversableRoute = planRoute(lunaGraph, LUNA_EXTERIOR_ENTRANCE_PLAZA, 'LUNA-GROUND-LOBBY', () => true);
  assert.equal(untraversableRoute.status, 'NOT_PHYSICALLY_TRAVERSABLE', 'a route through an edge with no mapped transition must say so honestly, never silently teleport');
  const boundGraph = { ...lunaGraph, edges: lunaGraph.edges.map((e) => (e === lunaEntranceEdge ? { ...e, transitionRef: LUNA_MAIN_ENTRANCE_TRANSITION.transitionId } : e)) };
  const traversableRoute = planRoute(boundGraph, LUNA_EXTERIOR_ENTRANCE_PLAZA, 'LUNA-GROUND-LOBBY', () => true);
  assert.equal(traversableRoute.status, 'OK');
  assert.equal(traversableRoute.steps.length, 1);
  const blockedRoute = planRoute(boundGraph, LUNA_EXTERIOR_ENTRANCE_PLAZA, 'LUNA-GROUND-LOBBY', () => false);
  assert.equal(blockedRoute.status, 'BLOCKED_BY_POLICY', 'planRoute must never expose a route whose edges the caller\'s own policy predicate rejects (Part 25)');
  checks.push('17. Route planning: NOT_PHYSICALLY_TRAVERSABLE until a real transitionRef is bound, OK once it is, and BLOCKED_BY_POLICY when the caller\'s Facility/Consumer filter rejects the edge — never bypassed');

  // ---- 18. Non-Luna fixture proof: the exact same engine functions, zero Luna references ----
  const miniTransition = buildMiniEntranceTransition();
  assert.equal(miniTransition.fromSpaceRef, MINI_EXTERIOR_REF);
  assert.equal(miniTransition.boundaryRef, MINI_MAIN_ENTRANCE_DOOR_REF);
  const miniValidation = validateTransition(miniTransition, miniModel);
  assert.equal(miniValidation.status, 'OK', `expected OK, got ${miniValidation.status}: ${miniValidation.reason}`);
  const miniWaypoints = buildTraversalWaypoints(miniTransition);
  let miniCtx = beginTransition(miniTransition, miniWaypoints.length);
  miniCtx = beginApproach(miniCtx);
  miniCtx = arriveAtApproachPoint(miniCtx);
  const miniAccess = resolveTransitionAccess(miniCtx.transition, undefined, { role: 'public', permissions: [], assignedHomeRefs: [], facilityResponsibility: false });
  assert.equal(miniAccess.outcome, 'NOT_REQUIRED');
  miniCtx = resolveAccessStep(miniCtx, miniAccess);
  assert.equal(miniCtx.phase, 'ACTUATING');
  miniCtx = checkClearance(miniCtx, true);
  assert.equal(miniCtx.phase, 'CROSSING');
  miniCtx = advanceCrossing(advanceCrossing(miniCtx));
  assert.equal(miniCtx.phase, 'ARRIVED');
  checks.push('18. Non-Luna proof: a synthetic building\'s own real automatic-sliding door walks the identical validateTransition/transitionEngine/clearance pipeline end to end, with zero Luna-specific code anywhere in the call path');

  // ---- 19. Two-tap grammar still holds (re-verified in this suite per Part 30/21) ----
  assert.equal(resolveTapAction('LUNA-GROUND-LOBBY', null, null), 'locate');
  assert.equal(resolveTapAction('LUNA-GROUND-LOBBY', 'LUNA-GROUND-LOBBY', null), 'enter', 'tap 2 must resolve "enter" — the real transition, never a teleport, is what the host then starts');
  checks.push('19. Two-tap grammar (Part 21): tap1=locate, tap2=enter — unchanged; tap2 is now what actually starts the real physical transition rather than a teleport, at the host wiring level');

  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} finally {
  await server.close();
}
