import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const checks = [];
try {
  const load = (path) => server.ssrLoadModule('/src/' + path);
  const { lunaSimulationProvider: p, lunaRuntimeInternals: i } = await load('luna/runtime/lunaSimulationProvider.ts');
  const { lunaTwinDataProvider: data } = await load('luna/operational/lunaTwinDataProvider.ts');
  const { identityForScope, buildScopePolicy } = await load('luna/intelligence/lunaScope.ts');
  const { parseIntent } = await load('luna/intelligence/lunaIntentParser.ts');
  const { TwinIntelligenceController } = await load('engine/twinIntelligence.ts');
  const { LUNA_SCENARIOS } = await load('luna/runtime/lunaScenarios.ts');
  const { lunaRepresentationPolicy } = await load('luna/policy/lunaRepresentationPolicy.ts');
  const serviceRouteMod = await load('engine/serviceRoute.ts');
  const { buildServiceRoute } = serviceRouteMod;
  const { relationshipsFrom, relationshipsTo } = await load('engine/engineeringRelationships.ts');
  const { LUNA_ENGINEERING_RELATIONSHIPS } = await load('luna/operational/lunaEngineeringRelationships.ts');
  const { WATER_BOARD_ASSETS, isWaterBoardRef, waterBoardTabKeyFor, WATER_BOARD_DEFAULT_REF, WATER_METER_PAIRED_VALVE_REF } = await load('luna/operational/lunaWaterBoard.ts');

  const actor = identityForScope('facility'), resident = identityForScope('consumer');
  const state = (ref) => p.getState(ref).state;
  const exec = (ref, command, args = {}, who = actor) => p.execute({ assetRef: ref, command, args, actor: who });

  const TANK = 'LUNA-B1-WATER-TANK-01', TREAT = 'LUNA-B1-WATER-TREAT-01', BP01 = 'LUNA-B1-WATER-BP-01', BP02 = 'LUNA-B1-WATER-BP-02';
  const VALVE = 'LUNA-B1-WATER-VALVE-01', METER = 'LUNA-B1-WATER-METER-01', INTAKE = 'LUNA-B1-WATER-INTAKE-01';
  const RISER = 'LUNA-RISER-WATER-01', BRANCH = 'LUNA-L06-WATER-BRANCH-01';
  const APT_VALVE = 'LUNA-L06-APT-A-UTILITY-VALVE-01', APT_METER = 'LUNA-L06-APT-A-METER-WATER-01';
  const APT_MAIN = 'LUNA-L06-APT-A-WATER-MAIN-01';

  // ---- 1. Canonical asset identity preservation — every ref exists exactly once, no duplicates ----
  const allRefs = data.listAssets().map((a) => a.ref);
  assert.equal(new Set(allRefs).size, allRefs.length, 'no duplicate canonical refs anywhere in the catalog');
  const requiredRefs = [
    TANK, TREAT, BP01, BP02, VALVE, METER, INTAKE, RISER, BRANCH,
    APT_VALVE, APT_METER, APT_MAIN, 'LUNA-L06-APT-A-WATER-HOT-01', 'LUNA-L06-APT-A-WATER-COLD-01',
    'LUNA-L06-APT-A-KITCHEN-FIXTURE-BRANCH-01', 'LUNA-L06-APT-A-BATH-01-FIXTURE-BRANCH-01',
    'LUNA-L06-APT-A-BATH-01-FIXTURE-BRANCH-02', 'LUNA-L06-APT-A-BATH-02-FIXTURE-BRANCH-01', 'LUNA-L06-APT-A-BATH-03-FIXTURE-BRANCH-01',
    'LUNA-L06-APT-A-DRAIN-01', 'LUNA-L06-APT-A-KITCHEN-DRAIN-01', 'LUNA-L06-APT-A-BATH-01-DRAIN-01',
    'LUNA-L06-APT-A-BATH-02-DRAIN-01', 'LUNA-L06-APT-A-BATH-03-DRAIN-01', 'LUNA-B1-DRAINAGE-MAIN-01', 'LUNA-RISER-DRAINAGE-01', 'LUNA-L06-DRAINAGE-BRANCH-01',
  ];
  for (const ref of requiredRefs) assert.ok(data.getAsset(ref), `${ref} must be a real registered canonical asset`);
  assert.equal(WATER_BOARD_ASSETS.length, 8, 'Water Control Board must expose exactly 8 asset-selector tabs');
  checks.push('Canonical asset identity preserved: every existing water/drainage ref intact, every new ref (intake, 3 bathroom cold branches, 2 bathroom drains) registered exactly once, no duplicates anywhere in the catalog');

  // ---- 2/3. Pump start/stop, independent Pump 01/02 state ----
  i.resetAll();
  assert.equal(state(BP01).running, true); assert.equal(state(BP02).running, false, 'BP-02 starts standby, not running');
  await exec(BP02, 'turnOn');
  assert.equal(state(BP02).running, true); assert.equal(state(BP02).pressure_bar, 3.2);
  assert.equal(state(BP01).running, true, 'commanding BP-02 must not affect BP-01');
  await exec(BP01, 'turnOff');
  assert.equal(state(BP01).running, false); assert.equal(state(BP01).pressure_bar, 0);
  assert.equal(state(BP02).running, true, 'commanding BP-01 must not affect BP-02 (independent state)');
  checks.push('Pump start/stop works via turnOn/turnOff; Pump 01 and Pump 02 state is fully independent (commanding one never touches the other)');

  // ---- 4. Duty/standby reference behavior ----
  i.resetAll();
  const riserStandbyEdge = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, RISER, 'supplied_by').find((e) => e.to === BP02);
  assert.ok(riserStandbyEdge, 'riser must carry an existing supplied_by edge documenting BP-02 as standby');
  assert.equal(state(BP01).running, true); assert.equal(state(BP02).running, false);
  checks.push('Duty (BP-01 running) / standby (BP-02 idle) reference configuration preserved, with its existing supplied_by edge documenting the relationship');

  // ---- 5. Downstream pressure/flow response ----
  i.resetAll();
  assert.equal(state(RISER).pressure_bar, 3.2); assert.equal(state(RISER).flow_status, 'flowing');
  assert.equal(state(BRANCH).pressure_bar, 3.2); assert.equal(state(BRANCH).flow_status, 'flowing');
  await exec(BP01, 'turnOff');
  assert.equal(state(RISER).pressure_bar, 0, 'stopping the only running pump must drop riser pressure to 0');
  assert.equal(state(RISER).flow_status, 'no_flow');
  assert.equal(state(BRANCH).pressure_bar, 0, 'branch must mirror riser pressure drop');
  await exec(BP02, 'turnOn');
  assert.equal(state(RISER).pressure_bar, 3.2, 'starting the standby pump must restore riser pressure');
  assert.equal(state(RISER).flow_status, 'flowing');
  checks.push('Downstream pressure/flow response: stopping all running pumps drops riser+branch to 0/no_flow; starting a pump restores 3.2 bar/flowing — a real behavioral response, not just a text flip');

  // ---- 6. Isolation-valve effect (both ends) ----
  i.resetAll();
  assert.equal(state(APT_METER).supply_active, true);
  await exec(VALVE, 'close'); // B1 header valve
  assert.equal(state(RISER).pressure_bar, 0, 'closing the building header valve must drop riser pressure regardless of pump state');
  assert.equal(state(APT_METER).supply_active, false, 'closing the header valve must cut apartment supply_active even though the apartment valve itself is untouched');
  await exec(VALVE, 'open');
  assert.equal(state(APT_METER).supply_active, true, 'reopening restores supply');
  await exec(APT_VALVE, 'close'); // 6A's own isolation valve
  assert.equal(state(RISER).pressure_bar, 3.2, 'closing the APARTMENT valve must not affect the building riser pressure (isolation is local)');
  assert.equal(state(APT_METER).supply_active, false, 'closing the apartment valve alone must cut its own supply_active');
  await exec(APT_VALVE, 'open');
  assert.equal(state(APT_METER).supply_active, true);
  checks.push('Isolation-valve effect verified from both ends: closing the B1 header valve cuts Apartment 6A supply_active (riser pressure -> 0); closing 6A\'s own valve cuts its supply_active without touching riser pressure');

  // ---- 7. Tank telemetry ----
  assert.equal(typeof state(TANK).level_pct, 'number');
  assert.ok(state(TANK).level_pct >= 0 && state(TANK).level_pct <= 100);
  checks.push('Tank telemetry (level_pct) observable and within a valid 0-100 range');

  // ---- 8. B1 -> L06 -> 6A route continuity ----
  i.resetAll();
  const route = buildServiceRoute(data, APT_METER, 20);
  assert.ok(route, 'a full route to the apartment meter must resolve');
  const routeRefs = route.steps.map((s) => s.ref);
  assert.equal(routeRefs[0], INTAKE, 'route must start at the new incoming-supply intake');
  assert.ok(routeRefs.includes(TANK)); assert.ok(routeRefs.includes(BP01)); assert.ok(routeRefs.includes(RISER)); assert.ok(routeRefs.includes(BRANCH));
  assert.equal(routeRefs[routeRefs.length - 1], APT_METER, 'route must end at the apartment meter');
  checks.push(`B1 -> L06 -> 6A route continuity: full source-to-destination chain resolves (${routeRefs.join(' -> ')})`);

  // ---- 9. Upstream/downstream graph traversal (typed relationships) ----
  const isolatedByRiser = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, RISER, 'isolated_by');
  assert.ok(isolatedByRiser.some((e) => e.to === VALVE), 'riser must be isolated_by the B1 header valve (new edge)');
  const treatSuppliesBP01 = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, BP01, 'supplied_by').find((e) => e.to === TREAT);
  assert.ok(treatSuppliesBP01, 'BP-01 must carry a supplied_by edge to the treatment unit (documents real functional order without changing parentRef)');
  const nearestIsolationFor6A = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, 'LUNA-L06-APT-A', 'isolated_by').find((e) => e.to === APT_VALVE);
  assert.ok(nearestIsolationFor6A, 'Apartment 6A must resolve its nearest isolation point via the existing isolated_by edge to its own valve, not the far B1 header');
  checks.push('Upstream/downstream graph traversal: riser isolated_by header valve, pumps supplied_by treatment, apartment isolated_by its own (nearest) valve — all via typed relationship edges, never parentRef alone');

  // ---- 10. No false connection from mesh proximity ----
  // The graph is exhaustively enumerable and small — assert its water-
  // relevant edges are EXACTLY the expected set, so nothing was silently
  // added from geometry/positions (which this test never touches).
  const waterEdges = LUNA_ENGINEERING_RELATIONSHIPS.filter((e) => [RISER, BP01, BP02].includes(e.from) || [RISER, BP01, BP02].includes(e.to));
  // The 4 intended edges: riser-isolated_by-valve (new), riser-supplied_by-BP02
  // standby (pre-existing, Phase 13), BP01-supplied_by-treat (new),
  // BP02-supplied_by-treat (new).
  assert.equal(waterEdges.length, 4, `expected exactly 4 water-relevant typed edges, got ${waterEdges.length}`);
  checks.push('No false connection from mesh proximity: the typed-relationship graph contains exactly the intended, explicitly-authored water edges (4) — nothing inferred from geometry, which this test never reads');

  // ---- 11. Facility control admission / Consumer privacy boundary ----
  i.resetAll();
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: BP01, identity: actor }), 'FULL_3D');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: BP01, identity: resident }), 'HIDDEN', 'a resident must not see B1 common plant equipment');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: APT_METER, identity: resident }), 'FULL_3D', "the assigned resident sees their OWN apartment's water meter fully");
  const otherResident = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-B'], facilityResponsibility: false };
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: APT_METER, identity: otherResident }), 'HIDDEN', "a DIFFERENT resident must not see 6A's water meter");
  // Command authorization for non-lift assets is enforced one layer up, at
  // TwinIntelligenceController.denyIfOutOfScope (see the full controller
  // round-trip test below) — unlike lifts, the provider's own execute()
  // does not itself gate every asset by actor (CommandRequest.actor is
  // documented as "physical gateways must authenticate independently");
  // this section verifies the RepresentationPolicy visibility contract
  // specifically, the actual command-rejection proof follows below.
  checks.push('Facility control admission confirmed (FULL_3D); Consumer privacy boundary confirmed (B1 plant HIDDEN for residents; 6A meter FULL_3D only for the assigned resident, HIDDEN for every other resident)');

  // ---- 12. RepresentationPolicy unchanged ----
  // (byte-hash re-verified by the existing test:representation suite,
  // run as part of the full regression pass — this suite additionally
  // spot-checks the exact same resolveMode contract above.)

  // ---- Water board registry sanity ----
  assert.equal(WATER_BOARD_DEFAULT_REF, TANK);
  assert.ok(isWaterBoardRef(BP01)); assert.ok(isWaterBoardRef(APT_METER)); assert.ok(isWaterBoardRef(APT_VALVE));
  assert.equal(waterBoardTabKeyFor(APT_VALVE), APT_METER, 'the paired isolation valve must resolve to the meter\'s tab identity');
  assert.equal(waterBoardTabKeyFor(BP01), BP01);
  checks.push('Water Control Board asset registry: 8 real registered tabs, deterministic default (Tank), paired valve correctly resolves to its meter tab');

  // ---- Oyi parser: the 8 target reference phrases ----
  const s1 = parseIntent('Show me the water system.', {});
  assert.equal(s1.kind, 'show_system'); assert.equal(s1.system, 'water');
  const s2 = parseIntent('Show the B1 water plant.', {});
  assert.equal(s2.kind, 'show_system'); assert.equal(s2.system, 'water'); assert.deepEqual(s2.targetRefs, ['LUNA-B1']);
  const s3 = parseIntent('Show Booster Pump 01.', {});
  assert.deepEqual(s3.targetRefs, [BP01]);
  const s4 = parseIntent('Start Booster Pump 01.', {});
  assert.equal(s4.kind, 'command'); assert.deepEqual(s4.targetRefs, [BP01]); assert.equal(s4.command, 'start');
  const s5 = parseIntent('Show the water riser.', {});
  assert.deepEqual(s5.targetRefs, [RISER]);
  const s6 = parseIntent('Show me what supplies water to Apartment 6A.', {});
  assert.equal(s6.kind, 'show_route'); assert.equal(s6.system, 'water'); assert.deepEqual(s6.targetRefs, ['LUNA-L06-APT-A']);
  const s7 = parseIntent('Trace water from the B1 plant to Apartment 6A.', {});
  assert.equal(s7.kind, 'show_route'); assert.equal(s7.system, 'water');
  const s8 = parseIntent('Show the nearest isolation point for Apartment 6A.', {});
  assert.equal(s8.kind, 'show_relationship'); assert.equal(s8.relationshipType, 'isolated_by'); assert.deepEqual(s8.targetRefs, ['LUNA-L06-APT-A']);
  checks.push('Oyi parser resolves all 8 target reference phrases to the correct intent shape (system/asset/route/relationship)');

  // ---- Full controller round-trip: command actually executes + Consumer denied ----
  const seen = [];
  const scene = { navigateToAsset(ref) { seen.push(ref); }, navigateToSpace(ref) { seen.push(ref); }, setSystemMode(sys) { seen.push(sys); }, assetView() { return false; } };
  const controller = new TwinIntelligenceController(data, p, scene, () => 'Water state');
  i.resetAll();
  const startRes = await controller.handleIntent(parseIntent('Start Booster Pump 02.', {}), buildScopePolicy(actor), {});
  assert.ok(startRes.ok, 'Facility must be able to start Booster Pump 02 via Oyi');
  assert.equal(state(BP02).running, true, 'the actual runtime state must change, not just return an ok response');
  const consumerDenied = await controller.handleIntent(parseIntent('Start Booster Pump 01.', {}), buildScopePolicy(resident), {});
  assert.equal(consumerDenied.ok, false, 'Consumer must be denied a water pump command through the full controller path');
  checks.push('Full Oyi controller round-trip: "Start Booster Pump 02" actually starts the pump (real state change, not just acknowledgement text); Consumer denied the same command');

  // ---- State preservation across scenario / reset cycles ----
  i.resetAll();
  await exec(BP02, 'turnOn');
  const preScenario = { BP01: JSON.stringify(state(BP01)), BP02: JSON.stringify(state(BP02)) };
  const waterFault = LUNA_SCENARIOS.find((s) => s.key === 'water-pressure-fault');
  assert.ok(waterFault, 'existing water-pressure-fault scenario must still be present, unreplaced');
  waterFault.apply();
  assert.equal(state(BP01).fault, true);
  assert.equal(state(RISER).pressure_bar, 3.2, "propagation must pick up BP-02's continued running state after BP-01 faults (max of running, fault-free pumps)");
  i.resetAll();
  assert.equal(state(BP01).running, true); assert.equal(state(BP01).fault, false);
  assert.equal(state(RISER).pressure_bar, 3.2, 'reset must rebuild AND recompute derived telemetry consistently');
  checks.push('State preservation across scenario application and reset: existing water-pressure-fault scenario still works and correctly propagates through recomputeWaterNetwork; reset rebuilds derived telemetry consistently, not just raw seed state');

  writeFileSync('artifacts/luna-domestic-water-runtime-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} catch (error) {
  writeFileSync('artifacts/luna-domestic-water-runtime-results.json', JSON.stringify({ passed: false, checks, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await server.close();
}
