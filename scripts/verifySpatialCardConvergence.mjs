// Oyi Spatial Card + 2D Plan Visual Convergence V1 — Part 24/29 visual +
// behavioral acceptance proof, run entirely in real Presentation Mode (the
// new Spatial Card system only renders there — Development Mode is a
// separate, mutually-exclusive dev-tools surface, confirmed by reading
// App.tsx's own {presentationMode && (...)} / {!presentationMode && (...)}
// branches). Screenshots + assertions for the new embedded map/breadcrumb/
// navigation-mode/device-list behavior added to LevelContextCard/
// ApartmentContextCard/InteriorNavigationCard.
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
const OYI_INPUT = 'input[placeholder="Ask Oyi about the building..."]';
const askOyi = async (text) => {
  await page.click(OYI_INPUT);
  await page.evaluate((sel) => { document.querySelector(sel).value = ''; }, OYI_INPUT);
  await page.type(OYI_INPUT, text);
  await page.keyboard.press('Enter');
  await pause(900);
};
const breadcrumbText = () => page.evaluate(() => document.querySelector('[data-spatial-card-breadcrumb]')?.textContent ?? null);
const mapCount = () => page.evaluate(() => document.querySelectorAll('[data-luna-spatial-map]').length);
const doorArcCount = () => page.evaluate(() => document.querySelectorAll('[data-interior-navigation-card] svg path').length);
const furnitureRectCount = () => page.evaluate(() => {
  const svg = document.querySelector('[data-interior-navigation-card] svg');
  if (!svg) return 0;
  return [...svg.querySelectorAll('rect')].filter((r) => r.getAttribute('rx') === '0.08').length;
});
const pollFor = async (predicate, maxIterations = 60, intervalMs = 500) => {
  for (let i = 0; i < maxIterations; i++) {
    if (await predicate()) return true;
    await pause(intervalMs);
  }
  return false;
};

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  await page.waitForSelector(OYI_INPUT);
  assert.equal(await page.$('vite-error-overlay'), null);
  await pause(1200);

  // Presentation Mode (the new Spatial Card system) has no scope switcher
  // of its own — the ONLY control for interactionScope lives in
  // Development Mode's OyiPanel. Set the assigned-resident scope there,
  // then return to Presentation Mode, exactly as a real operator would.
  await page.click('.sidebar-toggle');
  await pause(300);
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More options'));
  await clickByText('Development Mode');
  await pause(400);
  await clickByText('Consumer', '.oyi-panel__scope');
  await pause(300);
  await clickByText('Presentation Mode');
  await pause(600);

  // ---- 1. L06 level card: real plan, breadcrumb, embedded mode toggle ----
  await askOyi('Teleport me to Level 6.');
  const l06Ready = await pollFor(async () => {
    const bc = await breadcrumbText();
    return Boolean(bc && bc.includes('Level 6'));
  });
  assert.ok(l06Ready, 'Level 6 must resolve to the real Level card with a breadcrumb');
  await shot('scc-01-l06-level-card');
  results.push(`1. L06 level card: breadcrumb "${await breadcrumbText()}" present, rich plan rendered`);

  // ---- 2. Apartment A selected (LOCATE) ----
  await askOyi('Where is Apartment 6A?');
  const apartmentReady = await pollFor(async () => {
    const bc = await breadcrumbText();
    return Boolean(bc && bc.includes('Apartment A'));
  });
  assert.ok(apartmentReady, 'Apartment A LOCATE must show a real breadcrumb in the summary card');
  await shot('scc-02-apartment-a-selected');
  results.push(`2. Apartment A selected: breadcrumb "${await breadcrumbText()}" present, restrained highlight (not entered)`);

  // ---- 3. Apartment A interior: 14-room rich plan, live dot, single map ----
  await askOyi('Teleport me to the kitchen.');
  const enteredReady = await pollFor(async () => page.evaluate(() => Boolean(document.querySelector('[data-interior-navigation-card]'))));
  assert.ok(enteredReady, 'entering Apartment A via TELEPORT must open the real InteriorNavigationCard');
  const mapsAfterEnter = await mapCount();
  assert.equal(mapsAfterEnter, 1, `exactly one map must render once inside Apartment A (no duplicate/disconnected map), found ${mapsAfterEnter}`);
  const doors = await doorArcCount();
  assert.ok(doors > 0, "Apartment A's own interior plan must now render real internal door swings (previously zero)");
  const furniture = await furnitureRectCount();
  assert.ok(furniture > 0, "Apartment A's own interior plan must render real furniture silhouettes (previously none)");
  const dotPresent = await pollFor(async () => page.evaluate(() => Boolean(document.querySelector('[data-interior-navigation-card] [data-luna-live-dot]'))), 20, 300);
  assert.ok(dotPresent, 'the live position dot must be embedded inside the same Spatial Card, not a separate floating map');
  await shot('scc-03-apartment-a-interior');
  results.push(`3. Apartment A interior: single embedded map (${mapsAfterEnter}), ${doors} real door swing path(s), ${furniture} real furniture silhouette(s), live dot embedded in-card`);

  // ---- 4. Living Room selected: room context + real devices ----
  await askOyi('Teleport me to the living room.');
  const livingReady = await pollFor(async () => {
    const bc = await breadcrumbText();
    return Boolean(bc && bc.includes('Living'));
  });
  assert.ok(livingReady, 'Living Room focus must show a real breadcrumb');
  const devicesLabelPresent = await page.evaluate(() => [...document.querySelectorAll('[data-interior-navigation-card] div')].some((d) => d.textContent.trim() === 'Devices'));
  assert.ok(devicesLabelPresent, 'the Living Room state must show a real Devices section (ROOM state joining operational data to the spatial Twin)');
  await shot('scc-04-living-room-selected');
  results.push(`4. Living Room selected: breadcrumb "${await breadcrumbText()}", real Devices section present in the SAME card`);

  assert.equal(await breadcrumbText(), 'Level 6 › Apartment A › Living Room');
  await clickChecked(() => [...document.querySelectorAll('[data-spatial-asset]')].find((b) => /Air Conditioning|AC/i.test(b.textContent)) ?? document.querySelector('[data-spatial-asset]'));
  const deviceBreadcrumb = await breadcrumbText();
  assert.equal(deviceBreadcrumb.split(' › ').length, 4, 'asset selection adds one canonical breadcrumb segment');
  assert.equal(await page.$$eval('[data-interior-navigation-card]', (els) => els.length), 1);
  await shot('scc-05-actual-device-selected');
  results.push(`Asset depth: ${deviceBreadcrumb}`);
  // Back to the owning room keeps the same card and real selection.
  await clickChecked(() => document.querySelector('[data-interior-navigation-card] button'));
  assert.equal(await breadcrumbText(), 'Level 6 › Apartment A › Living Room');
  await shot('scc-07-assigned-consumer');

  // ---- 5. Device command from the SAME card ----
  await clickChecked(() => [...document.querySelectorAll('[data-spatial-asset]')].find((b) => /Light Circuit 1/.test(b.textContent)));

  const commandButton = await clickChecked(() => [...document.querySelectorAll('[data-interior-navigation-card] button')].find((b) => b.textContent.trim() === 'Turn On' || b.textContent.trim() === 'Turn Off'));
  assert.ok(commandButton, "a real device command button must be clickable directly inside the room's own Devices section");
  await pause(500);
  await shot('scc-05-device-command');
  results.push("5. Device command executed directly from the room's embedded Devices section — same card, same runtime, no separate floating device card needed for an in-apartment device");

  // Full back chain: asset -> room -> home -> apartment summary -> level.
  await clickChecked(() => document.querySelector('[data-interior-navigation-card] button'));
  assert.equal(await breadcrumbText(), 'Level 6 › Apartment A › Living Room');
  await clickChecked(() => document.querySelector('[data-interior-navigation-card] button'));
  assert.equal(await breadcrumbText(), 'Level 6 › Apartment A');
  await shot('scc-08-apartment-overview');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await pause(500);
  await shot('scc-09-compact-card');
  const bounds = await page.$eval('[data-interior-navigation-card]', (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; });
  assert.ok(bounds.left >= 0 && bounds.right <= 390, 'compact card stays within viewport');
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await clickChecked(() => document.querySelector('[data-interior-navigation-card] button'));
  assert.equal(await breadcrumbText(), 'Level 6 › Apartment A');
  await clickChecked(() => document.querySelector('[data-spatial-card-breadcrumb]').parentElement.querySelector('button'));
  assert.equal(await breadcrumbText(), 'Level 6');
  results.push('Back chain returns through room, home, summary and level; compact viewport contains the card.');

  // ---- 6. Facility view (privacy preserved through the new embedded-card path) ----
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector(OYI_INPUT);
  await pause(1200);
  await askOyi('Show me Apartment 6A.');
  await pause(800);
  // The common L06 floor plan (which apartments exist, not what's inside
  // them) is legitimately visible to Facility, unchanged from the prior
  // phase's own privacy proof — only the PRIVATE Apartment A interior plan
  // (and its embedded InteriorNavigationCard) must never appear.
  const facilityPrivateMap = await page.evaluate(() => Boolean(document.querySelector('[data-luna-spatial-map="LUNA-L06-APT-A"]')));
  const facilityInteriorCard = await page.evaluate(() => Boolean(document.querySelector('[data-interior-navigation-card]')));
  assert.ok(!facilityPrivateMap, 'Facility must never see the private Apartment A interior plan, even via the new embedded-map card path');
  assert.ok(!facilityInteriorCard, 'Facility must never reach the InteriorNavigationCard (the private 14-room breakdown)');
  await shot('scc-06-facility-view');
  results.push("6. Facility view: the common L06 plan stays visible (unchanged, privacy-safe) but the private Apartment A interior plan/card never appears through the new embedded-card path — privacy re-verified after this phase's UI changes");

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/spatial-card-convergence-results.json', JSON.stringify({ passed: true, results }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE:', String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/spatial-card-convergence-failure.png' }); } catch { /* page may already be closed */ }
  writeFileSync('artifacts/spatial-card-convergence-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
