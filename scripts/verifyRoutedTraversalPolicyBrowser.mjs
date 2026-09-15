import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(name) { await page.screenshot({ path: `artifacts/${name}.png` }); console.log('shot:', name); }
const clickChecked = async (findExpr, args) => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const target = await page.evaluateHandle(findExpr, args);
    if (!target.asElement()) return null;
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
const clickByText = async (text, scope = 'body') => {
  const h = await clickChecked(({ text, scope }) => [...document.querySelector(scope).querySelectorAll('button')].find((e) => e.textContent.trim() === text), { text, scope });
  assert.ok(h, `button "${text}" not found/clickable`);
};
const selectedRef = async () => page.$eval('.selection-debug__value', (el) => el.textContent.trim()).catch(() => null);
const askOyi = async (selector, text) => {
  await page.click(selector);
  await page.evaluate((sel) => { document.querySelector(sel).value = ''; }, selector);
  await page.type(selector, text);
  await page.keyboard.press('Enter');
  await pause(700);
};

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' }); await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await pause(1500);

  await page.click('.sidebar-toggle');
  await pause(300);
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More options'));
  await clickByText('Development Mode');
  await pause(500);
  const oyiDevInput = 'input[placeholder="Ask Oyi about Luna…"]';

  // ---- 1. Facility: a lift-requiring route is real and permitted (already
  // proven end-to-end in verifyRoutedTraversalBrowser.mjs — here we only
  // need to confirm the route actually BEGINS for Facility, not repeat
  // the full multi-second journey). ----
  await askOyi(oyiDevInput, 'Take me to Level 6');
  await pause(1000);
  await shot('rtp-01-facility-route-begins');
  const facilityRouteStarted = await page.evaluate(() => document.body.innerText.includes('Approaching the entrance') || document.body.innerText.includes('Opening the door') || document.body.innerText.includes('Entering'));
  assert.ok(facilityRouteStarted, 'a Facility identity must be able to begin a real lift-requiring route');
  results.push('1. Facility: a common route requiring the lift is real and permitted — the route narration confirms it actually began (not silently rejected)');

  // Let the entrance leg finish and cancel the rest by reloading — this
  // script only needs to prove policy behavior, not repeat the full
  // journey the other script already verified twice.
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.sidebar-toggle');
  await pause(1200);
  await page.click('.sidebar-toggle');
  await pause(300);
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More options'));
  await clickByText('Development Mode');
  await pause(500);

  // ---- 2. Switch to Consumer scope ----
  await clickByText('Consumer', '.oyi-panel__scope');
  await pause(400);
  await shot('rtp-02-consumer-scope');
  results.push('2. Switched to Consumer scope via the existing, real OyiPanel scope toggle');

  // ---- 3. Consumer: a valid common route (Enter the lobby) succeeds for real ----
  await askOyi(oyiDevInput, 'Enter the lobby');
  await pause(1400 + 2200 + 500); // real approach + real clearance-gated crossing
  const consumerInLobby = await selectedRef();
  await shot('rtp-03-consumer-entered-lobby');
  assert.equal(consumerInLobby, 'LUNA-GROUND-LOBBY', 'a Consumer identity must be able to complete a real, valid common-space route (the Main Entrance has no lift-control gate)');
  results.push('3. Consumer: "Enter the lobby" completes a REAL physical route (approach, door opens, threshold crossed) — common routes are not blanket-denied for Consumer');

  // ---- 4. Consumer: riding a passenger lift to their OWN assigned floor
  // is real and permitted ----
  // UPDATED: this step originally asserted a Consumer must NEVER be shown
  // boarding any lift, back when lift access meant lift CONTROL only. A
  // later, legitimate capability (passengerStopAllowed(), lunaRuntime/
  // lunaPassengerAccess.ts) narrowly lets a resident RIDE (never control)
  // a passenger lift to their own assigned home floor — without it,
  // "take me home" (Part 20) could never physically complete, since a
  // resident who can't board the lift could never reach an upper floor at
  // all. Development Mode's default Consumer identity is assigned to
  // LUNA-L06-APT-A (see lunaScope.ts's DEFAULT_ASSIGNED_HOME), so a route
  // to Level 6 — their own floor — now correctly shows the real
  // waiting/travelling sequence instead of being silently excluded.
  await askOyi(oyiDevInput, 'Take me to Level 6');
  await pause(1200);
  const ownFloorLiftViewAppeared = await page.evaluate(() => document.body.innerText.includes('Waiting for the lift') || document.body.innerText.includes('Travelling'));
  assert.ok(ownFloorLiftViewAppeared, 'a Consumer identity must be able to ride a passenger lift to their own assigned home floor — real physical access, not a fabricated bypass');
  await shot('rtp-04-consumer-own-floor-lift-ride');
  results.push('4. Consumer: riding the passenger lift to their OWN assigned floor (Level 6) is real and permitted — the narrow passengerStopAllowed() capability, never full lift control, proven by the SAME unmodified policy pipeline every other system enforces');

  // ---- 5. Consumer: a route to an UNRELATED floor is still excluded ----
  // Proves passenger access is genuinely scoped to the resident's own
  // floor, not a blanket bypass of the lift-control gate.
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.sidebar-toggle');
  await pause(1200);
  await page.click('.sidebar-toggle');
  await pause(300);
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More options'));
  await clickByText('Development Mode');
  await pause(500);
  await clickByText('Consumer', '.oyi-panel__scope');
  await pause(400);
  await askOyi(oyiDevInput, 'Take me to Level 7');
  await pause(900); // the real, current lift-control gate rejects this at planning time — no waiting/boarding sequence to poll for
  const otherFloorLiftViewAppeared = await page.evaluate(() => document.body.innerText.includes('Waiting for the lift') || document.body.innerText.includes('Travelling'));
  assert.ok(!otherFloorLiftViewAppeared, 'a Consumer identity must never be shown boarding/travelling in a lift toward a floor it has no real access to (not its own assigned home)');
  await shot('rtp-05-consumer-other-floor-lift-excluded');
  results.push('5. Consumer: a route to an unrelated floor (Level 7, not their own home) is correctly excluded — passenger access is real but scoped to the resident\'s own floor, never a blanket lift-control bypass');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/routed-traversal-policy-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE at results so far:', results);
  console.error(String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/routed-traversal-policy-browser-failure.png' }); } catch { /* page may already be closed */ }
  writeFileSync('artifacts/routed-traversal-policy-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
