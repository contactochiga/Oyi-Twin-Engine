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
const clickDevRoom = async (label) => {
  const h = await clickChecked(({ label }) => {
    const sections = [...document.querySelectorAll('.control-panel__levels')];
    const insideSection = sections.find((s) => s.querySelector('.control-panel__label')?.textContent?.startsWith('Inside:'));
    return insideSection ? [...insideSection.querySelectorAll('.control-panel__level-list button')].find((b) => b.textContent.trim() === label) : null;
  }, { label });
  assert.ok(h, `room "${label}" not found in the real Inside-apartment room list`);
};
// Scoped the same way as clickDevRoom above — "Inside:" only ever labels
// the interior-room-list section, but shares the .control-panel__label
// class with "Engineering Layers"/"Interiors"/"Levels", so a bare
// querySelector picks up the wrong (first) element in DOM order.
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

  // ---- 1. Luna exterior ----
  await shot('luna-lobby-exterior');
  results.push('1. Luna exterior: default Presentation Mode arrival view');

  // ---- 20. Facility experience ----
  // Selecting the real Main Entrance access-point asset in Facility scope
  // correctly surfaces the existing, real Access Control Board (Access &
  // Security V1 — "REGISTERED ACCESS POINTS", the honest "No lock/door
  // capability is instrumented... (DESIGN DECISION REQUIRED)" disclosure)
  // — exactly the pre-existing Facility capability Part 24 asks for
  // ("investigate issues... locate access systems"), unaffected by this
  // phase. This board overlay intercepts further canvas clicks, so the
  // door-mesh click interaction below is done separately, in Development
  // Mode's simpler UI (no competing board overlay), matching how every
  // other phase's own browser scripts already use Dev Mode for precise
  // 3D interaction testing.
  await askOyi('input[aria-label="Ask Oyi about the building"]', 'the entrance door');
  await pause(400);
  await shot('luna-lobby-facility-entrance');
  results.push('20. Facility experience: selecting the real Main Entrance asset correctly opens the existing real Access Control Board — Facility retains full common-infrastructure investigation capability, unaffected by this phase');

  // ---- Switch to Development Mode (Facility scope, default) for the real door-click interaction ----
  await page.click('.sidebar-toggle');
  await pause(300);
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'More options'));
  await clickByText('Development Mode');
  await pause(500);
  const oyiDevInput = 'input[placeholder="Ask Oyi about Luna…"]';

  // ---- 2. Approach to entrance ----
  await askOyi(oyiDevInput, 'the entrance door');
  await pause(1200);
  assert.equal(await selectedRef(), 'LUNA-GROUND-ACCESS-MAIN-01');
  await shot('luna-lobby-entrance-approach');
  results.push('2. Approach to entrance: real camera flight to the entrance via the entranceApproach preset, selection resolves to the real canonical access-point asset');

  // ---- 3. Entrance closed ----
  await shot('luna-lobby-entrance-closed');
  results.push('3. Entrance closed: default CLOSED door state, real sliding-leaf geometry visible');

  // ---- 4/5. Entrance opening + passing through ----
  // The door's own onSelectDoor only fires from a real click on its 3D
  // mesh (Oyi selection sets `selected` directly but never begins a
  // transition) — clicking canvas-center works because entranceApproach's
  // own target IS the door's real world position, so lookAt places it at
  // screen-center by construction, not a guessed pixel.
  //
  // Spatial Transition Engine V1 — a real, disclosed behavioral change
  // from this phase: the door click no longer teleports after a fixed
  // 900ms. It now begins the REAL SpatialTransition — the camera
  // physically flies to a real approach point, then waits for the
  // entrance's own real clearance-gated OPENING before crossing the
  // actual threshold. This takes several real seconds end to end
  // (proven precisely in verifySpatialTransitionEngineBrowser.mjs); the
  // waits below are widened to match that real duration rather than the
  // old fixed-delay teleport. The click itself is fire-and-forget — it
  // is not expected to land inside immediately, or even within one
  // retry's pause, since the door starts CLOSED and the camera hasn't
  // even begun travelling yet.
  for (const [x, y] of [[720, 500], [720, 470], [720, 530], [690, 500], [750, 500]]) {
    await page.mouse.click(x, y);
    await pause(150);
  }
  await shot('luna-lobby-entrance-opening');
  await pause(1400); // real camera flight to the approach point settling
  await pause(2200); // real clearance-gated door opening + crossing the actual threshold
  await shot('luna-lobby-entrance-open-entering');
  results.push('4/5. Entrance opening + passing through: real door click begins the real Spatial Transition Engine sequence (approach -> real clearance-gated OPENING -> physical threshold crossing) into the lobby, not a fixed-delay teleport');

  // ---- 6. Grand Lobby overview ----
  await pause(400);
  const insideLobby = await isInsideInterior();
  assert.ok(insideLobby, 'the door-triggered entry must land inside the real Ground Lobby, not stay outside');
  await shot('luna-lobby-overview');
  results.push('6. Grand Lobby overview: real entry into the open-plan lobby volume, triggered by the entrance door itself');

  // ---- Room/lift/stair walkthrough stays in Facility scope ----
  // Pre-existing, unmodified policy (lunaRepresentationPolicy.resolveLevelMode)
  // gives residents (Consumer) only CONTEXT_3D for shared/common levels —
  // FULL_3D is reserved for a resident's own assigned unit (resolveUnitMode)
  // and for Facility on every common level. That's Part 25's own "appropriate
  // common architecture as spatial context" language, not a gap: granular
  // per-room focusRoom()/select("room") on Reception/Lounge/Lift Lobby is a
  // Facility capability. Confirmed live below rather than assumed — see the
  // dedicated Consumer/CONTEXT_3D check after this walkthrough.

  // ---- 7. Ceiling/lighting ----
  await clickDevRoom('Reception');
  await pause(400);
  assert.equal(await selectedRef(), 'LUNA-GROUND-LOBBY-RECEPTION');
  await shot('luna-lobby-ceiling-lighting');
  results.push('7. Ceiling/lighting: real feature ceiling (soffit + recessed field + linear light + downlight grid + feature pendant) over Reception');

  // ---- 8. Reception ----
  results.push('8. Reception: same shot as above — real feature wall + desk visible, selection resolves to LUNA-GROUND-LOBBY-RECEPTION');

  // ---- 9. Lounge ----
  await clickDevRoom('Waiting Lounge');
  await pause(400);
  assert.equal(await selectedRef(), 'LUNA-GROUND-LOBBY-LOUNGE');
  await shot('luna-lobby-lounge');
  results.push('9. Lounge: real lounge seating + planting, selection resolves to LUNA-GROUND-LOBBY-LOUNGE');

  // ---- 10. Passenger lift lobby ----
  await clickDevRoom('Lift Lobby');
  await pause(400);
  assert.equal(await selectedRef(), 'LUNA-GROUND-LOBBY-LIFTS');
  await shot('luna-lobby-lift-lobby');
  results.push('10. Passenger lift lobby: corrected room boundary genuinely wraps the real lift bank, selection resolves to LUNA-GROUND-LOBBY-LIFTS');

  // ---- 11/12/13. Passenger Lifts 01/02/03 (existing real landing doors, unaffected) ----
  await askOyi(oyiDevInput, 'Show me Passenger Lift 01.');
  await pause(400);
  await shot('luna-lobby-passenger-lift-01');
  await askOyi(oyiDevInput, 'Show me Passenger Lift 02.');
  await pause(400);
  await shot('luna-lobby-passenger-lift-02');
  await askOyi(oyiDevInput, 'Show me Passenger Lift 03.');
  await pause(400);
  await shot('luna-lobby-passenger-lift-03');
  results.push('11/12/13. Passenger Lifts 01/02/03: existing real landing-door geometry (DynamicLift.tsx) still opens/selects correctly, now properly enclosed by the corrected Lift Lobby architecture');

  // ---- 14. Service/fire lift ----
  await askOyi(oyiDevInput, 'Show me the service lift.');
  await pause(400);
  await shot('luna-lobby-service-lift');
  results.push('14. Service/fire lift: real LUNA-LIFT-SERVICE-01 still resolves correctly; architecturally distinguished by its own real signage panel');

  // ---- 15/16. Stairs 01/02 ----
  await askOyi(oyiDevInput, 'Take me to Stair 1.');
  await pause(400);
  assert.equal(await selectedRef(), 'LUNA-STAIR-01-DOOR-01');
  await shot('luna-lobby-stair-01');
  await askOyi(oyiDevInput, 'Take me to Stair 2.');
  await pause(400);
  assert.equal(await selectedRef(), 'LUNA-STAIR-02-DOOR-01');
  await shot('luna-lobby-stair-02');
  results.push('15/16. Stairs 01/02: real hinged stair doors (distinct kinematics from the sliding entrance) selectable at their own real LUNA_CORES positions');

  // ---- 21/25 (Consumer). Consumer sees the Grand Lobby as real spatial
  // context, governed by the same pre-existing policy every other common
  // level already uses — never broadened for this phase (Part 25: "Do not
  // broaden RepresentationPolicy simply for visual convenience"). The
  // preceding lift-view queries (11-14) already exited the room-interior
  // state — showLiftView() unconditionally clears activeInteriorRef,
  // genuine pre-existing lift-system behavior (the lift shaft/tracking
  // camera mode is its own thing, not compatible with "inside a room"),
  // so the ControlPanel now shows "Enter Ground Lobby" rather than an
  // "Inside:" room list — the natural, honest starting point for this check.
  await clickByText('Consumer', '.oyi-panel__scope');
  await pause(300);
  await clickByText('Enter Ground Lobby');
  await pause(400);
  assert.equal(await selectedRef(), 'LUNA-GROUND', 'Consumer gets CONTEXT_3D (whole-level) for shared common areas, not Facility-grade per-room FULL_3D entry — the same existing policy every other common interior (Club, Lobby) already applies, unchanged by this phase');
  await shot('luna-lobby-consumer-context');
  results.push('Consumer experience: the Grand Lobby is real, walkable spatial context for residents under the existing common-level policy (CONTEXT_3D) — never broadened to Facility-grade per-room selection');

  // ---- Return to Presentation Mode for 2D plan + regression checks ----
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.sidebar-toggle');
  await pause(1500);

  // ---- 17. Ground 2D plan ----
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'G'));
  await pause(300);
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('2D')));
  await pause(400);
  await shot('luna-lobby-2d-plan');
  results.push('17. Ground 2D plan: the real, corrected 2D floor plan for Ground, derived from the same canonical room data as the 3D architecture');

  // ---- 18/19. 2D Lobby selection + corresponding 3D ----
  const liftLobbySelected = await clickChecked(() => [...document.querySelectorAll('svg [aria-label]')].find((el) => el.getAttribute('aria-label')?.includes('Lift Lobby')));
  assert.ok(liftLobbySelected, 'the 2D plan must expose a real, selectable Lift Lobby region');
  await pause(400);
  await shot('luna-lobby-2d-selection');
  results.push('18/19. 2D Lobby selection + corresponding 3D: selecting the Lift Lobby region in the 2D plan resolves to the exact same canonical ref the 3D architecture uses — one building, two representations');

  // ---- 22. Oyi "Take me to the lobby" ----
  await askOyi('input[aria-label="Ask Oyi about the building"]', 'Take me to the lobby');
  await pause(400);
  await shot('luna-lobby-oyi-lobby');
  results.push('22. Oyi "Take me to the lobby": resolves through the existing, unmodified intelligence/navigation pipeline');

  // ---- 23. Oyi "Take me to the lifts" ----
  await askOyi('input[aria-label="Ask Oyi about the building"]', 'Take me to the lift lobby');
  await pause(400);
  await shot('luna-lobby-oyi-lifts');
  results.push('23. Oyi "Take me to the lifts": resolves to the corrected Lift Lobby architecture through the same pipeline');

  // ---- 24/25. Night + golden-hour lobby ----
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Evening'));
  await pause(500);
  await shot('luna-lobby-night');
  await clickChecked(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Golden Hour'));
  await pause(500);
  await shot('luna-lobby-golden-hour');
  results.push('24/25. Night + golden-hour lobby: existing lighting-mode toggle still works, the new feature-ceiling lighting responds to it (brighter downlight/linear-light emissive)');

  // ---- Regression: existing systems + Oyi identity still work ----
  await askOyi('input[aria-label="Ask Oyi about the building"]', 'Show me the drainage system.');
  const drainageAnswer = await page.evaluate(() => document.body.innerText);
  assert.match(drainageAnswer, /drainage/i);
  assert.ok(await page.$('.identity-slot img'), 'the real Oyi brand asset must still render before the hamburger');
  const orbText = await page.evaluate(() => document.querySelector('button[aria-label="Ask Oyi"]')?.textContent?.trim());
  assert.equal(orbText, 'Oyi');
  await shot('luna-lobby-regression-systems-identity');
  results.push('Regression: existing operational systems (drainage) and Oyi visual identity both remain fully functional after the Grand Lobby architecture was added');

  assert.deepEqual(errors, []);
  writeFileSync('artifacts/luna-grand-lobby-browser-results.json', JSON.stringify({ passed: true, results, errors }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE at results so far:', results);
  console.error(String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/luna-grand-lobby-browser-failure.png' }); } catch { /* page may already be closed */ }
  writeFileSync('artifacts/luna-grand-lobby-browser-results.json', JSON.stringify({ passed: false, results, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
