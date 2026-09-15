// Deterministic Explore Mode V1 checks for the source-level contracts that keep
// manual movement generic and bound to Luna canonical semantics. Browser proof
// covers runtime pointer/keyboard/camera behavior.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const checks = [];
const input = readFileSync('src/engine/spatial/exploreInput.ts', 'utf8');
for (const action of ['MOVE_FORWARD', 'MOVE_BACKWARD', 'MOVE_LEFT', 'MOVE_RIGHT', 'LOOK', 'INTERACT', 'EXIT']) {
  assert.ok(input.includes(`"${action}"`), `ExploreInput action ${action} missing`);
}
assert.ok(input.includes('movementWithAction'), 'shared movement reducer missing');
assert.ok(input.includes('hasExploreMovement'), 'movement predicate missing');
checks.push('ExploreInput: one generic movement/action contract exists for pointer and keyboard input.');

const controller = readFileSync('src/engine/components/spatial/ExploreController.tsx', 'utf8');
assert.ok(controller.includes('data-explore-action={button.action}'), 'directional buttons must expose shared action ids');
assert.ok(controller.includes('onPointerDown={holdStart(button.action)}'), 'movement must start on pointer hold');
assert.ok(controller.includes('onPointerUp={holdEnd(button.action)}'), 'movement must stop on pointer release');
assert.ok(controller.includes('onPointerCancel={holdEnd(button.action)}'), 'movement must stop on pointer cancel');
assert.ok(controller.includes('data-explore-action="INTERACT"'), 'center Interact action missing');
assert.ok(controller.includes('data-explore-oyi'), 'OYI shortcut missing');
assert.ok(controller.includes('data-explore-exit'), 'Exit Explore control missing');
checks.push('Controller: circular UI routes all button input through the shared action callbacks and clears holds on cancel/release.');

const driver = readFileSync('src/engine/components/ExploreCameraDriver.tsx', 'utf8');
assert.ok(driver.includes('controlsRef'), 'Explore driver must use the existing CameraRig/OrbitControls ref');
assert.ok(driver.includes('camera.getWorldDirection'), 'movement should derive from current camera direction');
assert.ok(driver.includes('forward.y = 0'), 'movement must flatten camera pitch into planar yaw-only travel');
assert.ok(driver.includes('new THREE.Vector3().crossVectors(forward, WORLD_UP)'), 'strafe vector must derive from horizontal right, not rotate the camera');
assert.ok(driver.includes('walkPlaneY'), 'Explore movement must preserve a stable walking Y plane');
assert.ok(driver.includes('velocity'), 'Explore movement must use damped velocity rather than harsh per-tap jumps');
assert.ok(driver.includes('onMoveSample(sample)'), 'movement must report world position back to the existing spatial state');
assert.ok(driver.includes('raycaster.current.setFromCamera'), 'targeting must use center-screen camera raycasting');
assert.ok(driver.includes('canonicalRefFor'), 'targeting must resolve canonical refs from picked objects');
checks.push('Camera driver: movement uses planar yaw-only vectors, stable walk-plane Y, damped velocity, world-position samples, and canonical ray targets.');

const awareness = readFileSync('src/luna/explore/lunaExploreAwareness.ts', 'utf8');
assert.ok(awareness.includes('buildLunaReferenceModel'), 'Explore awareness must use the canonical Luna spatial model');
assert.ok(awareness.includes('allSpatialObjects'), 'Explore awareness must resolve against canonical spatial objects');
assert.ok(awareness.includes('lunaTwinDataProvider.getAsset'), 'target descriptors must use existing operational asset provider');
assert.ok(awareness.includes('findSpace'), 'target descriptors must use existing space lookup');
checks.push('Awareness: currentSpace and target descriptors derive from canonical Luna model/provider/lookup, not a parallel coordinate system.');

const app = readFileSync('src/App.tsx', 'utf8');
assert.ok(app.includes('if (!exploreMode) return;'), 'keyboard capture must be gated behind Explore mode');
assert.ok(app.includes('Escape'), 'Escape exit binding missing');
assert.ok(app.includes('handleExploreInteract'), 'app-level canonical interact handler missing');
assert.ok(app.includes('routeDriverRef.current?.beginRoute'), 'door interactions must reuse the existing route/transition driver');
assert.ok(app.includes('setOyiConversationOpen(true)'), 'OYI shortcut must reuse existing Oyi surface');
assert.ok(app.includes('followTarget={exploreMode ? undefined : followTarget}'), 'vertical lift/follow transitions must remain outside normal Explore walking mode');
checks.push('App integration: keyboard capture is Explore-only, Interact reuses app canonical routing/selection, and OYI reuses the existing surface.');

console.log(checks.join('\n'));
