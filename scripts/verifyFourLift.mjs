import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const checks = [];
try {
  const load = (path) => server.ssrLoadModule('/src/' + path);
  const { lunaSimulationProvider: p, lunaRuntimeInternals: i } = await load('luna/runtime/lunaSimulationProvider.ts');
  const { LIFT_DEFINITIONS: defs, isLiftRef, liftDefinition, LIFT_STOPS: stops, liftCamera } = await load('luna/lift/lunaLift.ts');
  const { identityForScope, buildScopePolicy } = await load('luna/intelligence/lunaScope.ts');
  const { lunaTwinDataProvider: data } = await load('luna/operational/lunaTwinDataProvider.ts');
  const { parseIntent } = await load('luna/intelligence/lunaIntentParser.ts');
  const { TwinIntelligenceController } = await load('engine/twinIntelligence.ts');
  const { LUNA_SCENARIOS } = await load('luna/runtime/lunaScenarios.ts');

  const REF01 = 'LUNA-LIFT-PASS-01', REF02 = 'LUNA-LIFT-PASS-02', REF03 = 'LUNA-LIFT-PASS-03', REFSVC = 'LUNA-LIFT-SERVICE-01';
  const actor = identityForScope('facility'), resident = identityForScope('consumer');
  const state = (ref) => p.getState(ref).state;
  const exec = (ref, command, args = {}, who = actor) => p.execute({ assetRef: ref, command, args, actor: who });
  const runUntil = (predicate, max = 8000) => { let n = 0; while (!predicate() && n++ < max) i.advanceLiftClock(0.02); assert.ok(predicate(), 'Timed out'); };
  const runBoth = (pred1, pred2, max = 8000) => { let n = 0; while (!(pred1() && pred2()) && n++ < max) i.advanceLiftClock(0.02); assert.ok(pred1() && pred2(), 'Timed out'); };

  // ---- Registry sanity ----
  assert.deepEqual(new Set(defs.map((d) => d.ref)), new Set([REF01, REF02, REF03, REFSVC]));
  for (const ref of [REF01, REF02, REF03, REFSVC]) {
    assert.ok(liftDefinition(ref), ref);
    assert.ok(isLiftRef(ref), ref);
    assert.equal(state(ref).schemaVersion, 'luna.elevator/2', `${ref} must be on the v2 dynamic schema, not the old static elevatorBehavior shape`);
  }
  assert.equal(isLiftRef('LUNA-B1-FIRE-PUMP-01'), false);
  // Baseline bumped for True Floor Plan System V1 (L06 Gold Standard)'s
  // disclosed "unit" branch added to resolveLevelRefFor() — a real bug
  // fix (a private unit/common zone with no InteriorSpec, e.g. Apartment
  // B/C/D or the new L06 Lift Lobby, used to crash this function) — the
  // guard now protects that new baseline going forward.
  assert.equal(createHash('sha256').update(readFileSync('src/luna/policy/lunaRepresentationPolicy.ts')).digest('hex'), '2a301cf10a6dbaaf9e9f81d49a8b852d308ae193837612cbfcca68e59fe19d7e');
  checks.push('Registry: all four canonical refs present, on v2 schema, RepresentationPolicy hash unchanged');

  // ---- Isolation: a command to one ref never touches another ----
  const baseline = Object.fromEntries([REF02, REF03, REFSVC].map((r) => [r, JSON.stringify(state(r))]));
  assert.ok((await exec(REF01, 'setPosition', { floor: 'LUNA-L06' })).ok);
  runUntil(() => state(REF01).motionState !== 'IDLE');
  for (const r of [REF02, REF03, REFSVC]) assert.equal(JSON.stringify(state(r)), baseline[r], `${r} must be untouched by a Lift 01 command`);
  runUntil(() => state(REF01).currentFloor === 'LUNA-L06' && state(REF01).doorState === 'OPEN');
  for (const r of [REF02, REF03, REFSVC]) assert.equal(JSON.stringify(state(r)), baseline[r], `${r} must remain untouched after Lift 01 arrives`);
  checks.push('Isolation: command to Lift 01 leaves Lift 02/03/Service state byte-identical throughout');

  const baseline2 = Object.fromEntries([REF01, REF02, REFSVC].map((r) => [r, JSON.stringify(state(r))]));
  assert.ok((await exec(REF03, 'setPosition', { floor: 'LUNA-B1' })).ok);
  runUntil(() => state(REF03).currentFloor === 'LUNA-B1' && state(REF03).doorState === 'OPEN');
  for (const r of [REF01, REF02, REFSVC]) assert.equal(JSON.stringify(state(r)), baseline2[r], `${r} must be untouched by a Lift 03 command`);
  checks.push('Isolation: command to Lift 03 leaves Lift 01/02/Service state byte-identical throughout');

  // ---- Concurrent travel: two cars moving in the SAME shared clock ticks ----
  await exec(REF01, 'setPosition', { floor: 'LUNA-GROUND' }); // Lift 01 currently at L06 from above — send home first
  runUntil(() => state(REF01).currentFloor === 'LUNA-GROUND' && state(REF01).doorState === 'OPEN');
  await exec(REF03, 'setPosition', { floor: 'LUNA-GROUND' });
  runUntil(() => state(REF03).currentFloor === 'LUNA-GROUND' && state(REF03).doorState === 'OPEN');
  assert.ok((await exec(REF01, 'setPosition', { floor: 'LUNA-L10' })).ok);
  assert.ok((await exec(REF03, 'setPosition', { floor: 'LUNA-L06' })).ok);
  let sampledBothMoving = false;
  runBoth(
    () => state(REF01).currentFloor === 'LUNA-L10' && state(REF01).doorState === 'OPEN',
    () => state(REF03).currentFloor === 'LUNA-L06' && state(REF03).doorState === 'OPEN',
    12000
  );
  // Re-run the same concurrent departure and this time sample mid-flight to prove BOTH were moving at once, not sequentially.
  await exec(REF01, 'setPosition', { floor: 'LUNA-GROUND' }); runUntil(() => state(REF01).currentFloor === 'LUNA-GROUND' && state(REF01).doorState === 'OPEN');
  await exec(REF03, 'setPosition', { floor: 'LUNA-GROUND' }); runUntil(() => state(REF03).currentFloor === 'LUNA-GROUND' && state(REF03).doorState === 'OPEN');
  assert.ok((await exec(REF01, 'setPosition', { floor: 'LUNA-L10' })).ok);
  assert.ok((await exec(REF03, 'setPosition', { floor: 'LUNA-B1' })).ok);
  for (let n = 0; n < 4000 && !(state(REF01).currentFloor === 'LUNA-L10' && state(REF03).currentFloor === 'LUNA-B1'); n++) {
    i.advanceLiftClock(0.02);
    if (state(REF01).speed > 0 && state(REF03).speed > 0) sampledBothMoving = true;
  }
  assert.ok(sampledBothMoving, 'Both cars must be observed moving within the same clock tick window, not one after the other');
  assert.equal(state(REF01).positionY, stops.find((s) => s.ref === 'LUNA-L10').y);
  assert.equal(state(REF03).positionY, -4);
  assert.notEqual(state(REF01).positionY, state(REF03).positionY); // the two cars end up at genuinely different elevations, not sharing one position
  checks.push('Concurrent travel: two lifts observed moving simultaneously within the same shared-clock ticks, arriving at independent destinations');

  // ---- Lift 01: Ground -> L06 -> Ground ----
  assert.ok((await exec(REF01, 'setPosition', { floor: 'LUNA-GROUND' })).ok);
  runUntil(() => state(REF01).currentFloor === 'LUNA-GROUND' && state(REF01).doorState === 'OPEN');
  assert.ok((await exec(REF01, 'setPosition', { floor: 'LUNA-L06' })).ok);
  runUntil(() => state(REF01).currentFloor === 'LUNA-L06' && state(REF01).doorState === 'OPEN');
  assert.ok((await exec(REF01, 'setPosition', { floor: 'LUNA-GROUND' })).ok);
  runUntil(() => state(REF01).currentFloor === 'LUNA-GROUND' && state(REF01).doorState === 'OPEN');
  assert.equal(state(REF01).positionY, 0);
  checks.push('Passenger Lift 01: Ground -> L06 -> Ground');

  // ---- Lift 03: Ground -> L10 -> B1 ----
  assert.ok((await exec(REF03, 'setPosition', { floor: 'LUNA-GROUND' })).ok);
  runUntil(() => state(REF03).currentFloor === 'LUNA-GROUND' && state(REF03).doorState === 'OPEN');
  assert.ok((await exec(REF03, 'setPosition', { floor: 'LUNA-L10' })).ok);
  runUntil(() => state(REF03).currentFloor === 'LUNA-L10' && state(REF03).doorState === 'OPEN');
  assert.ok((await exec(REF03, 'setPosition', { floor: 'LUNA-B1' })).ok);
  runUntil(() => state(REF03).currentFloor === 'LUNA-B1' && state(REF03).doorState === 'OPEN');
  assert.equal(state(REF03).positionY, -4);
  checks.push('Passenger Lift 03: Ground -> L10 -> B1');

  // ---- Service Lift: Ground -> B1 -> an upper admitted reference stop ----
  // Reference/demo only — fire recall, firefighter operation, protected-
  // lobby logic and emergency-power sequencing remain DD06/DD11/DD20 and
  // are NOT exercised here; this proves only normal reference simulation
  // movement, doors and state, same as the two passenger lifts above.
  assert.ok((await exec(REFSVC, 'setPosition', { floor: 'LUNA-B1' })).ok);
  runUntil(() => state(REFSVC).currentFloor === 'LUNA-B1' && state(REFSVC).doorState === 'OPEN');
  assert.ok((await exec(REFSVC, 'setPosition', { floor: 'LUNA-L06' })).ok);
  runUntil(() => state(REFSVC).currentFloor === 'LUNA-L06' && state(REFSVC).doorState === 'OPEN');
  assert.equal(state(REFSVC).positionY, stops.find((s) => s.ref === 'LUNA-L06').y);
  for (const disallowed of ['LUNA-PENTHOUSE', 'LUNA-ROOFTOP']) assert.equal((await exec(REFSVC, 'setPosition', { floor: disallowed })).ok, false, 'Service lift must not be admitted to PH/Roof either — same 14-stop matrix as passenger lifts');
  checks.push('Service/Fire Lift 01: Ground -> B1 -> L06 (normal reference simulation only; PH/Roof still not admitted)');

  // ---- Independent-state proof (brief §8's exact scenario) ----
  // Lift 01 -> L03, Lift 02 -> L10, Lift 03 -> Ground, Service -> B1, all
  // requested together, advanced together, verified to converge on four
  // DISTINCT positions with no cross-talk in positionY/currentFloorRef/
  // targetFloorRef/direction/speed/doors/requests/faults.
  for (const r of [REF01, REF02, REF03, REFSVC]) { await exec(r, 'setPosition', { floor: 'LUNA-GROUND' }); }
  runUntil(() => [REF01, REF02, REF03, REFSVC].every((r) => state(r).currentFloor === 'LUNA-GROUND' && state(r).doorState === 'OPEN'), 20000);
  const targets = { [REF01]: 'LUNA-L03', [REF02]: 'LUNA-L10', [REF03]: 'LUNA-GROUND', [REFSVC]: 'LUNA-B1' };
  for (const [r, floor] of Object.entries(targets)) if (floor !== 'LUNA-GROUND') assert.ok((await exec(r, 'setPosition', { floor })).ok, r);
  runUntil(() => Object.entries(targets).every(([r, floor]) => state(r).currentFloor === floor && state(r).doorState === 'OPEN'), 20000);
  const finalY = { [REF01]: stops.find((s) => s.ref === 'LUNA-L03').y, [REF02]: stops.find((s) => s.ref === 'LUNA-L10').y, [REF03]: 0, [REFSVC]: -4 };
  for (const [r, y] of Object.entries(finalY)) assert.equal(state(r).positionY, y, r);
  const ys = Object.values(finalY);
  assert.equal(new Set(ys).size, ys.length, 'all four lifts must be at DISTINCT elevations, proving no shared/leaked position state');
  checks.push('Independent state: Lift 01->L03, Lift 02->L10, Lift 03->Ground, Service->B1 all converge to distinct, correctly-isolated positions');

  // ---- Fault scenario (v2-schema fix) isolates to Lift 01 only ----
  const faultScenario = LUNA_SCENARIOS.find((sc) => sc.key === 'elevator-fault');
  assert.ok(faultScenario, 'elevator-fault scenario must still exist');
  const preFault = { [REF02]: JSON.stringify(state(REF02)), [REF03]: JSON.stringify(state(REF03)), [REFSVC]: JSON.stringify(state(REFSVC)) };
  faultScenario.apply();
  assert.equal(state(REF01).faultState, 'fault');
  assert.equal(state(REF01).motionState, 'IDLE');
  assert.equal(state(REF01).doorState, 'OPEN');
  assert.equal(p.getState(REF01).status, 'critical');
  const preFaultY = state(REF01).positionY;
  i.advanceLiftClock(5);
  assert.equal(state(REF01).positionY, preFaultY, 'faulted Lift 01 must not move');
  assert.equal((await exec(REF01, 'open')).ok, false, 'faulted lift rejects further commands');
  for (const r of [REF02, REF03, REFSVC]) assert.equal(JSON.stringify(state(r)), preFault[r], `${r} must be unaffected by Lift 01's fault scenario`);
  checks.push('Elevator Fault scenario (v2 schema) halts Lift 01 only — faultState/motionState/doorState correctly set, other three lifts untouched');
  i.resetAll();

  // ---- Consumer rejection, per lift ----
  for (const ref of [REF01, REF02, REF03, REFSVC]) {
    const result = await exec(ref, 'setPosition', { floor: 'LUNA-L06' }, resident);
    assert.equal(result.ok, false, `Consumer must be rejected commanding ${ref}`);
    assert.match(result.message, /facility|authorized/i);
  }
  checks.push('Consumer identity rejected commanding every one of the four lifts');

  // ---- Oyi resolution: each canonical lift resolves distinctly ----
  // "Show X" with no follow/engineering/structure/shaft keyword resolves to
  // a "query" intent (exactly Lift 02's own established behavior) — the
  // "shaft" default view comes from App.tsx's navigateToAsset handling of
  // a lift ref, not from the parser itself.
  const p1 = parseIntent('Show Passenger Lift 01.', {});
  assert.deepEqual(p1.targetRefs, [REF01]); assert.equal(p1.kind, 'query');
  const p2 = parseIntent('Follow Passenger Lift 02.', {});
  assert.deepEqual(p2.targetRefs, [REF02]); assert.equal(p2.assetView, 'follow');
  const p3 = parseIntent('Take Passenger Lift 03 to Level 6.', {});
  assert.deepEqual(p3.targetRefs, [REF03]); assert.equal(p3.kind, 'command'); assert.equal(p3.command, 'setPosition'); assert.equal(p3.commandArgs.floor, 'LUNA-L06');
  const psvc = parseIntent('Show the Service Lift.', {});
  assert.deepEqual(psvc.targetRefs, [REFSVC]);
  const pAll = parseIntent('Show all elevators.', {});
  assert.equal(pAll.kind, 'show_system'); assert.equal(pAll.system, 'vertical-transport');
  const pAllEng = parseIntent('Show elevators in engineering view.', {});
  assert.equal(pAllEng.kind, 'show_system'); assert.equal(pAllEng.system, 'vertical-transport');
  checks.push('Oyi vocabulary/parser: each of the four canonical lifts resolves distinctly; "all elevators" routes to the existing vertical-transport system mode');

  // End-to-end through the real controller too, not just the parser.
  const seen = [];
  const scene = { navigateToAsset(ref) { seen.push(ref); }, navigateToSpace() {}, setSystemMode(sys) { seen.push(sys); }, assetView(ref, view) { seen.push(`${ref}:${view}`); return true; } };
  const controller = new TwinIntelligenceController(data, p, scene, () => 'Lift state');
  for (const [phrase, expectSeen] of [
    ['Show Passenger Lift 01.', REF01], // query -> navigateToAsset(ref)
    ['Follow Passenger Lift 02.', `${REF02}:follow`], // asset_view -> assetView(ref, view)
    ['Show the Service Lift.', REFSVC],
  ]) {
    seen.length = 0;
    const res = await controller.handleIntent(parseIntent(phrase, {}), buildScopePolicy(actor), {});
    assert.ok(res.ok, phrase);
    assert.ok(seen.includes(expectSeen), `${phrase} -> expected scene to see "${expectSeen}", got ${JSON.stringify(seen)}`);
  }
  assert.equal((await controller.handleIntent(parseIntent('Follow Passenger Lift 03.', {}), buildScopePolicy(resident), {})).ok, false, 'Consumer must be denied a passenger-lift asset_view (canControl gate)');
  checks.push('Full Oyi controller round-trip for distinct lift refs; Consumer denied engineering/control view');

  writeFileSync('artifacts/luna-four-lift-runtime-results.json', JSON.stringify({ passed: true, checks }, null, 2));
  console.log(checks.map((c) => 'PASS ' + c).join('\n'));
} finally {
  await server.close();
}
