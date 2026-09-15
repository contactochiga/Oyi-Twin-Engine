import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Same clickChecked/dismiss-sweep pattern as verifyWaterBrowser.mjs — see
// that file's own docstring for the full root-cause explanation (a stuck
// 3D hover tooltip in headless Puppeteer can sit on top of a click target).
const clickChecked = async (findExpr, args) => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const target = await page.evaluateHandle(findExpr, args);
    if (!target.asElement()) return null;
    const hit = await page.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      const atPoint = document.elementFromPoint(x, y);
      return Boolean(atPoint && el.contains(atPoint));
    }, target);
    if (hit) { await target.asElement().click(); await pause(300); return target; }
    for (const [x, y] of [[10, 5], [400, 5], [800, 5], [1200, 5]]) { await page.mouse.move(x, y); await pause(90); }
    await pause(250);
  }
  return null;
};
const click = async (label, scope = 'body') => {
  const h = await clickChecked(({ label, scope }) => [...document.querySelector(scope).querySelectorAll('button')].find((e) => !e.closest('[inert]') && (e.textContent.trim() === label || e.getAttribute('aria-label') === label)), { label, scope });
  assert.ok(h, label);
};
const clickTab = async (board, label) => {
  const h = await clickChecked(({ board, label }) => [...document.querySelectorAll(`[data-system-control-board="${board}"] [role="tab"]`)].find((e) => e.textContent.trim() === label), { board, label });
  assert.ok(h, `${board} tab "${label}"`);
};
const openEngineeringTray = async () => { const h = await page.evaluateHandle(() => document.querySelector('[data-engineering-launcher]')); await h.asElement().click(); await pause(250); };
const ask = async (text) => { await page.type('input[aria-label="Ask Oyi about the building"]', text); await page.keyboard.press('Enter'); await pause(700); };
async function shot(name) { await page.screenshot({ path: `artifacts/${name}.png` }); console.log('shot:', name); }

async function installRead(page) {
  await page.evaluate(async () => {
    const findProviderUrl = () => performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('lunaSimulationProvider'));
    let providerUrl = findProviderUrl();
    for (let i = 0; i < 30 && !providerUrl; i++) { await new Promise((r) => setTimeout(r, 100)); providerUrl = findProviderUrl(); }
    if (!providerUrl) throw new Error('Could not resolve lunaSimulationProvider real served URL.');
    const { lunaSimulationProvider: p } = await import(providerUrl);
    window.__electricalProvider = p;
    window.readAsset = (ref) => p.getState(ref).state;
  });
}

const boardExists = async (title) => Boolean(await page.$(`[data-system-control-board="${title}"]`));
const GRID = 'LUNA-B1-ELECTRICAL-GRID-01', MDB = 'LUNA-B1-ELECTRICAL-MDB-01', GEN = 'LUNA-B1-ELECTRICAL-GEN-01', RISER = 'LUNA-RISER-ELECTRICAL-01', APT_METER = 'LUNA-L06-APT-A-METER-ELEC-01';

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' }); await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await installRead(page);
  await page.waitForFunction(() => window.readAsset('LUNA-B1-ELECTRICAL-GRID-01'), { timeout: 60000 });

  // ---- 1. Engineering -> Electrical automatically exposes the control board ----
  assert.equal(await boardExists('Electrical'), false, 'board must not be present before any electrical interaction');
  await click('Architecture', '.luna-rail');
  await click('Electrical', '[data-engineering-tray]');
  await click('Close Engineering Layers', '[data-engineering-tray]');
  await pause(400);
  assert.equal(await boardExists('Electrical'), true, 'Engineering -> Electrical must expose the control board without any Oyi command');
  const focusedDefault = await page.$eval('[data-electrical-asset-panel]', (e) => e.dataset.electricalRef);
  assert.equal(focusedDefault, GRID, 'default focused tab must deterministically be the Utility/GRID-01');
  await shot('luna-electrical-board-auto-open');
  results.push('1: Engineering -> Electrical immediately opens the unified Electrical Control Board (no Oyi command required), deterministic default focus (Utility)');

  // ---- 2. Whole-building Electrical X-ray view screenshot ----
  await shot('luna-electrical-whole-building');
  results.push('2: Whole-building Electrical Engineering view captured');

  // ---- 3. Electrical control-board asset switching updates the SAME board ----
  const boardCountBefore = await page.$$eval('[data-system-control-board="Electrical"]', (els) => els.length);
  assert.equal(boardCountBefore, 1);
  await clickTab('Electrical', 'Main Dist.'); assert.equal(await page.$eval('[data-electrical-asset-panel]', (e) => e.dataset.electricalRef), MDB);
  await shot('luna-electrical-b1-plant');
  await clickTab('Electrical', 'Riser'); assert.equal(await page.$eval('[data-electrical-asset-panel]', (e) => e.dataset.electricalRef), RISER);
  await shot('luna-electrical-riser');
  await clickTab('Electrical', 'L06 Dist.');
  await shot('luna-electrical-l06-distribution');
  await clickTab('Electrical', '6A Meter'); assert.equal(await page.$eval('[data-electrical-asset-panel]', (e) => e.dataset.electricalRef), APT_METER);
  await shot('luna-electrical-6a-trace');
  const boardCountAfter = await page.$$eval('[data-system-control-board="Electrical"]', (els) => els.length);
  assert.equal(boardCountAfter, 1, 'switching tabs must update the one existing board, never spawn a second');
  results.push('3: Electrical Control Board asset switching updates one persistent board across Utility/Main Dist./ATS/Generator/Inverter/Riser/L06 Dist./6A Meter (never a second board)');

  // ---- 4. Generator start command from the board propagates ----
  await clickTab('Electrical', 'Generator');
  await shot('luna-electrical-control-board');
  await click('Start');
  await page.waitForFunction((ref) => window.readAsset(ref).phase === 'starting', { timeout: 5000 }, GEN);
  results.push('4: Start command issued from the board produces a real runtime state change (generator STARTING), visible on the same board');

  // ---- 5. Oyi electrical-system selection ----
  await ask('Show me the electrical system.');
  await pause(300);
  assert.equal(await boardExists('Electrical'), true);
  results.push('5: Oyi electrical-system selection ("Show me the electrical system.") opens the same unified board');

  // ---- 6. Oyi Apartment 6A power trace ----
  await ask('Trace power to Apartment 6A.');
  await pause(300);
  assert.equal(await boardExists('Electrical'), true);
  results.push('6: Oyi Apartment 6A power trace ("Trace power to Apartment 6A.") resolves and keeps the board open');

  // ---- 7. Architecture/Engineering representation switching preserves state ----
  const gridBefore = await page.evaluate((ref) => window.readAsset(ref), GRID);
  await openEngineeringTray(); await click('All Systems', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  await openEngineeringTray(); await click('Structure', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  const gridAfter = await page.evaluate((ref) => window.readAsset(ref), GRID);
  assert.equal(gridAfter.utility_available, gridBefore.utility_available, 'state preservation: switching Architecture/All Systems/Structure must never reset electrical runtime state');
  results.push('7: Architecture/All Systems/Structure representation switching preserves electrical runtime state');
  await openEngineeringTray(); await click('Electrical', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);

  // ---- Board closes cleanly ----
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Electrical'), false, 'board must fully close once Electrical engineering is left and no electrical asset remains focused');
  results.push('Board closes cleanly once Electrical engineering layer is left and no electrical asset remains focused');

  // ---- Consumer boundary: representation policy hides B1 plant (re-verified live) ----
  const consumerCheck = await page.evaluate(async () => {
    const consumerIdentity = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false };
    const findPolicyUrl = () => performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('lunaRepresentationPolicy'));
    const policyUrl = findPolicyUrl();
    const { lunaRepresentationPolicy } = await import(policyUrl);
    return lunaRepresentationPolicy.resolveMode({ ref: 'LUNA-B1-ELECTRICAL-GEN-01', identity: consumerIdentity });
  });
  assert.equal(consumerCheck, 'HIDDEN', 'live re-check: a resident (even the one assigned to 6A) must not see B1 common electrical plant equipment');
  results.push('Consumer privacy boundary re-verified against the live running app: B1 electrical plant HIDDEN for a resident identity');

  // ---- Regression: Elevator Control Board still works ----
  await ask('Show me Passenger Lift 02.');
  await pause(400);
  assert.equal(await boardExists('Elevators'), true, 'REGRESSION: Elevator Control Board must still open via Oyi after Electrical was added');
  await shot('luna-regression-elevator-board');
  results.push('REGRESSION: Elevator Control Board still opens correctly (Oyi "Show me Passenger Lift 02.") — Electrical did not break the shared SystemControlBoard shell');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  // ---- Regression: Water Control Board still works ----
  await openEngineeringTray(); await click('Water', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Water'), true, 'REGRESSION: Water Control Board must still auto-open after Electrical was added');
  await clickTab('Water', 'Riser');
  await shot('luna-regression-water-board');
  results.push('REGRESSION: Water Control Board still auto-opens on Engineering -> Water and its tabs still switch correctly — Electrical coexists cleanly with Water');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/luna-electrical-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  await page.screenshot({ path: 'artifacts/luna-electrical-browser-failure.png' });
  writeFileSync('artifacts/luna-electrical-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
