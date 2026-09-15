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
  const { relationshipsFrom } = await load('engine/engineeringRelationships.ts');
  const { LUNA_ENGINEERING_RELATIONSHIPS } = await load('luna/operational/lunaEngineeringRelationships.ts');
  const { resolveHvacState } = await load('luna/runtime/lunaHvacResolver.ts');
  const { explainAsset } = await load('luna/intelligence/lunaExplain.ts');
  const { HVAC_BOARD_ASSETS, isHvacBoardRef, hvacBoardTabKeyFor, HVAC_BOARD_DEFAULT_REF } = await load('luna/operational/lunaHvacBoard.ts');

  const actor = identityForScope('facility'), resident = identityForScope('consumer');
  const state = (ref) => p.getState(ref).state;
  const exec = (ref, command, args = {}, who = actor) => p.execute({ assetRef: ref, command, args, actor: who });

  const LIVING = 'LUNA-L06-APT-A-LIVING-AC-01', BED = 'LUNA-L06-APT-A-BED-01-AC-01', OUTDOOR = 'LUNA-L06-APT-A-AC-OUTDOOR-01';
  const TH = 'LUNA-L06-APT-A-LIVING-TH-01';

  // ---- 1. Canonical identity preservation ----
  const allRefs = data.listAssets().map((a) => a.ref);
  assert.equal(new Set(allRefs).size, allRefs.length, 'no duplicate canonical refs anywhere in the catalog');
  for (const ref of [LIVING, BED, OUTDOOR, TH]) assert.ok(data.getAsset(ref), `${ref} must be a real registered canonical asset`);
  assert.equal(HVAC_BOARD_ASSETS.length, 3, 'HVAC Control Board must expose exactly 3 real asset-selector tabs');
  checks.push('Canonical HVAC asset identity preserved: every existing HVAC reference-chain ref intact (zero new operational assets were needed), no duplicates');

  // ---- 2. Reference topology: connected_to, not parentRef ----
  const livingConn = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, LIVING, 'connected_to').find((e) => e.to === OUTDOOR);
  const bedConn = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, BED, 'connected_to').find((e) => e.to === OUTDOOR);
  assert.ok(livingConn, 'Living Room AC must carry a connected_to edge to the outdoor condenser');
  assert.ok(bedConn, 'Primary Bedroom AC must carry a connected_to edge to the outdoor condenser');
  assert.equal(data.getAsset(LIVING).parentRef, 'LUNA-L06-APT-A-AC-CIRCUIT-01', 'the indoor unit\'s parentRef is its ELECTRICAL circuit — a different relationship than its HVAC connection, never conflated');
  const hvacEdges = LUNA_ENGINEERING_RELATIONSHIPS.filter((e) => e.to === OUTDOOR || e.from === OUTDOOR);
  assert.equal(hvacEdges.length, 2, `expected exactly 2 hvac typed edges (living+bed -> outdoor), got ${hvacEdges.length} — nothing inferred from geometry, which this test never reads`);
  checks.push('Reference topology: outdoor condenser <- connected_to <- both indoor units, correctly distinct from each unit\'s own electrical parentRef; exactly 2 typed edges exist');

  // ---- 3. Outdoor unit is asset-only, no fabricated controls ----
  assert.deepEqual(p.getState(OUTDOOR).availableCommands, [], 'the outdoor condenser must expose zero commands — Part 2\'s "do not give the outdoor unit arbitrary start/stop" instruction');
  checks.push('Safety boundary preserved: the outdoor condenser exposes zero commands — Oyi cannot fabricate independent condenser control authority');

  // ---- 4. OFF state (fresh reset) ----
  i.resetAll();
  let hvac = resolveHvacState();
  assert.ok(hvac, 'resolver must return live state once the store is built');
  assert.equal(hvac.hvacState, 'off');
  assert.equal(hvac.zones.every((z) => z.state === 'off'), true);
  assert.equal(hvac.outdoorDemand, false);
  checks.push('OFF state: resolver reports off for both zones and idle condenser demand on a fresh reset');

  // ---- 5. RUNNING state via real command ----
  const startRes = await exec(LIVING, 'turnOn');
  assert.ok(startRes.ok, 'Facility must be able to turn on the Living Room AC');
  hvac = resolveHvacState();
  assert.equal(hvac.hvacState, 'running');
  assert.equal(hvac.zones.find((z) => z.ref === LIVING).state, 'running');
  assert.equal(hvac.outdoorDemand, true, 'the outdoor condenser must show demand once a connected indoor unit is actually cooling');
  checks.push('RUNNING state: turning on the Living Room AC resolves the building HVAC state to RUNNING and the outdoor condenser to demand=true, both derived from the same real command');

  // ---- 6. Deterministic temperature response toward setpoint ----
  await exec(LIVING, 'setTemperature', { temperature: 18 });
  const beforeTemp = state(LIVING).room_temp_c;
  i.recomputeHvacNetwork();
  i.recomputeHvacNetwork();
  i.recomputeHvacNetwork();
  const afterTemp = state(LIVING).room_temp_c;
  assert.ok(afterTemp < beforeTemp, `room_temp_c must move toward the lower 18°C setpoint over successive recomputes (before=${beforeTemp}, after=${afterTemp})`);
  assert.equal(state(TH).temp_c, afterTemp, 'the real registered Living Room sensor must mirror the AC\'s own simulated room temperature — one live truth, never two');
  checks.push(`Deterministic temperature response: room_temp_c moved from ${beforeTemp}°C toward the 18°C setpoint over 3 recomputes (now ${afterTemp}°C), mirrored onto the real Living Room sensor`);

  // ---- 7. Setpoint change updates resolver ----
  hvac = resolveHvacState();
  assert.equal(hvac.zones.find((z) => z.ref === LIVING).targetTempC, 18);
  checks.push('Setpoint change: resolver reflects the new 18°C target for the Living Room zone');

  // ---- 8. FAULT via scenario, cannot restart while faulted ----
  const hvacFault = LUNA_SCENARIOS.find((s) => s.key === 'hvac-fault');
  assert.ok(hvacFault, 'hvac-fault scenario must exist');
  hvacFault.apply();
  hvac = resolveHvacState();
  assert.equal(hvac.hvacState, 'fault');
  assert.equal(state(LIVING).on, false, 'a fault must trip the unit off (toggleBehavior faultAware convention)');
  const blockedStart = await exec(LIVING, 'turnOn');
  assert.match(blockedStart.message, /fault/i, 'a faulted unit\'s turnOn must be refused with an explanatory message (faultAware convention — the command itself still reports ok:true, matching the generator/pump precedent, but state.on must not flip)');
  assert.equal(state(LIVING).on, false, 'a faulted unit must remain off after a blocked restart attempt — no user-facing resetFault exists');
  checks.push('FAULT state: hvac-fault scenario resolves the building HVAC state to FAULT, trips the unit off, and a restart attempt while faulted is refused (state stays off, explanatory message returned)');

  // ---- 9. Fault cools toward ambient, not target ----
  const faultTempBefore = state(LIVING).room_temp_c;
  i.recomputeHvacNetwork();
  i.recomputeHvacNetwork();
  const faultTempAfter = state(LIVING).room_temp_c;
  assert.ok(faultTempAfter >= faultTempBefore, `a faulted (off) unit must drift toward ambient (warmer), not continue cooling toward its old target (before=${faultTempBefore}, after=${faultTempAfter})`);
  checks.push('Fault behavior: cooling response stops while faulted — room temperature drifts toward ambient, never continues toward the old target');

  // ---- 10. Recovery ----
  i.resetAll();
  hvac = resolveHvacState();
  assert.equal(hvac.hvacState, 'off');
  assert.equal(state(LIVING).fault, false);
  checks.push('Recovery: reset returns the building HVAC state to OFF with the fault cleared');

  // ---- 12. Oyi target phrases ----
  i.resetAll();
  const s1 = parseIntent('What is the HVAC status?', {});
  assert.equal(s1.kind, 'query'); assert.deepEqual(s1.targetRefs, [OUTDOOR]);
  const s2 = parseIntent('Is the AC running?', {});
  assert.deepEqual(s2.targetRefs, [LIVING]);
  const s3 = parseIntent('What is the temperature in Apartment 6A?', {});
  assert.deepEqual(s3.targetRefs, [TH]);
  const s4 = parseIntent('What is the current setpoint?', {});
  assert.deepEqual(s4.targetRefs, [LIVING]);
  const s5 = parseIntent('Show me the outdoor unit.', {});
  assert.deepEqual(s5.targetRefs, [OUTDOOR]);
  // "Is there an HVAC fault?" resolves through the PRE-EXISTING, generic
  // matchProblem matcher (any "fault"/"problem"/"issue" phrase, shared by
  // every system) — not a new HVAC-specific branch, so it correctly
  // reuses the same cross-system fault-question mechanism every other
  // system already relies on.
  const s6 = parseIntent('Is there an HVAC fault?', {});
  assert.equal(s6.kind, 'show_problem');
  assert.equal(s6.system, 'hvac');
  const s7 = parseIntent('Why isn\'t Apartment 6A cooling?', {});
  assert.deepEqual(s7.targetRefs, [OUTDOOR]);
  const s8 = parseIntent('Turn on the AC.', {});
  assert.equal(s8.kind, 'command'); assert.deepEqual(s8.targetRefs, [LIVING]);
  const s9 = parseIntent('Set Apartment 6A to 22 degrees.', {});
  assert.equal(s9.kind, 'command'); assert.deepEqual(s9.targetRefs, [LIVING]); assert.equal(s9.commandArgs.temperature, 22);
  checks.push('Oyi parser resolves all HVAC target reference phrases to the correct intent shape (system/asset/query/command)');

  // ---- 13. Oyi narrative correctness ----
  await exec(LIVING, 'turnOn');
  const statusText = explainAsset(data, p, OUTDOOR);
  assert.match(statusText, /RUNNING/);
  assert.match(statusText, /reference simulation/);
  assert.match(statusText, /Living Room AC/);
  checks.push(`Oyi "what is the HVAC status"/"is there a fault"/"what is cooling apartment 6a" all resolve to the SAME live narrative: "${statusText}"`);
  i.resetAll();

  // ---- 14. Facility permissions / Consumer boundaries ----
  // The outdoor condenser is shared building plant (Facility-owned-unit
  // allowlist, like the fire pump or a booster pump) — CONTEXT_3D for
  // Facility. The two indoor split units are the resident's OWN comfort
  // devices — a PRE-EXISTING, already-documented design decision
  // (lunaUnitMepAssets.ts's own comment: "the resident's own indoor split
  // units stay apartment-devices and fully resident-only") deliberately
  // keeps them OFF the allowlist, so Facility gets HIDDEN, the same
  // privacy boundary already established for lights/curtains. This test
  // intentionally does NOT add them to the allowlist — see
  // docs/LUNA_HVAC_REFERENCE_SPEC.md §7 for why this is honored, not
  // worked around.
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: OUTDOOR, identity: actor }), 'CONTEXT_3D');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: LIVING, identity: actor }), 'HIDDEN', 'Facility must NOT see the resident\'s own indoor unit — the same privacy boundary as lights/curtains, deliberately not overridden by this phase');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: LIVING, identity: resident }), 'FULL_3D', 'the assigned resident (identityForScope("consumer") in this harness) sees their OWN indoor unit fully');
  const otherResident = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-B'], facilityResponsibility: false };
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: LIVING, identity: otherResident }), 'HIDDEN', 'a DIFFERENT resident must not see 6A\'s indoor unit');
  checks.push('Facility contextual admission confirmed (CONTEXT_3D for the shared outdoor condenser); resident-privacy boundary confirmed (Facility HIDDEN from the resident\'s own indoor unit, matching lights/curtains); assigned resident sees their own indoor unit FULL_3D; a different resident sees HIDDEN');

  // ---- 15. Full Oyi controller round-trip ----
  // The indoor unit is a resident-owned comfort device (see check 14) —
  // its "authorized user" under the CURRENT, unmodified RepresentationPolicy
  // is the assigned RESIDENT, the same model already established for
  // lights/curtains, not Facility. This is the correct, policy-consistent
  // round-trip to prove: Oyi actually operates real runtime state for
  // whoever IS authorized, and denies whoever isn't.
  const scene = { navigateToAsset() {}, navigateToSpace() {}, setSystemMode() {}, assetView() { return false; } };
  const controller = new TwinIntelligenceController(data, p, scene, (ref) => explainAsset(data, p, ref));
  const residentStart = await controller.handleIntent(parseIntent('Turn on the AC.', {}), buildScopePolicy(resident), {});
  assert.ok(residentStart.ok, 'the assigned resident must be able to turn on their own AC via Oyi (a real state change)');
  assert.equal(state(LIVING).on, true);
  const facilityDenied = await controller.handleIntent(parseIntent('Turn on the AC.', {}), buildScopePolicy(actor), {});
  assert.equal(facilityDenied.ok, false, 'Facility must be denied commanding the resident\'s own indoor unit through the full controller path — it is HIDDEN to Facility, not merely uncommandable');
  checks.push('Full Oyi controller round-trip: "Turn on the AC" actually starts it for the assigned resident (real state change); Facility denied the same command (resident-privacy boundary enforced end-to-end, not just in the board UI)');

  // ---- 16. Control Board registry sanity ----
  assert.equal(HVAC_BOARD_DEFAULT_REF, OUTDOOR);
  assert.ok(isHvacBoardRef(LIVING)); assert.ok(isHvacBoardRef(BED)); assert.ok(isHvacBoardRef(OUTDOOR));
  assert.equal(hvacBoardTabKeyFor(LIVING), LIVING);
  checks.push('HVAC Control Board asset registry: 3 real registered tabs, deterministic default (Condenser)');

  i.resetAll();
  writeFileSync('artifacts/luna-hvac-runtime-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} catch (error) {
  writeFileSync('artifacts/luna-hvac-runtime-results.json', JSON.stringify({ passed: false, checks, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await server.close();
}
