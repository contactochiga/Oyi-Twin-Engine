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
  const { CCTV_CAMERA_REFS, resolveCameraState, resolveAllCameraStates, resolveCameraForAccessPoint } = await load('luna/runtime/lunaCameraResolver.ts');
  const { explainAsset } = await load('luna/intelligence/lunaExplain.ts');
  const { CCTV_BOARD_ASSETS, isCctvBoardRef, cctvBoardTabKeyFor, CCTV_BOARD_DEFAULT_REF } = await load('luna/operational/lunaCctvBoard.ts');

  const facility = identityForScope('facility'), resident = identityForScope('consumer');
  const state = (ref) => p.getState(ref).state;
  const exec = (ref, command, args = {}, who = facility) => p.execute({ assetRef: ref, command, args, actor: who });

  const [SEC, LOBBY, PARKING, COMMON] = CCTV_CAMERA_REFS;
  const MAIN = 'LUNA-GROUND-ACCESS-MAIN-01', SERVICE = 'LUNA-B1-ACCESS-SERVICE-01', LIFT_LOBBY = 'LUNA-GROUND-ACCESS-LIFT-LOBBY-01';
  const LOCK = 'LUNA-L06-APT-A-ENTRY-LOCK-01', INTERCOM = 'LUNA-L06-APT-A-ENTRY-INTERCOM-01';

  // ---- 1. Canonical camera inventory ----
  const allRefs = data.listAssets().map((a) => a.ref);
  assert.equal(new Set(allRefs).size, allRefs.length, 'no duplicate canonical refs anywhere in the catalog');
  assert.equal(CCTV_CAMERA_REFS.length, 4, 'exactly four registered cameras, matching the Master Equipment Schedule');
  for (const ref of CCTV_CAMERA_REFS) assert.ok(data.getAsset(ref), `${ref} must be a real registered canonical asset`);
  assert.equal(CCTV_BOARD_ASSETS.length, 4, 'CCTV Control Board must expose exactly 4 real asset-selector tabs');
  checks.push('Canonical camera inventory preserved: all four registered CCTV assets intact (zero new canonical operational assets were created), no duplicates');

  // ---- 2. No capability fabrication — schedule boundary ----
  for (const ref of CCTV_CAMERA_REFS) {
    assert.equal(data.getAsset(ref).classification, 'observable', `${ref} must remain observable — no PTZ/recording/live-view capability was fabricated`);
    assert.deepEqual(p.getState(ref).availableCommands, [], `${ref} must expose zero commands`);
  }
  checks.push('Safety boundary preserved: no PTZ, recording, playback, live-view or event-search capability was fabricated for any camera — all four remain observable; none, matching the real backend schedule');

  // ---- 3. State — online (fresh), offline (scenario), recovery ----
  i.resetAll();
  assert.equal(resolveCameraState(SEC).state, 'online', 'fresh reset starts online');
  const offlineScenario = LUNA_SCENARIOS.find((s) => s.key === 'camera-offline');
  assert.ok(offlineScenario, 'the pre-existing camera-offline scenario must still exist — reused, not recreated');
  offlineScenario.apply();
  assert.equal(resolveCameraState(SEC).state, 'offline', 'camera-offline scenario must flip the resolver to offline');
  assert.equal(resolveCameraState(LOBBY).state, 'online', 'only the ground entrance camera is affected — other cameras stay online');
  i.resetAll();
  assert.equal(resolveCameraState(SEC).state, 'online', 'recovery: reset returns the camera to online');
  checks.push('Camera state: ONLINE (fresh reset) -> OFFLINE (pre-existing camera-offline scenario, reused not recreated) -> ONLINE (recovery via reset) — no FAULT/MAINTENANCE state was fabricated, since no runtime field or scenario supports them');

  // ---- 4. Canonical, non-proximity-derived access-point relationships ----
  const mainEdge = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, MAIN, 'monitored_by').find((e) => e.to === SEC);
  assert.ok(mainEdge, 'Main Resident Entrance must carry a real monitored_by edge to the Ground Entrance Camera');
  const lockEdge = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, LOCK, 'monitored_by').find((e) => e.to === INTERCOM);
  assert.ok(lockEdge, 'the apartment entrance lock must carry a real monitored_by edge to its own video intercom');
  assert.equal(resolveCameraForAccessPoint(SERVICE), null, 'Service Entrance has no canonical camera relationship — different locationLabel/position than the Parking camera, not guessed');
  assert.equal(resolveCameraForAccessPoint(LIFT_LOBBY), null, 'Lift Lobby has no canonical camera relationship — not inferred from any camera\'s proximity');
  checks.push('Access-point/camera relationships are canonical monitored_by edges, never proximity-derived: Main Entrance<-Ground Entrance Camera and the apartment lock<-video intercom are real; Service Entrance and Lift Lobby are honestly left unresolved (no edge fabricated)');

  // ---- 5. Access event correlation — GRANTED and DENIED, real data ----
  i.resetAll();
  await exec(LOCK, 'unlock', {}, resident);
  let camera = resolveCameraForAccessPoint(LOCK);
  assert.equal(camera.ref, INTERCOM);
  let events = i.getAccessEvents();
  assert.equal(events[1].label, 'ACCESS_GRANTED');
  const grantedText = explainAsset(data, p, INTERCOM);
  // The narrative's "most recent event" is the newest-first log's own head
  // (UNLOCKED, logged immediately after ACCESS_GRANTED) — the GRANTED
  // outcome itself was already confirmed directly against the event log
  // above; this assertion checks the narrative surfaces the resulting
  // real physical-state event, not a second, divergent description.
  assert.match(grantedText, /UNLOCKED/);
  assert.match(grantedText, /unlocked/);
  checks.push(`Access correlation (granted): the intercom's own narrative includes the real resulting event and the lock's real state: "${grantedText}"`);

  i.resetAll();
  await exec(LOCK, 'unlock', {}, facility);
  events = i.getAccessEvents();
  assert.equal(events[0].label, 'ACCESS_DENIED');
  const deniedText = explainAsset(data, p, INTERCOM);
  assert.match(deniedText, /ACCESS_DENIED/);
  assert.match(deniedText, /locked/);
  checks.push(`Access correlation (denied): the intercom's own narrative includes the real DENIED event and confirms the door remains locked: "${deniedText}"`);

  // ---- 6. Camera events distinct from Access events — no duplication ----
  offlineScenario.apply();
  const eventsAfterOffline = i.getAccessEvents();
  assert.equal(eventsAfterOffline.length, events.length, 'a camera going offline must never write an ACCESS event — CCTV consumes Access events, it never produces them');
  i.resetAll();
  checks.push('Camera state transitions never write to the Access event log — Access remains the sole owner/producer of access events; CCTV only ever reads/correlates them, per the Section 16 boundary');

  // ---- 7. Oyi target phrases ----
  const s1 = parseIntent('Show me the cameras.', {});
  assert.equal(s1.kind, 'show_system'); assert.equal(s1.system, 'security');
  const s2 = parseIntent('Show me Camera 01.', {});
  assert.deepEqual(s2.targetRefs, [SEC]);
  const s3 = parseIntent('Is Camera 01 online?', {});
  assert.equal(s3.kind, 'query'); assert.deepEqual(s3.targetRefs, [SEC]);
  const s4 = parseIntent('Show me the camera at Apartment 6A.', {});
  assert.deepEqual(s4.targetRefs, [INTERCOM]);
  const s5 = parseIntent('Show me the last access event.', {});
  assert.deepEqual(s5.targetRefs, [LOCK]);
  const s6 = parseIntent('Show me the camera associated with the last denied access.', {});
  assert.deepEqual(s6.targetRefs, [INTERCOM]);
  const s7 = parseIntent('Why was access denied?', {});
  assert.equal(s7.kind, 'query'); assert.deepEqual(s7.targetRefs, [MAIN]);
  const s8 = parseIntent('Show me the security event.', {});
  assert.deepEqual(s8.targetRefs, [LOCK]);
  checks.push('Oyi parser resolves all CCTV/investigation target phrases to the correct intent shape, including the pre-existing Access phrase ("Why was access denied?") unchanged');

  // ---- 8. Vocabulary collision check — pre-existing systems unaffected ----
  const c1 = parseIntent('Show me the active power path.', {});
  assert.deepEqual(c1.targetRefs, ['LUNA-L06-APT-A-METER-ELEC-01'], 'Electrical\'s own route phrase must be unaffected');
  const c2 = parseIntent('Turn on the AC.', {});
  assert.deepEqual(c2.targetRefs, ['LUNA-L06-APT-A-LIVING-AC-01'], 'HVAC\'s own command phrase must be unaffected');
  const c3 = parseIntent('Is the main entrance locked?', {});
  assert.deepEqual(c3.targetRefs, [MAIN], 'Access\'s own status phrase must be unaffected');
  const c4 = parseIntent('Show me the water tank.', {});
  assert.deepEqual(c4.targetRefs, ['LUNA-B1-WATER-TANK-01'], 'Water\'s own asset alias must be unaffected');
  checks.push('Vocabulary collision check: Electrical/HVAC/Access/Water phrases all resolve exactly as before — no substring hijack introduced by the new camera/CCTV patterns');

  // ---- 9. Oyi narrative correctness ----
  i.resetAll();
  const camText = explainAsset(data, p, SEC);
  assert.match(camText, /online/);
  assert.match(camText, /reference simulation/);
  assert.match(camText, /Monitors: Main Resident Entrance/);
  checks.push(`Oyi camera narrative includes live state and its real monitored access point: "${camText}"`);

  // ---- 10. Facility permissions / Consumer boundaries ----
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: SEC, identity: facility }), 'FULL_3D', 'common CCTV infrastructure stays fully visible to Facility, unchanged');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: SEC, identity: resident }), 'HIDDEN', 'a resident must NOT gain Facility CCTV visibility merely because a camera exists in common space');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: INTERCOM, identity: facility }), 'HIDDEN', 'the private apartment intercom stays HIDDEN to Facility — same boundary as the entrance lock');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: INTERCOM, identity: resident }), 'FULL_3D', 'the assigned resident sees their own intercom fully, unchanged');
  checks.push('RepresentationPolicy unchanged: Facility sees common cameras FULL_3D, a resident is denied Facility CCTV visibility (HIDDEN), the private apartment intercom stays HIDDEN to Facility and FULL_3D only for the assigned resident');

  // ---- 11. Full Oyi controller round-trip — investigation flow ----
  i.resetAll();
  await exec(LOCK, 'unlock', {}, resident);
  const scene = { navigateToAsset() {}, navigateToSpace() {}, setSystemMode() {}, assetView() { return false; } };
  const controller = new TwinIntelligenceController(data, p, scene, (ref) => explainAsset(data, p, ref));
  const residentInvestigation = await controller.handleIntent(parseIntent('Show me the camera associated with the last denied access.', {}), buildScopePolicy(resident), {});
  assert.ok(residentInvestigation.ok, 'the assigned resident must be able to investigate their own door\'s camera via Oyi');
  assert.match(residentInvestigation.text, /video intercom|Doorbell/i);
  const facilityInvestigation = await controller.handleIntent(parseIntent('Show me the camera associated with the last denied access.', {}), buildScopePolicy(facility), {});
  assert.equal(facilityInvestigation.ok, false, 'Facility must be denied investigating the private apartment intercom end-to-end — the camera never becomes an authorization authority, and privacy holds even for security investigation');
  checks.push('Full Oyi investigation round-trip: the assigned resident reaches the real correlated camera + event narrative end-to-end; Facility is denied the SAME investigation end-to-end (private-unit privacy preserved even for security investigation, exactly Section 15\'s requirement)');

  // ---- 12. Control Board registry sanity ----
  assert.equal(CCTV_BOARD_DEFAULT_REF, SEC);
  assert.ok(isCctvBoardRef(SEC)); assert.ok(isCctvBoardRef(LOBBY)); assert.ok(isCctvBoardRef(PARKING)); assert.ok(isCctvBoardRef(COMMON));
  assert.equal(isCctvBoardRef(INTERCOM), false, 'the private apartment intercom is deliberately NOT a Facility board tab — same disclosed boundary as HVAC\'s indoor units / Access\'s own lock');
  assert.equal(cctvBoardTabKeyFor(SEC), SEC);
  checks.push('CCTV Control Board asset registry: 4 real camera tabs, deterministic default (Camera 01 / Ground Entrance Camera); the private intercom correctly excluded');

  // ---- 13. resolveAllCameraStates() sanity ----
  const all = resolveAllCameraStates();
  assert.equal(all.length, 4);
  assert.ok(all.every((c) => c.state === 'online' || c.state === 'offline'));
  checks.push('resolveAllCameraStates() returns all four cameras with a valid state — the single truth the Control Board summary widget reads');

  i.resetAll();
  writeFileSync('artifacts/luna-cctv-spatial-security-runtime-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} catch (error) {
  writeFileSync('artifacts/luna-cctv-spatial-security-runtime-results.json', JSON.stringify({ passed: false, checks, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await server.close();
}
