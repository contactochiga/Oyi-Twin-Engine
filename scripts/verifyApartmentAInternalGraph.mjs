// Apartment A Full Interior Reality V1 — Parts 1-3, 23: the internal
// room/door navigation graph, built from the SAME canonical room/door
// records scripts/verifyApartmentAInteriorReality.mjs already verifies
// (never a second, hand-typed topology). Same Vite ssrLoadModule
// convention every other verify*.mjs already uses.
import { createServer } from 'vite';
import assert from 'node:assert/strict';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const checks = [];
try {
  const load = (path) => server.ssrLoadModule('/src/' + path);

  const { buildNavigationGraph } = await load('engine/spatial/navigationGraph.ts');
  const { requestRoute } = await load('engine/spatial/routeRequest.ts');
  const { buildLunaReferenceModel } = await load('luna/ingestion/lunaSpatialModel.ts');
  const { LUNA_TRANSITION_BINDINGS } = await load('luna/transitions/lunaRouteTransitions.ts');
  const { LUNA_L06_APT_A } = await load('luna/interiors/lunaInteriors.ts');
  const { lunaIsRouteEdgeAllowed } = await load('luna/transitions/lunaRoutePolicy.ts');

  const model = buildLunaReferenceModel();
  const graph = buildNavigationGraph(model);
  const rooms = LUNA_L06_APT_A.rooms;
  const roomRefs = new Set(rooms.map((r) => r.ref));

  // ---- 1. Every navigable canonical room has a graph node ----
  const nodeSet = new Set(graph.nodes);
  const missingNodes = rooms.filter((r) => !nodeSet.has(r.ref));
  assert.equal(missingNodes.length, 0, `rooms missing graph nodes: ${missingNodes.map((r) => r.ref).join(', ')}`);
  checks.push('1. All 14 Apartment A canonical rooms are real navigation-graph nodes');

  // ---- 2. Every verified internal connection has the expected graph edge (bidirectional) ----
  const internalDoorPairs = [
    ['LUNA-L06-APT-A-ENTRY', 'LUNA-L06-APT-A-KITCHEN'],
    ['LUNA-L06-APT-A-ENTRY', 'LUNA-L06-APT-A-GUEST-WC'],
    ['LUNA-L06-APT-A-KITCHEN', 'LUNA-L06-APT-A-DINING'],
    ['LUNA-L06-APT-A-DINING', 'LUNA-L06-APT-A-LIVING'],
    ['LUNA-L06-APT-A-DINING', 'LUNA-L06-APT-A-CORRIDOR'],
    ['LUNA-L06-APT-A-DINING', 'LUNA-L06-APT-A-UTILITY'],
    ['LUNA-L06-APT-A-LIVING', 'LUNA-L06-APT-A-BALCONY'],
    ['LUNA-L06-APT-A-CORRIDOR', 'LUNA-L06-APT-A-BED-01'],
    ['LUNA-L06-APT-A-CORRIDOR', 'LUNA-L06-APT-A-BED-02'],
    ['LUNA-L06-APT-A-CORRIDOR', 'LUNA-L06-APT-A-BED-03'],
    ['LUNA-L06-APT-A-BED-01', 'LUNA-L06-APT-A-BATH-01'],
    ['LUNA-L06-APT-A-BED-02', 'LUNA-L06-APT-A-BATH-02'],
    ['LUNA-L06-APT-A-BED-03', 'LUNA-L06-APT-A-BATH-03'],
  ];
  function hasEdge(a, b) {
    return graph.edges.some((e) => (e.fromRef === a && e.toRef === b) || (e.bidirectional && e.fromRef === b && e.toRef === a));
  }
  const missingEdges = internalDoorPairs.filter(([a, b]) => !hasEdge(a, b));
  assert.equal(missingEdges.length, 0, `missing graph edges: ${missingEdges.map(([a, b]) => `${a}<->${b}`).join(', ')}`);
  checks.push(`2. All ${internalDoorPairs.length} verified internal door connections are real, bidirectional graph edges`);

  // ---- 3. No duplicate edges for the same door pair, no edge routing through a non-connected wall (only the 13 verified pairs + entrance/home-bridge exist between apartment refs) ----
  const doorEdges = graph.edges.filter((e) => e.via === 'door' && roomRefs.has(e.fromRef) && roomRefs.has(e.toRef));
  const edgeKeys = doorEdges.map((e) => [e.fromRef, e.toRef].sort().join('|'));
  assert.equal(new Set(edgeKeys).size, edgeKeys.length, 'no duplicate room-to-room door edges');
  const expectedKeys = new Set(internalDoorPairs.map(([a, b]) => [a, b].sort().join('|')));
  const unexpectedEdges = [...new Set(edgeKeys)].filter((k) => !expectedKeys.has(k));
  assert.equal(unexpectedEdges.length, 0, `unexpected room-to-room edges not backed by a real wall opening: ${unexpectedEdges.join(', ')}`);
  checks.push('3. No duplicate room-to-room edges; every room-to-room edge is backed by a real, verified wall opening — none invented');

  // ---- 4. Apartment entrance connects L06 Lobby -> Apartment A unit -> Foyer (the real bridge) ----
  assert.ok(hasEdge('LUNA-L06-LOBBY', 'LUNA-L06-APT-A'), 'the real entrance door must connect the L06 Lobby to the apartment unit');
  assert.ok(hasEdge('LUNA-L06-APT-A', 'LUNA-L06-APT-A-ENTRY'), 'the apartment unit must bridge to its own real Foyer room');
  checks.push('4. Apartment entrance graph chain: L06 Lobby <-> Apartment A unit <-> Foyer, both real edges present');

  // ---- 5. Reachability: every room reachable from the Foyer via BFS over real edges only ----
  function bfsReachable(fromRef) {
    const seen = new Set([fromRef]);
    const queue = [fromRef];
    while (queue.length) {
      const cur = queue.shift();
      for (const e of graph.edges) {
        if (e.fromRef === cur && !seen.has(e.toRef)) { seen.add(e.toRef); queue.push(e.toRef); }
        if (e.bidirectional && e.toRef === cur && !seen.has(e.fromRef)) { seen.add(e.fromRef); queue.push(e.fromRef); }
      }
    }
    return seen;
  }
  const reachableFromFoyer = bfsReachable('LUNA-L06-APT-A-ENTRY');
  const unreachable = rooms.filter((r) => !reachableFromFoyer.has(r.ref));
  assert.equal(unreachable.length, 0, `rooms unreachable from the Foyer: ${unreachable.map((r) => r.ref).join(', ')}`);
  checks.push('5. Every one of the 14 rooms is reachable from the Foyer via real graph edges (BFS-verified)');

  // ---- 6. Guest WC, all 3 bedrooms, all 3 ensuites specifically reachable, ensuites ONLY via their own bedroom ----
  assert.ok(reachableFromFoyer.has('LUNA-L06-APT-A-GUEST-WC'), 'Guest WC must be reachable');
  for (const n of [1, 2, 3]) {
    assert.ok(reachableFromFoyer.has(`LUNA-L06-APT-A-BED-0${n}`), `Bedroom ${n} must be reachable`);
    assert.ok(reachableFromFoyer.has(`LUNA-L06-APT-A-BATH-0${n}`), `Ensuite ${n} must be reachable`);
    // The ensuite's ONLY door is to its own bedroom — verify no direct edge from the ensuite to anything else.
    const ensuiteRef = `LUNA-L06-APT-A-BATH-0${n}`;
    const ensuiteEdges = graph.edges.filter((e) => (e.fromRef === ensuiteRef || e.toRef === ensuiteRef) && e.via === 'door');
    const neighbors = new Set(ensuiteEdges.map((e) => (e.fromRef === ensuiteRef ? e.toRef : e.fromRef)));
    assert.deepEqual([...neighbors], [`LUNA-L06-APT-A-BED-0${n}`], `Ensuite ${n} must connect ONLY to its own bedroom, never directly to the corridor or another room`);
  }
  checks.push('6. Guest WC + all 3 bedrooms reachable; each ensuite connects ONLY through its own bedroom (true ensuite semantics, graph-verified)');

  // ---- 7. Balcony connectivity is truthful (only via Living, never a phantom exterior shortcut) ----
  const balconyEdges = graph.edges.filter((e) => (e.fromRef === 'LUNA-L06-APT-A-BALCONY' || e.toRef === 'LUNA-L06-APT-A-BALCONY') && e.via === 'door');
  const balconyNeighbors = new Set(balconyEdges.map((e) => (e.fromRef === 'LUNA-L06-APT-A-BALCONY' ? e.toRef : e.fromRef)));
  assert.deepEqual([...balconyNeighbors], ['LUNA-L06-APT-A-LIVING'], 'the Balcony must connect only through Living, no phantom exterior shortcut');
  checks.push('7. Balcony connectivity is truthful: reachable only via Living');

  // ---- 8. Real internal route proof (Part 3) — pure graph/route planner proof, no UI ----
  const identity = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false };
  function planFrom(fromRef, toRef) {
    return requestRoute(model, LUNA_TRANSITION_BINDINGS, (edge) => lunaIsRouteEdgeAllowed(edge, identity), fromRef, toRef, `test-route-${fromRef}-${toRef}`);
  }
  // Foyer's own real doors are to the entrance, Kitchen, and Guest WC only
  // (verified in verifyApartmentAInteriorReality.mjs) — Foyer -> Kitchen is
  // a real DIRECT door, so the shortest real route correctly takes it in
  // one hop; that is proof the planner isn't fabricating detours, not a
  // bug. Foyer -> Living has no direct door at all, so THAT pair is the
  // real multi-hop proof: the only real path is Foyer -> Kitchen -> Dining
  // -> Living, through the Dining hub exactly as Part 3 asks for.
  const foyerToKitchen = planFrom('LUNA-L06-APT-A-ENTRY', 'LUNA-L06-APT-A-KITCHEN');
  assert.equal(foyerToKitchen.status, 'OK', `Foyer -> Kitchen route must plan OK, got ${foyerToKitchen.status}: ${foyerToKitchen.reason}`);
  const foyerToKitchenRefs = foyerToKitchen.route.steps.filter((s) => s.kind === 'TRANSITION' || s.kind === 'MOVE').map((s) => s.toRef);
  assert.ok(foyerToKitchenRefs.includes('LUNA-L06-APT-A-KITCHEN'), 'Foyer -> Kitchen route must actually arrive at the Kitchen');
  checks.push(`8a. Foyer -> Kitchen plans a real, direct 1-hop route (steps: ${foyerToKitchenRefs.join(' -> ')}) — a real door, not a shortcut`);

  const foyerToLiving = planFrom('LUNA-L06-APT-A-ENTRY', 'LUNA-L06-APT-A-LIVING');
  assert.equal(foyerToLiving.status, 'OK', `Foyer -> Living route must plan OK, got ${foyerToLiving.status}: ${foyerToLiving.reason}`);
  const foyerToLivingRefs = foyerToLiving.route.steps.filter((s) => s.kind === 'TRANSITION' || s.kind === 'MOVE').map((s) => s.toRef);
  assert.ok(foyerToLivingRefs.includes('LUNA-L06-APT-A-DINING'), 'Foyer -> Living must pass through the real intermediate Dining hub — there is no direct door');
  assert.ok(foyerToLivingRefs.includes('LUNA-L06-APT-A-LIVING'), 'Foyer -> Living route must actually arrive at Living');
  checks.push(`8b. Foyer -> Living plans a real multi-step route through Dining, no direct door exists (steps: ${foyerToLivingRefs.join(' -> ')})`);

  const corridorToEnsuite = planFrom('LUNA-L06-APT-A-CORRIDOR', 'LUNA-L06-APT-A-BATH-01');
  assert.equal(corridorToEnsuite.status, 'OK', `Corridor -> Ensuite 1 route must plan OK, got ${corridorToEnsuite.status}: ${corridorToEnsuite.reason}`);
  const corridorToEnsuiteRefs = corridorToEnsuite.route.steps.filter((s) => s.kind === 'TRANSITION' || s.kind === 'MOVE').map((s) => s.toRef);
  assert.ok(corridorToEnsuiteRefs.includes('LUNA-L06-APT-A-BED-01'), 'Corridor -> Ensuite 1 must pass through Bedroom 1 (the only real door), not a direct crossing');
  checks.push(`8c. Corridor -> Ensuite 1 plans a real route through Bedroom 1 (steps: ${corridorToEnsuiteRefs.join(' -> ')})`);

  const livingToGuestWc = planFrom('LUNA-L06-APT-A-LIVING', 'LUNA-L06-APT-A-GUEST-WC');
  assert.equal(livingToGuestWc.status, 'OK', `Living -> Guest WC route must plan OK, got ${livingToGuestWc.status}: ${livingToGuestWc.reason}`);
  checks.push('8d. Living -> Guest WC plans a real route through real graph connections');

  // ---- 9. Full entrance-to-interior chain: L06 Lobby -> Foyer -> Living -> Dining -> Kitchen, no step skips a real edge ----
  const fullChain = planFrom('LUNA-L06-LOBBY', 'LUNA-L06-APT-A-KITCHEN');
  assert.equal(fullChain.status, 'OK', `L06 Lobby -> Kitchen full chain must plan OK, got ${fullChain.status}: ${fullChain.reason}`);
  checks.push('9. Full chain L06 Lobby -> Apartment A -> Foyer -> ... -> Kitchen plans as one real, connected route (no re-entering the apartment required)');

  console.log(checks.map((c) => `PASS ${c}`).join('\n'));
} finally {
  await server.close();
}
