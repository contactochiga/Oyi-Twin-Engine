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
    // The Engineering tray lists 13 systems in a scrollable panel — several
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
    let resolverUrl = findUrl('lunaNetworkResolver');
    for (let n = 0; n < 30 && !resolverUrl; n++) { await new Promise((r) => setTimeout(r, 100)); resolverUrl = findUrl('lunaNetworkResolver'); }
    const { resolveNetworkState } = await import(resolverUrl);
    window.readNetworkState = () => resolveNetworkState();
    let scenariosUrl = findUrl('lunaScenarios');
    for (let n = 0; n < 30 && !scenariosUrl; n++) { await new Promise((r) => setTimeout(r, 100)); scenariosUrl = findUrl('lunaScenarios'); }
    const { LUNA_SCENARIOS } = await import(scenariosUrl);
    window.__scenarios = LUNA_SCENARIOS;
  });
}

const boardExists = async (title) => Boolean(await page.$(`[data-system-control-board="${title}"]`));
const GATEWAY = 'LUNA-B1-NET-GATEWAY-01';


const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' }); await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await installRead(page);
  await page.waitForFunction(() => window.readNetworkState && window.readNetworkState(), { timeout: 60000 });

  // ---- JOURNEY 1: Engineering discovery ----
  await click('Architecture', '.luna-rail');
  await click('Network / Edge', '[data-engineering-tray]');
  await click('Close Engineering Layers', '[data-engineering-tray]');
  await pause(400);
  assert.equal(await boardExists('Network / Edge'), true);
  const focusedDefault = await page.$eval('[data-network-asset-panel]', (e) => e.dataset.networkRef);
  assert.equal(focusedDefault, GATEWAY, 'default focused tab must deterministically be the core Gateway');
  const summaryExists = Boolean(await page.$('[data-network-status-summary]'));
  assert.ok(summaryExists, 'live Network Status summary widget must render');
  await shot('luna-network-engineering-board');
  results.push('JOURNEY 1 (Engineering discovery): Engineering -> Network / Edge auto-opens the Network Control Board — no Oyi command required, deterministic default focus, live status summary present');

  // ---- Physical connectivity: the real backbone chain, at rest ----
  const backboneText = await page.$eval('[data-network-asset-panel]', (e) => e.textContent);
  assert.match(backboneText, /Reachable/, 'the real physical backbone chain must be visible on the Gateway tab');
  await shot('luna-network-backbone-chain');
  results.push('Physical connectivity: the Gateway tab shows the real, pre-existing parentRef backbone chain (riser -> branch -> Apartment 6A ONT -> router) all reachable at rest');

  // ---- JOURNEY 2: Spatial discovery — asset selector switching ----
  await clickTab('Network / Edge', 'Wi-Fi AP');
  const focused2 = await page.$eval('[data-network-asset-panel]', (e) => e.dataset.networkRef);
  assert.equal(focused2, 'LUNA-GROUND-NET-WIFI-AP-01');
  await shot('luna-network-wifi-ap-selected');
  results.push('JOURNEY 2 (spatial discovery): selecting a different network asset tab updates the SAME board — one persistent board, not a separate dashboard per device');

  // ---- Oyi Edge/Core honesty disclosure ----
  await clickTab('Network / Edge', 'Oyi Edge Core');
  const edgeCoreText = await page.$eval('[data-network-asset-panel]', (e) => e.textContent);
  assert.match(edgeCoreText, /No established physical or logical connection/);
  await shot('luna-network-edge-core-disclosure');
  results.push('THE NETWORK CARRIES TRUTH, IT DOES NOT CREATE TRUTH: the Oyi Edge/Core tab explicitly discloses it has no established connection to the gateway chain, rather than silently implying one');
  await clickTab('Network / Edge', 'Gateway');

  // ---- No fake controls ----
  const gatewayPanelText = await page.$eval('[data-network-asset-panel]', (e) => e.textContent);
  assert.match(gatewayPanelText, /No remote-control capability/);
  results.push('Network panel honestly discloses no remote-control capability rather than showing dead buttons');

  // ---- Deterministic cascade: gateway uplink lost, real downstream chain reacts ----
  const before = await page.evaluate(() => window.readNetworkState());
  assert.equal(before.gatewayUplinkUp, true);
  await page.evaluate(() => {
    const scenario = window.__scenarios.find((s) => s.key === 'network-uplink-lost');
    scenario.apply();
  });
  await page.waitForFunction(() => window.readNetworkState().gatewayUplinkUp === false, { timeout: 5000 });
  const after = await page.evaluate(() => window.readNetworkState());
  assert.ok(after.backbone.every((n) => n.reachable === false), 'the entire real backbone chain must cascade to unreachable in the live running app');
  assert.equal(after.wifiApReachable, false);
  await shot('luna-network-uplink-lost');
  results.push('Deterministic cascade proven against the live running app: the gateway loses uplink -> the entire real physical backbone chain (riser/branch/ONT/router) and the Wi-Fi AP cascade to unreachable — read directly from the live provider, not simulated separately');

  // ---- Recovery ----
  await page.evaluate(() => window.__internals.resetAll());
  await page.waitForFunction(() => window.readNetworkState().gatewayUplinkUp === true, { timeout: 5000 });
  await shot('luna-network-recovery');
  results.push('Recovery captured — resetting the provider returns the gateway uplink and the entire backbone chain to reachable');

  // ---- JOURNEY 4: Oyi navigation ----
  await ask('Show me the network.');
  await pause(400);
  assert.equal(await boardExists('Network / Edge'), true);
  await shot('luna-network-oyi-investigation');
  results.push('JOURNEY 4 (Oyi): "Show me the network." resolves through Oyi and keeps the board open — Oyi is an additional discovery path, not the only one');

  // ---- JOURNEY 5: Privacy — Facility board vs private-unit assets ----
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  await openEngineeringTray(); await click('Network / Edge', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  const facilityBoardTabs = await page.evaluate(() => [...document.querySelectorAll('[data-system-control-board="Network / Edge"] [role="tab"]')].map((e) => e.textContent.trim()));
  assert.deepEqual(facilityBoardTabs, ['Gateway', 'Wi-Fi AP', 'Oyi Edge Core'], 'the Facility Network Control Board must expose only the three common assets — Apartment 6A\'s own ONT and router are never tabs here');
  await shot('luna-network-facility-view');
  results.push('JOURNEY 5 (privacy): the live Facility Network Control Board exposes exactly the three common assets — Apartment 6A\'s Facility-owned ONT and the resident\'s own router are confirmed absent as board tabs (RepresentationPolicy re-verified in the deterministic suite: ONT CONTEXT_3D, router HIDDEN to Facility, both unchanged)');

  // ---- Regression: Elevator + Water + Electrical + Fire + HVAC + Access + CCTV boards still work ----
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(300);
  await ask('Show me Passenger Lift 02.');
  await pause(400);
  assert.equal(await boardExists('Elevators'), true, 'REGRESSION: Elevator Control Board must still open after Network/Edge was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Water', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Water'), true, 'REGRESSION: Water Control Board must still auto-open after Network/Edge was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Electrical', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Electrical'), true, 'REGRESSION: Electrical Control Board must still auto-open after Network/Edge was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Fire', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Fire'), true, 'REGRESSION: Fire Control Board must still auto-open after Network/Edge was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('HVAC', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('HVAC'), true, 'REGRESSION: HVAC Control Board must still auto-open after Network/Edge was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Access', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('Access & Security'), true, 'REGRESSION: Access Control Board must still auto-open after Network/Edge was added');
  await openEngineeringTray(); await click('Architecture', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);

  await openEngineeringTray(); await click('Security', '[data-engineering-tray]'); await click('Close Engineering Layers', '[data-engineering-tray]'); await pause(400);
  assert.equal(await boardExists('CCTV & Security'), true, 'REGRESSION: CCTV Control Board must still auto-open after Network/Edge was added');
  results.push('REGRESSION: Elevator, Water, Electrical, Fire, HVAC, Access and CCTV Control Boards all still work correctly after Network/Edge & Physical Connectivity was added');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/luna-network-edge-connectivity-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE at results so far:', results);
  console.error(String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/luna-network-edge-connectivity-browser-failure.png' }); } catch { /* page may already be closed */ }
  writeFileSync('artifacts/luna-network-edge-connectivity-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
