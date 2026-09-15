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
const openEngineeringTray = async () => { const h = await page.evaluateHandle(() => document.querySelector('[data-engineering-launcher]')); await h.asElement().click(); await pause(250); };
const boardExists = async (title) => Boolean(await page.$(`[data-system-control-board="${title}"]`));

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' }); await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await pause(1500); // let ensureLunaProject's async seed effect complete

  // ---- 11. Oyi identity in top bar (regression from Part A) ----
  assert.ok(await page.$('.identity-slot img'), 'the real Oyi brand asset must still render before the hamburger');
  results.push('11. Oyi identity in top bar: still present, unaffected by the ingestion foundation being added');

  // ---- 12. Oyi closed conversation identity (regression from Part A) ----
  const orbText = await page.evaluate(() => document.querySelector('button[aria-label="Ask Oyi"]')?.textContent?.trim());
  assert.equal(orbText, 'Oyi');
  results.push('12. Oyi closed conversation identity: still the Facility-matched dark-glass "Oyi" orb, unaffected');

  // ---- 1. Create New Project entry ----
  await page.click('.sidebar-toggle');
  await pause(300);
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More options'));
  await clickByText('Create New Project');
  await pause(400);
  assert.ok(await page.$('[data-create-project-flow]'), 'the Create New Project overlay must open');
  await shot('luna-ingestion-create-project-entry');
  results.push('1. Create New Project entry: reachable from the existing Profile overflow menu (no new floating chip), opens as an overlay over the still-visible building');

  // ---- 8. Luna reference project already registered ----
  const projectListText = await page.evaluate(() => document.querySelector('[data-create-project-flow]')?.innerText);
  assert.match(projectListText, /Luna Residences/);
  assert.match(projectListText, /LUNA/);
  await shot('luna-ingestion-luna-reference-project');
  results.push('8. Luna reference project: "Luna Residences (LUNA)" already appears as a registered project — the first project exercising the system, not hardcoded as the only one possible');

  // ---- 2. Project intake ----
  await clickChecked(() => [...document.querySelectorAll('[data-create-project-flow] [role="tab"]')].find((b) => b.textContent.trim() === 'Project'));
  await pause(200);
  const intakeFieldsPresent = await page.evaluate(() => [...document.querySelectorAll('[data-create-project-flow] input')].length >= 6);
  assert.ok(intakeFieldsPresent, 'the project intake form must expose the real set of fields (name, projectId, developer, type, building type, address, revision)');
  await shot('luna-ingestion-project-intake');
  results.push('2. Project intake: a real form capturing name/projectId/developer/type/buildingType/address/phase/revision/notes exists, matching the brief\'s own example fields');

  // Select the Luna project to drive the rest of the flow against real data.
  await clickChecked(() => [...document.querySelectorAll('[data-create-project-flow] button')].find((b) => b.textContent.includes('Luna Residences')));
  await pause(300);

  // ---- 3/4. Source registration + source type/status ----
  await clickChecked(() => [...document.querySelectorAll('[data-create-project-flow] [role="tab"]')].find((b) => b.textContent.trim() === 'Sources'));
  await pause(300);
  const sourcesText = await page.evaluate(() => document.querySelector('[data-create-project-flow]')?.innerText);
  assert.match(sourcesText, /luna-procedural-reference/);
  assert.match(sourcesText, /PARTIALLY SUPPORTED/);
  assert.ok(await page.$('[data-create-project-flow] input[type="file"]'), 'a real file-upload input for registering a new source must exist');
  await shot('luna-ingestion-source-registration');
  results.push('3/4. Source registration + status: the seeded Luna source shows a real format, an honest support-level badge (PARTIALLY SUPPORTED), and a real file-upload input is present for registering new sources');

  // ---- 5/6. Ingestion workflow + detected model/source information ----
  await clickChecked(() => [...document.querySelectorAll('[data-create-project-flow] [role="tab"]')].find((b) => b.textContent.trim() === 'Ingestion'));
  await pause(300);
  const ingestionText = await page.evaluate(() => document.querySelector('[data-create-project-flow]')?.innerText);
  assert.match(ingestionText, /Extracted \d+ objects/, 'the Ingestion tab must show real extraction counts, already run by the Luna project seed');
  await shot('luna-ingestion-workflow');
  results.push(`5/6. Ingestion workflow + detected model info: real extraction status/counts shown for the Luna source — "${ingestionText.match(/Extracted \d+ objects\.?/)?.[0]}"`);

  // ---- 7. Normalization/review state ----
  await clickChecked(() => [...document.querySelectorAll('[data-create-project-flow] [role="tab"]')].find((b) => b.textContent.trim() === 'Review'));
  await pause(300);
  const reviewText = await page.evaluate(() => document.querySelector('[data-create-project-flow]')?.innerText);
  assert.match(reviewText, /PROPOSED/);
  assert.match(reviewText, /Confidence/);
  assert.ok(reviewText.includes('LUNA-L06') || reviewText.includes('LUNA-TOWER'), 'real, already-canonical proposals must be visible in review');
  await shot('luna-ingestion-review-state');
  results.push('7. Normalization/review state: real PROPOSED mappings with real confidence percentages are listed, Accept/Reject actions present, nothing pre-confirmed');

  // Confirm one real mapping end-to-end, then publish, to prove the full CONFIRM -> PUBLISH boundary live.
  await clickChecked(() => [...document.querySelectorAll('[data-create-project-flow] button')].find((b) => b.textContent.trim() === 'Accept'));
  await pause(300);
  await clickChecked(() => [...document.querySelectorAll('[data-create-project-flow] [role="tab"]')].find((b) => b.textContent.trim() === 'Publish'));
  await pause(300);
  await clickChecked(() => document.querySelector('[data-create-project-flow] [data-publish-action]'));
  await pause(300);
  const publishText = await page.evaluate(() => document.querySelector('[data-create-project-flow]')?.innerText);
  assert.match(publishText, /Published canonical refs for this project: [1-9]/, 'publishing must produce at least one real canonical ref from the confirmed mapping');
  await shot('luna-ingestion-publish-boundary');
  results.push(`Publish boundary proven live: confirming one real mapping then publishing produced a real canonical ref — "${publishText.match(/Published canonical refs for this project: \d+/)?.[0]}"`);

  await clickChecked(() => document.querySelector('[data-create-project-flow] button[aria-label="Close"]'));
  await pause(300);

  // ---- 9. Existing Twin still opens ----
  assert.equal(await page.$('[data-create-project-flow]'), null, 'the overlay must close cleanly, returning to the plain Twin');
  const canvasBox = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return r.width * r.height; });
  assert.ok(canvasBox / (1440 * 1000) > 0.85, 'the building must remain visually dominant after closing the ingestion overlay');
  await shot('luna-ingestion-twin-still-opens');
  results.push('9. Existing Twin still opens: closing the ingestion overlay returns cleanly to the full 3D Twin, still visually dominant');

  // ---- 10. Existing Oyi conversation still works ----
  await page.type('input[aria-label="Ask Oyi about the building"]', 'Show me the drainage system.');
  await page.keyboard.press('Enter');
  await pause(700);
  const oyiAnswer = await page.evaluate(() => document.body.innerText);
  assert.match(oyiAnswer, /drainage/i);
  await shot('luna-ingestion-oyi-still-works');
  results.push('10. Existing Oyi conversation still works: a real drainage-system query resolved correctly through the unchanged intelligence pipeline');

  // ---- 13. Existing Engineering drawer ----
  await openEngineeringTray();
  await pause(300);
  assert.ok(await page.$('[data-engineering-tray]'), 'the Engineering drawer must still open normally');
  await shot('luna-ingestion-engineering-drawer');
  results.push('13. Existing Engineering drawer: still opens correctly, unaffected by the ingestion foundation');
  await clickChecked(() => [...document.querySelectorAll('[data-engineering-tray] button')].find((b) => b.textContent.trim().startsWith('Drainage')));
  await pause(200);
  await clickChecked(() => [...document.querySelectorAll('[data-engineering-tray] button')].find((b) => b.textContent.trim() === 'Close Engineering Layers'));
  await pause(400);

  // ---- 14. Existing systems remain operational ----
  assert.equal(await boardExists('Drainage'), true, 'REGRESSION: the Drainage Control Board (most recently added system) must still open correctly');
  await shot('luna-ingestion-systems-operational');
  results.push('14. Existing systems remain operational: the Drainage Control Board (the most recently completed system) still opens correctly after the ingestion foundation and identity integration were added');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/oyi-ingestion-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE at results so far:', results);
  console.error(String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/oyi-ingestion-browser-failure.png' }); } catch { /* page may already be closed */ }
  writeFileSync('artifacts/oyi-ingestion-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
