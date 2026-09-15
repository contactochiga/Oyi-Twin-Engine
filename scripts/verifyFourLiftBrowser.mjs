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
// The rail's Engineering launcher shows whatever representation is
// CURRENTLY active as its own label text (e.g. "Elevators", not a fixed
// "Engineering Layers") — select it by its stable data attribute instead
// of guessing the label.
const openEngineeringTray = async () => { const h = await page.evaluateHandle(() => document.querySelector('[data-engineering-launcher]')); await h.asElement().click(); await pause(250); };
const ask = async (text) => { await page.type('input[aria-label="Ask Oyi about the building"]', text); await page.keyboard.press('Enter'); await pause(700); };
async function shot(name) { await page.screenshot({ path: `artifacts/${name}.png` }); console.log('shot:', name); }

// Resolve lunaSimulationProvider through its REAL served URL (see
// artifacts/luna-dynamic-lift-report.md §7 for why a bare path creates a
// disconnected module instance) — same fix already applied to the Lift 02
// browser test, reused verbatim here.
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

const REF01 = 'LUNA-LIFT-PASS-01', REF02 = 'LUNA-LIFT-PASS-02', REF03 = 'LUNA-LIFT-PASS-03', REFSVC = 'LUNA-LIFT-SERVICE-01';
const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' }); await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await installReadLifts(page);

  // ---- Engineering -> Elevators exposes ALL FOUR cars simultaneously ----
  await click('Architecture', '.luna-rail');
  await click('Elevators', '[data-engineering-tray]');
  await click('Close Engineering Layers', '[data-engineering-tray]');
  await pause(400);
  const exposure = await page.evaluate(async (refs) => {
    const fiberUrl = performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('@react-three_fiber'));
    const fiber = await import(fiberUrl);
    const state = fiber._roots.get(document.querySelector('canvas')).store.getState();
    return refs.map((ref) => {
      const group = state.scene.getObjectByName(ref);
      const wall = state.scene.getObjectByName(`${ref}::shaft-back`);
      const carParts = state.scene.getObjectByName(`${ref}::car`)?.children.length ?? 0;
      return { ref, visible: group?.visible, wallOpacity: wall?.material?.opacity, carParts };
    });
  }, [REF01, REF02, REF03, REFSVC]);
  await shot('luna-four-lift-engineering-exposure');
  for (const e of exposure) {
    assert.equal(e.visible, true, `${e.ref} must be visible with Elevators engineering active`);
    assert.ok(e.wallOpacity < 0.5, `${e.ref} shaft wall must be transparent in engineering mode, got ${e.wallOpacity}`);
    assert.ok(e.carParts >= 9, `${e.ref} car must have real geometry (>=9 parts), got ${e.carParts}`);
  }
  results.push('Engineering -> Elevators exposes all four canonical lifts simultaneously (visible + transparent shaft walls + real car geometry each)');

  // ---- Concurrent movement is visible in the live app, not just the deterministic test ----
  await ask('Take Passenger Lift 01 to Level 10.');
  await pause(300);
  await ask('Take Passenger Lift 03 to Level 6.');
  await page.waitForFunction((r1, r3) => {
    const s1 = window.readLift(r1), s3 = window.readLift(r3);
    return s1.speed > 0 && s3.speed > 0;
  }, { timeout: 10000 }, REF01, REF03);
  const bothMoving = await page.evaluate((r1, r3) => ({ s1: window.readLift(r1).speed, s3: window.readLift(r3).speed }), REF01, REF03);
  assert.ok(bothMoving.s1 > 0 && bothMoving.s3 > 0);
  await shot('luna-four-lift-concurrent-moving');
  results.push('Real app: Lift 01 and Lift 03 observed moving concurrently (non-zero speed simultaneously) after independent Oyi commands');

  // ---- State preservation: switch representation while both cars are still moving ----
  await openEngineeringTray();
  await click('All Systems', '[data-engineering-tray]');
  await click('Close Engineering Layers', '[data-engineering-tray]');
  await pause(200);
  await openEngineeringTray();
  await click('Structure', '[data-engineering-tray]');
  await click('Close Engineering Layers', '[data-engineering-tray]');
  await pause(200);
  const stillMoving = await page.evaluate((r1, r3) => ({ m1: window.readLift(r1).motionState, m3: window.readLift(r3).motionState, t1: window.readLift(r1).targetFloor, t3: window.readLift(r3).targetFloor }), REF01, REF03);
  assert.ok(stillMoving.t1 === 'LUNA-L10' || stillMoving.m1 === 'IDLE', 'Lift 01 target must be preserved (still heading to L10 or already arrived), not reset by representation switching');
  assert.ok(stillMoving.t3 === 'LUNA-L06' || stillMoving.m3 === 'IDLE', 'Lift 03 target must be preserved (still heading to L06 or already arrived), not reset by representation switching');
  await page.waitForFunction((r1, r3) => window.readLift(r1).currentFloor === 'LUNA-L10' && window.readLift(r3).currentFloor === 'LUNA-L06', { timeout: 20000 }, REF01, REF03);
  results.push('State preservation: switching Architecture -> All Systems -> Structure mid-flight never resets either lift\'s destination; both arrive correctly');

  // ---- LevelRail tracking: Follow Lift 01, then cleanly hand off to Lift 03 ----
  // Unified Spatial Control Surface v1 replaced the old bottom-right
  // card's "Close" (X) button with an auto-hiding board (visible while
  // Engineering -> Elevators is active or a lift is focused). Structure
  // engineering layer is active here (not vertical-transport), so
  // clearing the lift focus alone is enough to fully close the board.
  await click('Exit lift view');
  await ask('Follow Passenger Lift 01.');
  await page.waitForSelector('[data-lift-card]');
  await pause(300);
  let railMode = await page.$eval('[data-level-rail-mode]', (e) => ({ mode: e.dataset.levelRailMode, ref: e.dataset.trackingLiftRef }));
  assert.equal(railMode.mode, 'elevator'); assert.equal(railMode.ref, REF01);
  await shot('luna-four-lift-rail-tracking-01');
  results.push('LevelRail tracks Lift 01 while Follow is active (data-tracking-lift-ref = Lift 01)');

  await click('Exit lift view');
  await ask('Follow Passenger Lift 03.');
  await page.waitForSelector('[data-lift-card]');
  await pause(300);
  railMode = await page.$eval('[data-level-rail-mode]', (e) => ({ mode: e.dataset.levelRailMode, ref: e.dataset.trackingLiftRef }));
  assert.equal(railMode.mode, 'elevator'); assert.equal(railMode.ref, REF03, 'Rail must have cleanly transferred to Lift 03, not stayed on Lift 01 or tracked both');
  await shot('luna-four-lift-rail-tracking-03');
  results.push('LevelRail cleanly transfers tracking from Lift 01 to Lift 03 on a fresh Follow — one owner at a time, no stale ref left behind');

  await click('Exit lift view');
  await pause(300);
  railMode = await page.$eval('[data-level-rail-mode]', (e) => e.dataset.levelRailMode);
  assert.equal(railMode, 'static');
  results.push('Exiting lift view returns LevelRail cleanly to static floor navigation');

  // ---- Service Lift: reachable, shows its own identity and DD-required note ----
  await ask('Show the Service Lift.');
  await page.waitForSelector('[data-lift-card]');
  await pause(300);
  const svcCard = await page.evaluate(() => ({ ref: document.querySelector('[data-lift-card]')?.dataset.liftRef, hasNote: Boolean(document.querySelector('[data-service-lift-note]')) }));
  assert.equal(svcCard.ref, REFSVC);
  assert.ok(svcCard.hasNote, 'Service lift card must disclose the DD06/DD11/DD20 special-modes note');
  await shot('luna-four-lift-service-card');
  results.push('Service/Fire Lift 01 opens its own contextual card, correctly identified, with the DD-required special-modes disclosure present');

  // ---- Lift 02 remains fully independent throughout all of the above ----
  const lift02Untouched = await page.evaluate((r) => window.readLift(r), REF02);
  assert.equal(lift02Untouched.currentFloor, 'LUNA-GROUND');
  assert.equal(lift02Untouched.motionState, 'IDLE');
  results.push('Lift 02 (the golden reference) remained untouched — still at Ground, idle — throughout every Lift 01/03/Service interaction above');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/luna-four-lift-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  await page.screenshot({ path: 'artifacts/luna-four-lift-browser-failure.png' });
  writeFileSync('artifacts/luna-four-lift-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
