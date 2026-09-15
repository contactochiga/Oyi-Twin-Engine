// Explore Mode movement correction proof: planar walking under pitched camera,
// strafe without rotation, target preservation, and prompt release stop.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const parse = (value) => {
  assert.ok(value, 'missing explore debug vector');
  const [x, y, z] = value.split(',').map(Number);
  return { x, y, z };
};
const pos = async () => parse(await page.evaluate(() => document.documentElement.getAttribute('data-oyi-explore-position')));
const tgt = async () => parse(await page.evaluate(() => document.documentElement.getAttribute('data-oyi-explore-target')));
const vec = (a, b) => ({ x: b.x - a.x, y: b.y - a.y, z: b.z - a.z });
const lenXZ = (v) => Math.hypot(v.x, v.z);
const close = (a, b, tol = 0.03) => Math.abs(a - b) <= tol;
async function shot(name) { await page.screenshot({ path: `artifacts/${name}.png`, fullPage: false }); console.log('shot:', name); }
async function activate() {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-explore-activate]');
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'L06')?.click());
  await page.waitForFunction(() => document.body.innerText.includes('Level 6'));
  await page.click('[data-explore-activate]');
  await page.waitForSelector('[data-explore-controller]');
  await page.keyboard.down('KeyW'); await pause(120); await page.keyboard.up('KeyW'); await pause(250);
}
async function dragViewport(dx, dy) {
  await page.mouse.move(920, 430);
  await page.mouse.down();
  await page.mouse.move(920 + dx, 430 + dy, { steps: 12 });
  await page.mouse.up();
  await pause(250);
}
async function holdKey(code, ms = 800) {
  const beforePos = await pos();
  const beforeTarget = await tgt();
  await page.keyboard.down(code);
  await pause(ms);
  await page.keyboard.up(code);
  await pause(220);
  const afterPos = await pos();
  const afterTarget = await tgt();
  return { beforePos, beforeTarget, afterPos, afterTarget, deltaPos: vec(beforePos, afterPos), deltaTarget: vec(beforeTarget, afterTarget), beforeRel: vec(beforePos, beforeTarget), afterRel: vec(afterPos, afterTarget) };
}
function assertPlanarMove(sample, label) {
  assert.ok(close(sample.beforePos.y, sample.afterPos.y, 0.012), `${label}: camera Y drifted ${sample.afterPos.y - sample.beforePos.y}`);
  assert.ok(lenXZ(sample.deltaPos) > 0.05, `${label}: expected horizontal movement`);
  assert.ok(close(sample.deltaTarget.x, sample.deltaPos.x, 0.04), `${label}: target X did not translate with camera`);
  assert.ok(close(sample.deltaTarget.z, sample.deltaPos.z, 0.04), `${label}: target Z did not translate with camera`);
  assert.ok(close(sample.beforeRel.x, sample.afterRel.x, 0.045), `${label}: camera-target relative X changed`);
  assert.ok(close(sample.beforeRel.y, sample.afterRel.y, 0.045), `${label}: camera-target relative Y changed`);
  assert.ok(close(sample.beforeRel.z, sample.afterRel.z, 0.045), `${label}: camera-target relative Z changed`);
}

const results = [];
try {
  await activate();
  await shot('explore-planar-01-active');

  await dragViewport(0, -260);
  const upward = await holdKey('KeyW');
  assertPlanarMove(upward, 'upward pitch forward');
  await shot('explore-planar-02-upward-forward');
  results.push(`Upward pitch forward: startY=${upward.beforePos.y.toFixed(3)} endY=${upward.afterPos.y.toFixed(3)} deltaY=${(upward.afterPos.y - upward.beforePos.y).toFixed(4)}`);

  await dragViewport(0, 420);
  const downward = await holdKey('KeyW');
  assertPlanarMove(downward, 'downward pitch forward');
  await shot('explore-planar-03-downward-forward');
  results.push(`Downward pitch forward: startY=${downward.beforePos.y.toFixed(3)} endY=${downward.afterPos.y.toFixed(3)} deltaY=${(downward.afterPos.y - downward.beforePos.y).toFixed(4)}`);

  const beforeHeadingTarget = await tgt();
  const beforeHeadingPos = await pos();
  const beforeHeading = vec(beforeHeadingPos, beforeHeadingTarget);
  const left = await holdKey('KeyA');
  assertPlanarMove(left, 'left strafe');
  const afterLeftHeading = vec(await pos(), await tgt());
  assert.ok(close(beforeHeading.x, afterLeftHeading.x, 0.06) && close(beforeHeading.z, afterLeftHeading.z, 0.06), 'left strafe must not rotate heading');
  await shot('explore-planar-04-left-strafe');
  results.push(`Left strafe: startY=${left.beforePos.y.toFixed(3)} endY=${left.afterPos.y.toFixed(3)} deltaY=${(left.afterPos.y - left.beforePos.y).toFixed(4)}`);

  const beforeRightHeading = vec(await pos(), await tgt());
  const right = await holdKey('KeyD');
  assertPlanarMove(right, 'right strafe');
  const afterRightHeading = vec(await pos(), await tgt());
  assert.ok(close(beforeRightHeading.x, afterRightHeading.x, 0.06) && close(beforeRightHeading.z, afterRightHeading.z, 0.06), 'right strafe must not rotate heading');
  await shot('explore-planar-05-right-strafe');
  results.push(`Right strafe: startY=${right.beforePos.y.toFixed(3)} endY=${right.afterPos.y.toFixed(3)} deltaY=${(right.afterPos.y - right.beforePos.y).toFixed(4)}`);

  const back = await holdKey('KeyS');
  assertPlanarMove(back, 'backward');
  await shot('explore-planar-06-backward');
  results.push(`Backward: startY=${back.beforePos.y.toFixed(3)} endY=${back.afterPos.y.toFixed(3)} deltaY=${(back.afterPos.y - back.beforePos.y).toFixed(4)}`);

  const beforeRelease = await pos();
  await pause(650);
  const afterRelease = await pos();
  assert.ok(lenXZ(vec(beforeRelease, afterRelease)) < 0.08, `release should stop promptly; drift=${lenXZ(vec(beforeRelease, afterRelease))}`);
  results.push('Release: residual movement damps promptly after keyup.');

  await page.click('[data-explore-exit]');
  await pause(250);
  assert.equal(await page.$('[data-explore-controller]'), null, 'Exit still closes Explore after planar movement pass');
  assert.deepEqual(errors, []);
  writeFileSync('artifacts/explore-planar-movement-results.json', JSON.stringify({ passed: true, results }, null, 2));
  console.log(results.join('\n'));
} catch (error) {
  console.error('FAILURE:', String(error?.stack || error));
  try { await page.screenshot({ path: 'artifacts/explore-planar-movement-failure.png', fullPage: false }); } catch {}
  writeFileSync('artifacts/explore-planar-movement-results.json', JSON.stringify({ passed: false, results, errors, error: String(error?.stack || error) }, null, 2));
  throw error;
} finally {
  await browser.close();
}
