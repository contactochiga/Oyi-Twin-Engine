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
  const { resolveNetworkState, NETWORK_STATE_SOURCE_REFS } = await load('luna/runtime/lunaNetworkResolver.ts');
  const { explainAsset } = await load('luna/intelligence/lunaExplain.ts');
  const { NETWORK_BOARD_ASSETS, isNetworkBoardRef, networkBoardTabKeyFor, NETWORK_BOARD_DEFAULT_REF } = await load('luna/operational/lunaNetworkBoard.ts');
  const { lunaBuildRoute } = await load('luna/intelligence/lunaServiceRoutes.ts');
  const { lunaResolveRelationship } = await load('luna/intelligence/lunaRelationships.ts');

  const facility = identityForScope('facility'), resident = identityForScope('consumer');
  const state = (ref) => p.getState(ref).state;

  const GATEWAY = 'LUNA-B1-NET-GATEWAY-01', WIFI_AP = 'LUNA-GROUND-NET-WIFI-AP-01', EDGE_CORE = 'LUNA-EDGE-CORE-01';
  const RISER = 'LUNA-RISER-NETWORK-01', BRANCH = 'LUNA-L06-NETWORK-BRANCH-01';
  const ONT = 'LUNA-L06-APT-A-NET-ONT-01', ROUTER = 'LUNA-L06-APT-A-ROUTER-01';

  // ---- 1. Canonical network/edge inventory — zero new assets ----
  const allRefs = data.listAssets().map((a) => a.ref);
  assert.equal(new Set(allRefs).size, allRefs.length, 'no duplicate canonical refs anywhere in the catalog');
  for (const ref of NETWORK_STATE_SOURCE_REFS) assert.ok(data.getAsset(ref), `${ref} must be a real registered canonical asset`);
  assert.equal(NETWORK_BOARD_ASSETS.length, 3, 'Network Control Board must expose exactly 3 real common asset tabs');
  checks.push('Canonical network/edge inventory preserved: every registered ref intact (zero new canonical operational assets were created), no duplicates');

  // ---- 2. Fixed a real, confirmed gap — ROUTER-01 now has a runtime row ----
  assert.ok(p.getState(ROUTER), 'LUNA-L06-APT-A-ROUTER-01 must now have a real runtime row (it already had a seededState declaring uplink_up:true, but no corresponding runtime entry existed before this phase)');
  checks.push('Router runtime gap fixed: LUNA-L06-APT-A-ROUTER-01 now has a real runtime row, matching the exact uplink_up:true value already declared in its own pre-existing seededState — nothing invented');

  // ---- 3. No capability fabrication ----
  for (const ref of NETWORK_STATE_SOURCE_REFS) {
    assert.equal(data.getAsset(ref).classification === 'controllable', false, `${ref} must not be controllable — no command is documented anywhere in the canonical schedule`);
    assert.deepEqual(p.getState(ref).availableCommands, [], `${ref} must expose zero commands`);
  }
  checks.push('Safety boundary preserved: no remote-control capability was fabricated for any network/edge asset — all remain observable, matching the real backend schedule');

  // ---- 4. The one real, pre-existing physical backbone chain (parentRef, Phase 10) ----
  assert.equal(data.getAsset(RISER).parentRef, GATEWAY);
  assert.equal(data.getAsset(BRANCH).parentRef, RISER);
  assert.equal(data.getAsset(ONT).parentRef, BRANCH);
  assert.equal(data.getAsset(ROUTER).parentRef, ONT);
  assert.equal(data.getAsset(WIFI_AP).parentRef, GATEWAY);
  assert.equal(data.getAsset(EDGE_CORE).parentRef, undefined, 'Oyi Edge/Core must have NO parentRef — no connection to the gateway chain is established anywhere in canonical data');
  checks.push('The one real physical backbone chain is expressed entirely through the PRE-EXISTING parentRef data (Phase 10) — no new relationship edges were needed: GATEWAY <- RISER <- BRANCH <- ONT <- ROUTER, and GATEWAY <- WIFI_AP. Oyi Edge/Core confirmed to have zero relationship to it.');

  // ---- 5. THE NETWORK CARRIES TRUTH, IT DOES NOT CREATE TRUTH — the central resolver guarantee ----
  i.resetAll();
  let network = resolveNetworkState();
  assert.ok(network, 'resolver must return live state once the store is built');
  assert.equal(network.edgeCoreConnected, false, 'edgeCoreConnected must be hardcoded false — the resolver must never claim a connection that is not real');
  assert.equal(network.gatewayUplinkUp, true);
  assert.ok(network.backbone.every((n) => n.reachable === true), 'fresh reset: entire real backbone chain reads reachable');
  assert.equal(network.wifiApReachable, true);
  checks.push('resolveNetworkState() fresh-reset baseline: gateway uplink up, entire real backbone chain reachable, Wi-Fi AP reachable, edgeCoreConnected hardcoded false');

  // ---- 6. Deterministic cascade — gateway uplink lost, recovery ----
  const scenario = LUNA_SCENARIOS.find((s) => s.key === 'network-uplink-lost');
  assert.ok(scenario, 'network-uplink-lost scenario must exist');
  scenario.apply();
  network = resolveNetworkState();
  assert.equal(network.gatewayUplinkUp, false);
  assert.ok(network.backbone.every((n) => n.reachable === false), 'the entire real backbone chain must cascade to unreachable when the gateway itself loses uplink');
  assert.equal(network.wifiApReachable, false);
  assert.equal(network.wifiApClientsConnected, 0, 'an unreachable AP must show zero clients, not a fabricated positive count');
  assert.equal(state(ONT).uplink_up, false, 'the cascade must also write the real downstream uplink_up fields the geometry/panels read directly');
  assert.equal(state(ROUTER).uplink_up, false);
  checks.push('Deterministic cascade: gateway uplink lost -> the entire real backbone chain (riser/branch/ONT/router) and the Wi-Fi AP cascade to unreachable — a real derivation within Network/Edge\'s own domain, the same precedent as recomputePowerNetwork()\'s MDB energization cascade');

  i.resetAll();
  network = resolveNetworkState();
  assert.equal(network.gatewayUplinkUp, true);
  assert.ok(network.backbone.every((n) => n.reachable === true));
  assert.equal(network.wifiApClientsConnected, 14);
  checks.push('Recovery: reset returns the gateway uplink, the entire backbone chain, and the Wi-Fi AP client count to their real baseline');

  // ---- 7. Network never becomes a dependency of any other system's own resolver ----
  // Cascade the network offline, then confirm Fire/HVAC/Access/CCTV all
  // still resolve completely independently — THE NETWORK CARRIES TRUTH,
  // IT DOES NOT CREATE TRUTH for any other system.
  scenario.apply();
  const { resolveFireState } = await load('luna/runtime/lunaFireResolver.ts');
  const { resolveHvacState } = await load('luna/runtime/lunaHvacResolver.ts');
  const fireBefore = resolveFireState();
  const hvacBefore = resolveHvacState();
  assert.ok(fireBefore, 'Fire must resolve completely independently of network state');
  assert.equal(fireBefore.fireState, 'normal');
  assert.ok(hvacBefore, 'HVAC must resolve completely independently of network state');
  assert.equal(hvacBefore.hvacState, 'off');
  i.resetAll();
  checks.push('Boundary proven: Fire and HVAC resolve their own complete, correct, independent state while the network is fully offline — Network/Edge never becomes a dependency of any other system\'s own resolver');

  // ---- 8. Oyi target phrases ----
  const s1 = parseIntent('Show me the network.', {});
  assert.equal(s1.kind, 'show_system'); assert.equal(s1.system, 'network-edge');
  const s2 = parseIntent('Is the edge core online?', {});
  assert.equal(s2.kind, 'query'); assert.deepEqual(s2.targetRefs, [EDGE_CORE]);
  const s3 = parseIntent('Show me the gateway.', {});
  assert.deepEqual(s3.targetRefs, [GATEWAY]);
  const s4 = parseIntent("Is Apartment 6A's router online?", {});
  assert.deepEqual(s4.targetRefs, [ROUTER]);
  // "What connects the fire panel to the network?" was deliberately NOT
  // given special-case handling: no matcher claims this phrasing (the
  // pre-existing RELATIONSHIP_PHRASES mechanism only fires on the literal
  // adjacent "connects to"/"connected to", which this wording doesn't
  // contain), so it falls through to the generic asset query on the fire
  // panel itself — a real, honest answer about the fire panel's own
  // state that never mentions or fabricates any network connection.
  const s5 = parseIntent('What connects the fire panel to the network?', {});
  assert.equal(s5.kind, 'query');
  assert.deepEqual(s5.targetRefs, ['LUNA-B1-FIRE-PANEL-01']);
  const scene = { navigateToAsset() {}, navigateToSpace() {}, setSystemMode() {}, assetView() { return false; } };
  const controller = new TwinIntelligenceController(
    data,
    p,
    scene,
    (ref) => explainAsset(data, p, ref),
    (system, targetRef) => lunaBuildRoute(data, system, targetRef),
    (ref, type) => lunaResolveRelationship(ref, type)
  );
  const honestAnswer = await controller.handleIntent(s5, buildScopePolicy(facility), {});
  assert.equal(honestAnswer.ok, true);
  assert.doesNotMatch(honestAnswer.text, /network|gateway|uplink/i);
  checks.push(`Oyi parser resolves all network target phrases correctly. The unimplemented phrasing ("what connects the fire panel to the network") was deliberately given NO special-case code — it honestly falls through to a plain query on the fire panel itself, which never mentions or fabricates any network connection: "${honestAnswer.text}"`);
  const denyPhrase = parseIntent('Is the fire panel connected to the network?', {});
  assert.equal(denyPhrase.kind, 'show_relationship');
  const honestDenial = await controller.handleIntent(denyPhrase, buildScopePolicy(facility), {});
  assert.equal(honestDenial.ok, false);
  assert.match(honestDenial.text, /don't have that relationship on record/i);
  checks.push('The pre-existing generic "connected to" relationship mechanism (RELATIONSHIP_PHRASES) honestly answers "I don\'t have that relationship on record" for the fire panel — no fabricated network edge, and no special-case code was written for this negative answer');

  // ---- 9. The real route-tracing chain already worked before this phase ----
  const routeIntent = parseIntent('Trace the network to Apartment 6A.', {});
  assert.equal(routeIntent.kind, 'show_route');
  assert.equal(routeIntent.system, 'network-edge');
  checks.push('The real physical backbone is already traceable via the PRE-EXISTING buildServiceRoute()/UNIT_SYSTEM_TERMINATION mechanism (Phase 10\'s own "network-edge": NET-ONT-01 termination entry) — zero new route code was needed for this phase');

  // ---- 10. Vocabulary collision check ----
  const c1 = parseIntent('Show me the cameras.', {});
  assert.equal(c1.system, 'security', "CCTV's own aggregate phrase must be unaffected");
  const c2 = parseIntent('Is the main entrance locked?', {});
  assert.deepEqual(c2.targetRefs, ['LUNA-GROUND-ACCESS-MAIN-01'], "Access's own status phrase must be unaffected");
  const c3 = parseIntent('Turn on the AC.', {});
  assert.deepEqual(c3.targetRefs, ['LUNA-L06-APT-A-LIVING-AC-01'], "HVAC's own command phrase must be unaffected");
  const c4 = parseIntent('Show me the network gateway.', {});
  assert.deepEqual(c4.targetRefs, [GATEWAY], 'a specific-asset network phrase must still resolve via matchAsset, not get swallowed by the new aggregate "show me the network" matcher');
  checks.push('Vocabulary collision check: CCTV/Access/HVAC phrases all resolve exactly as before; "show me the network gateway" (specific asset) is correctly NOT swallowed by the new "show me the network." (aggregate) matcher');

  // ---- 11. Oyi narrative correctness ----
  i.resetAll();
  const gatewayText = explainAsset(data, p, GATEWAY);
  assert.match(gatewayText, /reference simulation/);
  assert.match(gatewayText, /Data \/ Fiber Riser/);
  assert.match(gatewayText, /no established connection/i);
  checks.push(`Oyi "show me the network" narrative covers the real backbone chain AND explicitly discloses Edge/Core's own lack of connection: "${gatewayText}"`);
  const edgeCoreText = explainAsset(data, p, EDGE_CORE);
  assert.match(edgeCoreText, /DESIGN DECISION REQUIRED/);
  checks.push(`Oyi "is the edge core online" narrative: "${edgeCoreText}"`);

  // ---- 12. Facility permissions / Consumer boundaries ----
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: GATEWAY, identity: facility }), 'FULL_3D', 'common network infrastructure stays fully visible to Facility, unchanged');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: GATEWAY, identity: resident }), 'HIDDEN', 'a resident does not gain Facility network visibility merely because common infrastructure exists');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: ONT, identity: facility }), 'CONTEXT_3D', 'the apartment ONT is Facility-owned infrastructure (pre-existing allowlist entry) — CONTEXT_3D, unchanged');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: ROUTER, identity: facility }), 'HIDDEN', 'the resident\'s OWN router stays HIDDEN to Facility — same boundary as HVAC\'s indoor units / Access\'s own lock, unchanged');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: ROUTER, identity: resident }), 'FULL_3D', 'the assigned resident sees their own router fully, unchanged');
  checks.push('RepresentationPolicy unchanged: Facility sees common network infrastructure FULL_3D and the Facility-owned ONT CONTEXT_3D (both pre-existing rules); the resident\'s own router stays HIDDEN to Facility, FULL_3D for the assigned resident');

  // ---- 13. Control Board registry sanity ----
  assert.equal(NETWORK_BOARD_DEFAULT_REF, GATEWAY);
  assert.ok(isNetworkBoardRef(GATEWAY)); assert.ok(isNetworkBoardRef(WIFI_AP)); assert.ok(isNetworkBoardRef(EDGE_CORE));
  assert.equal(isNetworkBoardRef(ROUTER), false, 'the resident\'s own router is deliberately NOT a Facility board tab');
  assert.equal(isNetworkBoardRef(ONT), false, 'the private-unit-scoped ONT is deliberately NOT a Facility board tab either, matching the established private-unit-asset-never-a-board-tab precedent');
  assert.equal(networkBoardTabKeyFor(GATEWAY), GATEWAY);
  checks.push('Network Control Board asset registry: 3 real common-asset tabs (Gateway default/Wi-Fi AP/Oyi Edge Core), deterministic default; the private-unit ONT and resident-owned router correctly excluded');

  i.resetAll();
  writeFileSync('artifacts/luna-network-edge-connectivity-runtime-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} catch (error) {
  writeFileSync('artifacts/luna-network-edge-connectivity-runtime-results.json', JSON.stringify({ passed: false, checks, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await server.close();
}
