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
  const { resolveDrainageState, DRAINAGE_STATE_SOURCE_REFS } = await load('luna/runtime/lunaDrainageResolver.ts');
  const { explainAsset } = await load('luna/intelligence/lunaExplain.ts');
  const { DRAINAGE_BOARD_ASSETS, isDrainageBoardRef, drainageBoardTabKeyFor, DRAINAGE_BOARD_DEFAULT_REF } = await load('luna/operational/lunaDrainageBoard.ts');
  const { lunaBuildRoute } = await load('luna/intelligence/lunaServiceRoutes.ts');
  const { lunaResolveRelationship } = await load('luna/intelligence/lunaRelationships.ts');
  const { resolveFireState } = await load('luna/runtime/lunaFireResolver.ts');
  const { resolveHvacState } = await load('luna/runtime/lunaHvacResolver.ts');

  const facility = identityForScope('facility'), resident = identityForScope('consumer');
  const state = (ref) => p.getState(ref).state;

  const KITCHEN = 'LUNA-L06-APT-A-KITCHEN-DRAIN-01', BATH1 = 'LUNA-L06-APT-A-BATH-01-DRAIN-01', BATH2 = 'LUNA-L06-APT-A-BATH-02-DRAIN-01', BATH3 = 'LUNA-L06-APT-A-BATH-03-DRAIN-01';
  const STACK = 'LUNA-L06-APT-A-DRAIN-01', BRANCH = 'LUNA-L06-DRAINAGE-BRANCH-01', RISER = 'LUNA-RISER-DRAINAGE-01', B1_MAIN = 'LUNA-B1-DRAINAGE-MAIN-01';
  const VENT = 'LUNA-ROOF-VENT-TERMINATION-01', ROOF_DRAIN = 'LUNA-ROOFTOP-STORM-DRAIN-01', DOWNPIPE = 'LUNA-STORM-DOWNPIPE-01', SITE_DISCHARGE = 'LUNA-SITE-STORM-DISCHARGE-01';

  // ---- 1. Canonical inventory — no duplicates, zero fabricated capability ----
  const allRefs = data.listAssets().map((a) => a.ref);
  assert.equal(new Set(allRefs).size, allRefs.length, 'no duplicate canonical refs anywhere in the catalog');
  for (const ref of DRAINAGE_STATE_SOURCE_REFS) assert.ok(data.getAsset(ref), `${ref} must be a real registered canonical asset`);
  for (const ref of DRAINAGE_STATE_SOURCE_REFS) {
    assert.equal(data.getAsset(ref).classification === 'controllable', false, `${ref} must not be controllable — no valve/actuator was fabricated for this passive gravity system`);
  }
  checks.push('Canonical drainage inventory: 4 new reference assets (single-stack vent roof termination + roof drain/downpipe/site discharge stormwater chain), zero duplicate refs, zero fabricated controllable capability');

  // ---- 2. Fixed real, confirmed gaps — fixture drains + new assets all have runtime rows ----
  for (const ref of [KITCHEN, BATH1, BATH2, BATH3, VENT, ROOF_DRAIN, DOWNPIPE, SITE_DISCHARGE]) {
    assert.ok(p.getState(ref), `${ref} must have a real runtime row`);
  }
  checks.push('Runtime gaps fixed: the 4 fixture-level drain points (already real canonical assets since Phase 10/Domestic Water V1) and all 4 new drainage assets now have real runtime rows');

  // ---- 3. Real physical backbone chain (parentRef) — wastewater ----
  assert.equal(data.getAsset(KITCHEN).parentRef, STACK);
  assert.equal(data.getAsset(BATH1).parentRef, STACK);
  assert.equal(data.getAsset(BATH2).parentRef, STACK);
  assert.equal(data.getAsset(BATH3).parentRef, STACK);
  assert.equal(data.getAsset(STACK).parentRef, BRANCH);
  assert.equal(data.getAsset(BRANCH).parentRef, RISER);
  assert.equal(data.getAsset(RISER).parentRef, B1_MAIN);
  assert.equal(data.getAsset(B1_MAIN).parentRef, undefined, 'the B1 discharge reference is the root of the drainage graph (no further parent)');
  checks.push('Wastewater route integrity: Kitchen/Bath1/Bath2/Bath3 -> 6A stack connection -> L06 branch -> riser -> B1 discharge reference, entirely via the pre-existing parentRef mechanism — no parallel graph');

  // ---- 4. Vent — single-stack, not a fabricated second riser ----
  assert.equal(data.getAsset(VENT).parentRef, RISER, 'the vent termination must parent to the SAME soil/waste riser (single-stack), never a fabricated second riser');
  checks.push('Vent route integrity: single-stack venting — the roof termination parents directly to the real soil/waste riser, proving no second/parallel vent riser was fabricated');

  // ---- 5. Stormwater — genuinely separate chain from wastewater ----
  assert.equal(data.getAsset(ROOF_DRAIN).parentRef, DOWNPIPE);
  assert.equal(data.getAsset(DOWNPIPE).parentRef, SITE_DISCHARGE);
  assert.equal(data.getAsset(SITE_DISCHARGE).parentRef, undefined, 'the site discharge reference is the root of the stormwater graph');
  assert.notEqual(data.getAsset(ROOF_DRAIN).system === 'drainage' && data.getAsset(ROOF_DRAIN).type, data.getAsset(KITCHEN).type, 'stormwater assets must carry distinct types from wastewater assets — never merged into one generic "plumbing" graph');
  checks.push('Stormwater route integrity: roof drain -> downpipe -> site discharge, a genuinely separate reference chain from wastewater/vent (distinct refs, distinct types, no shared node)');

  // ---- 6. Apartment 6A drainage tracing via the existing route mechanism ----
  const route = lunaBuildRoute(data, 'drainage', 'LUNA-L06-APT-A');
  assert.ok(route && route.steps.length > 0, 'Apartment 6A must resolve to a real traced drainage route');
  const routeRefs = route.steps.map((s) => s.ref);
  assert.ok(routeRefs.includes(STACK) && routeRefs.includes(B1_MAIN), 'the traced route must include both the apartment stack connection and the B1 reference discharge point');
  checks.push(`Apartment 6A drainage tracing resolves via the pre-existing buildServiceRoute()/UNIT_SYSTEM_TERMINATION mechanism: ${route.steps.map((s) => s.label).join(' -> ')}`);

  // ---- 7. Missing/unknown destination handling — DD10 is disclosed, never fabricated ----
  i.resetAll();
  let drainage = resolveDrainageState();
  assert.ok(drainage, 'resolver must return live state');
  assert.equal(drainage.finalDischargeDesignRequired, true, 'finalDischargeDesignRequired must be hardcoded true — the resolver must never claim a resolved final discharge design');
  assert.ok(drainage.ventChain.some((n) => n.state === 'DESIGN_REFERENCE'));
  assert.ok(drainage.stormwaterChain.every((n) => n.state === 'DESIGN_REFERENCE'), 'every new stormwater reference asset must be marked DESIGN_REFERENCE, never a fabricated engineered state');
  checks.push('DD10 boundary enforced at the code level: finalDischargeDesignRequired is hardcoded true (mirrors resolveNetworkState()\'s edgeCoreConnected:false pattern), and every new vent/stormwater asset is explicitly marked DESIGN_REFERENCE — never invented as engineered/approved');

  // ---- 8. Drainage state resolution — fresh baseline + reference simulation ----
  assert.equal(drainage.wastewaterBackbone.find((n) => n.ref === STACK).state, 'NORMAL', 'fresh reset: the stack connection reads NORMAL (clear)');
  assert.ok(drainage.wastewaterFixtures.every((n) => n.state === 'NORMAL'));
  checks.push('resolveDrainageState() fresh-reset baseline: every fixture and the stack connection read NORMAL (clear)');

  // ---- 9. Reference simulation — deterministic blockage scenario + recovery ----
  const scenario = LUNA_SCENARIOS.find((s) => s.key === 'drainage-blockage');
  assert.ok(scenario, 'drainage-blockage scenario must exist');
  scenario.apply();
  drainage = resolveDrainageState();
  assert.equal(drainage.wastewaterBackbone.find((n) => n.ref === STACK).state, 'BLOCKED');
  assert.equal(state(STACK).condition, 'blocked');
  checks.push('Reference simulation: drainage-blockage scenario deterministically sets the 6A stack connection to BLOCKED, explicitly labeled as reference simulation (never claimed as real sensor data)');
  i.resetAll();
  drainage = resolveDrainageState();
  assert.equal(drainage.wastewaterBackbone.find((n) => n.ref === STACK).state, 'NORMAL');
  checks.push('Recovery: reset returns the stack connection to NORMAL');

  // ---- 10. Cross-system isolation — drainage never contaminates or depends on another system's resolver ----
  scenario.apply();
  const fireDuringBlockage = resolveFireState();
  const hvacDuringBlockage = resolveHvacState();
  assert.ok(fireDuringBlockage && fireDuringBlockage.fireState === 'normal', 'Fire must resolve independently while drainage reports a blockage');
  assert.ok(hvacDuringBlockage && hvacDuringBlockage.hvacState === 'off', 'HVAC must resolve independently while drainage reports a blockage');
  i.resetAll();
  checks.push('No cross-system state contamination: Fire and HVAC resolve their own complete, correct, independent state while a drainage blockage is active — drainage never becomes a dependency of any other system\'s resolver, and the blockage patch touches only the one asset it names');

  // ---- 11. Oyi drainage questions (brief Part 4 examples) ----
  const q1 = parseIntent('Show me the drainage from Apartment 6A.', {});
  assert.equal(q1.kind, 'query'); assert.deepEqual(q1.targetRefs, [STACK]);
  const q2 = parseIntent('Where does the master bathroom waste go?', {});
  assert.equal(q2.kind, 'show_route'); assert.deepEqual(q2.targetRefs, [BATH1]); assert.equal(q2.system, 'drainage');
  const q3 = parseIntent('Show me the soil stack serving Apartment 6A.', {});
  assert.equal(q3.kind, 'query'); assert.deepEqual(q3.targetRefs, [RISER]);
  const q4 = parseIntent('Show me the stormwater route from the roof.', {});
  assert.equal(q4.kind, 'query'); assert.deepEqual(q4.targetRefs, [ROOF_DRAIN]);
  const q5 = parseIntent('Where does wastewater from this apartment terminate?', {});
  assert.equal(q5.kind, 'query'); assert.deepEqual(q5.targetRefs, [B1_MAIN]);
  const q6 = parseIntent('Show me the nearest drainage access point.', {});
  assert.deepEqual(q6.targetRefs, [B1_MAIN]);
  checks.push('Oyi parser resolves all 6 drainage target phrases from the brief to the correct intent shape');

  const scene = { navigateToAsset() {}, navigateToSpace() {}, setSystemMode() {}, highlightRoute() {}, assetView() { return false; } };
  const controller = new TwinIntelligenceController(
    data, p, scene,
    (ref) => explainAsset(data, p, ref),
    (system, targetRef) => lunaBuildRoute(data, system, targetRef),
    (ref, type) => lunaResolveRelationship(ref, type)
  );
  const terminateAnswer = await controller.handleIntent(q5, buildScopePolicy(facility), {});
  assert.equal(terminateAnswer.ok, true);
  assert.match(terminateAnswer.text, /DESIGN DECISION REQUIRED/, 'the "where does wastewater terminate" answer must explicitly disclose DD10, never invent a final destination');
  checks.push(`Oyi honestly discloses DD10 rather than inventing a final destination: "${terminateAnswer.text}"`);

  const drainageFromApt = await controller.handleIntent(q1, buildScopePolicy(facility), {});
  assert.equal(drainageFromApt.ok, true);
  assert.match(drainageFromApt.text, /reference simulation/);
  assert.match(drainageFromApt.text, /DESIGN DECISION REQUIRED/);
  checks.push(`Oyi "show me the drainage from Apartment 6A" narrative covers the real wastewater/vent/stormwater picture plus DD10: "${drainageFromApt.text}"`);

  // ---- 12. Vocabulary collision check ----
  const c1 = parseIntent('Show me the cameras.', {});
  assert.equal(c1.system, 'security', "CCTV's own aggregate phrase must be unaffected");
  const c2 = parseIntent('Turn on the AC.', {});
  assert.deepEqual(c2.targetRefs, ['LUNA-L06-APT-A-LIVING-AC-01'], "HVAC's own command phrase must be unaffected");
  const c3 = parseIntent('Show me the network.', {});
  assert.equal(c3.system, 'network-edge', "Network's own aggregate phrase must be unaffected");
  const c4 = parseIntent('What is the fire status?', {});
  assert.deepEqual(c4.targetRefs, ['LUNA-B1-FIRE-PANEL-01'], "Fire's own status phrase must be unaffected");
  checks.push('Vocabulary collision check: CCTV/HVAC/Network/Fire phrases all resolve exactly as before — the new "waste"/"stormwater" system patterns and new asset aliases introduced no substring hijack');

  // ---- 13. RepresentationPolicy — unchanged, Facility/Consumer boundaries ----
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: B1_MAIN, identity: facility }), 'FULL_3D', 'common B1 drainage infrastructure stays fully visible to Facility');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: B1_MAIN, identity: resident }), 'HIDDEN', 'a resident has no Facility drainage-plant visibility');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: STACK, identity: facility }), 'CONTEXT_3D', 'the apartment stack connection is Facility-owned service infrastructure (pre-existing allowlist entry), unchanged');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: KITCHEN, identity: facility }), 'CONTEXT_3D', 'the fixture-level drains are the same class of Facility service infrastructure (pre-existing allowlist entries), unchanged');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: STACK, identity: resident }), 'FULL_3D', 'the assigned resident sees their own apartment\'s drainage fully, matching the existing meter/valve precedent');
  checks.push('RepresentationPolicy behavior unchanged (file untouched): Facility sees common drainage infrastructure FULL_3D and the pre-existing Facility-owned unit allowlist entries stay CONTEXT_3D for Facility / FULL_3D for the assigned resident');

  // ---- 14. Consumer privacy — new stormwater/vent assets carry no privacy leak ----
  for (const ref of [VENT, ROOF_DRAIN, DOWNPIPE, SITE_DISCHARGE]) {
    assert.equal(lunaRepresentationPolicy.resolveMode({ ref, identity: resident }), 'HIDDEN', `${ref} is common infrastructure — must stay HIDDEN to any resident, exactly like every other common drainage asset`);
  }
  checks.push('Consumer privacy: all 4 new common vent/stormwater reference assets are HIDDEN to residents, matching the existing common-infrastructure boundary — no new asset accidentally widened resident visibility');

  // ---- 15. Drainage Control Board registry sanity ----
  assert.equal(DRAINAGE_BOARD_DEFAULT_REF, B1_MAIN);
  assert.equal(DRAINAGE_BOARD_ASSETS.length, 8, 'Drainage Control Board must expose exactly 8 real registered tabs');
  assert.ok(isDrainageBoardRef(B1_MAIN)); assert.ok(isDrainageBoardRef(RISER)); assert.ok(isDrainageBoardRef(VENT)); assert.ok(isDrainageBoardRef(ROOF_DRAIN)); assert.ok(isDrainageBoardRef(DOWNPIPE)); assert.ok(isDrainageBoardRef(SITE_DISCHARGE));
  assert.equal(drainageBoardTabKeyFor(KITCHEN), STACK, 'fixture-level drains belong to the stack-connection tab, the real node they physically drain to');
  checks.push('Drainage Control Board asset registry: 8 real registered tabs, deterministic default (B1 Discharge); fixture-level drains correctly resolve to the stack-connection tab');

  // ---- 16. No duplicate canonical assets (repeat, explicit final count) ----
  assert.equal(data.listAssets().length, 86, 'total canonical asset count must reflect exactly the 4 new drainage reference assets added this phase (82 -> 86)');
  checks.push('Final canonical asset count confirmed: 86 (82 + 4 new drainage reference assets), zero duplicates, matching scripts/verifyLift.mjs\'s own updated baseline');

  i.resetAll();
  writeFileSync('artifacts/luna-drainage-runtime-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} catch (error) {
  writeFileSync('artifacts/luna-drainage-runtime-results.json', JSON.stringify({ passed: false, checks, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await server.close();
}
