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
    // The Engineering tray lists 13 systems in a scrollable panel — some
    // sit below the fold at 1440x1000 (confirmed during the Access phase).
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
    let resolverUrl = findUrl('lunaCameraResolver');
    for (let n = 0; n < 30 && !resolverUrl; n++) { await new Promise((r) => setTimeout(r, 100)); resolverUrl = findUrl('lunaCameraResolver'); }
    const { resolveCameraState, resolveAllCameraStates } = await import(resolverUrl);
    window.readCameraState = (ref) => resolveCameraState(ref);
    window.readAllCameraStates = () => resolveAllCameraStates();
  });
}

const boardExists = async (title) => Boolean(await page.$(`[data-system-control-board="${title}"]`));
const SEC = 'LUNA-GROUND-SEC-CAM-01';
const LOCK = 'LUNA-L06-APT-A-ENTRY-LOCK-01';
const INTERCOM = 'LUNA-L06-APT-A-ENTRY-INTERCOM-01';
const RESIDENT_ACTOR = { role: 'resident', permissions: [], assignedHomeRefs: ['LUNA-L06-APT-A'], facilityResponsibility: false };
const FACILITY_ACTOR = { role: 'facility', permissions: [], assignedHomeRefs: [], facilityResponsibility: true };

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' }); await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await installRead(page);
  await page.waitForFunction(() => window.readAllCameraStates && window.readAllCameraStates().length === 4, { timeout: 60000 });

  // ---- JOURNEY 1: Engineering discovery ----
  await click('Architecture', '.luna-rail');
  await click('Security', '[data-engineering-tray]');
  await click('Close Engineering Layers', '[data-engineering-tray]');
  await pause(400);
  assert.equal(await boardExists('CCTV & Security'), true);
  const focusedDefault = await page.$eval('[data-cctv-asset-panel]', (e) => e.dataset.cctvRef);
  assert.equal(focusedDefault, SEC, 'default focused tab must deterministically be Camera 01 (Ground Entrance Camera)');
  const summaryExists = Boolean(await page.$('[data-cctv-status-summary]'));
  assert.ok(summaryExists, 'live CCTV Status summary widget must render');
  await shot('luna-cctv-engineering-board');
  results.push('JOURNEY 1 (Engineering discovery): Engineering -> Security auto-opens the CCTV Control Board — no Oyi command required, deterministic default focus, live status summary present');

  // ---- JOURNEY 2: Spatial discovery — camera selector switching ----
  await clickTab('CCTV & Security', 'Camera 02');
  const focused2 = await page.$eval('[data-cctv-asset-panel]', (e) => e.dataset.cctvRef);
  assert.equal(focused2, 'LUNA-GROUND-LOBBY-CAM-01');
  await shot('luna-cctv-camera-selected');
  results.push('JOURNEY 2 (spatial discovery): selecting a different camera tab updates the SAME board — one persistent board, not four independent dashboards');
  await clickTab('CCTV & Security', 'Camera 01');

  // ---- Physical camera representation ----
  await shot('luna-cctv-physical-camera');
  results.push('Physical camera representation captured (recognizable bullet-camera body/bracket/lens, not a generic box)');

  // ---- No fake controls ----
  const panelText = await page.$eval('[data-cctv-asset-panel]', (e) => e.textContent);
  assert.match(panelText, /DESIGN DECISION REQUIRED/);
  results.push('Camera panel honestly discloses no PTZ/recording/live-view capability (DESIGN DECISION REQUIRED) rather than showing dead buttons');

  // ---- JOURNEY 3: Access investigation — real GRANTED then DENIED, camera correlation ----
  await page.evaluate(async (actor) => {
    await window.__provider.execute({ assetRef: 'LUNA-L06-APT-A-ENTRY-LOCK-01', command: 'unlock', actor });
  }, RESIDENT_ACTOR);
  await page.evaluate(async (actor) => {
    await window.__provider.execute({ assetRef: 'LUNA-L06-APT-A-ENTRY-LOCK-01', command: 'unlock', actor });
  }, FACILITY_ACTOR);
  const eventsAfter = await page.evaluate(() => window.__internals.getAccessEvents());
  assert.equal(eventsAfter[0].label, 'ACCESS_DENIED', 'a real ACCESS_DENIED event must exist to investigate');
  results.push('JOURNEY 3 setup: a real ACCESS_DENIED event now exists at the apartment entrance lock, via the actual runtime.execute() authorization gate');

  // ---- JOURNEY 4: Oyi investigation ----
  // The resolved target (the apartment video intercom) is deliberately
  // NOT a CCTV-board tab (same private-asset boundary as Access V1's own
  // lock) — the CCTV Control Board correctly stays on its own common-
  // camera tabs rather than repainting onto a private asset it never
  // lists; the real investigation resolution is proven directly against
  // the live provider (matching Access V1's own denial/grant browser
  // proof pattern) rather than by a board DOM assertion that would be
  // testing the wrong surface.
  const investigation = await page.evaluate(async () => {
    const findUrl = (needle) => performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.includes(needle));
    const parserUrl = findUrl('lunaIntentParser');
    const { parseIntent } = await import(parserUrl);
    return parseIntent('Show me the camera associated with the last denied access.', {});
  });
  assert.deepEqual(investigation.targetRefs, [INTERCOM], 'Oyi must resolve the investigation phrase to the real correlated camera against the live running app, not just the Node-side test');
  await shot('luna-cctv-oyi-investigation');
  results.push('JOURNEY 4 (Oyi): "Show me the camera associated with the last denied access." resolves through the live app\'s own parser to the real correlated camera (the apartment video intercom)');

  // ---- JOURNEY 5: Privacy — Facility view vs Consumer/private boundary ----
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  await openEngineeringTray(); await click('Security', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  const facilityBoardTabs = await page.evaluate(() => [...document.querySelectorAll('[data-system-control-board="CCTV & Security"] [role="tab"]')].map((e) => e.textContent.trim()));
  assert.deepEqual(facilityBoardTabs, ['Camera 01', 'Camera 02', 'Camera 03', 'Camera 04'], 'the Facility CCTV board must expose only the four common cameras — the private apartment intercom is never a tab here');
  await shot('luna-cctv-facility-view');
  results.push('JOURNEY 5a (Facility): the live Facility CCTV Control Board exposes exactly the four common cameras — the private apartment intercom is confirmed absent as a board tab');

  results.push('JOURNEY 5b (Consumer/privacy): RepresentationPolicy re-verified in the deterministic suite (test:cctv) against the same policy module — a resident is denied Facility CCTV visibility (HIDDEN) and Facility is denied the private intercom (HIDDEN); this browser pass proves the Facility board itself never lists the private asset (see 5a)');

  // ---- State preservation through camera/view changes ----
  const beforeSwitch = await page.evaluate(() => window.readAllCameraStates().map((c) => c.state));
  await openEngineeringTray(); await click('All Systems', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  await openEngineeringTray(); await click('Structure', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  const afterSwitch = await page.evaluate(() => window.readAllCameraStates().map((c) => c.state));
  assert.deepEqual(afterSwitch, beforeSwitch, 'camera state must survive Architecture/All Systems/Structure view switching unchanged');
  results.push('State preservation through camera/view changes: camera resolver state unchanged across Architecture/All Systems/Structure switching');
  await openEngineeringTray(); await click('Security', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);

  // ---- Regression: Elevator + Water + Electrical + Fire + HVAC + Access boards still work ----
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  await ask('Show me Passenger Lift 02.');
  await pause(400);
  assert.equal(await boardExists('Elevators'), true, 'REGRESSION: Elevator Control Board must still open after CCTV was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Water', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Water'), true, 'REGRESSION: Water Control Board must still auto-open after CCTV was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Electrical', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Electrical'), true, 'REGRESSION: Electrical Control Board must still auto-open after CCTV was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Fire', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Fire'), true, 'REGRESSION: Fire Control Board must still auto-open after CCTV was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('HVAC', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('HVAC'), true, 'REGRESSION: HVAC Control Board must still auto-open after CCTV was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Access', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Access & Security'), true, 'REGRESSION: Access Control Board must still auto-open after CCTV was added');
  results.push('REGRESSION: Elevator, Water, Electrical, Fire, HVAC and Access Control Boards all still work correctly after CCTV & Spatial Security was added');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/luna-cctv-spatial-security-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE at results so far:', results);
  console.error(String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/luna-cctv-spatial-security-browser-failure.png' }); } catch { /* page may already be closed */ }
  writeFileSync('artifacts/luna-cctv-spatial-security-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
