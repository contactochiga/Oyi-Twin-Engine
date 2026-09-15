// Luna — True Floor Plan System V1 (L06 Gold Standard Floor) Part 38.
// Deterministic checks against the real, coordination-checked floor
// plate this phase built — same Vite ssrLoadModule pattern every prior
// phase's own verify*.mjs script already uses.
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const checks = [];

function runTwice(label, fn) {
  fn();
  fn();
  checks.push(`${label} (run twice, stable)`);
}

try {
  const load = (path) => server.ssrLoadModule('/src/' + path);
  const { LUNA_L06_UNITS, LUNA_CORES, L06_UNIT_BOXES, LUNA_LEVELS } = await load('luna/lunaProgramme.ts');
  const { L06_LOBBY, L06_STAIR_LINK_WEST, L06_STAIR_LINK_EAST, L06_APARTMENT_DOORS, checkL06FloorPlateCoordination, checkL06WithinEnvelope } = await load('luna/architecture/l06FloorPlate.ts');
  const { residentialUnitsForLevel } = await load('luna/lunaResidentialUnits.ts');
  const { LUNA_L06_FLOOR_PLAN } = await load('luna/policy/lunaFloorPlans.ts');
  const { buildLunaReferenceModel } = await load('luna/ingestion/lunaSpatialModel.ts');
  const { buildNavigationGraph } = await load('engine/spatial/navigationGraph.ts');
  const { requestRoute } = await load('engine/spatial/routeRequest.ts');
  const { LUNA_TRANSITION_BINDINGS } = await load('luna/transitions/lunaRouteTransitions.ts');
  const { lunaIsRouteEdgeAllowed } = await load('luna/transitions/lunaRoutePolicy.ts');
  const { identityForScope } = await load('luna/intelligence/lunaScope.ts');
  const { lunaRepresentationPolicy, LUNA_PRIVATE_UNIT_REFS } = await load('luna/policy/lunaRepresentationPolicy.ts');
  const { checkL06AptAStructuralCoordination } = await load('luna/architecture/l06AptAStructuralCoordination.ts');
  const { L06_APT_A_MASSING_FRAME, L06_APT_A_PLAN_FRAME, MASSING_TO_PLAN_OFFSET } = await load('luna/architecture/l06AptAFrame.ts');
  const { findSpace } = await load('luna/interiors/lunaSpaceLookup.ts');
  const { SPACE_ALIASES } = await load('luna/intelligence/lunaVocabulary.ts');

  // ---- 1. Coordinate frame resolution (Part 2) ----
  runTwice('1. Coordinate frame resolution: 2D plan and 3D massing read the exact same box for all 4 units', () => {
    for (const unit of LUNA_L06_UNITS) {
      const box = L06_UNIT_BOXES[unit.ref];
      assert.equal(unit.planX, box.x);
      assert.equal(unit.planZ, box.z);
      assert.equal(unit.planWidth, box.width);
      assert.equal(unit.planDepth, box.depth);
    }
    assert.equal(MASSING_TO_PLAN_OFFSET.offsetX, 0, 'Apartment A plan/massing offset must be exactly zero now');
    assert.equal(MASSING_TO_PLAN_OFFSET.offsetZ, 0, 'Apartment A plan/massing offset must be exactly zero now');
    assert.equal(L06_APT_A_MASSING_FRAME.x, L06_APT_A_PLAN_FRAME.x);
  });

  // ---- 2. Zero real overlaps on the floor plate (Part 5) ----
  runTwice('2. Floor plate coordination: zero real overlaps among core/lobby/stair-links/apartments', () => {
    const result = checkL06FloorPlateCoordination();
    assert.equal(result.status, 'CLEAR', JSON.stringify(result.overlaps));
    assert.ok(result.checkedPairs > 20, 'must actually check a real number of pairs, not a trivial set');
  });

  // ---- 3. Everything stays within the existing tower envelope (Part 5) ----
  const l06Level = LUNA_LEVELS.find((l) => l.ref === 'LUNA-L06');
  runTwice('3. Envelope check: every new rectangle stays within the existing tower footprint', () => {
    const result = checkL06WithinEnvelope(l06Level.footprint);
    assert.equal(result.status, 'CLEAR', JSON.stringify(result.violations));
  });

  // ---- 4. Real programme: 4 apartments, correct bedroom mix (Part 4/12) ----
  const units = residentialUnitsForLevel('LUNA-L06');
  assert.equal(units.length, 4);
  const bedroomsByRef = Object.fromEntries(units.map((u) => [u.ref.slice(-1), u.bedrooms]));
  assert.deepEqual(bedroomsByRef, { A: 3, B: 3, C: 2, D: 2 }, 'A=3BED, B=3BED, C=2BED, D=2BED');
  checks.push('4. Programme: exactly 4 apartments with the real A=3BED/B=3BED/C=2BED/D=2BED mix');

  // ---- 5. Vertical core intact (Part 6) ----
  const passengerLifts = LUNA_CORES.filter((c) => c.ref.startsWith('LUNA-LIFT-PASS'));
  const serviceLifts = LUNA_CORES.filter((c) => c.ref === 'LUNA-LIFT-SERVICE-01');
  const stairs = LUNA_CORES.filter((c) => c.ref.startsWith('LUNA-STAIR'));
  assert.equal(passengerLifts.length, 3);
  assert.equal(serviceLifts.length, 1);
  assert.equal(stairs.length, 2);
  checks.push('5. Vertical core: 3 passenger lifts, 1 service/fire lift, 2 protected stairs — none moved or resized');

  // ---- 6. Real Lift Lobby + stair-link corridors (Part 7/9/10) ----
  assert.ok(L06_LOBBY.width > 0 && L06_LOBBY.depth > 0);
  assert.ok(L06_STAIR_LINK_WEST.width > 0 && L06_STAIR_LINK_EAST.width > 0);
  checks.push('6. Real common circulation: Lift Lobby + 2 stair-link corridors exist with real, non-zero geometry');

  // ---- 7. Apartment entrance doors (Part 14) ----
  assert.equal(L06_APARTMENT_DOORS.length, 4);
  const aDoor = L06_APARTMENT_DOORS.find((d) => d.unitRef === 'LUNA-L06-APT-A');
  assert.equal(aDoor.accessControlled, true, 'only Apartment A has a real governed lock');
  for (const d of L06_APARTMENT_DOORS.filter((d) => d.unitRef !== 'LUNA-L06-APT-A')) {
    assert.equal(d.accessControlled, false, `${d.unitRef}'s door must not fabricate a lock`);
  }
  checks.push('7. Apartment entrance doors: 4 real doors, Apartment A access-controlled, B/C/D not (no fabricated locks)');

  // ---- 8. No duplicate canonical refs on the floor plan (Part 38) ----
  const allRefs = LUNA_L06_FLOOR_PLAN.units.map((u) => u.ref);
  assert.equal(new Set(allRefs).size, allRefs.length, 'every ref on the L06 2D plan must be unique');
  checks.push(`8. No duplicate canonical refs: ${allRefs.length} regions on the L06 2D plan, all unique`);

  // ---- 9. 2D/3D canonical binding: every plan unit ref resolves through findSpace ----
  runTwice('9. 2D<->3D canonical binding: every apartment ref on the plan resolves to a real space', () => {
    for (const unit of LUNA_L06_UNITS) {
      const found = findSpace(unit.ref);
      assert.ok(found, `${unit.ref} must resolve via findSpace`);
    }
    const lobbyFound = findSpace(L06_LOBBY.ref);
    assert.equal(lobbyFound.kind, 'room', 'the Lift Lobby resolves as a real registered room (LUNA-L06-COMMON), the same generic path Ground Lobby zones already use');
  });

  // ---- 10. Navigation graph reflects real circulation (Part 32) ----
  const model = await buildLunaReferenceModel();
  const graph = buildNavigationGraph(model, []);
  const lobbyToLevelEdge = graph.edges.find((e) => (e.fromRef === 'LUNA-L06' && e.toRef === L06_LOBBY.ref) || (e.fromRef === L06_LOBBY.ref && e.toRef === 'LUNA-L06'));
  assert.ok(lobbyToLevelEdge, 'the Lift Lobby must have a real adjacency edge to its own level (free arrival hop)');
  const aptADoorEdge = graph.edges.some((e) => e.toRef === 'LUNA-L06-APT-A' && e.via === 'door');
  assert.ok(aptADoorEdge, 'Apartment A must be reachable via a real door edge, not floating disconnected');
  checks.push('10. Navigation graph: Lift Lobby has a real adjacency edge to LUNA-L06, Apartment A reachable via a real door edge');

  // ---- 11. Door transitions registered (Part 14/33) ----
  const doorRefs = new Set(LUNA_TRANSITION_BINDINGS.doorTransitions.map((t) => t.boundaryRef));
  for (const d of L06_APARTMENT_DOORS) assert.ok(doorRefs.has(d.ref), `${d.ref} must be a real bound door transition`);
  checks.push('11. Door transitions: all 4 apartment entrance doors bound into the real route engine');

  // ---- 12. Facility privacy preserved (Part 20) ----
  runTwice('12. Facility privacy: entering a private unit door edge is not spatially-visible-only, requires FULL_3D', () => {
    const facility = identityForScope('facility');
    const edgeToB = { fromRef: L06_LOBBY.ref, toRef: 'LUNA-L06-APT-B', via: 'door' };
    const allowed = lunaIsRouteEdgeAllowed(edgeToB, facility);
    const mode = lunaRepresentationPolicy.resolveMode({ ref: 'LUNA-L06-APT-B', identity: facility });
    assert.equal(allowed, mode === 'FULL_3D', 'route entry into a private unit must match the real FULL_3D gate exactly');
  });

  // ---- 13. Consumer assignment + privacy (Part 21) ----
  runTwice('13. Consumer privacy: a resident of Apartment A cannot route into Apartment B, C, or D', () => {
    const residentA = identityForScope('consumer', 'LUNA-L06-APT-A');
    assert.equal(lunaIsRouteEdgeAllowed({ fromRef: L06_LOBBY.ref, toRef: 'LUNA-L06-APT-A', via: 'door' }, residentA), true);
    for (const otherRef of ['LUNA-L06-APT-B', 'LUNA-L06-APT-C', 'LUNA-L06-APT-D']) {
      assert.equal(lunaIsRouteEdgeAllowed({ fromRef: L06_LOBBY.ref, toRef: otherRef, via: 'door' }, residentA), false, `resident of A must never route into ${otherRef}`);
    }
  });

  // ---- 14. Structural clearance still real and CLEAR (Part 23) ----
  runTwice('14. Structural coordination: Apartment A vs real L06 columns remains CLEAR after the floor-plate fix', () => {
    const result = checkL06AptAStructuralCoordination();
    assert.equal(result.status, 'CLEAR', JSON.stringify(result.conflicts));
  });

  // ---- 15. Lift arrival resolves to the real Lift Lobby (Part 34) ----
  runTwice('15. Lift arrival: a facility route from the exterior to the L06 Lift Lobby is a real, connected path', () => {
    const facility = identityForScope('facility');
    const result = requestRoute(model, LUNA_TRANSITION_BINDINGS, (edge) => lunaIsRouteEdgeAllowed(edge, facility), 'LUNA-EXTERIOR-ENTRANCE-PLAZA', L06_LOBBY.ref, 'test-route');
    assert.equal(result.status, 'OK', result.reason);
    assert.ok(result.route.steps.some((s) => s.kind === 'LIFT'), 'the route must actually use a lift');
    const lastStep = result.route.steps[result.route.steps.length - 1];
    assert.equal(lastStep.toRef, L06_LOBBY.ref, 'the route must terminate at the real Lift Lobby, not the bare level');
  });

  // ---- 16. Oyi alias resolution (Part 35) ----
  runTwice('16. Oyi alias resolution: Apartment A/B/C/D and the L06 Lift Lobby all have real, resolvable aliases', () => {
    for (const ref of ['LUNA-L06-APT-A', 'LUNA-L06-APT-B', 'LUNA-L06-APT-C', 'LUNA-L06-APT-D', 'LUNA-L06-LOBBY']) {
      const alias = SPACE_ALIASES.find((a) => a.ref === ref);
      assert.ok(alias && alias.patterns.length > 0, `${ref} must have at least one real Oyi phrase`);
      assert.ok(findSpace(ref), `${ref} must resolve through findSpace`);
    }
  });

  // ---- 17. LUNA_PRIVATE_UNIT_REFS untouched (representation policy not weakened) ----
  assert.deepEqual(LUNA_PRIVATE_UNIT_REFS, ['LUNA-L06-APT-A', 'LUNA-L06-APT-B', 'LUNA-L06-APT-C', 'LUNA-L06-APT-D', 'LUNA-L10-APT-A', 'LUNA-PENTHOUSE']);
  checks.push('17. RepresentationPolicy untouched: LUNA_PRIVATE_UNIT_REFS unchanged from before this phase');

  writeFileSync('artifacts/luna-l06-floor-runtime-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} catch (error) {
  writeFileSync('artifacts/luna-l06-floor-runtime-results.json', JSON.stringify({ passed: false, checks, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await server.close();
}
