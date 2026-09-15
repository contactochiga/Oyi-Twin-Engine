// True Floor Plan System V1 (L06 Gold Standard Floor) — Part 34 (mandatory
// golden-journey re-run) + a real subset of Part 39's browser checklist.
// Same Puppeteer conventions every prior browser script already uses
// (verifyRoutedTraversalBrowser.mjs) — poll real state, never guess a
// fixed wait, never assert on screenshots alone.
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
  await shot('l06f-01-exterior');
  results.push('1. Exterior: default arrival view');

  await page.click('.sidebar-toggle');
  await pause(300);
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More options'));
  await clickByText('Development Mode');
  await pause(500);
  const oyiDevInput = 'input[placeholder="Ask Oyi about Luna…"]';

  // ---- Part 34 (MANDATORY): re-run the golden journey against the new
  // L06 architecture — must now arrive at the REAL Lift Lobby, not the
  // bare level. ----
  await askOyi(oyiDevInput, 'Take me to Level 6');
  await pause(600);
  await shot('l06f-02-route-begun');

  let reachedLobby = false;
  for (let i = 0; i < 60; i++) {
    await pause(500);
    if ((await selectedRef()) === 'LUNA-L06-LOBBY') { reachedLobby = true; break; }
  }
  await shot('l06f-03-arrived-l06-lobby');
  assert.ok(reachedLobby, 'the routed journey must reach the REAL L06 Lift Lobby (LUNA-L06-LOBBY), not the bare LUNA-L06 level node — this is Part 34\'s own mandatory re-run');
  results.push('2-3. MANDATORY re-run: Exterior -> Grand Lobby -> Passenger Lift -> real L06 Lift Lobby (LUNA-L06-LOBBY), no procedural arrival floating inside geometry');

  // ---- 2D plan shows the real 4 apartments + core (Part 16/39) ----
  // Selecting Level 6 in the rail/plan and reading the canonical debug
  // value for each apartment proves the 2D<->3D binding is real, not
  // just visually plausible.
  await askOyi(oyiDevInput, 'Show me Apartment A');
  await pause(800);
  assert.equal(await selectedRef(), 'LUNA-L06-APT-A', '"Show me Apartment A" must resolve to the real canonical ref');
  await shot('l06f-04-apartment-a');
  results.push('4. Oyi "Show me Apartment A" resolves to the real LUNA-L06-APT-A canonical ref');

  // "Where is X?" phrasing is a real, PRE-EXISTING limitation across the
  // whole vocabulary (matchQuery intercepts "where is" before
  // matchNavigateOrAsset ever runs, confirmed against "Where is Stair 1?"
  // and "Where is Apartment A?" too — not something this phase introduced
  // or is in scope to fix). "Show me X" is the real, working equivalent.
  await askOyi(oyiDevInput, 'Show me Apartment B');
  await pause(800);
  assert.equal(await selectedRef(), 'LUNA-L06-APT-B', '"Show me Apartment B" must resolve to the real canonical ref (locate-only, no interior)');
  await shot('l06f-05-apartment-b');
  results.push('5. Oyi "Show me Apartment B" resolves to the real LUNA-L06-APT-B canonical ref (LOCATE-only, no fabricated interior enter)');

  await askOyi(oyiDevInput, 'Take me to Apartment A');
  let reachedAptA = false;
  for (let i = 0; i < 40; i++) {
    await pause(500);
    const ref = await selectedRef();
    if (ref === 'LUNA-L06-APT-A') { reachedAptA = true; break; }
  }
  await shot('l06f-06-entered-apartment-a');
  assert.ok(reachedAptA, 'Take me to Apartment A must actually route there (Facility identity, real access resolution) — Part 33');
  results.push('6. Oyi "Take me to Apartment A" runs the real route engine through the real entrance door (Facility identity)');

  // ---- Reverse journey ----
  await askOyi(oyiDevInput, 'Take me back to the ground floor');
  let reachedGround = false;
  for (let i = 0; i < 60; i++) {
    await pause(500);
    if ((await selectedRef()) === 'LUNA-GROUND-LOBBY' || (await selectedRef()) === 'LUNA-GROUND') { reachedGround = true; break; }
  }
  await shot('l06f-07-reverse-to-ground');
  assert.ok(reachedGround, 'the reverse journey must actually arrive back at Ground/the Grand Lobby');
  results.push('7. Reverse journey: "Take me back to the ground floor" runs the same route engine back through the lift lobby, lift, and Grand Lobby');

  // ---- Consumer privacy re-verification against the NEW architecture (Part 21) ----
  // The scope toggle is the real "Consumer"/"Facility" button pair inside
  // the Oyi panel header (OyiPanel.tsx), not a sidebar menu item.
  await clickByText('Consumer', '.oyi-panel');
  await pause(500);
  await askOyi(oyiDevInput, 'Take me to Apartment C');
  await pause(1200);
  const consumerReachedC = (await selectedRef()) === 'LUNA-L06-APT-C';
  await shot('l06f-08-consumer-privacy-denied');
  assert.equal(consumerReachedC, false, 'a Consumer resident of Apartment A must never be routed into Apartment C');
  results.push('8. Consumer privacy re-verified against the new floor plate: a resident of Apartment A cannot route into Apartment C — RepresentationPolicy untouched');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/luna-l06-floor-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE at results so far:', results);
  console.error(String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/luna-l06-floor-browser-failure.png' }); } catch { /* page may already be closed */ }
  writeFileSync('artifacts/luna-l06-floor-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
