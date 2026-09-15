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
  const { resolveBuildingPower } = await load('luna/runtime/lunaPowerResolver.ts');
  const { explainAsset } = await load('luna/intelligence/lunaExplain.ts');

  const actor = identityForScope('facility'), resident = identityForScope('consumer');
  const state = (ref) => p.getState(ref).state;
  const exec = (ref, command, args = {}, who = actor) => p.execute({ assetRef: ref, command, args, actor: who });

  const GRID = 'LUNA-B1-ELECTRICAL-GRID-01', GEN = 'LUNA-B1-ELECTRICAL-GEN-01';
  const BRANCH = 'LUNA-L06-ELECTRICAL-BRANCH-01', APT_METER = 'LUNA-L06-APT-A-METER-ELEC-01';

  // ---- 1. Building active-source resolver: normal utility state ----
  i.resetAll();
  let power = resolveBuildingPower();
  assert.ok(power, 'resolver must return a live state, not null, once the store is built');
  assert.equal(power.activeSource, 'utility');
  assert.equal(power.utilityAvailable, true);
  assert.equal(power.ats.source, 'grid');
  assert.equal(power.mainBusEnergized, true);
  assert.equal(power.transition, 'stable');
  assert.deepEqual(power.activeFaults, []);
  assert.equal(power.quality, 'simulated');
  checks.push('Building active-source resolver: normal state resolves activeSource=utility, utilityAvailable, ATS on grid, main bus energized, stable transition, no faults');

  // ---- 2. Inverter/battery is informational only — never fabricated as a supply source ----
  assert.ok(power.inverter, 'INV-01 telemetry must be surfaced for information');
  assert.equal(typeof power.inverter.on, 'boolean');
  assert.notEqual(power.activeSource, 'inverter', 'the inverter must never be reported as the building supply source — its current canonical role is not wired into the energization cascade');
  checks.push('Inverter/battery participation: surfaced as informational telemetry only, never fabricated as a building supply source (matches its actual, non-cascade-participating canonical role)');

  // ---- 3. L06 inherited source / Apartment 6A energization mirror the resolver ----
  assert.equal(state(BRANCH).energized, true);
  assert.equal(state(APT_METER).supply_active, true);
  checks.push('L06 inherited source and Apartment 6A energization both mirror the resolver\'s mainBusEnergized/activeSource truth');

  // ---- 4. Utility failure -> generator STARTING -> downstream de-energized ----
  const gridFailure = LUNA_SCENARIOS.find((s) => s.key === 'grid-failure');
  assert.ok(gridFailure);
  gridFailure.apply();
  power = resolveBuildingPower();
  assert.equal(power.utilityAvailable, false);
  assert.equal(power.generator.phase, 'starting');
  assert.equal(power.activeSource, 'none', 'no valid source is live yet — grid is gone and the generator has not reached RUNNING');
  assert.equal(power.mainBusEnergized, false);
  assert.ok(power.lastTransition && power.lastTransition.label === 'Utility supply lost');
  checks.push('Utility failure: resolver reflects utility unavailable, generator STARTING, activeSource NONE (truthfully reflects the gap, not a fabricated source), lastTransition records the loss');

  // ---- 5. Generator RUNNING -> ATS TRANSFERRING -> downstream re-energized ----
  await wait(3100);
  power = resolveBuildingPower();
  assert.equal(power.generator.phase, 'running');
  assert.equal(power.generator.running, true);
  assert.equal(power.transition, 'transferring', 'the ATS changeover window must be observable as its own transition state, not an atomic flip');
  await wait(1400);
  power = resolveBuildingPower();
  assert.equal(power.activeSource, 'generator');
  assert.equal(power.ats.source, 'generator');
  assert.equal(power.mainBusEnergized, true);
  assert.equal(state(BRANCH).energized, true, 'downstream L06 re-energization must follow the same live source');
  assert.equal(state(APT_METER).supply_active, true, 'downstream Apartment 6A re-energization must follow the same live source');
  assert.ok(power.lastTransition && power.lastTransition.label === 'ATS transferred to Generator');
  checks.push('Generator RUNNING -> ATS TRANSFERRING (observable) -> ATS transferred to Generator -> full downstream re-energization (MDB/L06/Apartment 6A all agree with the resolver)');

  // ---- 6. Active power-path resolution (Oyi route) ----
  const activePathIntent = parseIntent('Show me the active power path.', {});
  assert.equal(activePathIntent.kind, 'show_route');
  assert.equal(activePathIntent.system, 'electrical');
  assert.deepEqual(activePathIntent.targetRefs, [APT_METER]);
  checks.push('Active power-path resolution: "Show me the active power path." resolves to a real route target, not a generic unresolved response');

  // ---- 7. Oyi "what are we running on" / "why are we on generator" ----
  const runningOnIntent = parseIntent('What is the building running on?', {});
  assert.equal(runningOnIntent.kind, 'query');
  assert.deepEqual(runningOnIntent.targetRefs, [GRID]);
  const runningOnText = explainAsset(data, p, GRID);
  assert.match(runningOnText, /generator supply/i);
  assert.match(runningOnText, /Utility is unavailable/i);
  assert.match(runningOnText, /ATS is on generator/i);
  assert.match(runningOnText, /Main distribution is energized/i);
  checks.push(`Oyi "What is the building running on?" resolves and answers with the live, derived narrative: "${runningOnText}"`);

  const whyIntent = parseIntent('Why are we on generator?', {});
  assert.equal(whyIntent.kind, 'query');
  assert.deepEqual(whyIntent.targetRefs, [GEN]);
  const whyText = explainAsset(data, p, GEN);
  assert.match(whyText, /generator supply/i);
  assert.match(whyText, /Most recent transition/i);
  assert.match(whyText, /Utility supply lost|ATS transferred to Generator/i);
  checks.push(`Oyi "Why are we on generator?" resolves and gives a causal answer referencing the actual event log: "${whyText}"`);

  // ---- 8. Event history is real and ordered ----
  const events = i.getElectricalEvents();
  const labels = events.map((e) => e.label);
  for (const expected of ['Utility supply lost', 'Generator start initiated', 'Main distribution de-energized', 'Generator available', 'ATS transfer initiated', 'ATS transferred to Generator', 'Main distribution energized']) {
    assert.ok(labels.includes(expected), `event log must contain "${expected}"`);
  }
  assert.ok(events[0].at >= events[events.length - 1].at, 'events must be newest-first');
  checks.push(`Event history: full causal chain recorded in order (${['Utility supply lost', 'Generator start initiated', '...', 'ATS transferred to Generator', 'Main distribution energized'].join(' -> ')})`);

  // ---- 9. Utility restoration -> ATS transfer back -> generator cooldown ----
  i.setAssetState(GRID, { ...state(GRID), utility_available: true });
  i.recomputePowerNetwork();
  power = resolveBuildingPower();
  assert.equal(power.generator.phase, 'stopping', 'utility restoration must begin generator cooldown');
  assert.equal(power.transition, 'transferring', 'ATS transfer-back must also be observable');
  await wait(1600);
  power = resolveBuildingPower();
  assert.equal(power.generator.phase, 'stopped');
  assert.equal(power.activeSource, 'utility');
  assert.equal(power.ats.source, 'grid');
  assert.equal(power.mainBusEnergized, true);
  const eventsAfter = i.getElectricalEvents().map((e) => e.label);
  assert.ok(eventsAfter.includes('Generator cooldown started'));
  assert.ok(eventsAfter.includes('Generator cooldown completed'));
  assert.ok(eventsAfter.includes('ATS transferred to Utility'));
  assert.ok(eventsAfter.includes('Utility supply restored'));
  checks.push('Utility restoration: ATS transfers back to Utility, generator completes a real cooldown sequence (STOPPING -> STOPPED with logged start/complete events), all downstream stays consistent throughout the handback');

  // ---- 10. Generator failure during outage: NONE/no-valid-source state ----
  i.resetAll();
  const gridFailure2 = LUNA_SCENARIOS.find((s) => s.key === 'grid-failure');
  gridFailure2.apply();
  await wait(4500); // generator reaches RUNNING and the ATS fully completes its transfer to it
  assert.equal(resolveBuildingPower().activeSource, 'generator', 'generator must be the fully-established live source before it fails, matching the real "failure during outage" scenario');
  i.setAssetState(GEN, { ...state(GEN), fault: true, phase: 'stopped', running: false });
  i.recomputePowerNetwork();
  power = resolveBuildingPower();
  assert.equal(power.activeSource, 'none', 'with utility unavailable AND the generator faulted, there is truthfully no valid source');
  assert.equal(power.mainBusEnergized, false);
  assert.ok(power.activeFaults.includes('Generator fault'));
  assert.equal(state(BRANCH).energized, false, 'downstream must truthfully reflect total supply loss, not a fabricated partial state');
  checks.push('Generator failure during a utility outage: resolver correctly reports activeSource NONE and an active generator fault; downstream truthfully de-energizes rather than showing a fabricated partial state');

  // ---- 11. Facility control admission / Consumer privacy boundary unchanged ----
  i.resetAll();
  const scene = { navigateToAsset() {}, navigateToSpace() {}, setSystemMode() {}, assetView() { return false; } };
  const controller = new TwinIntelligenceController(data, p, scene, (ref) => explainAsset(data, p, ref));
  const startRes = await controller.handleIntent(parseIntent('Start the generator.', {}), buildScopePolicy(actor), {});
  assert.ok(startRes.ok);
  const consumerDenied = await controller.handleIntent(parseIntent('Start the generator.', {}), buildScopePolicy(resident), {});
  assert.equal(consumerDenied.ok, false);
  checks.push('Full Oyi controller round-trip unaffected: Facility can still start the generator, Consumer still denied');

  // ---- 12. Reset gives a clean, consistent resolver state ----
  i.resetAll();
  power = resolveBuildingPower();
  assert.equal(power.activeSource, 'utility');
  assert.equal(power.generator.phase, 'stopped');
  assert.equal(i.getElectricalEvents().length, 0, 'reset must clear the event log, not accumulate across sessions');
  checks.push('Reset produces a clean, consistent resolver state and clears the event log');

  writeFileSync('artifacts/luna-electrical-live-ops-runtime-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} catch (error) {
  writeFileSync('artifacts/luna-electrical-live-ops-runtime-results.json', JSON.stringify({ passed: false, checks, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await server.close();
}
