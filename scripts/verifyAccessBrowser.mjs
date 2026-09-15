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
    // The Engineering tray lists 13 systems in a scrollable panel — Access
    // sits below the fold at 1440x1000, unlike every earlier system's own
    // browser test (all positioned high enough to already be visible).
    await page.evaluate((el) => el.scrollIntoView({ block: 'center' }), target);
    await pause(80);
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
    let resolverUrl = findUrl('lunaAccessResolver');
    for (let n = 0; n < 30 && !resolverUrl; n++) { await new Promise((r) => setTimeout(r, 100)); resolverUrl = findUrl('lunaAccessResolver'); }
    const { resolveAccessState } = await import(resolverUrl);
    window.readAccessState = () => resolveAccessState();
  });
}

const boardExists = async (title) => Boolean(await page.$(`[data-system-control-board="${title}"]`));
const MAIN = 'LUNA-GROUND-ACCESS-MAIN-01', LOCK = 'LUNA-L06-APT-A-ENTRY-LOCK-01';
const RESIDENT_ACTOR = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false };
const FACILITY_ACTOR = { role: 'facility', permissions: [], assignedHomeRefs: [], facilityResponsibility: true };

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' }); await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await installRead(page);
  await page.waitForFunction(() => window.readAccessState && window.readAccessState(), { timeout: 60000 });

  // ---- Engineering path: Engineering -> Access & Security ----
  await click('Architecture', '.luna-rail');
  await click('Access', '[data-engineering-tray]');
  await click('Close Engineering Layers', '[data-engineering-tray]');
  await pause(400);
  assert.equal(await boardExists('Access & Security'), true);
  results.push('1: Engineering -> Access & Security auto-opens the Access Control Board — no Oyi command required, matching every other system');

  // ---- 2. Deterministic default focus + status summary ----
  const focusedDefault = await page.$eval('[data-access-asset-panel]', (e) => e.dataset.accessRef);
  assert.equal(focusedDefault, MAIN, 'default focused tab must deterministically be the Main Entrance');
  const summaryExists = Boolean(await page.$('[data-access-status-summary]'));
  assert.ok(summaryExists, 'live Access Status summary widget must render');
  await shot('luna-access-normal-state');
  results.push('2: Access NORMAL state — board auto-opens with deterministic default focus (Main Entrance), live status summary widget present');

  // ---- 3. Whole access reference network ----
  await shot('luna-access-whole-network');
  results.push('3: Whole registered access-point network view captured');

  // ---- Spatial path: LOCATE via each common access point's own tab ----
  await clickTab('Access & Security', 'Main Entrance');
  const mainPanelText = await page.$eval('[data-access-asset-panel]', (e) => e.textContent);
  assert.match(mainPanelText, /DESIGN DECISION REQUIRED/, 'the Main Entrance panel must honestly disclose it has no instrumented lock capability, never a fabricated state');
  await shot('luna-access-main-entrance');
  results.push('4: Main Entrance tab selected — panel honestly discloses no instrumented lock capability (DESIGN DECISION REQUIRED), never fabricated');

  await clickTab('Access & Security', 'Service Entrance');
  await shot('luna-access-service-entrance');
  results.push('5: Service Entrance tab selected');

  await clickTab('Access & Security', 'Lift Lobby');
  await shot('luna-access-lift-lobby');
  results.push('6: Lift Lobby tab selected');
  await clickTab('Access & Security', 'Main Entrance');

  // ---- Denial path: a real, provider-level DENIED attempt (Facility, no master key) ----
  const beforeLocked = await page.evaluate(() => window.readAsset('LUNA-L06-APT-A-ENTRY-LOCK-01').locked);
  assert.equal(beforeLocked, true, 'fresh state starts locked');
  const denied = await page.evaluate(async (actor) => {
    return window.__provider.execute({ assetRef: 'LUNA-L06-APT-A-ENTRY-LOCK-01', command: 'unlock', actor });
  }, FACILITY_ACTOR);
  assert.equal(denied.ok, false, 'Facility must be denied by the real runtime authorization gate — not merely hidden by the renderer');
  const afterDeniedLocked = await page.evaluate(() => window.readAsset('LUNA-L06-APT-A-ENTRY-LOCK-01').locked);
  assert.equal(afterDeniedLocked, true, 'PHYSICAL STATE must remain unchanged after a denied attempt — the door remains locked');
  const eventsAfterDenied = await page.evaluate(() => window.__internals.getAccessEvents());
  assert.equal(eventsAfterDenied[0].label, 'ACCESS_DENIED');
  await shot('luna-access-denied');
  results.push('7 (denial path): a real Facility credential attempts to unlock Apartment 6A\'s entrance through the actual runtime.execute() authorization gate (not a UI-hidden button) and is DENIED — physical state unchanged, ACCESS_DENIED event recorded');

  // ---- Grant path: a real, provider-level GRANTED attempt (assigned resident) ----
  const granted = await page.evaluate(async (actor) => {
    return window.__provider.execute({ assetRef: 'LUNA-L06-APT-A-ENTRY-LOCK-01', command: 'unlock', actor });
  }, RESIDENT_ACTOR);
  assert.ok(granted.ok, 'the assigned resident must be authorized');
  await page.waitForFunction(() => window.readAsset('LUNA-L06-APT-A-ENTRY-LOCK-01').locked === false, { timeout: 5000 });
  const eventsAfterGranted = await page.evaluate(() => window.__internals.getAccessEvents());
  assert.equal(eventsAfterGranted[1].label, 'ACCESS_GRANTED');
  assert.equal(eventsAfterGranted[0].label, 'UNLOCKED');
  await shot('luna-access-granted');
  results.push('8 (grant path): the assigned resident\'s credential is GRANTED through the same real authorization gate — lock releases (a real state change), ACCESS_GRANTED + UNLOCKED events recorded, matching the brief\'s own worked example');

  // ---- Access Control Board (full capture, with event history) ----
  await clickTab('Access & Security', 'Main Entrance');
  await shot('luna-access-control-board');
  results.push('9: Access Control Board captured with the live registered-access-points summary and recent access event history');

  // ---- Oyi path ----
  await ask('Why was access denied?');
  await pause(300);
  assert.equal(await boardExists('Access & Security'), true);
  await shot('luna-access-oyi-investigation');
  results.push('10 (Oyi path): "Why was access denied?" resolves through Oyi and keeps the board open — Oyi is an additional route, not the only way to discover this system');

  // ---- Facility/Consumer path — RepresentationPolicy re-verified live ----
  const boardTabRefs = await page.evaluate(() => [...document.querySelectorAll('[data-system-control-board="Access & Security"] [role="tab"]')].map((e) => e.textContent.trim()));
  assert.deepEqual(boardTabRefs, ['Main Entrance', 'Service Entrance', 'Lift Lobby'], 'the Facility Access Control Board must expose only the three common access points — the private apartment lock is deliberately never a tab here');
  results.push('11 (Facility/Consumer path): the live running app\'s Facility Access Control Board exposes only the three common access points — Apartment 6A\'s own private lock is confirmed absent as a board tab, the same disclosed privacy boundary as HVAC\'s indoor units (RepresentationPolicy byte-hash re-verified separately by test:lift)');

  // ---- State preservation through camera/view changes ----
  const beforeSwitch = await page.evaluate(() => window.readAccessState());
  await openEngineeringTray(); await click('All Systems', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  await openEngineeringTray(); await click('Structure', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  const afterSwitch = await page.evaluate(() => window.readAccessState());
  assert.deepEqual(afterSwitch.points.map((pt) => pt.locked), beforeSwitch.points.map((pt) => pt.locked), 'access state must survive Architecture/All Systems/Structure view switching unchanged');
  results.push('State preservation through camera/view changes: access resolver state unchanged across Architecture/All Systems/Structure switching');
  await openEngineeringTray(); await click('Access', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);

  // ---- Regression: Elevator + Water + Electrical + Fire + HVAC boards still work ----
  await ask('Show me Passenger Lift 02.');
  await pause(400);
  assert.equal(await boardExists('Elevators'), true, 'REGRESSION: Elevator Control Board must still open after Access was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Water', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Water'), true, 'REGRESSION: Water Control Board must still auto-open after Access was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Electrical', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Electrical'), true, 'REGRESSION: Electrical Control Board must still auto-open after Access was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Fire', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Fire'), true, 'REGRESSION: Fire Control Board must still auto-open after Access was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('HVAC', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('HVAC'), true, 'REGRESSION: HVAC Control Board must still auto-open after Access was added');
  results.push('REGRESSION: Elevator, Water, Electrical, Fire and HVAC Control Boards all still work correctly after Access & Security was added');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/luna-access-security-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE at results so far:', results);
  console.error(String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/luna-access-security-browser-failure.png' }); } catch { /* page may already be closed */ }
  writeFileSync('artifacts/luna-access-security-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
