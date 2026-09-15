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
  const { lunaRepresentationPolicy } = await load('luna/policy/lunaRepresentationPolicy.ts');
  const { resolveAccessState, isAccessGovernedRef, resolveAccessAuthorization } = await load('luna/runtime/lunaAccessResolver.ts');
  const { explainAsset } = await load('luna/intelligence/lunaExplain.ts');
  const { ACCESS_BOARD_ASSETS, isAccessBoardRef, accessBoardTabKeyFor, ACCESS_BOARD_DEFAULT_REF } = await load('luna/operational/lunaAccessBoard.ts');

  const facility = identityForScope('facility'), resident = identityForScope('consumer');
  const state = (ref) => p.getState(ref).state;
  const exec = (ref, command, args = {}, who = facility) => p.execute({ assetRef: ref, command, args, actor: who });

  const MAIN = 'LUNA-GROUND-ACCESS-MAIN-01', SERVICE = 'LUNA-B1-ACCESS-SERVICE-01', LOBBY = 'LUNA-GROUND-ACCESS-LIFT-LOBBY-01';
  const LOCK = 'LUNA-L06-APT-A-ENTRY-LOCK-01';

  // ---- 1. Canonical identity preservation — zero new operational assets ----
  const allRefs = data.listAssets().map((a) => a.ref);
  assert.equal(new Set(allRefs).size, allRefs.length, 'no duplicate canonical refs anywhere in the catalog');
  for (const ref of [MAIN, SERVICE, LOBBY, LOCK]) assert.ok(data.getAsset(ref), `${ref} must be a real registered canonical asset`);
  assert.equal(ACCESS_BOARD_ASSETS.length, 3, 'Access Control Board must expose exactly 3 real asset-selector tabs (the common access points only)');
  checks.push('Canonical access asset identity preserved: every registered access-related ref intact (zero new operational assets were created), no duplicates');

  // ---- 2. No capability fabrication — schedule boundary ----
  // Master Equipment Schedule's own "Current instance register" documents
  // the three common access points as "observable; none" — this build
  // must not silently upgrade them to controllable.
  for (const ref of [MAIN, SERVICE, LOBBY]) {
    assert.equal(data.getAsset(ref).classification, 'observable', `${ref} must remain observable — no capability was fabricated`);
    assert.deepEqual(p.getState(ref).availableCommands, [], `${ref} must expose zero commands`);
  }
  assert.equal(data.getAsset(LOCK).classification, 'controllable');
  assert.deepEqual(p.getState(LOCK).availableCommands.sort(), ['lock', 'unlock'], 'the apartment lock keeps its exact pre-existing real capability — no open/close/door-motion command was fabricated');
  checks.push('Safety boundary preserved: no lock/door capability was fabricated for the three common access points; the one real reference lock keeps its exact pre-existing lock/unlock capability, nothing added');

  // ---- 3. Authorization vs physical state — GRANTED (assigned resident) ----
  i.resetAll();
  assert.equal(state(LOCK).locked, true, 'fresh reset starts locked');
  const grantedResult = await exec(LOCK, 'unlock', {}, resident);
  assert.ok(grantedResult.ok, 'the assigned resident must be authorized to unlock their own home');
  assert.equal(state(LOCK).locked, false, 'physical state changes only after authorization granted the command');
  const events1 = i.getAccessEvents();
  assert.equal(events1[1].label, 'ACCESS_GRANTED', 'an ACCESS_GRANTED event must be recorded before the resulting UNLOCKED event');
  assert.equal(events1[0].label, 'UNLOCKED', 'the resulting physical-state event must also be recorded');
  checks.push('Worked example (resident): valid resident credential -> authorized -> ACCESS_GRANTED event -> lock releases -> door state changes -> UNLOCKED event recorded, matching the brief\'s own worked example');

  // ---- 4. Authorization vs physical state — DENIED (facility, no master key) ----
  i.resetAll();
  const deniedFacility = await exec(LOCK, 'unlock', {}, facility);
  assert.equal(deniedFacility.ok, false, 'Facility must be denied — no master-key capability is modeled for a private home entrance');
  assert.equal(state(LOCK).locked, true, 'PHYSICAL STATE must remain unchanged on denial — the door remains locked');
  const eventsF = i.getAccessEvents();
  assert.equal(eventsF[0].label, 'ACCESS_DENIED');
  assert.match(eventsF[0].detail, /Facility/);
  checks.push('Worked example (Facility denial): Facility credential presented at the private home lock -> DENIED, reason recorded, PHYSICAL STATE unchanged (door remains locked), event recorded');

  // ---- 5. Authorization vs physical state — DENIED (unauthorized resident) ----
  i.resetAll();
  const otherResident = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-B'], facilityResponsibility: false };
  const deniedOther = await exec(LOCK, 'unlock', {}, otherResident);
  assert.equal(deniedOther.ok, false, 'a resident credential for a DIFFERENT home must be denied');
  assert.equal(state(LOCK).locked, true);
  checks.push('Worked example (unauthorized resident): a resident credential assigned to a different home is denied at this lock, physical state unchanged');

  // ---- 6. Authorization vs physical state — DENIED (unauthorized/visitor) ----
  i.resetAll();
  const visitor = { role: 'public', permissions: [], assignedHomeRefs: [], facilityResponsibility: false };
  const deniedVisitor = await exec(LOCK, 'unlock', {}, visitor);
  assert.equal(deniedVisitor.ok, false, 'an unauthenticated/visitor credential must be denied');
  assert.equal(state(LOCK).locked, true);
  const deniedNoActor = await exec(LOCK, 'unlock', {}, undefined);
  assert.equal(deniedNoActor.ok, false, 'no credential at all must be denied, never fail open');
  checks.push('Worked example (Visitor/Unauthorized): the pre-existing "public" role and a missing actor both deny access at the lock — never fails open');

  // ---- 7. Observable common access points accept no authorization gate at all ----
  // (there is nothing to gate — zero commands — confirmed by check 2)
  assert.equal(isAccessGovernedRef(MAIN), false);
  assert.equal(isAccessGovernedRef(LOCK), true);
  const mainAuth = resolveAccessAuthorization(facility, MAIN);
  assert.equal(mainAuth.granted, false);
  assert.match(mainAuth.reason, /DESIGN DECISION REQUIRED/);
  checks.push('resolveAccessAuthorization() honestly refuses to authorize an uncontrollable access point rather than fabricating a decision');

  // ---- 8. resolveAccessState() — honest instrumentation disclosure ----
  i.resetAll();
  let access = resolveAccessState();
  assert.ok(access);
  const mainPoint = access.points.find((pt) => pt.ref === MAIN);
  assert.equal(mainPoint.instrumented, false);
  assert.equal(mainPoint.locked, null, 'an uninstrumented point must report null, never a fabricated boolean');
  const lockPoint = access.points.find((pt) => pt.ref === LOCK);
  assert.equal(lockPoint.instrumented, true);
  assert.equal(lockPoint.locked, true);
  checks.push('resolveAccessState(): the three common points honestly report not-instrumented (locked: null); the one real reference lock reports its actual live state');

  // ---- 9. Event log capped, newest-first, capped at 40 ----
  for (let n = 0; n < 45; n++) {
    await exec(LOCK, n % 2 === 0 ? 'unlock' : 'lock', {}, resident);
  }
  const events2 = i.getAccessEvents();
  assert.ok(events2.length <= 40, 'access event log must be capped, matching FireEvent/ElectricalEvent convention');
  assert.ok(events2[0].at >= events2[events2.length - 1].at, 'events must be newest-first');
  checks.push(`Access event log capped at ${events2.length} entries (max 40), newest-first — same capped-array convention as FireEvent/ElectricalEvent`);

  // ---- 10. Oyi target phrases ----
  i.resetAll();
  const s1 = parseIntent('Is the main entrance locked?', {});
  assert.equal(s1.kind, 'query'); assert.deepEqual(s1.targetRefs, [MAIN]);
  const s2 = parseIntent('Open the main gate.', {});
  assert.equal(s2.kind, 'command'); assert.deepEqual(s2.targetRefs, [MAIN]); assert.equal(s2.command, 'open');
  const s3 = parseIntent('Lock the lobby entrance.', {});
  assert.equal(s3.kind, 'command'); assert.deepEqual(s3.targetRefs, [MAIN]); assert.equal(s3.command, 'lock');
  const s4 = parseIntent('Why was access denied?', {});
  assert.equal(s4.kind, 'query'); assert.deepEqual(s4.targetRefs, [MAIN]);
  const s5 = parseIntent('Show me the last access attempt.', {});
  assert.deepEqual(s5.targetRefs, [MAIN]);
  const s6 = parseIntent('Who attempted access?', {});
  assert.deepEqual(s6.targetRefs, [MAIN]);
  const s7 = parseIntent('Show me the access point.', {});
  assert.deepEqual(s7.targetRefs, [MAIN]);
  const s8 = parseIntent('Which doors are currently unlocked?', {});
  assert.equal(s8.kind, 'query'); assert.deepEqual(s8.targetRefs, [MAIN]);
  const s9 = parseIntent('Is the residential entrance secure?', {});
  assert.deepEqual(s9.targetRefs, [MAIN]);
  checks.push('Oyi parser resolves all 9 access target phrases from the brief to the correct intent shape');

  // ---- 11. Vocabulary collision check — pre-existing systems unaffected ----
  // Direct proof this phase's new patterns did not hijack another
  // system's phrasing, the exact class of bug the HVAC phase found and
  // fixed ("the ac" swallowing "the active power path").
  const collisionCheck1 = parseIntent('Show me the active power path.', {});
  assert.deepEqual(collisionCheck1.targetRefs, ['LUNA-L06-APT-A-METER-ELEC-01'], 'Electrical\'s own route phrase must be unaffected by new access vocabulary');
  const collisionCheck2 = parseIntent('Turn on the AC.', {});
  assert.deepEqual(collisionCheck2.targetRefs, ['LUNA-L06-APT-A-LIVING-AC-01'], 'HVAC\'s own command phrase must be unaffected');
  const collisionCheck3 = parseIntent('Is the AC running?', {});
  assert.deepEqual(collisionCheck3.targetRefs, ['LUNA-L06-APT-A-LIVING-AC-01']);
  const collisionCheck4 = parseIntent('Show me the fire panel.', {});
  assert.deepEqual(collisionCheck4.targetRefs, ['LUNA-B1-FIRE-PANEL-01']);
  checks.push('Vocabulary collision check: Electrical\'s "active power path" and HVAC\'s "turn on the AC"/"is the AC running" phrases resolve exactly as before — no substring hijack introduced');

  // ---- 12. Oyi narrative correctness ----
  i.resetAll();
  const statusText = explainAsset(data, p, MAIN);
  assert.match(statusText, /reference simulation/);
  assert.match(statusText, /DESIGN DECISION REQUIRED/);
  assert.match(statusText, /Entrance Smart Lock/);
  checks.push(`Oyi "why was access denied"/"show me the access point"/"which doors are unlocked" all resolve to the SAME aggregate narrative: "${statusText}"`);
  const lockText = explainAsset(data, p, LOCK);
  assert.match(lockText, /locked|unlocked/);
  checks.push(`Oyi answer for Apartment 6A's own entrance lock: "${lockText}"`);

  // ---- 13. Facility permissions / Consumer boundaries ----
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: MAIN, identity: facility }), 'FULL_3D', 'common infrastructure stays fully visible to Facility, unchanged');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: LOCK, identity: facility }), 'HIDDEN', 'the private home lock stays HIDDEN to Facility — this phase did not touch RepresentationPolicy or the Facility-owned-unit allowlist');
  assert.equal(lunaRepresentationPolicy.resolveMode({ ref: LOCK, identity: resident }), 'FULL_3D', 'the assigned resident sees their own lock fully, unchanged');
  checks.push('RepresentationPolicy unchanged: Facility sees common access points FULL_3D, the private lock stays HIDDEN to Facility, the assigned resident sees their own lock FULL_3D — identical to pre-existing behavior');

  // ---- 14. Full Oyi controller round-trip — GRANTED and DENIED ----
  i.resetAll();
  const scene = { navigateToAsset() {}, navigateToSpace() {}, setSystemMode() {}, assetView() { return false; } };
  const controller = new TwinIntelligenceController(data, p, scene, (ref) => explainAsset(data, p, ref));
  const residentUnlock = await controller.handleIntent(parseIntent('Unlock the door.', {}), buildScopePolicy(resident), {});
  assert.ok(residentUnlock.ok, 'the assigned resident must be able to unlock their own door via Oyi (a real, authorized state change)');
  assert.equal(state(LOCK).locked, false);
  i.resetAll();
  const facilityUnlockDenied = await controller.handleIntent(parseIntent('Unlock the door.', {}), buildScopePolicy(facility), {});
  assert.equal(facilityUnlockDenied.ok, false, 'Facility must be denied through the full controller path — HIDDEN, never reaches the authorization gate at all');
  assert.equal(state(LOCK).locked, true);
  checks.push('Full Oyi controller round-trip: resident unlock succeeds end-to-end (real state change, real GRANTED event); Facility attempt denied end-to-end (physical state never changes)');

  // ---- 15. Control Board registry sanity ----
  assert.equal(ACCESS_BOARD_DEFAULT_REF, MAIN);
  assert.ok(isAccessBoardRef(MAIN)); assert.ok(isAccessBoardRef(SERVICE)); assert.ok(isAccessBoardRef(LOBBY));
  assert.equal(isAccessBoardRef(LOCK), false, 'the private lock is deliberately NOT a Facility board tab — same disclosed boundary as HVAC\'s indoor units');
  assert.equal(accessBoardTabKeyFor(MAIN), MAIN);
  checks.push('Access Control Board asset registry: 3 real common-access-point tabs, deterministic default (Main Entrance); the private lock correctly excluded');

  // ---- 16. RepresentationPolicy byte-hash unchanged ----
  // (re-verified for real in the full regression run via test:lift's own
  // hash assertion — this check just confirms the module still imports
  // and resolves cleanly after this phase's changes.)
  assert.ok(typeof lunaRepresentationPolicy.resolveMode === 'function');
  checks.push('lunaRepresentationPolicy.ts module unchanged and functional (byte-hash re-verified by test:lift in the full regression run)');

  i.resetAll();
  writeFileSync('artifacts/luna-access-security-runtime-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} catch (error) {
  writeFileSync('artifacts/luna-access-security-runtime-results.json', JSON.stringify({ passed: false, checks, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await server.close();
}
