// Apartment A Full Interior Reality V1 — Part 10. TELEPORT golden proof:
// from a valid context, LOCATE then ENTER a room via the real TELEPORT
// mechanism (focusRoom/enterInterior — policy-checked, direct arrival,
// never a route). Proves LOCATE never moves the traveler, ENTER via
// TELEPORT does move them instantly with no route/narration history, and
// an explicit Oyi phrase override ("Teleport me to X") works without
// touching the session's own default navigationMode.
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
const narrationSnapshot = () => page.evaluate(() => document.body.innerText.match(/(Approaching|Opening|Waiting for the lift|Travelling|Entering|Crossing)[^\n]*/gi) ?? []);

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await pause(1200);
  await shot('teleport-01-exterior');

  await page.click('.sidebar-toggle');
  await pause(300);
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More options'));
  await clickByText('Development Mode');
  await pause(400);
  await clickByText('Consumer', '.oyi-panel__scope');
  await pause(300);
  const oyiDevInput = 'input[placeholder="Ask Oyi about Luna…"]';

  // ---- 1. LOCATE the kitchen: selects/highlights but never physically
  // moves the traveler into it (the established LOCATE/ENTER grammar —
  // locateDestination's own room case sets `selected` for the 3D/2D
  // highlight, matching a real "where is X" peek, but never flies the
  // camera or claims arrival) ----
  await askOyi(oyiDevInput, 'Where is the kitchen?');
  await pause(500);
  assert.equal(await selectedRef(), 'LUNA-L06-APT-A-KITCHEN', 'LOCATE must still resolve/highlight the real canonical Kitchen ref (it is a real select, not a no-op)');
  const mapAfterLocate = await page.evaluate(() => Boolean(document.querySelector('[data-luna-spatial-map="LUNA-L06-APT-A"]')));
  assert.ok(!mapAfterLocate, 'LOCATE must never claim the traveler is physically inside Apartment A — no map/live-dot activation, unlike a real ENTER arrival');
  const narrationAfterLocate = await narrationSnapshot();
  assert.deepEqual(narrationAfterLocate, [], 'LOCATE must never produce real-travel narration (approaching/opening/crossing) — no route was ever begun');
  await shot('teleport-02-located-kitchen');
  results.push('1. LOCATE: "Where is the kitchen?" highlights the real Kitchen ref (selection updates) but never claims physical arrival — no map/dot activation, no travel narration');

  // ---- 2. ENTER the kitchen via explicit TELEPORT override ----
  await askOyi(oyiDevInput, 'Teleport me to the kitchen.');
  await pause(800);
  assert.equal(await selectedRef(), 'LUNA-L06-APT-A-KITCHEN', 'TELEPORT ENTER must resolve selection to the real canonical Kitchen ref');
  const narrationAfterTeleport = await narrationSnapshot();
  assert.deepEqual(narrationAfterTeleport, [], 'a TELEPORT arrival must never generate real-route narration (approaching/opening/crossing) — it is a direct, policy-checked arrival, never a fabricated physical route');
  const mapVisible = await page.evaluate(() => Boolean(document.querySelector('[data-luna-spatial-map="LUNA-L06-APT-A"]')));
  assert.ok(mapVisible, 'the Apartment A map must be active immediately after a TELEPORT arrival — mapSpec must react to TELEPORT the same way it reacts to TOUR');
  // Wait for the real camera-derived dot. The existing camera easing can still
  // be 8cm above the floor-context tolerance after the old fixed 800ms delay.
  // No synthetic position/current-space update and no weakened dot assertion.
  await page.waitForSelector('[data-luna-live-dot]', { timeout: 10000 });
  const dotPresent = await page.evaluate(() => Boolean(document.querySelector('[data-luna-live-dot]')));
  assert.ok(dotPresent, 'the live position dot must be present after a TELEPORT arrival — currentSpaceRef is real (focusRoom sets it), not just a camera cut with no spatial-truth update');
  await shot('teleport-03-entered-kitchen');
  results.push('2. TELEPORT ENTER: "Teleport me to the kitchen." resolves the real Kitchen ref directly — no route narration generated, map + live dot both real and active');

  // ---- 3. Repeat with Bedroom 2 ----
  await askOyi(oyiDevInput, 'Teleport me to bedroom 2.');
  await pause(800);
  assert.equal(await selectedRef(), 'LUNA-L06-APT-A-BED-02', 'a second TELEPORT arrival must resolve the real canonical Bedroom 2 ref');
  const narrationAfterSecondTeleport = await narrationSnapshot();
  assert.deepEqual(narrationAfterSecondTeleport, [], 'the second TELEPORT arrival must also generate no route narration');
  await shot('teleport-04-entered-bedroom2');
  results.push('3. Repeat: "Teleport me to bedroom 2." resolves LUNA-L06-APT-A-BED-02 directly, same honest no-narration TELEPORT semantics');

  // ---- 4. The persistent session navigationMode was never mutated by these one-shot overrides ----
  const teleportButtonActive = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find((el) => el.textContent.trim() === 'Tour');
    return b ? b.getAttribute('aria-pressed') : null;
  });
  assert.equal(teleportButtonActive, 'true', 'the session\'s own default navigationMode (TOUR) must be untouched by one-shot "teleport me to X" overrides — the mode toggle still shows Tour active, not permanently flipped to Teleport');
  results.push('4. One-shot override discipline: explicit "teleport me to X" phrases never mutate the session\'s own persistent navigationMode (still showing TOUR active)');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/apartment-a-teleport-results.json', JSON.stringify({ passed: true, results }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE:', String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/apartment-a-teleport-failure.png' }); } catch { /* page may already be closed */ }
  writeFileSync('artifacts/apartment-a-teleport-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
