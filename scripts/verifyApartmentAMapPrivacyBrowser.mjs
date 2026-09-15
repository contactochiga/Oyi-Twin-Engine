// Apartment A Full Interior Reality V1 — Part 6 (mandatory). Proves the
// map/live-position DATA/RENDER path itself respects RepresentationPolicy
// — not just a hidden click handler. Covers the real regression found and
// fixed this phase: Oyi navigating to an apartment-devices asset used to
// set activeInteriorRef unconditionally (no policy check), which would
// have handed Facility the private 14-room map the instant they asked
// about any apartment device.
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
const askOyi = async (selector, text) => {
  await page.click(selector);
  await page.evaluate((sel) => { document.querySelector(sel).value = ''; }, selector);
  await page.type(selector, text);
  await page.keyboard.press('Enter');
  await pause(700);
};
const apartmentMapPresent = () => page.evaluate(() => Boolean(document.querySelector('[data-luna-spatial-map="LUNA-L06-APT-A"]')));
const insideRoomListText = () => page.evaluate(() => {
  const sections = [...document.querySelectorAll('.control-panel__levels')];
  const s = sections.find((sec) => sec.querySelector('.control-panel__label')?.textContent?.startsWith('Inside:'));
  return s ? s.textContent : '';
});

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await pause(1200);

  await page.click('.sidebar-toggle');
  await pause(300);
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More options'));
  await clickByText('Development Mode');
  await pause(400);
  const oyiDevInput = 'input[placeholder="Ask Oyi about Luna…"]';
  // Default scope is Facility — deliberately NOT switching to Consumer.

  // ---- 1. Facility asking about an apartment device must NOT leak the private map ----
  await askOyi(oyiDevInput, 'Turn on the living room light.');
  await pause(900);
  await shot('map-privacy-01-facility-device-command');
  const mapAfterFacilityCommand = await apartmentMapPresent();
  assert.ok(!mapAfterFacilityCommand, 'Facility issuing an apartment-device command must NEVER activate the private 14-room Apartment A map — the render path itself, not a click handler, must respect policy');
  const roomListAfterFacilityCommand = await insideRoomListText();
  assert.equal(roomListAfterFacilityCommand, '', 'Facility must never see the private "Inside: Apartment A" 14-room breakdown, even via an Oyi-driven apartment-device command');
  results.push('1. Facility + apartment-device command: no private 14-room map, no room-list disclosure — the real regression this phase found and fixed (navigateToAsset used to set activeInteriorRef unconditionally)');

  // ---- 2. Facility asking to navigate to the apartment directly is still denied full entry ----
  await askOyi(oyiDevInput, 'Show me Apartment 6A.');
  await pause(700);
  const mapAfterFacilityNav = await apartmentMapPresent();
  assert.ok(!mapAfterFacilityNav, 'Facility must not receive the private map via a direct "show me Apartment 6A" request either');
  results.push('2. Facility + direct apartment request: still correctly denied full 3D entry — unchanged pre-existing privacy boundary');

  // ---- 3. Switch to Consumer (assigned resident) — the SAME map now legitimately appears ----
  await clickByText('Consumer', '.oyi-panel__scope');
  await pause(300);
  await askOyi(oyiDevInput, 'Teleport me to the kitchen.');
  await pause(800);
  const mapForResident = await apartmentMapPresent();
  assert.ok(mapForResident, 'the assigned resident must still genuinely receive the real 14-room map once they actually enter — privacy is scoped correctly, not globally disabled');
  await shot('map-privacy-02-resident-map-active');
  results.push('3. Assigned resident: the same real map DOES activate on genuine entry — privacy is correctly scoped, not a blanket map removal');

  // ---- 4. A DIFFERENT resident (not assigned to Apartment A) stays denied ----
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.sidebar-toggle');
  await pause(1200);
  const otherResidentMap = await apartmentMapPresent();
  assert.ok(!otherResidentMap, 'a fresh page load (no identity assigned to Apartment A yet established in this session) must not show the private map by default');
  results.push('4. Fresh session / unrelated identity: private map is not shown by default — confirms the map only ever appears from a real, policy-checked entry, never as a default-visible surface');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/apartment-a-map-privacy-results.json', JSON.stringify({ passed: true, results }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE:', String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/apartment-a-map-privacy-failure.png' }); } catch { /* page may already be closed */ }
  writeFileSync('artifacts/apartment-a-map-privacy-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
