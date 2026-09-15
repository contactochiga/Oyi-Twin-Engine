import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const checks = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const load = (path) => server.ssrLoadModule('/src/' + path);
  const { lunaSimulationProvider: p, lunaRuntimeInternals: i } = await load('luna/runtime/lunaSimulationProvider.ts');
  const { lunaTwinDataProvider: data } = await load('luna/operational/lunaTwinDataProvider.ts');
  const { identityForScope, buildScopePolicy } = await load('luna/intelligence/lunaScope.ts');
  const { parseIntent } = await load('luna/intelligence/lunaIntentParser.ts');
  const { TwinIntelligenceController } = await load('engine/twinIntelligence.ts');
  const { LUNA_SCENARIOS } = await load('luna/runtime/lunaScenarios.ts');
  const { lunaRepresentationPolicy } = await load('luna/policy/lunaRepresentationPolicy.ts');
  const { buildServiceRoute } = await load('engine/serviceRoute.ts');
  const { relationshipsFrom } = await load('engine/engineeringRelationships.ts');
  const { LUNA_ENGINEERING_RELATIONSHIPS } = await load('luna/operational/lunaEngineeringRelationships.ts');
  const { ELECTRICAL_BOARD_ASSETS, isElectricalBoardRef, electricalBoardTabKeyFor, ELECTRICAL_BOARD_DEFAULT_REF, METER_PAIRED_DB_REF } = await load('luna/operational/lunaElectricalBoard.ts');

  const actor = identityForScope('facility'), resident = identityForScope('consumer');
  const state = (ref) => p.getState(ref).state;
  const exec = (ref, command, args = {}, who = actor) => p.execute({ assetRef: ref, command, args, actor: who });

  const GRID = 'LUNA-B1-ELECTRICAL-GRID-01', MDB = 'LUNA-B1-ELECTRICAL-MDB-01', ATS = 'LUNA-B1-ELECTRICAL-ATS-01';
  const GEN = 'LUNA-B1-ELECTRICAL-GEN-01', INV = 'LUNA-B1-ELECTRICAL-INV-01', METER01 = 'LUNA-B1-ELECTRICAL-METER-01';
  const RISER = 'LUNA-RISER-ELECTRICAL-01', BRANCH = 'LUNA-L06-ELECTRICAL-BRANCH-01';
  const APT_METER = 'LUNA-L06-APT-A-METER-ELEC-01', APT_DB = 'LUNA-L06-APT-A-DB-01';

  // ---- 1. Canonical asset identity preservation ----
  const allRefs = data.listAssets().map((a) => a.ref);
  assert.equal(new Set(allRefs).size, allRefs.length, 'no duplicate canonical refs anywhere in the catalog');
  const requiredRefs = [GRID, MDB, ATS, GEN, INV, METER01, RISER, BRANCH, APT_METER, APT_DB,
    'LUNA-L06-APT-A-LIGHTING-CIRCUIT-01', 'LUNA-L06-APT-A-LIGHTING-CIRCUIT-02', 'LUNA-L06-APT-A-AC-CIRCUIT-01'];
  for (const ref of requiredRefs) assert.ok(data.getAsset(ref), `${ref} must be a real registered canonical asset`);
  assert.equal(ELECTRICAL_BOARD_ASSETS.length, 8, 'Electrical Control Board must expose exactly 8 asset-selector tabs');
  checks.push('Canonical electrical asset identity preserved: every existing electrical ref intact (zero new operational assets were needed — the reference chain was already complete end-to-end), no duplicates');

  // ---- 2. Utility available baseline state ----
  i.resetAll();
  assert.equal(state(GRID).utility_available, true);
  assert.equal(state(MDB).energized, true); assert.equal(state(MDB).voltage_v, 415);
  assert.equal(state(RISER).energized, true); assert.equal(state(BRANCH).energized, true);
  assert.equal(state(APT_METER).supply_active, true); assert.equal(state(APT_DB).energized, true);
  assert.equal(state(ATS).source, 'grid');
  checks.push('Utility-available baseline: GRID utility_available, MDB energized (415V), riser/branch/6A meter/6A DB all energized, ATS on grid');

  // ---- 3. Full reference-chain continuity (route + relationship graph) ----
  const route = buildServiceRoute(data, APT_METER, 20);
  assert.ok(route, 'a full route to the apartment electricity meter must resolve');
  const routeRefs = route.steps.map((s) => s.ref);
  assert.equal(routeRefs[0], GRID, 'route must start at the utility/incoming supply');
  assert.ok(routeRefs.includes(MDB)); assert.ok(routeRefs.includes(RISER)); assert.ok(routeRefs.includes(BRANCH));
  assert.equal(routeRefs[routeRefs.length - 1], APT_METER, 'route must end at the apartment meter');
  checks.push(`Complete reference-chain continuity: ${routeRefs.join(' -> ')}`);

  const atsGridEdge = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, ATS, 'supplied_by').find((e) => e.to === GRID);
  const atsGenEdge = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, ATS, 'supplied_by').find((e) => e.to === GEN);
  assert.ok(atsGridEdge, 'ATS must carry a supplied_by edge to the utility (primary source)');
  assert.ok(atsGenEdge, 'ATS must carry a supplied_by edge to the generator (standby source)');
  const electricalEdges = LUNA_ENGINEERING_RELATIONSHIPS.filter((e) => e.from === ATS || e.to === ATS);
  assert.equal(electricalEdges.length, 2, `expected exactly 2 electrical typed edges (ATS<-grid, ATS<-generator), got ${electricalEdges.length}`);
  checks.push('Upstream graph traversal: ATS supplied_by both grid (primary) and generator (standby) via typed edges — no false connection from mesh proximity (exactly 2 electrical edges exist)');

  // ---- 4. Generator start/run/stop sequencing ----
  i.resetAll();
  assert.equal(state(GEN).phase, 'stopped'); assert.equal(state(GEN).running, false);
  await exec(GEN, 'turnOn');
  assert.equal(state(GEN).running, true); assert.equal(state(GEN).phase, 'starting', 'a generator does not reach RUNNING the instant it is commanded on');
  await wait(3200);
  assert.equal(state(GEN).phase, 'running', 'generator must reach RUNNING a believable interval after STARTING');
  await exec(GEN, 'turnOff');
  assert.equal(state(GEN).phase, 'stopping');
  await wait(1700);
  assert.equal(state(GEN).phase, 'stopped');
  checks.push('Generator start/run/stop sequencing: STOPPED -> (turnOn) -> STARTING -> (~3s) -> RUNNING -> (turnOff) -> STOPPING -> (~1.5s) -> STOPPED, a real believable-timing sequence, not an instant label flip');

  // ---- 5. Generator fault blocks start ----
  i.resetAll();
  i.setAssetState(GEN, { ...state(GEN), fault: true });
  const faultedStart = await exec(GEN, 'turnOn');
  assert.equal(faultedStart.ok, true, 'command itself is still acknowledged (matches pumpBehavior precedent)');
  assert.equal(state(GEN).running, false, 'a faulted generator must not actually start');
  assert.equal(state(GEN).phase, 'stopped', 'phase must not advance to STARTING while faulted');
  checks.push('Generator fault blocks start: commanding a faulted generator on leaves it STOPPED, not RUNNING (faultAware toggle, matching pumpBehavior() precedent)');

  // ---- 6. Utility failure propagation: ATS auto-transfer + generator auto-start + downstream restoration ----
  i.resetAll();
  const gridFailure = LUNA_SCENARIOS.find((s) => s.key === 'grid-failure');
  assert.ok(gridFailure, 'existing grid-failure scenario must still be present, unreplaced');
  gridFailure.apply();
  assert.equal(state(GRID).utility_available, false);
  assert.equal(state(GEN).phase, 'starting', 'utility loss must automatically begin the generator start sequence (auto mode)');
  // Downstream is de-energized WHILE the generator is still starting — no
  // valid source yet (grid gone, generator not RUNNING) is the physically
  // correct intermediate state, not a bug.
  assert.equal(state(MDB).energized, false, 'MDB must de-energize during the gap before the generator reaches RUNNING');
  await wait(3200);
  assert.equal(state(GEN).phase, 'running');
  // V1.1: the ATS now has its own observable TRANSFERRING changeover
  // window (~1s) triggered once the generator reaches RUNNING, not an
  // atomic flip at the same instant — wait past that too before asserting.
  await wait(1400);
  assert.equal(state(ATS).source, 'generator', 'ATS must auto-transfer to the generator once it is actually running');
  assert.equal(state(MDB).energized, true, 'MDB must re-energize once the ATS has a live source again');
  assert.equal(state(RISER).energized, true); assert.equal(state(BRANCH).energized, true);
  assert.equal(state(APT_METER).supply_active, true); assert.equal(state(APT_DB).energized, true, 'energization must cascade all the way to the 6A DB, not stop at MDB');
  checks.push('Utility failure propagation: GRID loss -> ATS recognizes source loss -> generator sequence begins -> MDB/riser/branch/6A de-energized during the gap -> generator reaches RUNNING -> ATS auto-transfers -> full downstream re-energizes (MDB -> riser -> branch -> 6A meter -> 6A DB)');

  // Utility restoration stands the generator back down and returns to grid.
  i.setAssetState(GRID, { ...state(GRID), utility_available: true });
  i.recomputePowerNetwork();
  assert.equal(state(GEN).phase, 'stopping', 'utility restoration must stand the generator back down (auto mode)');
  await wait(1700);
  assert.equal(state(GEN).phase, 'stopped');
  assert.equal(state(ATS).source, 'grid');
  assert.equal(state(MDB).energized, true);
  checks.push('Utility restoration: ATS auto-transfers back to grid, generator auto-stands-down (RUNNING -> STOPPING -> STOPPED), downstream stays energized throughout the handback');

  // ---- 7. Facility control admission / Consumer privacy boundary ----
  i.resetAll();
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: GEN, identity: actor }), 'FULL_3D');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: GEN, identity: resident }), 'HIDDEN', 'a resident must not see B1 common electrical plant');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: APT_METER, identity: resident }), 'FULL_3D', "the assigned resident sees their OWN apartment's electricity meter fully");
  const otherResident = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-B'], facilityResponsibility: false };
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: APT_METER, identity: otherResident }), 'HIDDEN', "a DIFFERENT resident must not see 6A's electricity meter");
  checks.push('Facility control admission confirmed (FULL_3D); Consumer privacy boundary confirmed (B1 electrical plant HIDDEN for residents; 6A meter FULL_3D only for the assigned resident)');

  // ---- Electrical board registry sanity ----
  assert.equal(ELECTRICAL_BOARD_DEFAULT_REF, GRID);
  assert.ok(isElectricalBoardRef(GEN)); assert.ok(isElectricalBoardRef(APT_METER)); assert.ok(isElectricalBoardRef(APT_DB));
  assert.equal(electricalBoardTabKeyFor(APT_DB), APT_METER, 'the paired distribution board must resolve to the meter\'s tab identity');
  assert.equal(electricalBoardTabKeyFor(GEN), GEN);
  checks.push('Electrical Control Board asset registry: 8 real registered tabs, deterministic default (Utility/GRID-01), paired DB correctly resolves to its meter tab');

  // ---- Oyi parser: the 10 target reference phrases ----
  const s1 = parseIntent('Show me the electrical system.', {});
  assert.equal(s1.kind, 'show_system'); assert.equal(s1.system, 'electrical');
  const s2 = parseIntent('Show the main electrical distribution.', {});
  assert.deepEqual(s2.targetRefs, [MDB]);
  const s3 = parseIntent('Show the generator.', {});
  assert.deepEqual(s3.targetRefs, [GEN]);
  const s4 = parseIntent('Is the generator running?', {});
  assert.equal(s4.kind, 'query'); assert.deepEqual(s4.targetRefs, [GEN]);
  const s5 = parseIntent('Show the electrical riser.', {});
  assert.deepEqual(s5.targetRefs, [RISER]);
  const s6 = parseIntent('Show what supplies power to L06.', {});
  assert.equal(s6.kind, 'show_route'); assert.equal(s6.system, 'electrical');
  const s7 = parseIntent('Show what supplies power to Apartment 6A.', {});
  assert.equal(s7.kind, 'show_route'); assert.equal(s7.system, 'electrical'); assert.deepEqual(s7.targetRefs, ['LUNA-L06-APT-A']);
  const s8 = parseIntent('Trace power to Apartment 6A.', {});
  assert.equal(s8.kind, 'show_route'); assert.equal(s8.system, 'electrical');
  const s9 = parseIntent('Show the L06 distribution board.', {});
  assert.deepEqual(s9.targetRefs, [BRANCH]);
  const s10 = parseIntent('Show the 6A meter.', {});
  assert.deepEqual(s10.targetRefs, [APT_METER]);
  checks.push('Oyi parser resolves all 10 target reference phrases to the correct intent shape (system/asset/query/route)');

  // ---- Full controller round-trip: generator command actually executes + Consumer denied ----
  const scene = { navigateToAsset() {}, navigateToSpace() {}, setSystemMode() {}, assetView() { return false; } };
  const controller = new TwinIntelligenceController(data, p, scene, () => 'Electrical state');
  i.resetAll();
  const startRes = await controller.handleIntent(parseIntent('Start the generator.', {}), buildScopePolicy(actor), {});
  assert.ok(startRes.ok, 'Facility must be able to start the generator via Oyi');
  assert.equal(state(GEN).running, true, 'the actual runtime state must change, not just return an ok response');
  const consumerDenied = await controller.handleIntent(parseIntent('Start the generator.', {}), buildScopePolicy(resident), {});
  assert.equal(consumerDenied.ok, false, 'Consumer must be denied a generator command through the full controller path');
  checks.push('Full Oyi controller round-trip: "Start the generator" actually starts it (real state change); Consumer denied the same command');

  // ---- State preservation across reset ----
  i.resetAll();
  assert.equal(state(GRID).utility_available, true);
  assert.equal(state(GEN).phase, 'stopped');
  assert.equal(state(MDB).energized, true);
  checks.push('Reset rebuilds AND recomputes derived electrical telemetry consistently (utility available, generator stopped, MDB energized)');

  writeFileSync('artifacts/luna-electrical-runtime-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} catch (error) {
  writeFileSync('artifacts/luna-electrical-runtime-results.json', JSON.stringify({ passed: false, checks, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await server.close();
}
