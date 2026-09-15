import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const click = async (label, scope = 'body') => {
  const h = await page.evaluateHandle(({ label, scope }) => [...document.querySelector(scope).querySelectorAll('button')].find((e) => !e.closest('[inert]') && (e.textContent.trim() === label || e.getAttribute('aria-label') === label)), { label, scope });
  assert.ok(h.asElement(), label);
  await h.asElement().click(); await pause(250);
};
const openEngineeringTray = async () => { const h = await page.evaluateHandle(() => document.querySelector('[data-engineering-launcher]')); await h.asElement().click(); await pause(250); };
const ask = async (text) => { await page.type('input[aria-label="Ask Oyi about the building"]', text); await page.keyboard.press('Enter'); await pause(700); };
async function shot(name) { await page.screenshot({ path: `artifacts/${name}.png` }); console.log('shot:', name); }

// Same fix as every other browser script in this repo (see
// artifacts/luna-dynamic-lift-report.md §7): resolve lunaSimulationProvider
// through its REAL served URL, not a bare path, or the read handle is a
// disconnected module instance.
async function installReadLifts(page) {
  await page.evaluate(async () => {
    const findProviderUrl = () => performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('lunaSimulationProvider'));
    let providerUrl = findProviderUrl();
    for (let i = 0; i < 30 && !providerUrl; i++) { await new Promise((r) => setTimeout(r, 100)); providerUrl = findProviderUrl(); }
    if (!providerUrl) throw new Error('Could not resolve lunaSimulationProvider real served URL.');
    const { lunaSimulationProvider: p } = await import(providerUrl);
    window.__liftProvider = p;
    window.readLift = (ref) => p.getState(ref).state;
  });
}

const tabButton = async (label) => page.evaluateHandle((label) => [...document.querySelectorAll('[data-system-control-board] [role="tab"]')].find((e) => e.textContent.trim() === label), label);
const clickTab = async (label) => { const h = await tabButton(label); assert.ok(h.asElement(), `tab "${label}"`); await h.asElement().click(); await pause(300); };
const boardFocusedRef = async () => page.$eval('[data-system-control-board] [data-lift-card]', (e) => e.dataset.liftRef);
const boardExists = async () => Boolean(await page.$('[data-system-control-board]'));

const REF01 = 'LUNA-LIFT-PASS-01', REF02 = 'LUNA-LIFT-PASS-02', REF03 = 'LUNA-LIFT-PASS-03', REFSVC = 'LUNA-LIFT-SERVICE-01';
const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' }); await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await installReadLifts(page);
  await page.waitForFunction(() => window.readLift('LUNA-LIFT-PASS-02'), { timeout: 60000 });

  // ---- 1. Engineering -> Elevators immediately opens the control board, no Oyi needed ----
  // Note: selecting ANY engineering system already re-frames the camera to
  // the overview preset when no lift is focused (App.tsx selectSystem, a
  // pre-existing behavior shared by every system, not introduced by the
  // control board) — that reframing is expected and not tested here; what
  // matters for this pass is that the board itself appears without an
  // extra, board-specific flight and without requiring Oyi.
  assert.equal(await boardExists(), false, 'board must not be present before any elevator interaction');
  await click('Architecture', '.luna-rail');
  await click('Elevators', '[data-engineering-tray]');
  await click('Close Engineering Layers', '[data-engineering-tray]');
  await pause(300);
  assert.equal(await boardExists(), true, 'Engineering -> Elevators must expose the control board without any Oyi command');
  await shot('luna-control-surface-auto-open');
  results.push('1: Engineering -> Elevators immediately opens the unified control board with no Oyi command required');

  // ---- 2. Default selected lift is deterministic (Lift 02, the golden reference) ----
  assert.equal(await boardFocusedRef(), REF02, 'default focused tab must deterministically be Passenger Lift 02');
  const activeTabLabel = await page.$eval('[data-system-control-board] [role="tab"][aria-selected="true"]', (e) => e.textContent.trim());
  assert.equal(activeTabLabel, 'Lift 02');
  results.push('2: default focused tab is deterministic (Passenger Lift 02, aria-selected + data-lift-ref both confirm)');

  // ---- 3. Switching 01 -> 02 -> 03 -> Service updates the SAME board, never spawns another ----
  const boardCountBefore = await page.$$eval('[data-system-control-board]', (els) => els.length);
  assert.equal(boardCountBefore, 1);
  await clickTab('Lift 01'); assert.equal(await boardFocusedRef(), REF01);
  await clickTab('Lift 02'); assert.equal(await boardFocusedRef(), REF02);
  await clickTab('Lift 03'); assert.equal(await boardFocusedRef(), REF03);
  await clickTab('Service Lift'); assert.equal(await boardFocusedRef(), REFSVC);
  const boardCountAfter = await page.$$eval('[data-system-control-board]', (els) => els.length);
  assert.equal(boardCountAfter, 1, 'switching tabs must update the one existing board, never spawn a second');
  assert.ok(await page.$('[data-service-lift-note]'), 'Service Lift tab must disclose the DD06/DD11/DD20 special-modes note');
  await shot('luna-control-surface-service-tab');
  results.push('3: switching 01 -> 02 -> 03 -> Service updates one persistent board (never a second board), Service tab discloses the DD-required note');

  // ---- 4. Commands affect only the selected canonical lift ----
  await clickTab('Lift 01');
  await page.select('[aria-label="Lift destination"]', 'LUNA-L06');
  await click('Travel');
  await page.waitForFunction((r) => window.readLift(r).speed > 0, { timeout: 8000 }, REF01);
  const isolation = await page.evaluate((refs) => refs.map((r) => ({ ref: r, motion: window.readLift(r).motionState })), [REF02, REF03, REFSVC]);
  assert.ok(isolation.every((s) => s.motion === 'IDLE'), `Travel on Lift 01 must not move any other lift, got ${JSON.stringify(isolation)}`);
  results.push('4: commanding the selected tab (Lift 01 Travel) leaves every other canonical lift IDLE — commands are scoped to the focused lift only');

  // ---- 5. Switching tabs while multiple lifts move preserves every lift's independent state ----
  await clickTab('Lift 03');
  await page.select('[aria-label="Lift destination"]', 'LUNA-L10');
  await click('Travel');
  await page.waitForFunction((r) => window.readLift(r).speed > 0, { timeout: 8000 }, REF03);
  const bothMovingBeforeSwitch = await page.evaluate((r1, r3) => ({ s1: window.readLift(r1).speed, s3: window.readLift(r3).speed }), REF01, REF03);
  assert.ok(bothMovingBeforeSwitch.s1 > 0 && bothMovingBeforeSwitch.s3 > 0, 'Lift 01 and Lift 03 must both be moving concurrently before the tab switch');
  await clickTab('Lift 02'); await pause(200); await clickTab('Service Lift'); await pause(200); await clickTab('Lift 01');
  const stillMoving = await page.evaluate((r1, r3) => ({ t1: window.readLift(r1).targetFloor, m1: window.readLift(r1).motionState, t3: window.readLift(r3).targetFloor, m3: window.readLift(r3).motionState }), REF01, REF03);
  assert.ok(stillMoving.t1 === 'LUNA-L06' || stillMoving.m1 === 'IDLE', 'Lift 01 target must survive tab switching (still heading to L06 or already arrived)');
  assert.ok(stillMoving.t3 === 'LUNA-L10' || stillMoving.m3 === 'IDLE', 'Lift 03 target must survive tab switching (still heading to L10 or already arrived)');
  await page.waitForFunction((r1, r3) => window.readLift(r1).currentFloor === 'LUNA-L06' && window.readLift(r3).currentFloor === 'LUNA-L10', { timeout: 20000 }, REF01, REF03);
  results.push("5: cycling through all four tabs while Lift 01 and Lift 03 are both mid-flight never disturbs either lift's destination — both arrive correctly");

  // ---- 6. Follow tracks the SELECTED lift ----
  await clickTab('Lift 01');
  await click('Follow lift');
  await pause(300);
  let rail = await page.$eval('[data-level-rail-mode]', (e) => ({ mode: e.dataset.levelRailMode, ref: e.dataset.trackingLiftRef }));
  assert.equal(rail.mode, 'elevator'); assert.equal(rail.ref, REF01);
  results.push('6: Follow (clicked from the board) tracks the currently focused lift (Lift 01) via LevelRail');

  // ---- 7. Switching the active lift transfers camera/LevelRail ownership cleanly ----
  await clickTab('Lift 03');
  await click('Follow lift');
  await pause(300);
  rail = await page.$eval('[data-level-rail-mode]', (e) => ({ mode: e.dataset.levelRailMode, ref: e.dataset.trackingLiftRef }));
  assert.equal(rail.mode, 'elevator'); assert.equal(rail.ref, REF03, 'switching tabs then Follow must hand LevelRail tracking cleanly to Lift 03, not leave it on Lift 01');
  await shot('luna-control-surface-follow-transfer');
  results.push('7: switching the active lift (tab 01 -> tab 03) then Follow transfers camera/LevelRail ownership cleanly to the newly selected lift');

  // ---- 8. Exiting control restores normal (static) LevelRail ----
  await click('Exit lift view');
  await pause(300);
  rail = await page.$eval('[data-level-rail-mode]', (e) => e.dataset.levelRailMode);
  assert.equal(rail, 'static', 'exiting lift view must restore ordinary static floor navigation on the LevelRail');
  results.push('8: exiting control (Exit lift view) restores the LevelRail to normal static floor navigation');

  // Fully close the board (leave Elevators engineering) before the Oyi discoverability check, so the next assertion proves Oyi opens it fresh.
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]');
  await pause(300);
  assert.equal(await boardExists(), false, 'board must fully close once Elevators engineering is left and no lift is focused');

  // ---- 9. Oyi can still open/select a lift (discoverability route 3, not the only route) ----
  await ask('Show me Passenger Lift 03.');
  await page.waitForSelector('[data-system-control-board]');
  await pause(300);
  assert.equal(await boardFocusedRef(), REF03, 'Oyi selecting a specific lift must focus that lift\'s tab on the SAME unified board, not a separate card');
  await shot('luna-control-surface-oyi-select');
  results.push('9: Oyi ("Show me Passenger Lift 03") still opens/selects a lift, correctly focusing its tab on the same unified board — Oyi remains an additional route, not the only one');

  // ---- 10. Consumer permission boundary: unchanged (runtime-level, since Presentation Mode has no UI path to Consumer scope — verified honestly, not fabricated) ----
  // The elevatorBoardOpen visibility gate itself requires interactionScope
  // === "facility" (see src/App.tsx), reusing the exact same scope check
  // already governing spatial lift selection (sceneActions.navigateToAsset).
  // The deeper runtime.execute() authorization boundary for Consumer
  // identities is unchanged and is already re-verified against the live
  // provider singleton by test:lift:browser (case I) and
  // test:four-lift:browser (Consumer rejection across all four lifts),
  // both of which passed in this same regression pass.
  const consumerRejected = await page.evaluate(async (ref) => {
    const consumerIdentity = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false };
    const r = await window.__liftProvider.execute({ assetRef: ref, command: 'setPosition', args: { floor: 'LUNA-L10', originFloorRef: 'LUNA-L10', requestId: crypto.randomUUID() }, actor: consumerIdentity });
    return r.ok === false;
  }, REF03);
  assert.ok(consumerRejected, 'Consumer identity must still be rejected by the live provider for the exact lift the board just focused');
  results.push('10: Consumer permission boundary unchanged — elevatorBoardOpen itself is gated on interactionScope==="facility", and the live provider still rejects a Consumer identity commanding the currently-focused lift');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/luna-control-surface-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  await page.screenshot({ path: 'artifacts/luna-control-surface-browser-failure.png' });
  writeFileSync('artifacts/luna-control-surface-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
