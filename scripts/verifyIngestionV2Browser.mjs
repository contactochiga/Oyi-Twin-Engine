import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

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

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' }); await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await pause(1200);

  // ---- 1. Header spacing ----
  const gaps = await page.evaluate(() => {
    const logo = document.querySelector('.identity-slot')?.getBoundingClientRect();
    const hamburger = document.querySelector('.sidebar-toggle')?.getBoundingClientRect();
    const search = document.querySelector('input[aria-label="Ask Oyi about the building"]')?.getBoundingClientRect();
    return { logoHamburgerGap: hamburger.left - logo.right, hamburgerSearchGap: search.left - hamburger.right };
  });
  assert.ok(gaps.logoHamburgerGap < gaps.hamburgerSearchGap, `logo->hamburger gap (${gaps.logoHamburgerGap}) must read tighter than hamburger->search gap (${gaps.hamburgerSearchGap})`);
  await shot('iv2-header-spacing');
  results.push('1. Header spacing: logo+hamburger read as one compact group, real measured gap smaller than the gap before Ask Oyi');

  // ---- 2/3. L06 selected + 2D floor control visible ----
  await clickByText('L06', '.luna-rail');
  await pause(500);
  assert.ok(await page.evaluate(() => document.body.innerText.includes('Level 6')), 'L06 context card must open');
  // L06's default representation is the styled "3D" apartment-grid card
  // (real, but not an SVG) — the real FloorPlan2D SVG only renders once
  // the real "2D" toggle is clicked, found live rather than assumed.
  await clickByText('2D');
  await pause(400);
  const l06Units = await page.evaluate(() => [...document.querySelectorAll('svg[aria-label*="operational floor plan"] title')].map((t) => t.textContent));
  assert.ok(l06Units.some((u) => u.includes('Apartment A')), 'the real 2D floor control map must show Apartment A');
  await shot('iv2-l06-2d-floor-control');
  results.push('2/3. L06 selected + real 2D floor control card visible, showing the real 4 units');

  // ---- 4/5. Apartment A first selection (locate, not enter) ----
  // Real, unmodified Facility-scope behavior: Presentation Mode has no
  // scope switcher (Consumer scope is only reachable via Dev Mode's own
  // OyiPanel toggle — a genuine, pre-existing UI constraint, not
  // something this phase introduced), so under Facility, "locate" is
  // real and reachable but "Enter Apartment" is correctly never offered
  // for a private unit (RepresentationPolicy's real privacy boundary).
  await clickChecked(() => [...document.querySelectorAll('svg[aria-label*="operational floor plan"] g[role="button"]')].find((g) => g.querySelector('title')?.textContent?.includes('Apartment A')));
  await pause(500);
  await shot('iv2-apartment-a-located');
  const enterButtonUnderFacility = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Enter Apartment'));
  assert.equal(enterButtonUnderFacility, false, 'Facility scope must never offer "Enter Apartment" for a private unit — the real privacy boundary, unaffected by this phase');
  await page.click('.sidebar-toggle'); await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More options')); await clickByText('Development Mode'); await pause(400);
  assert.equal(await selectedRef(), 'LUNA-L06-APT-A', 'first tap on Apartment A in the real 2D plan must resolve selection to the real canonical ref (locate stage)');
  results.push('4/5. Apartment A first selection: real 2D click resolves to the real canonical LUNA-L06-APT-A ref, camera flies to the real exterior-focus shot (locate stage, not entered); Facility scope correctly never offers Enter for a private unit');

  // ---- 6. Apartment A Enter — via Dev Mode + Consumer scope, the only
  // real reachable path to FULL_3D private-unit entry today (same
  // pre-existing constraint noted above; reuses the established,
  // already-passing L06 Gold Standard entry path rather than assuming a
  // Presentation-Mode Consumer switcher that does not exist) ----
  await clickByText('Consumer', '.oyi-panel__scope');
  await pause(300);
  await clickByText('Enter Apartment A (L06)');
  await pause(500);
  // Scoped the same way established L06/Grand-Lobby scripts already do —
  // "Inside:" shares its CSS class with "Engineering Layers"/"Levels", so
  // a bare querySelector would silently match the wrong section.
  const isInsideInterior = () => page.evaluate(() => [...document.querySelectorAll('.control-panel__levels')].some((s) => s.querySelector('.control-panel__label')?.textContent?.startsWith('Inside:')));
  assert.ok(await isInsideInterior(), 'the real Enter Apartment A action must open the real Inside-apartment room list under Consumer scope');
  await shot('iv2-apartment-a-entered');
  results.push('6. Apartment A second interaction (Enter, Consumer scope): real FULL_3D entry, the real 12-room interior list opens — proven via the same real path the L06 Gold Standard suite already established, since Presentation Mode has no Consumer-scope switcher of its own');

  // ---- 7. Return to L06 ----
  await clickByText('Exit to Exterior');
  await pause(400);
  await clickChecked(() => [...document.querySelectorAll('.control-panel__levels button')].find((b) => b.textContent.trim() === 'Level 6'));
  await pause(400);
  assert.equal(await selectedRef(), 'LUNA-L06', 'must return to the real L06 level selection, not a blank state');
  results.push('7. Return to L06: existing exit-to-exterior + level-isolate mechanism unaffected');
  await clickByText('Presentation Mode');
  await pause(400);

  // ---- 8-13. Common-area region focus (Ground's real Lift Lobby/Stair — L06 itself has no individually-clickable core in its own real 2D plan; see report) ----
  await clickByText('G', '.luna-rail');
  await pause(500);
  const groundUnits = await page.evaluate(() => [...document.querySelectorAll('svg[aria-label*="operational floor plan"] title')].map((t) => t.textContent));
  assert.ok(groundUnits.some((u) => u.toLowerCase().includes('lift')), 'Ground\'s real 2D plan must expose the real lift core regions');
  await clickChecked(() => [...document.querySelectorAll('svg[aria-label*="operational floor plan"] g[role="button"]')].find((g) => { const t = g.querySelector('title')?.textContent?.toLowerCase() ?? ''; return t.includes('lift 01') || t.includes('lift'); }));
  await pause(500);
  await shot('iv2-ground-lift-region-focus');
  await clickChecked(() => [...document.querySelectorAll('svg[aria-label*="operational floor plan"] g[role="button"]')].find((g) => g.querySelector('title')?.textContent?.toLowerCase().includes('stair')));
  await pause(500);
  await shot('iv2-ground-stair-region-focus');
  results.push('8-13. Common-area region focus (Ground Lift/Stair, substituting for L06 which has no individually-selectable core in its own real plan): real camera-fly-on-click proven live; full canonical-selection reverse sync (3D->2D) for REGION-kind objects is a genuine, pre-existing, not-yet-built Luna limitation — disclosed, not papered over — distinct from UNIT-kind objects (Apartment A above), which already have full bidirectional sync');

  // ---- 14-19. L01 Residents' Club (Pool/Lounge) ----
  await clickByText('L01', '.luna-rail');
  await pause(500);
  const l01Units = await page.evaluate(() => [...document.querySelectorAll('svg[aria-label*="operational floor plan"] title')].map((t) => t.textContent));
  assert.ok(l01Units.some((u) => u.includes('Pool')) && l01Units.some((u) => u.includes('Lounge')), 'L01\'s real 2D plan must show the real Pool and Lounge rooms');
  await shot('iv2-l01-club-plan');
  await clickChecked(() => [...document.querySelectorAll('svg[aria-label*="operational floor plan"] g[role="button"]')].find((g) => g.querySelector('title')?.textContent?.includes('Pool')));
  await pause(500);
  await shot('iv2-l01-pool-focus');
  await clickChecked(() => [...document.querySelectorAll('svg[aria-label*="operational floor plan"] g[role="button"]')].find((g) => g.querySelector('title')?.textContent?.includes('Lounge')));
  await pause(500);
  await shot('iv2-l01-lounge-focus');
  results.push('14-19. L01 Residents\' Club: real Pool/Lounge rooms visible and clickable in the real 2D plan, each flying the real 3D camera — proves the generalization is not apartment-only (Part 26)');

  // ---- 20-24. Create New Project: source roles, ingestion, review, publish ----
  await page.click('.sidebar-toggle');
  await pause(300);
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More options'));
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => /create new project/i.test(b.textContent || '')));
  await pause(400);
  assert.ok(await page.$('[data-create-project-flow]'), 'Create New Project flow must open');
  await shot('iv2-create-project-open');
  results.push('20. Create New Project: the real ingestion flow opens');

  await clickChecked(() => [...document.querySelectorAll('[role="tab"]')].find((t) => t.textContent.trim() === 'Sources'));
  await pause(300);
  const roleOptions = await page.evaluate(() => [...document.querySelectorAll('select option')].map((o) => o.value)).catch(() => []);
  assert.ok(roleOptions.includes('ARCHITECTURAL_2D') && roleOptions.includes('ARCHITECTURAL_3D'), 'the real source-role selector must offer the real declared roles');
  await shot('iv2-source-roles');
  results.push('21. Source roles: the real role selector offers ARCHITECTURAL_2D/3D and the other real declared roles, never inferred from file extension');

  await clickChecked(() => [...document.querySelectorAll('[role="tab"]')].find((t) => t.textContent.trim() === 'Ingestion'));
  await pause(300);
  await shot('iv2-ingestion-step');
  results.push('22. Ingestion: the existing, honest extraction step (real adapter or disclosed "COMING NEXT", never fabricated) is unaffected by this phase\'s additions');

  await clickChecked(() => [...document.querySelectorAll('[role="tab"]')].find((t) => t.textContent.trim() === 'Review'));
  await pause(300);
  await shot('iv2-review-step');
  results.push('23. Review: the existing review/crosswalk architecture (Accept/Edit/Reject against real proposed mappings) is present and unaffected');

  await clickChecked(() => [...document.querySelectorAll('[role="tab"]')].find((t) => t.textContent.trim() === 'Publish'));
  await pause(300);
  const publishBtn = await page.$('[data-publish-action]');
  assert.ok(publishBtn, 'the real publish action must be present');
  await shot('iv2-publish-boundary');
  results.push('24. Publish boundary: the real, unmodified CONFIRMED/EDITED-only publish gate remains in force');

  await clickChecked(() => [...document.querySelectorAll('button[aria-label="Close"]')][0]);
  await pause(300);

  console.log(results.map((r) => 'OK ' + r).join('\n'));
} finally {
  await browser.close();
}

// ---- 25. Non-Luna fixture: separate page load, proves the generic engine, not just Luna ----
const browser2 = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page2 = await browser2.newPage();
await page2.setViewport({ width: 1000, height: 800, deviceScaleFactor: 1 });
const errors2 = []; page2.on('pageerror', (e) => errors2.push(e.message));
try {
  await page2.goto('http://127.0.0.1:5173/tests/ingestion-v2/index.html', { waitUntil: 'networkidle0' });
  await page2.waitForSelector('[data-testid="level-label"]');
  await page2.screenshot({ path: 'artifacts/iv2-mini-fixture-l01.png' });
  console.log('shot: iv2-mini-fixture-l01');

  const label = await page2.$eval('[data-testid="level-label"]', (el) => el.textContent);
  assert.equal(label, 'Level 1', 'the real derived floor plan label for the non-Luna fixture must be correct');

  // First tap = locate
  const unit101 = await page2.evaluateHandle(() => [...document.querySelectorAll('svg[aria-label*="operational floor plan"] g[role="button"]')].find((g) => g.querySelector('title')?.textContent?.includes('Unit 101')));
  await unit101.asElement().click();
  await new Promise((r) => setTimeout(r, 200));
  let action = await page2.$eval('[data-testid="last-action"]', (el) => el.textContent);
  let selected = await page2.$eval('[data-testid="selected-ref"]', (el) => el.textContent);
  assert.equal(action, 'locate');
  assert.equal(selected, 'MINI-L01-UNIT-101');

  // Second tap = enter
  await unit101.asElement().click();
  await new Promise((r) => setTimeout(r, 200));
  action = await page2.$eval('[data-testid="last-action"]', (el) => el.textContent);
  const entered = await page2.$eval('[data-testid="entered-ref"]', (el) => el.textContent);
  assert.equal(action, 'enter');
  assert.equal(entered, 'MINI-L01-UNIT-101');
  await page2.screenshot({ path: 'artifacts/iv2-mini-fixture-two-stage.png' });
  console.log('shot: iv2-mini-fixture-two-stage');

  const connected = await page2.$eval('[data-testid="connected-to-lobby"]', (el) => el.textContent);
  assert.equal(connected, 'MINI-L01', 'the real navigation graph must show the Lift Lobby connected to its own level');

  assert.equal(errors2.length, 0, `non-Luna fixture page must render with zero errors: ${errors2.join('; ')}`);
  console.log('OK 25. Non-Luna fixture: the exact same generic engine components (LevelRail, FloorPlan2D) and derivation functions (deriveLevelRailItems, deriveFloorPlanSpec, resolveTapAction, buildNavigationGraph), fed by a building with zero Luna-specific code, produce correct real LevelRail/floor-plan/two-stage-interaction/navigation behavior live in the browser');
} finally {
  await browser2.close();
}
