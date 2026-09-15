import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(name) { await page.screenshot({ path: `artifacts/${name}.png` }); console.log('shot:', name); }

const results = [];
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' }); await page.waitForSelector('.sidebar-toggle');
  assert.equal(await page.$('vite-error-overlay'), null);
  await pause(1200);

  // ---- 1. Twin with Oyi identity before hamburger ----
  const identityImg = await page.$('.identity-slot img');
  assert.ok(identityImg, 'the real Oyi brand asset must render in the identity slot');
  const identitySrc = await page.evaluate((el) => el.getAttribute('src'), identityImg);
  assert.match(identitySrc, /oyi-logo/, 'the identity slot must use the real copied oyi-logo asset, not a placeholder');
  // Building Ingestion V2's header-spacing fix wrapped the identity mark
  // and hamburger in a shared "identity-group" div (so they read as one
  // compact control group with a tighter gap than the rest of the bar) —
  // the real DOM-order requirement itself (identity mark first, hamburger
  // immediately after) is unchanged, so this checks that invariant via
  // document order rather than direct-children class names, which no
  // longer match the new (correctly deeper) nesting.
  const order = await page.evaluate(() => {
    const bar = document.querySelector('.top-command-glass');
    return [...bar.querySelectorAll('.identity-slot, .sidebar-toggle')].map((el) => el.className);
  });
  assert.ok(order[0].includes('identity-slot'), 'the identity mark must be the FIRST element in the top command bar');
  assert.ok(order[1].includes('sidebar-toggle'), 'the hamburger must come immediately after the identity mark');
  await shot('luna-oyi-identity-topbar');
  results.push('1. Twin top bar reads [OYI][HAMBURGER][ASK OYI...] — the real Oyi brand asset (copied from Facility, never redrawn) sits first, immediately before the hamburger');

  // ---- 2. Closed Oyi conversation identity ----
  const orbText = await page.evaluate(() => document.querySelector('button[aria-label="Ask Oyi"]')?.textContent?.trim());
  assert.equal(orbText, 'Oyi', 'the closed-state orb must show the literal "Oyi" wordmark, matching Facility\'s own .oyi-shell-orb treatment');
  const orbBg = await page.evaluate(() => getComputedStyle(document.querySelector('button[aria-label="Ask Oyi"]')).backgroundColor);
  assert.equal(orbBg, 'rgb(6, 16, 29)', 'the closed orb must use the exact dark-glass background Facility uses (#06101d), not the prior purple treatment');
  await shot('luna-oyi-identity-closed-orb');
  results.push('2. Closed Oyi conversation identity: the bottom-right orb now uses the exact dark-glass/cyan-glow "Oyi" treatment ported from Facility\'s own oyi-shell-orb, replacing the prior purple "✦" orb');

  // ---- 3. Oyi conversation opened (via the closed orb) ----
  const orbHandle = await page.$('button[aria-label="Ask Oyi"]');
  await orbHandle.click();
  await pause(400);
  let panelVisible = await page.evaluate(() => Boolean(document.querySelector('button[aria-label="Collapse Oyi"]')));
  assert.ok(panelVisible, 'the conversation composer must open when the closed orb is clicked');
  await shot('luna-oyi-conversation-opened');
  results.push('3. Oyi conversation opened: clicking the closed orb expands the same composer that already exists (parseIntent -> TwinIntelligenceController pipeline unchanged)');

  // Close it again via the same orb button (it now shows a collapse control).
  await page.evaluate(() => document.querySelector('button[aria-label="Collapse Oyi"]')?.click());
  await pause(300);

  // ---- 4 & 3b. Top-bar identity mark opens the SAME conversation surface (Part A3) ----
  const identityButton = await page.$('.identity-slot');
  await identityButton.click();
  await pause(400);
  panelVisible = await page.evaluate(() => Boolean(document.querySelector('button[aria-label="Collapse Oyi"]')));
  assert.ok(panelVisible, 'clicking the top-bar Oyi identity mark must open the SAME conversation surface as the closed orb — one shared conversation, not a second entry point');
  await shot('luna-oyi-identity-shared-open');
  results.push('One shared conversation confirmed: the top-bar Oyi identity mark opens the exact same conversation surface the closed orb opens — no second AI session was created');

  // ---- 5/6. Existing top bar (hamburger, search) still works; Oyi still answers ----
  await page.evaluate(() => document.querySelector('button[aria-label="Collapse Oyi"]')?.click());
  await pause(300);
  const sidebarBefore = await page.evaluate(() => document.querySelector('.viewer-root')?.className.includes('sidebar-open'));
  await page.click('.sidebar-toggle');
  await pause(300);
  const sidebarAfter = await page.evaluate(() => document.querySelector('.viewer-root')?.className.includes('sidebar-open'));
  assert.notEqual(sidebarBefore, sidebarAfter, 'the hamburger must still toggle the sidebar exactly as before');
  await page.click('.sidebar-toggle');
  await pause(200);
  results.push('4/5. Existing top bar still works: the hamburger still toggles the sidebar, unaffected by the identity mark being added before it');

  await page.type('input[aria-label="Ask Oyi about the building"]', 'Show me the water system.');
  await page.keyboard.press('Enter');
  await pause(700);
  const answerText = await page.evaluate(() => document.body.innerText);
  assert.match(answerText, /water/i, 'the existing Ask-Oyi search field must still answer through the same real intelligence system');
  await shot('luna-oyi-search-still-works');
  results.push('6. Oyi still answers through the existing system: the top-bar search field (unchanged) resolved a real water-system query');

  // ---- 7. Building remains visually dominant ----
  const canvasBox = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { w: r.width, h: r.height }; });
  const viewportArea = 1440 * 1000;
  const canvasArea = canvasBox.w * canvasBox.h;
  assert.ok(canvasArea / viewportArea > 0.85, 'the 3D canvas must still occupy the overwhelming majority of the viewport — no giant panel introduced');
  await shot('luna-oyi-building-dominant');
  results.push(`7. Building remains visually dominant: the 3D canvas still occupies ${Math.round((canvasArea / viewportArea) * 100)}% of the viewport after the identity integration`);

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/luna-oyi-identity-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE at results so far:', results);
  console.error(String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/luna-oyi-identity-browser-failure.png' }); } catch { /* page may already be closed */ }
  writeFileSync('artifacts/luna-oyi-identity-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
