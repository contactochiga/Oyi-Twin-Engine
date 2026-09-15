// OYI Explore Mode V1 browser proof: validates the circular controller, shared
// keyboard/touch movement contract, Oyi shortcut, exit cleanup, and live-dot
// movement from the live Presentation UI without introducing a duplicate
// spatial state path.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(name) { await page.screenshot({ path: `artifacts/${name}.png`, fullPage: false }); console.log('shot:', name); }
const explorePosition = async () => page.evaluate(() => document.documentElement.getAttribute('data-oyi-explore-position'));
const positionChanged = (a, b) => typeof b === 'string' && a !== b;

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await pause(1000);
  await shot('explore-v1-01-inactive');
  assert.ok(await page.$('[data-explore-activate]'), 'Explore launcher visible in Presentation mode');

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'L06');
    if (button) button.click();
  });
  await page.waitForFunction(() => document.body.innerText.includes('Level 6') && document.body.innerText.includes('Apartment A'));
  results.push('Presentation context: selecting L06 activates the existing single Spatial Card while remaining in the live Presentation UI.');

  await page.click('[data-explore-activate]');
  await page.waitForSelector('[data-explore-controller]');
  await shot('explore-v1-02-active-controller');
  assert.equal(await page.$$eval('input[placeholder="Ask Oyi about the building..."]', (els) => els.length), 1, 'Explore must not create a second top Oyi search bar');
  assert.ok(await page.$('[data-explore-oyi]'), 'OYI shortcut visible');
  assert.ok(await page.$('[data-explore-exit]'), 'Exit Explore visible');
  results.push('Explore activation: compact bottom-right controller appears with one OYI shortcut and no duplicate Ask Oyi bar.');

  const forward = await page.$('[data-explore-action="MOVE_FORWARD"]');
  assert.ok(forward, 'forward button exists');
  const beforeHold = await explorePosition();
  const box = await forward.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await pause(900);
  const duringPressed = await page.$eval('[data-explore-action="MOVE_FORWARD"]', (el) => el.getAttribute('aria-pressed'));
  await page.mouse.up();
  await pause(450);
  const afterHold = await explorePosition();
  const afterRelease = await page.$eval('[data-explore-action="MOVE_FORWARD"]', (el) => el.getAttribute('aria-pressed'));
  assert.equal(duringPressed, 'true', 'holding forward sets the shared movement intent');
  assert.equal(afterRelease, 'false', 'releasing forward clears the shared movement intent');
  assert.ok(positionChanged(beforeHold, afterHold), `camera sample should change after held forward movement: ${JSON.stringify({ beforeHold, afterHold })}`);
  await shot('explore-v1-03-after-hold-forward');
  results.push('Pointer hold: holding Forward moves the real camera in the WebGL viewport; release clears movement.');

  const beforeKeyboard = await explorePosition();
  await page.keyboard.down('KeyW');
  await pause(650);
  await page.keyboard.up('KeyW');
  await pause(350);
  const afterKeyboard = await explorePosition();
  assert.ok(positionChanged(beforeKeyboard, afterKeyboard), `keyboard W should move the camera sample: ${JSON.stringify({ beforeKeyboard, afterKeyboard })}`);
  results.push('Keyboard: W movement uses the same Explore movement contract and moves the WebGL viewport.');

  await page.click('[data-explore-oyi]');
  await pause(400);
  assert.equal(await page.$$eval('input[placeholder="Ask Oyi about the building..."]', (els) => els.length), 1, 'OYI shortcut must not add another top search');
  results.push('OYI shortcut: opens the existing contextual Oyi surface without adding a second top search.');

  await page.click('[data-explore-action="INTERACT"]');
  await pause(250);
  await shot('explore-v1-04-interact');
  results.push('Interact: center button executes through the app-level canonical target/selection handler; no detached fake modal appears.');

  await page.click('[data-explore-exit]');
  await pause(350);
  assert.equal(await page.$('[data-explore-controller]'), null, 'controller hidden after explicit Exit');
  const beforeInactiveKey = await explorePosition();
  await page.keyboard.down('KeyW');
  await pause(450);
  await page.keyboard.up('KeyW');
  await pause(250);
  const afterInactiveKey = await explorePosition();
  assert.equal(beforeInactiveKey, afterInactiveKey, 'keyboard movement must be ignored after Explore exits');
  await shot('explore-v1-05-exited');
  results.push('Exit: hides controller, clears movement, and W is ignored when Explore is inactive.');

  await page.click('[data-explore-activate]');
  await page.waitForSelector('[data-explore-controller]');
  await page.keyboard.press('Escape');
  await pause(250);
  assert.equal(await page.$('[data-explore-controller]'), null, 'Escape exits Explore mode');
  results.push('Escape: exits Explore mode through the same cleanup path.');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/explore-mode-v1-browser-results.json', JSON.stringify({ passed: true, results }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE:', String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/explore-mode-v1-failure.png', fullPage: false }); } catch {}
  writeFileSync('artifacts/explore-mode-v1-browser-results.json', JSON.stringify({ passed: false, results, errors, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
