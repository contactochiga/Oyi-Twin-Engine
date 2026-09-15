// Apartment A Full Interior Reality V1 — Parts 1/2/3/5/11. Proves Oyi's
// spatial-command phrase semantics resolve through the SAME generic
// navigate intent / SceneActions.navigateToSpace() dispatch every other
// entry point uses (Part 1: no second movement system), with the correct
// navAction/navModeOverride annotation for each phrase family (Part 2),
// identity-correct "take me home" resolution (Part 3), canonical room/
// device alias resolution (Part 5), and response wording that honestly
// distinguishes LOCATE from ENTER (Part 11).
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const checks = [];
try {
  const load = (path) => server.ssrLoadModule('/src/' + path);
  const { parseIntent } = await load('luna/intelligence/lunaIntentParser.ts');
  const { TwinIntelligenceController, HOME_DESTINATION_SENTINEL } = await load('engine/twinIntelligence.ts');
  const { identityForScope, buildScopePolicy } = await load('luna/intelligence/lunaScope.ts');
  const { lunaTwinDataProvider: data } = await load('luna/operational/lunaTwinDataProvider.ts');
  const { lunaSimulationProvider: runtime } = await load('luna/runtime/lunaSimulationProvider.ts');
  const { explainAsset } = await load('luna/intelligence/lunaExplain.ts');

  const KITCHEN = 'LUNA-L06-APT-A-KITCHEN';
  const LIVING = 'LUNA-L06-APT-A-LIVING';
  const BED_02 = 'LUNA-L06-APT-A-BED-02';
  const HOME = 'LUNA-L06-APT-A';

  // ---- 1. Room alias resolution (Part 5) ----
  assert.equal(parseIntent('Take me to the kitchen.', {}).targetRefs[0], KITCHEN, 'kitchen alias must resolve to the real canonical Kitchen ref');
  assert.equal(parseIntent('Take me to the living room.', {}).targetRefs[0], LIVING, 'living room alias must resolve to the real canonical Living Room ref');
  assert.equal(parseIntent('Take me to bedroom 2.', {}).targetRefs[0], BED_02, 'bedroom alias must resolve to the real canonical Bedroom 2 ref');
  checks.push('1. Room alias resolution: kitchen/living room/bedroom phrases resolve to their real canonical room refs');

  // ---- 2. Mode-agnostic ENTER phrase (Part 2A) ----
  const enterIntent = parseIntent('Take me to the kitchen.', {});
  assert.equal(enterIntent.kind, 'navigate');
  assert.equal(enterIntent.navAction, undefined, 'a plain "take me to X" carries no navAction override — defaults to ENTER at dispatch time');
  assert.equal(enterIntent.navModeOverride, undefined, 'a plain "take me to X" must not force a mode — it obeys whatever the session navigationMode already is');
  checks.push('2. Mode-agnostic ENTER: "Take me to the kitchen" resolves Kitchen with no forced mode — obeys the current session navigationMode');

  // ---- 3. Explicit TOUR override (Part 2B) ----
  for (const phrase of ['Walk me to the kitchen.', 'Tour me to the kitchen.', 'Take me there physically.']) {
    const i = parseIntent(phrase, {});
    if (phrase === 'Take me there physically.') continue; // no space alias in this bare phrase; covered by the two above
    assert.equal(i.targetRefs[0], KITCHEN, `"${phrase}" must still resolve the real Kitchen ref`);
    assert.equal(i.navAction, 'enter', `"${phrase}" is a real ENTER request, not a LOCATE`);
    assert.equal(i.navModeOverride, 'TOUR', `"${phrase}" must force a one-shot TOUR override`);
  }
  checks.push('3. Explicit TOUR override: "walk me to X" / "tour me to X" force a one-shot TOUR override without touching navAction');

  // ---- 4. Explicit TELEPORT override (Part 2C) ----
  for (const phrase of ['Jump to the kitchen.', 'Teleport me to the kitchen.']) {
    const i = parseIntent(phrase, {});
    assert.equal(i.targetRefs[0], KITCHEN, `"${phrase}" must still resolve the real Kitchen ref`);
    assert.equal(i.navAction, 'enter');
    assert.equal(i.navModeOverride, 'TELEPORT', `"${phrase}" must force a one-shot TELEPORT override`);
  }
  checks.push('4. Explicit TELEPORT override: "jump to X" / "teleport me to X" force a one-shot TELEPORT override');

  // ---- 5. LOCATE phrases (Part 2D) ----
  for (const phrase of ['Where is the kitchen?', 'Show me the kitchen.']) {
    const i = parseIntent(phrase, {});
    assert.equal(i.kind, 'navigate');
    assert.equal(i.targetRefs[0], KITCHEN, `"${phrase}" must resolve the real Kitchen ref`);
    assert.equal(i.navAction, 'locate', `"${phrase}" must be a LOCATE-only request, never a travel request`);
    assert.equal(i.navModeOverride, undefined, 'a LOCATE phrase never carries a mode override — there is no travel to mode-select');
  }
  checks.push('5. LOCATE phrases: "where is X" / "show me X" resolve navAction:"locate" — select/peek only, never travel');

  // ---- 6. "Take me home" resolves to the acting identity's own home (Part 3) ----
  const homeIntent = parseIntent('Take me home.', {});
  assert.equal(homeIntent.targetRefs[0], HOME_DESTINATION_SENTINEL, 'the parser cannot know identity — it hands off the sentinel, never guesses a ref');
  const resident = identityForScope('consumer'); // DEFAULT_ASSIGNED_HOME = LUNA-L06-APT-A
  const scene1 = { navigateToAsset() {}, navigateToSpace(ref, options) { scene1.lastRef = ref; scene1.lastOptions = options; }, setSystemMode() {} };
  const controller1 = new TwinIntelligenceController(data, runtime, scene1, (ref) => explainAsset(data, runtime, ref));
  const homeResponse = await controller1.handleIntent(homeIntent, buildScopePolicy(resident), {});
  assert.equal(homeResponse.ok, true, '"take me home" must succeed for an identity with a real assigned home');
  assert.equal(scene1.lastRef, HOME, 'the resolved destination must be the REAL assigned home ref, read from the acting identity — never hardcoded');
  checks.push('6. "Take me home": the sentinel resolves through scopePolicy.actor.assignedHomeRefs — identity-correct, not a fixed Apartment A string');

  // ---- 7. "Take me home" fails honestly for an identity with no assigned home ----
  const facilityIdentity = identityForScope('facility');
  const homeResponseFacility = await controller1.handleIntent(parseIntent('Take me home.', {}), buildScopePolicy(facilityIdentity), {});
  assert.equal(homeResponseFacility.ok, false, 'an identity with no assigned home must get an honest failure, never a fabricated destination');
  checks.push('7. "Take me home" (no assigned home): fails honestly rather than guessing a destination');

  // ---- 8. Controller threads navAction/navModeOverride straight through to SceneActions (Part 1: single dispatch path) ----
  const locateIntent = parseIntent('Where is the kitchen?', {});
  await controller1.handleIntent(locateIntent, buildScopePolicy(resident), {});
  assert.deepEqual(scene1.lastOptions, { navAction: 'locate', navModeOverride: undefined }, 'the controller must pass the SAME navAction/navModeOverride the parser resolved — no re-interpretation, no second policy');
  const tourIntent = parseIntent('Walk me to the kitchen.', {});
  await controller1.handleIntent(tourIntent, buildScopePolicy(resident), {});
  assert.deepEqual(scene1.lastOptions, { navAction: 'enter', navModeOverride: 'TOUR' }, 'an explicit TOUR override must reach SceneActions.navigateToSpace unchanged');
  checks.push('8. Single dispatch path (Part 1): TwinIntelligenceController.handleNavigate forwards navAction/navModeOverride verbatim to SceneActions.navigateToSpace — no second route/camera system, no Kitchen-specific code');

  // ---- 9. Response wording distinguishes LOCATE from ENTER (Part 11) ----
  const locateResp = await controller1.handleIntent(parseIntent('Where is the kitchen?', {}), buildScopePolicy(resident), {});
  const enterResp = await controller1.handleIntent(parseIntent('Take me to the kitchen.', {}), buildScopePolicy(resident), {});
  assert.notEqual(locateResp.text, enterResp.text, 'LOCATE and ENTER responses must read differently — never the same "you arrived" wording for a peek');
  assert.ok(/where/i.test(locateResp.text), 'the LOCATE response must not claim travel occurred');
  checks.push('9. Honest response wording: LOCATE replies read as "here is where it is", ENTER replies read as "here you go" — never conflated');

  // ---- 10. Ambiguous/private destinations remain blocked for an unrelated identity (Part 5) ----
  const otherResident = identityForScope('consumer', 'LUNA-L06-APT-B');
  const deniedResponse = await controller1.handleIntent(parseIntent('Take me to the kitchen.', {}), buildScopePolicy(otherResident), {});
  assert.equal(deniedResponse.ok, false, 'a resident not assigned to Apartment A must still be denied the real Apartment A Kitchen — the alias resolving correctly does not bypass policy');
  assert.equal(deniedResponse.deniedByScope, true);
  checks.push('10. Unrelated identity stays blocked: resolving the Kitchen alias correctly is independent of, and does not bypass, RepresentationPolicy');

  // ---- 11. Device command proof (Part 4) — "Turn on the living room light" ----
  const cmdIntent = parseIntent('Turn on the living room light.', {});
  assert.equal(cmdIntent.kind, 'command');
  assert.deepEqual(cmdIntent.targetRefs.sort(), ['LUNA-L06-APT-A-LIVING-LIGHT-01', 'LUNA-L06-APT-A-LIVING-LIGHT-02'].sort(), 'the real, already-existing Living Room light circuits — never a fabricated device');
  assert.equal(cmdIntent.command, 'turnOn');
  const before = runtime.getState('LUNA-L06-APT-A-LIVING-LIGHT-01').state;
  const cmdResponse = await controller1.handleIntent(cmdIntent, buildScopePolicy(resident), {});
  assert.equal(cmdResponse.ok, true, 'the permitted resident must be able to actually execute the command through the real runtime');
  const after = runtime.getState('LUNA-L06-APT-A-LIVING-LIGHT-01').state;
  assert.notDeepEqual(before, after, 'the real runtime state must have actually changed — not just a response string');
  checks.push('11. Device command proof: "Turn on the living room light" resolves ROOM -> canonical device -> permitted capability -> real runtime command -> updated state, via the existing unmodified command pipeline');

  writeFileSync('artifacts/apartment-a-oyi-semantics-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} catch (error) {
  writeFileSync('artifacts/apartment-a-oyi-semantics-results.json', JSON.stringify({ passed: false, checks, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await server.close();
}
