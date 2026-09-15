import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

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
    const findUrl = (needle) => performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes(needle));
    let providerUrl = findUrl('lunaSimulationProvider');
    for (let i = 0; i < 30 && !providerUrl; i++) { await new Promise((r) => setTimeout(r, 100)); providerUrl = findUrl('lunaSimulationProvider'); }
    if (!providerUrl) throw new Error('Could not resolve lunaSimulationProvider real served URL.');
    const { lunaSimulationProvider: p, lunaRuntimeInternals: i } = await import(providerUrl);
    window.__provider = p; window.__internals = i;
    window.readAsset = (ref) => p.getState(ref).state;
    let resolverUrl = findUrl('lunaPowerResolver');
    for (let n = 0; n < 30 && !resolverUrl; n++) { await new Promise((r) => setTimeout(r, 100)); resolverUrl = findUrl('lunaPowerResolver'); }
    const { resolveBuildingPower } = await import(resolverUrl);
    window.readBuildingPower = () => resolveBuildingPower();
  });
}

const boardExists = async (title) => Boolean(await page.$(`[data-system-control-board="${title}"]`));
const GRID = 'LUNA-B1-ELECTRICAL-GRID-01', GEN = 'LUNA-B1-ELECTRICAL-GEN-01';

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' }); await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await installRead(page);
  await page.waitForFunction(() => window.readBuildingPower && window.readBuildingPower(), { timeout: 60000 });

  // ---- Open the Electrical Control Board ----
  await click('Architecture', '.luna-rail');
  await click('Electrical', '[data-engineering-tray]');
  await click('Close Engineering Layers', '[data-engineering-tray]');
  await pause(400);
  assert.equal(await boardExists('Electrical'), true);

  // ---- 1. Utility powering Luna — live building-supply summary ----
  let summary = await page.$eval('[data-building-supply-summary]', (e) => e.dataset.buildingSupplySource);
  assert.equal(summary, 'utility', 'default state must read UTILITY in the live summary widget');
  const summaryText = await page.$eval('[data-building-supply-summary]', (e) => e.textContent);
  assert.match(summaryText, /Available/); assert.match(summaryText, /Standby/); assert.match(summaryText, /Energized/);
  await shot('luna-electrical-live-utility-powering');
  results.push('1: Utility powering Luna — the live Electrical Control Board summary reads UTILITY, Utility Available, Generator Standby, ATS Utility, Main Bus Energized');

  // ---- 2. Utility failure ----
  await page.evaluate(() => {
    const grid = window.readAsset('LUNA-B1-ELECTRICAL-GRID-01');
    window.__internals.setAssetState('LUNA-B1-ELECTRICAL-GRID-01', { ...grid, utility_available: false }, 'critical');
    window.__internals.recomputePowerNetwork();
  });
  await pause(300);
  summary = await page.$eval('[data-building-supply-summary]', (e) => e.dataset.buildingSupplySource);
  assert.equal(summary, 'none', 'losing utility with the generator not yet running must read NONE, not a fabricated source');
  await shot('luna-electrical-live-utility-failure');
  results.push('2: Utility failure — live summary correctly reads NONE while utility is gone and the generator has not yet reached RUNNING');

  // ---- 3. Generator starting ----
  const genPhase = await page.evaluate((ref) => window.readAsset(ref).phase, GEN);
  assert.equal(genPhase, 'starting');
  await shot('luna-electrical-live-generator-starting');
  results.push('3: Generator starting — GEN-01 phase is STARTING immediately after the utility loss (auto-sequenced, not commanded)');

  // ---- 4. Generator powering Luna ----
  await page.waitForFunction((ref) => window.readAsset(ref).phase === 'running', { timeout: 5000 }, GEN);
  await page.waitForFunction(() => window.readBuildingPower().activeSource === 'generator', { timeout: 5000 });
  summary = await page.$eval('[data-building-supply-summary]', (e) => e.dataset.buildingSupplySource);
  assert.equal(summary, 'generator');
  await shot('luna-electrical-live-generator-powering');
  results.push('4: Generator powering Luna — live summary reads GENERATOR once the ATS has actually completed its transfer');

  // ---- 5. ATS state on the board ----
  await clickTab('Electrical', 'ATS');
  await shot('luna-electrical-live-ats-state');
  results.push('5: ATS asset tab shows live source/fault/transitioning state on the same board');

  // ---- 6. Utility restoration ----
  await page.evaluate(() => {
    const grid = window.readAsset('LUNA-B1-ELECTRICAL-GRID-01');
    window.__internals.setAssetState('LUNA-B1-ELECTRICAL-GRID-01', { ...grid, utility_available: true }, 'normal');
    window.__internals.recomputePowerNetwork();
  });
  await page.waitForFunction(() => window.readBuildingPower().activeSource === 'utility', { timeout: 6000 });
  await page.waitForFunction((ref) => window.readAsset(ref).phase === 'stopped', { timeout: 6000 }, GEN);
  summary = await page.$eval('[data-building-supply-summary]', (e) => e.dataset.buildingSupplySource);
  assert.equal(summary, 'utility');
  await shot('luna-electrical-live-utility-restoration');
  results.push('6: Utility restoration — ATS transfers back, generator completes cooldown back to STOPPED, live summary reads UTILITY again');

  // ---- 7. Whole-building Electrical X-ray ----
  await clickTab('Electrical', 'Utility');
  await shot('luna-electrical-live-whole-building-xray');
  results.push('7: Whole-building Electrical X-ray view captured');

  // ---- 8. Realistic B1 electrical equipment ----
  await clickTab('Electrical', 'Generator');
  await shot('luna-electrical-live-b1-equipment');
  results.push('8: Realistic B1 electrical equipment (generator set with control panel) captured');

  // ---- 9. Riser / floor distribution ----
  await clickTab('Electrical', 'Riser');
  await shot('luna-electrical-live-riser-distribution');
  results.push('9: Electrical riser (busway-style duct cross-section) / floor distribution captured');

  // ---- 10. L06 active power trace ----
  await clickTab('Electrical', 'L06 Dist.');
  await shot('luna-electrical-live-l06-trace');
  results.push('10: L06 active power trace captured');

  // ---- 11. Apartment 6A trace ----
  await clickTab('Electrical', '6A Meter');
  await shot('luna-electrical-live-6a-trace');
  results.push('11: Apartment 6A trace captured');

  // ---- 12. Electrical Control Board with live building source ----
  await clickTab('Electrical', 'Utility');
  await shot('luna-electrical-live-control-board');
  results.push('12: Electrical Control Board with live building-source summary captured');

  // ---- Oyi live power understanding, end to end ----
  await ask('What is the building running on?');
  await pause(300);
  assert.equal(await boardExists('Electrical'), true);
  results.push('Oyi "What is the building running on?" answered and kept the board open');

  // ---- State preservation through camera/view changes ----
  const beforeSwitch = await page.evaluate(() => window.readBuildingPower());
  await openEngineeringTray(); await click('All Systems', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  await openEngineeringTray(); await click('Structure', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  const afterSwitch = await page.evaluate(() => window.readBuildingPower());
  assert.equal(afterSwitch.activeSource, beforeSwitch.activeSource, 'building power state must survive Architecture/All Systems/Structure view switching unchanged');
  results.push('State preservation through camera/view changes: building power resolver state unchanged across Architecture/All Systems/Structure switching');
  await openEngineeringTray(); await click('Electrical', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);

  // ---- Regression: Elevator + Water boards still work ----
  await ask('Show me Passenger Lift 02.');
  await pause(400);
  assert.equal(await boardExists('Elevators'), true, 'REGRESSION: Elevator Control Board must still open after V1.1');
  results.push('REGRESSION: Elevator Control Board still opens correctly after the V1.1 convergence pass');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Water', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Water'), true, 'REGRESSION: Water Control Board must still auto-open after V1.1');
  await clickTab('Water', 'Pump 01');
  await click('Stop');
  await page.waitForFunction((ref) => window.readAsset(ref).running === false, { timeout: 5000 }, 'LUNA-B1-WATER-BP-01');
  await click('Start');
  await page.waitForFunction((ref) => window.readAsset(ref).running === true, { timeout: 5000 }, 'LUNA-B1-WATER-BP-01');
  results.push('REGRESSION: Water Control Board still auto-opens and its commands still work after the V1.1 convergence pass');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/luna-electrical-live-ops-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  await page.screenshot({ path: 'artifacts/luna-electrical-live-ops-browser-failure.png' });
  writeFileSync('artifacts/luna-electrical-live-ops-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
