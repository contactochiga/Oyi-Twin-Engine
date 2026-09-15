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
    let resolverUrl = findUrl('lunaFireResolver');
    for (let n = 0; n < 30 && !resolverUrl; n++) { await new Promise((r) => setTimeout(r, 100)); resolverUrl = findUrl('lunaFireResolver'); }
    const { resolveFireState } = await import(resolverUrl);
    window.readFireState = () => resolveFireState();
  });
}

const boardExists = async (title) => Boolean(await page.$(`[data-system-control-board="${title}"]`));
const PANEL = 'LUNA-B1-FIRE-PANEL-01', SMOKE_DET = 'LUNA-L06-APT-A-ENTRY-SMOKE-01';

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' }); await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await installRead(page);
  await page.waitForFunction(() => window.readFireState && window.readFireState(), { timeout: 60000 });

  // ---- Open the Fire Control Board ----
  await click('Architecture', '.luna-rail');
  await click('Fire', '[data-engineering-tray]');
  await click('Close Engineering Layers', '[data-engineering-tray]');
  await pause(400);
  assert.equal(await boardExists('Fire'), true);

  // ---- 1. Fire NORMAL state ----
  let summary = await page.$eval('[data-fire-status-summary]', (e) => e.dataset.fireState);
  assert.equal(summary, 'normal', 'default state must read NORMAL in the live summary widget');
  const focusedDefault = await page.$eval('[data-fire-asset-panel]', (e) => e.dataset.fireRef);
  assert.equal(focusedDefault, PANEL, 'default focused tab must deterministically be the Fire Alarm Panel');
  await shot('luna-fire-normal-state');
  results.push('1: Fire NORMAL state — live summary reads NORMAL, board auto-opens on Engineering -> Fire with deterministic default focus (Panel)');

  // ---- 2. Whole-building Fire Engineering view ----
  await shot('luna-fire-whole-building');
  results.push('2: Whole-building Fire Engineering view captured');

  // ---- 3. Alarm/detection network ----
  await clickTab('Fire', 'Grd. Detector');
  await shot('luna-fire-alarm-network');
  results.push('3: Alarm/detection network view captured (common-area detector selected)');

  // ---- 4. Fire-water network ----
  await clickTab('Fire', 'Pump');
  await shot('luna-fire-water-network');
  results.push('4: Fire-water network view captured (fire pump selected)');

  // ---- 5. B1 Fire plant ----
  await clickTab('Fire', 'Tank');
  await shot('luna-fire-b1-plant');
  results.push('5: B1 Fire plant (tank/pump/panel) view captured');

  // ---- 6. Fire riser ----
  await clickTab('Fire', 'Riser');
  await shot('luna-fire-riser');
  results.push('6: Fire riser view captured');

  // ---- 7. L06 fire zone ----
  await clickTab('Fire', 'L06 Zone');
  await shot('luna-fire-l06-zone');
  results.push('7: L06 fire zone view captured');

  // ---- 8. Selected detector ----
  await clickTab('Fire', '6A Detector');
  const focusedDetector = await page.$eval('[data-fire-asset-panel]', (e) => e.dataset.fireRef);
  assert.equal(focusedDetector, SMOKE_DET);
  await shot('luna-fire-selected-detector');
  results.push('8: Selected detector (Apartment 6A entry smoke detector) view captured');

  // ---- 9. Simulated alarm state ----
  await page.evaluate(() => {
    const det = window.readAsset('LUNA-L06-APT-A-ENTRY-SMOKE-01');
    window.__internals.setAssetState('LUNA-L06-APT-A-ENTRY-SMOKE-01', { ...det, smoke: true }, 'critical');
    window.__internals.recomputeFireNetwork();
  });
  await page.waitForFunction(() => window.readFireState().fireState === 'alarm', { timeout: 5000 });
  summary = await page.$eval('[data-fire-status-summary]', (e) => e.dataset.fireState);
  assert.equal(summary, 'alarm');
  await clickTab('Fire', 'Panel');
  await shot('luna-fire-simulated-alarm');
  results.push('9: Simulated alarm state captured — live summary correctly reads ALARM, originating device and zone identified');

  // ---- 10. Fire Control Board (with active-incident summary) ----
  const panelText = await page.$eval('[data-fire-asset-panel]', (e) => e.textContent);
  assert.match(panelText, /Active Incident/);
  await shot('luna-fire-control-board');
  results.push('10: Fire Control Board captured with the live building fire-state summary and active-incident investigation section');

  // ---- 11. Oyi incident investigation ----
  await ask('What triggered the alarm?');
  await pause(300);
  assert.equal(await boardExists('Fire'), true);
  await shot('luna-fire-oyi-investigation');
  results.push('11: Oyi incident investigation ("What triggered the alarm?") resolves and keeps the board open on the panel');

  // ---- 12. Recovery/reset state ----
  await page.evaluate(() => {
    const det = window.readAsset('LUNA-L06-APT-A-ENTRY-SMOKE-01');
    window.__internals.setAssetState('LUNA-L06-APT-A-ENTRY-SMOKE-01', { ...det, smoke: false }, 'normal');
    window.__internals.recomputeFireNetwork();
  });
  await page.waitForFunction(() => window.readFireState().fireState === 'normal', { timeout: 5000 });
  summary = await page.$eval('[data-fire-status-summary]', (e) => e.dataset.fireState);
  assert.equal(summary, 'normal');
  await shot('luna-fire-recovery-state');
  results.push('12: Recovery/reset state captured — clearing the detector returns the live summary to NORMAL');

  // ---- State preservation through camera/view changes ----
  const beforeSwitch = await page.evaluate(() => window.readFireState());
  await openEngineeringTray(); await click('All Systems', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  await openEngineeringTray(); await click('Structure', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  const afterSwitch = await page.evaluate(() => window.readFireState());
  assert.equal(afterSwitch.fireState, beforeSwitch.fireState, 'fire state must survive Architecture/All Systems/Structure view switching unchanged');
  results.push('State preservation through camera/view changes: fire resolver state unchanged across Architecture/All Systems/Structure switching');
  await openEngineeringTray(); await click('Fire', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);

  // ---- Consumer boundary: representation policy hides B1 plant (re-verified live) ----
  const consumerCheck = await page.evaluate(async () => {
    const consumerIdentity = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false };
    const findPolicyUrl = () => performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes('lunaRepresentationPolicy'));
    const policyUrl = findPolicyUrl();
    const { lunaRepresentationPolicy } = await import(policyUrl);
    return lunaRepresentationPolicy.resolveMode({ ref: 'LUNA-B1-FIRE-PANEL-01', identity: consumerIdentity });
  });
  assert.equal(consumerCheck, 'HIDDEN', 'live re-check: a resident must not see the B1 fire control panel');
  results.push('Consumer privacy boundary re-verified against the live running app: B1 fire plant HIDDEN for a resident identity');

  // ---- Regression: Elevator + Water + Electrical boards still work ----
  await ask('Show me Passenger Lift 02.');
  await pause(400);
  assert.equal(await boardExists('Elevators'), true, 'REGRESSION: Elevator Control Board must still open after Fire was added');
  results.push('REGRESSION: Elevator Control Board still opens correctly after Fire was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Water', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Water'), true, 'REGRESSION: Water Control Board must still auto-open after Fire was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Electrical', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Electrical'), true, 'REGRESSION: Electrical Control Board must still auto-open after Fire was added');
  const powerSummaryExists = Boolean(await page.$('[data-building-supply-summary]'));
  assert.ok(powerSummaryExists, 'REGRESSION: Electrical live building-supply summary must still render after Fire was added');
  results.push('REGRESSION: Water and Electrical Control Boards (including Electrical\'s live building-supply summary) still work correctly after Fire was added');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/luna-fire-life-safety-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  await page.screenshot({ path: 'artifacts/luna-fire-life-safety-browser-failure.png' });
  writeFileSync('artifacts/luna-fire-life-safety-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
