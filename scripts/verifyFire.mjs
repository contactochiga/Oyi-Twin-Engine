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
  const { buildServiceRoute } = await load('engine/serviceRoute.ts');
  const { relationshipsFrom } = await load('engine/engineeringRelationships.ts');
  const { LUNA_ENGINEERING_RELATIONSHIPS } = await load('luna/operational/lunaEngineeringRelationships.ts');
  const { resolveFireState } = await load('luna/runtime/lunaFireResolver.ts');
  const { explainAsset } = await load('luna/intelligence/lunaExplain.ts');
  const { FIRE_BOARD_ASSETS, isFireBoardRef, fireBoardTabKeyFor, FIRE_BOARD_DEFAULT_REF } = await load('luna/operational/lunaFireBoard.ts');

  const actor = identityForScope('facility'), resident = identityForScope('consumer');
  const state = (ref) => p.getState(ref).state;
  const exec = (ref, command, args = {}, who = actor) => p.execute({ assetRef: ref, command, args, actor: who });

  const PANEL = 'LUNA-B1-FIRE-PANEL-01', PUMP = 'LUNA-B1-FIRE-PUMP-01', TANK = 'LUNA-B1-FIRE-TANK-01';
  const GROUND_DET = 'LUNA-GROUND-FIRE-DET-01', SMOKE_DET = 'LUNA-L06-APT-A-ENTRY-SMOKE-01';
  const RISER = 'LUNA-RISER-FIRE-01', BRANCH = 'LUNA-L06-FIRE-BRANCH-01';

  // ---- 1. Canonical identity preservation ----
  const allRefs = data.listAssets().map((a) => a.ref);
  assert.equal(new Set(allRefs).size, allRefs.length, 'no duplicate canonical refs anywhere in the catalog');
  for (const ref of [PANEL, PUMP, TANK, GROUND_DET, SMOKE_DET, RISER, BRANCH]) assert.ok(data.getAsset(ref), `${ref} must be a real registered canonical asset`);
  assert.equal(FIRE_BOARD_ASSETS.length, 7, 'Fire Control Board must expose exactly 7 asset-selector tabs');
  checks.push('Canonical fire asset identity preserved: every existing fire ref intact (zero new operational assets were needed), no duplicates');

  // ---- 2. NORMAL fire state ----
  i.resetAll();
  let fire = resolveFireState();
  assert.ok(fire, 'resolver must return live state once the store is built');
  assert.equal(fire.fireState, 'normal');
  assert.equal(fire.alarmActive, false);
  assert.equal(fire.activeAlarmDeviceCount, 0);
  assert.equal(fire.originatingZoneRef, null);
  assert.equal(fire.controllerCommunicationOk, true);
  checks.push('NORMAL fire state: resolver reports normal, no active alarm devices, no originating zone, controller communication OK');

  // ---- 3. Detector alarm -> ALARM building-state resolution -> originating device/level ----
  const smokeAlert = LUNA_SCENARIOS.find((s) => s.key === 'smoke-alert');
  assert.ok(smokeAlert, 'existing smoke-alert scenario must still be present, unreplaced');
  smokeAlert.apply();
  fire = resolveFireState();
  assert.equal(fire.fireState, 'alarm');
  assert.equal(fire.alarmActive, true);
  assert.equal(fire.activeAlarmDeviceCount, 1);
  assert.equal(fire.originatingZoneRef, SMOKE_DET, 'originating device must resolve to the actual detector that alarmed');
  assert.equal(fire.affectedLevelRef, 'LUNA-L06', 'affected level must resolve from the originating device\'s ownerLevelRef');
  checks.push('Detector alarm -> ALARM building-state resolution: originating device (6A entry smoke detector) and affected level (L06) both correctly resolved from live state, never inferred from geometry');

  // ---- 4. Event ordering ----
  const events = i.getFireEvents();
  assert.ok(events.length >= 1);
  assert.equal(events[0].label, 'Detector alarm received', 'events must be newest-first');
  checks.push('Event ordering: fire event log records the detector alarm, newest-first');

  // ---- 5. Alarm clear/recovery ----
  // SMOKE_DET is observable (no user-facing command) — a real detector
  // clearing after the smoke condition resolves is a facility/external
  // event, the same category a scenario represents, not a user command.
  i.setAssetState(SMOKE_DET, { ...state(SMOKE_DET), smoke: false });
  i.recomputeFireNetwork();
  fire = resolveFireState();
  assert.equal(fire.fireState, 'normal', 'clearing the detector must return the building fire state to normal');
  assert.equal(fire.alarmActive, false);
  const eventsAfterClear = i.getFireEvents().map((e) => e.label);
  assert.ok(eventsAfterClear.includes('Alarm cleared'), 'a real "Alarm cleared" event must be recorded, not silently dropped');
  checks.push('Alarm clear/recovery: clearing the originating detector returns the building fire state to NORMAL and records a real "Alarm cleared" event');

  // ---- 6. Controller fault/trouble ----
  i.setAssetState(PANEL, { ...state(PANEL), trouble: true }, 'warning');
  i.recomputeFireNetwork();
  fire = resolveFireState();
  assert.equal(fire.fireState, 'trouble', 'a panel trouble condition (independent of any alarm) must resolve the building state to TROUBLE');
  assert.equal(fire.troubleActive, true);
  const eventsAfterTrouble = i.getFireEvents().map((e) => e.label);
  assert.ok(eventsAfterTrouble.includes('Controller trouble/fault'));
  checks.push('Controller fault/trouble: an independent panel trouble condition correctly resolves the building fire state to TROUBLE and is logged');
  i.resetAll();

  // ---- 7. Fire pump state (real, controllable) ----
  assert.equal(state(PUMP).running, false);
  await exec(PUMP, 'turnOn');
  assert.equal(state(PUMP).running, true);
  assert.ok(state(PUMP).pressure_bar > 0, 'starting the fire pump must produce real pressure telemetry, not just a label flip');
  fire = resolveFireState();
  assert.equal(fire.pump.running, true);
  assert.equal(fire.riserPressurized, true, 'the hydraulic network must reflect the pump — riser pressurizes');
  assert.equal(state(RISER).pressurized, true);
  assert.equal(state(BRANCH).pressurized, true, 'the L06 fire zone must mirror the riser (hydraulic cascade)');
  await exec(PUMP, 'turnOff');
  assert.equal(state(RISER).pressurized, false, 'stopping the pump must depressurize the riser');
  checks.push('Fire pump state: Start/Stop produce real running/pressure_bar telemetry; the hydraulic network (riser + L06 zone) correctly cascades from the pump, independently of the alarm network');

  // ---- 8. Fire-water route continuity ----
  const route = buildServiceRoute(data, BRANCH, 20);
  assert.ok(route, 'a full route to the L06 fire zone must resolve');
  const routeRefs = route.steps.map((s) => s.ref);
  assert.ok(routeRefs.includes(RISER)); assert.ok(routeRefs.includes(PUMP));
  assert.equal(routeRefs[routeRefs.length - 1], BRANCH);
  checks.push(`Fire-water route continuity: ${routeRefs.join(' -> ')}`);

  // ---- 9. Alarm network relationship continuity + no false connection from mesh proximity ----
  const pumpSupply = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, PUMP, 'supplied_by').find((e) => e.to === TANK);
  assert.ok(pumpSupply, 'the fire pump must carry a supplied_by edge to the fire tank (its real hydraulic source, distinct from its alarm-network parentRef to the panel)');
  const fireEdges = LUNA_ENGINEERING_RELATIONSHIPS.filter((e) => e.from === PUMP || e.to === PUMP);
  assert.equal(fireEdges.length, 1, `expected exactly 1 fire typed edge (pump<-tank), got ${fireEdges.length} — nothing inferred from geometry, which this test never reads`);
  checks.push('Alarm/hydraulic network relationship continuity: fire pump supplied_by fire tank via a typed edge; no false connection from mesh proximity (exactly 1 fire edge exists)');

  // ---- 10. Fire Control Board registry sanity ----
  assert.equal(FIRE_BOARD_DEFAULT_REF, PANEL);
  assert.ok(isFireBoardRef(PUMP)); assert.ok(isFireBoardRef(SMOKE_DET)); assert.ok(isFireBoardRef(GROUND_DET));
  assert.equal(fireBoardTabKeyFor(PUMP), PUMP);
  checks.push('Fire Control Board asset registry: 7 real registered tabs, deterministic default (Panel)');

  // ---- 11. Oyi target phrases ----
  i.resetAll();
  const s1 = parseIntent('What is the fire status of Luna?', {});
  assert.equal(s1.kind, 'query'); assert.deepEqual(s1.targetRefs, [PANEL]);
  const s2 = parseIntent('Where is the alarm?', {});
  assert.deepEqual(s2.targetRefs, [PANEL]);
  const s3 = parseIntent('What triggered the alarm?', {});
  assert.deepEqual(s3.targetRefs, [PANEL]);
  const s4 = parseIntent('Show the fire pump.', {});
  assert.deepEqual(s4.targetRefs, [PUMP]);
  const s5 = parseIntent('Is the fire pump running?', {});
  assert.equal(s5.kind, 'query'); assert.deepEqual(s5.targetRefs, [PUMP]);
  const s6 = parseIntent('Show the fire riser.', {});
  assert.deepEqual(s6.targetRefs, [RISER]);
  checks.push('Oyi parser resolves all fire target reference phrases to the correct intent shape (system/asset/query)');

  // ---- 12. Oyi narrative correctness ----
  smokeAlert.apply();
  const statusText = explainAsset(data, p, PANEL);
  assert.match(statusText, /ALARM/);
  assert.match(statusText, /Entry Smoke Detector/);
  assert.match(statusText, /LUNA-L06/);
  checks.push(`Oyi "what is the fire status"/"where is the alarm"/"what triggered it" all resolve to the SAME live narrative: "${statusText}"`);
  i.resetAll();

  // ---- 13. Facility permissions / Consumer boundaries ----
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: PANEL, identity: actor }), 'FULL_3D');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: PANEL, identity: resident }), 'HIDDEN', 'a resident must not see B1 common fire plant equipment');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: SMOKE_DET, identity: resident }), 'FULL_3D', "the assigned resident sees their OWN apartment's smoke detector fully");
  const otherResident = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-B'], facilityResponsibility: false };
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: SMOKE_DET, identity: otherResident }), 'HIDDEN', "a DIFFERENT resident must not see 6A's smoke detector");
  checks.push('Facility control admission confirmed (FULL_3D); Consumer privacy boundary confirmed (B1 fire plant HIDDEN for residents; 6A smoke detector FULL_3D only for the assigned resident)');

  // ---- 14. Full Oyi controller round-trip ----
  const scene = { navigateToAsset() {}, navigateToSpace() {}, setSystemMode() {}, assetView() { return false; } };
  const controller = new TwinIntelligenceController(data, p, scene, (ref) => explainAsset(data, p, ref));
  const startRes = await controller.handleIntent(parseIntent('Start the fire pump.', {}), buildScopePolicy(actor), {});
  assert.ok(startRes.ok, 'Facility must be able to start the fire pump via Oyi (a real, non-life-safety-overriding reference test capability)');
  assert.equal(state(PUMP).running, true);
  const consumerDenied = await controller.handleIntent(parseIntent('Start the fire pump.', {}), buildScopePolicy(resident), {});
  assert.equal(consumerDenied.ok, false, 'Consumer must be denied a fire pump command through the full controller path');
  checks.push('Full Oyi controller round-trip: "Start the fire pump" actually starts it (real state change); Consumer denied the same command');

  // ---- 15. Safety boundary: panel silence/reset remain unmapped (no fabricated life-safety authority) ----
  i.resetAll();
  assert.deepEqual(p.getState(PANEL).availableCommands, [], 'the fire panel must expose zero commands — silence/reset are deliberately not wired to any runtime command, matching the pre-existing architectural decision and Part 6\'s non-negotiable safety boundary');
  checks.push('Safety boundary preserved: the fire alarm panel exposes zero commands (silence/reset remain unmapped) — Oyi cannot fabricate life-safety control authority');

  writeFileSync('artifacts/luna-fire-life-safety-runtime-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} catch (error) {
  writeFileSync('artifacts/luna-fire-life-safety-runtime-results.json', JSON.stringify({ passed: false, checks, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await server.close();
}
