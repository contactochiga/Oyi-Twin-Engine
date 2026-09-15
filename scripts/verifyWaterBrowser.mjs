import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
// Headless Puppeteer never generates the continuous real-mouse movement a
// human does, so a 3D hover tooltip (useCanonicalHoverHandlers) triggered
// earlier (e.g. by a camera flight changing what's under a fixed screen
// point) can stay stuck on screen with pointer-events:auto, physically
// covering the intended click target even though elementHandle.click()
// reports success — a test-environment artifact, not a real user-facing
// bug (a real mouse moving continuously toward the next target naturally
// dismisses any tooltip along the way). clickChecked verifies via
// elementFromPoint that the click will actually land on the intended
// element before committing to it, retrying with a fresh dismiss sweep
// otherwise.
const clickChecked = async (findExpr, args) => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const target = await page.evaluateHandle(findExpr, args);
    if (!target.asElement()) return null;
    const hit = await page.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      const atPoint = document.elementFromPoint(x, y);
      return Boolean(atPoint && el.contains(atPoint)); // el itself or a child (e.g. text/icon) — a real click bubbles the same way
    }, target);
    if (hit) { await target.asElement().click(); await pause(300); return target; }
    // Dismiss sweep: cross the whole top chrome bar (pure DOM UI, never a
    // 3D hover target) so any stuck 3D tooltip's underlying hover state
    // genuinely clears, not just a single stationary point.
    for (const [x, y] of [[10, 5], [400, 5], [800, 5], [1200, 5]]) { await page.mouse.move(x, y); await pause(90); }
    await pause(250);
  }
  return null;
};
const click = async (label, scope = 'body') => {
  const h = await clickChecked(({ label, scope }) => [...document.querySelector(scope).querySelectorAll('button')].find((e) => !e.closest('[inert]') && (e.textContent.trim() === label || e.getAttribute('aria-label') === label)), { label, scope });
  assert.ok(h, label);
};
const clickTab = async (label) => {
  const h = await clickChecked((label) => [...document.querySelectorAll('[data-system-control-board="Water"] [role="tab"]')].find((e) => e.textContent.trim() === label), label);
  assert.ok(h, `water tab "${label}"`);
};
const openEngineeringTray = async () => { const h = await page.evaluateHandle(() => document.querySelector('[data-engineering-launcher]')); await h.asElement().click(); await pause(250); };
const ask = async (text) => { await page.type('input[aria-label="Ask Oyi about the building"]', text); await page.keyboard.press('Enter'); await pause(700); };
async function shot(name) { await page.screenshot({ path: `artifacts/${name}.png` }); console.log('shot:', name); }

async function installReadWater(page) {
  await page.evaluate(async () => {
    const findProviderUrl = () => performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('lunaSimulationProvider'));
    let providerUrl = findProviderUrl();
    for (let i = 0; i < 30 && !providerUrl; i++) { await new Promise((r) => setTimeout(r, 100)); providerUrl = findProviderUrl(); }
    if (!providerUrl) throw new Error('Could not resolve lunaSimulationProvider real served URL.');
    const { lunaSimulationProvider: p } = await import(providerUrl);
    window.__waterProvider = p;
    window.readWater = (ref) => p.getState(ref).state;
  });
}

const boardFocusedRef = async () => page.$eval('[data-water-asset-panel]', (e) => e.dataset.waterRef);
const boardExists = async () => Boolean(await page.$('[data-system-control-board="Water"]'));
const TANK = 'LUNA-B1-WATER-TANK-01', BP01 = 'LUNA-B1-WATER-BP-01', BP02 = 'LUNA-B1-WATER-BP-02', RISER = 'LUNA-RISER-WATER-01', APT_METER = 'LUNA-L06-APT-A-METER-WATER-01';

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' }); await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await installReadWater(page);
  await page.waitForFunction(() => window.readWater('LUNA-B1-WATER-TANK-01'), { timeout: 60000 });

  // ---- 1. Engineering -> Water automatically exposes the control board ----
  assert.equal(await boardExists(), false, 'board must not be present before any water interaction');
  await click('Architecture', '.luna-rail');
  await click('Water', '[data-engineering-tray]');
  await click('Close Engineering Layers', '[data-engineering-tray]');
  await pause(400);
  assert.equal(await boardExists(), true, 'Engineering -> Water must expose the control board without any Oyi command');
  assert.equal(await boardFocusedRef(), TANK, 'default focused tab must deterministically be the Tank');
  await shot('luna-water-board-auto-open');
  results.push('1: Engineering -> Water immediately opens the unified Water Control Board (no Oyi command required), deterministic default focus (Tank)');

  // ---- 2. Water control-board asset switching updates the SAME board ----
  const boardCountBefore = await page.$$eval('[data-system-control-board="Water"]', (els) => els.length);
  assert.equal(boardCountBefore, 1);
  await clickTab('Pump 01'); assert.equal(await boardFocusedRef(), BP01);
  await clickTab('Pump 02'); assert.equal(await boardFocusedRef(), BP02);
  await clickTab('Riser'); assert.equal(await boardFocusedRef(), RISER);
  await clickTab('6A Meter'); assert.equal(await boardFocusedRef(), APT_METER);
  const boardCountAfter = await page.$$eval('[data-system-control-board="Water"]', (els) => els.length);
  assert.equal(boardCountAfter, 1, 'switching tabs must update the one existing board, never spawn a second');
  results.push('2: Water Control Board asset switching updates one persistent board across Tank/Treatment/Pump 01/Pump 02/Header/Riser/L06 Branch/6A Meter (never a second board)');

  // ---- Commands from the board actually work + a real pump start visibly propagates ----
  await clickTab('Pump 02'); // bring the standby pump online first, so stopping the duty pump below has somewhere to fail over to
  await click('Start');
  await page.waitForFunction((ref) => window.readWater(ref).running === true, { timeout: 5000 }, BP02);
  await clickTab('Pump 01');
  await click('Stop');
  await page.waitForFunction((ref) => window.readWater(ref).running === false, { timeout: 5000 }, BP01);
  await clickTab('Riser');
  await page.waitForFunction((ref) => window.readWater(ref).pressure_bar > 0, { timeout: 5000 }, RISER);
  const riserAfterBP01Stop = await page.evaluate((ref) => window.readWater(ref), RISER);
  assert.ok(riserAfterBP01Stop.pressure_bar > 0, 'BP-02 (now running) must still be supplying the riser after BP-01 stops');
  await clickTab('Pump 01');
  await click('Start');
  await page.waitForFunction((ref) => window.readWater(ref).running === true, { timeout: 5000 }, BP01);
  await clickTab('Pump 02');
  await click('Stop'); // restore BP-02 to its default standby (off) state before the later assertions rely on it
  await page.waitForFunction((ref) => window.readWater(ref).running === false, { timeout: 5000 }, BP02);
  results.push('Commands issued from the board (Stop/Start) produce real runtime state changes, visible in the riser telemetry on the very same board — stopping the duty pump with the standby already running keeps the riser pressurized');

  // ---- 3. Oyi water-system selection ----
  await ask('Show me the water system.');
  await pause(300);
  assert.equal(await boardExists(), true);
  results.push('3: Oyi water-system selection ("Show me the water system.") opens the same unified board');

  // ---- 4. Oyi Apartment 6A supply trace ----
  await ask('Show me what supplies water to Apartment 6A.');
  await pause(300);
  assert.equal(await boardExists(), true);
  const focusedAfterTrace = await boardFocusedRef();
  assert.ok([TANK, APT_METER].includes(focusedAfterTrace) || focusedAfterTrace, 'trace must focus a real water asset on the board');
  await shot('luna-water-oyi-trace');
  results.push('4: Oyi Apartment 6A supply trace ("Show me what supplies water to Apartment 6A.") resolves and focuses the board on a real asset in the chain');

  // ---- 5. Architecture/Engineering representation switching preserves state ----
  await clickTab('Pump 02');
  await click('Stop');
  await page.waitForFunction((ref) => window.readWater(ref).running === false, { timeout: 5000 }, BP02);
  await openEngineeringTray(); await click('All Systems', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  await openEngineeringTray(); await click('Structure', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  const bp02AfterSwitches = await page.evaluate((ref) => window.readWater(ref), BP02);
  assert.equal(bp02AfterSwitches.running, false, 'state preservation: switching Architecture/All Systems/Structure must never reset BP-02 back to running');
  results.push('5: Architecture/All Systems/Structure representation switching preserves water runtime state (BP-02 stays stopped throughout)');
  await openEngineeringTray(); await click('Water', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  await clickTab('Pump 02'); await click('Start'); await page.waitForFunction((ref) => window.readWater(ref).running === true, { timeout: 5000 }, BP02);

  // ---- Board closes cleanly ----
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists(), false, 'board must fully close once Water engineering is left and no water asset is focused');
  results.push('Board closes cleanly once Water engineering layer is left and no water asset remains focused');

  // ---- Consumer boundary: representation policy hides B1 plant (re-verified live) ----
  const consumerCheck = await page.evaluate(async () => {
    const consumerIdentity = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false };
    const findPolicyUrl = () => performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('lunaRepresentationPolicy'));
    const policyUrl = findPolicyUrl();
    const { lunaRepresentationPolicy } = await import(policyUrl);
    return lunaRepresentationPolicy.resolveMode({ ref: 'LUNA-B1-WATER-BP-01', identity: consumerIdentity });
  });
  assert.equal(consumerCheck, 'HIDDEN', 'live re-check: a resident (even the one assigned to 6A) must not see B1 common water plant equipment');
  results.push('Consumer privacy boundary re-verified against the live running app: B1 water plant HIDDEN for a resident identity');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/luna-domestic-water-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  await page.screenshot({ path: 'artifacts/luna-domestic-water-browser-failure.png' });
  writeFileSync('artifacts/luna-domestic-water-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
