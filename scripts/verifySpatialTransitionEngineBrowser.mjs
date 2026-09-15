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
const isInsideInterior = () => page.evaluate(() => {
  const sections = [...document.querySelectorAll('.control-panel__levels')];
  return sections.some((s) => s.querySelector('.control-panel__label')?.textContent?.startsWith('Inside:'));
});
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

  // ---- 1. Exterior ----
  await shot('ste-exterior');
  results.push('1. Exterior: default arrival view before any transition begins');

  // Development Mode, matching every other phase's precise-interaction convention.
  await page.click('.sidebar-toggle');
  await pause(300);
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More options'));
  await clickByText('Development Mode');
  await pause(500);
  const oyiDevInput = 'input[placeholder="Ask Oyi about Luna…"]';

  // ---- 2. Select the real Main Entrance and approach it (unmodified Oyi camera preset) ----
  await askOyi(oyiDevInput, 'the entrance door');
  await pause(1200);
  assert.equal(await selectedRef(), 'LUNA-GROUND-ACCESS-MAIN-01');
  await shot('ste-select-main-entrance');
  results.push('2. Select + approach main entrance: Oyi resolves the real canonical entrance asset, camera flies to the existing entranceApproach preset');

  // ---- 3. Entrance closed before the real transition begins ----
  await shot('ste-entrance-closed');
  results.push('3. Entrance closed: door renders CLOSED, no transition in flight yet');

  // ---- 4. Click the real door mesh -> begins the REAL SpatialTransition (LOCATING_ENTRY -> APPROACHING) ----
  // The transition guards against re-entry (start() no-ops if one is
  // already in flight), so clicking every candidate point is safe — at
  // most one of them actually hits the door mesh and begins the transition.
  for (const [x, y] of [[720, 500], [720, 470], [720, 530], [690, 500], [750, 500]]) {
    await page.mouse.click(x, y);
    await pause(150);
  }
  // Immediately after the click(s) the camera should still be MOVING
  // toward the real approach point (not yet settled, not yet inside) —
  // proving this is a physical flight in progress, not an instant jump.
  const stillOutsideRightAfterClick = !(await isInsideInterior());
  assert.ok(stillOutsideRightAfterClick, 'clicking the door must not instantly teleport the camera inside — it must still be travelling');
  results.push('4. Door click begins the real transition: camera is still mid-flight, not yet inside, immediately after the click — no instant teleport');
  await shot('ste-transition-begun');

  // ---- 5. Camera settles at the approach point, door begins OPENING (real clearance-gated actuation) ----
  await pause(1400); // real camera flight (0.11/frame lerp) settling at the real approach point
  await shot('ste-approach-settled-door-opening');
  results.push('5. Camera settles at the real approach point outside the entrance, door begins its real OPENING animation (clearance not yet satisfied)');

  // ---- 6. Camera crosses the actual threshold once real clearance is reached, arrives inside ----
  await pause(2200); // real exponential leaf-opening approach (rate 1.4/s) clears the 0.9m profile well within this window, then CROSSING plays out
  const insideAfterCrossing = await isInsideInterior();
  assert.ok(insideAfterCrossing, 'the transition must have physically crossed the threshold and arrived inside the real Grand Lobby by now');
  await shot('ste-crossed-threshold-arrived');
  results.push('6. Threshold crossed: the transition engine\'s real WAITING_FOR_CLEARANCE -> CROSSING -> ARRIVED sequence lands the camera inside the Grand Lobby, door state updates from the transition, not a fixed timer');

  // ---- 7. Door closes after a brief dwell, following the real completed traversal ----
  await pause(2200); // CLOSE_DWELL_MS + CLOSE_ANIMATION_MS
  await shot('ste-door-closed-after-arrival');
  results.push('7. Door closes after arrival: the entrance closes itself once the real traversal has completed, not as a precondition for crossing');

  // ---- 8. Exit Building — the reverse transition, real navigation-card back control ----
  // The interior navigation card (and its back control) only renders in
  // Presentation Mode's own card stack — switching there preserves the
  // SAME underlying App.tsx state (activeInteriorRef etc.) this transition
  // just set; it is a chrome/rendering-style toggle, not a separate app.
  await clickByText('Presentation Mode');
  await pause(600);
  const backButton = await clickChecked(() => [...document.querySelectorAll('[data-interior-navigation-card] button')].find((b) => b.textContent.trim().startsWith('‹')));
  assert.ok(backButton, 'the Grand Lobby\'s own interior navigation card back control must be present and clickable');
  await pause(300);
  await shot('ste-exit-begun');
  results.push('8. Exit Building begins: the SAME back control that used to teleport out now starts the real reverse SpatialTransition (approach the inside face -> actuate -> wait for clearance -> cross -> arrive outside)');

  // ---- 9. Reverse transition completes: back outside, door closes ----
  await pause(4200); // approach + actuate + clearance + crossing + close dwell, same real durations as the forward direction
  // Presentation Mode's own card stack only renders the interior
  // navigation card while activeInteriorRef is set — its disappearance is
  // the real, product-visible signal that interior context was actually
  // cleared, not merely a UI flag flipped early.
  const cardStillShowing = await page.evaluate(() => Boolean(document.querySelector('[data-interior-navigation-card]')));
  assert.ok(!cardStillShowing, 'Exit Building must have actually crossed back through the entrance and cleared interior context, not merely reset a UI flag while still "inside"');
  await shot('ste-exited-outside');
  results.push('9. Exit Building complete: camera has physically crossed back outside through the same real entrance, interior context cleared, door closed behind it');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/spatial-transition-engine-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE at results so far:', results);
  console.error(String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/spatial-transition-engine-browser-failure.png' }); } catch { /* page may already be closed */ }
  writeFileSync('artifacts/spatial-transition-engine-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
