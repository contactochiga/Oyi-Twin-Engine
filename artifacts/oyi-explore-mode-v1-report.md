# OYI Explore Mode V1 Report

## Objective

Add a minimal circular manual navigation controller to Luna so the user can manually Explore while the existing Spatial Card, Oyi, route engine, runtime providers, and RepresentationPolicy remain authoritative.

## Files changed

- `src/App.tsx`
- `src/App.css`
- `src/engine/index.ts`
- `src/engine/spatial/exploreInput.ts`
- `src/engine/components/ExploreCameraDriver.tsx`
- `src/engine/components/spatial/ExploreController.tsx`
- `src/luna/explore/lunaExploreAwareness.ts`
- `src/engine/components/CameraRig.tsx`
- `scripts/verifyExploreMode.mjs`
- `scripts/verifyExploreModeBrowser.mjs`
- `package.json`
- `docs/OYI_EXPLORE_MODE_V1.md`
- `artifacts/oyi-explore-mode-v1.json`
- `artifacts/oyi-explore-mode-v1-report.md`

## What was preserved

- One Spatial Card / progressive context hierarchy.
- Top Oyi command bar.
- Level Rail.
- TELEPORT and TOUR navigation mode semantics.
- Existing canonical refs, route driver, access resolver, lift runtime, Oyi controller path, and runtime providers.
- RepresentationPolicy byte-for-byte in this phase.
- Apartment A map privacy and Consumer-only private interior behavior.

## Implementation

Explore Mode is an additive input layer. `ExploreController` renders the compact circular glass control in the bottom-right viewport area. It uses circular direction buttons and a center Interact button, plus subordinate OYI and Exit controls. It is hidden until the user clicks the Explore launcher.

`exploreInput.ts` defines the shared action and movement-intent contract. Pointer/touch and keyboard both call the same reducer. Holds continue movement; pointer release/cancel and Exit clear movement.

`ExploreCameraDriver` runs inside the existing Three scene. It uses the existing camera and OrbitControls ref, derives motion from camera yaw only, reports world-position samples to the same app state used by map/live-dot logic, and raycasts from the center of the viewport for canonical targeting. Normal walking is locked to a stable Y plane; left/right strafe instead of rotating; camera and look target translate together by the same applied delta.

`lunaExploreAwareness.ts` maps world positions back to canonical Luna spaces using the existing Luna reference model and resolves target descriptors through the existing space lookup and operational data provider.

`CameraRig` received a narrow cancellation fix: if a flight target is cleared while the rig is still internally marked as flying, it exits flying mode so OrbitControls remounts. This was required for Explore to take over after cancelling an in-progress flight and is a real camera-owner bug fix, not a new camera system.

## Interaction behavior

- Explore launcher opens manual mode.
- Direction buttons and W/A/S/D or arrows drive the same movement intent.
- E/Enter triggers Interact.
- Escape or Exit closes Explore and clears movement.
- OYI opens the existing Oyi orb/conversation surface without adding another search bar.
- Interact uses the current raycast canonical target when present and falls back to the selected canonical object.

## Access, lift, and privacy

Explore does not bypass access. Door interactions route through existing transition bindings and the route driver. Lift interactions reuse existing lift context/view behavior. Apartment A remains governed by the existing access resolver and policy gates.

Facility presentation scope correctly does not expose the private Apartment A interior map/live dot. The existing assigned-Consumer browser tests still prove private map activation after permitted entry/teleport.

## Visual proof

Screenshots captured by `scripts/verifyExploreModeBrowser.mjs`:

- `artifacts/explore-v1-01-inactive.png`
- `artifacts/explore-v1-02-active-controller.png`
- `artifacts/explore-v1-03-after-hold-forward.png`
- `artifacts/explore-v1-04-interact.png`
- `artifacts/explore-v1-05-exited.png`
- `artifacts/explore-planar-01-active.png`
- `artifacts/explore-planar-02-upward-forward.png`
- `artifacts/explore-planar-03-downward-forward.png`
- `artifacts/explore-planar-04-left-strafe.png`
- `artifacts/explore-planar-05-right-strafe.png`
- `artifacts/explore-planar-06-backward.png`

The active screenshot shows a restrained circular glass controller in the bottom-right viewport, separate from the Spatial Card and Level Rail.

## Validation results

GREEN:

- `npx tsc -b --pretty false`
- `npm run lint` — completed with existing warning set plus the intentional Three camera mutation warning in `ExploreCameraDriver`.
- `npm run build`
- `npm run test:representation`
- `npm run test:presentation`
- `npm run test:apt-a-map-policy`
- `npm run test:apt-a-interior`
- `npm run test:apt-a-graph`
- `npm run test:apt-a-oyi-semantics`
- `npm run test:spatial-transition`
- `npm run test:routed-traversal`
- `npm run test:explore`
- `npm run test:explore:browser`
- `npm run test:explore:planar-browser`
- `npm run test:apt-a-map-privacy:browser`
- `npm run test:apt-a-teleport:browser`

KNOWN PRE-EXISTING / DISCLOSED:

- `test:ingestion-v2` has the previously disclosed L06 floor-outline depth mismatch.
- Older L06 browser pixel-click fragility remains outside this Explore phase.
- Full wall-by-wall collision is not implemented in Explore V1; bounded movement is the honest reference constraint.

## Manual local test

1. Run `npm run dev` if the local Vite server is not already running.
2. Open `http://127.0.0.1:5173/`.
3. Click `L06` on the Level Rail.
4. Click `Explore` in the lower-right viewport.
5. Hold the Up button or W; the camera moves.
6. Release; movement stops.
7. Use A/D or arrow keys to turn.
8. Click `Interact` or press Enter near a canonical target.
9. Click `OYI` to open the existing Oyi surface.
10. Click `Exit` or press Escape to leave Explore Mode.

## Remaining gaps

- Replace rectangular bounds with canonical walkable polygons and wall/door collision.
- Add richer center reticle/target feedback once object-level canonical hit coverage is complete.
- Extend manual Apartment A door/lift/device golden journeys after first-person collision and targeting are mature enough for stable pixel-free browser automation.
- Gamepad, VR, avatar, running, jumping, crouching, and advanced Camera Director are deferred.

## Safety

No production deployment, cloud writes, service-role keys, remote migrations, or physical device commands were used.


## Movement correction results

`npm run test:explore:planar-browser` logged:

- Upward pitch forward: deltaY=0.0000
- Downward pitch forward: deltaY=0.0000
- Left strafe: deltaY=0.0000
- Right strafe: deltaY=0.0000
- Backward: deltaY=0.0000
- Release: residual movement damps promptly after keyup

The lift regression remains green, confirming legitimate vertical systems can still change Y outside normal Explore walking.
