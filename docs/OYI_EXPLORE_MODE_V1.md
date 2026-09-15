# OYI — Explore Mode V1

Explore Mode V1 adds a manual movement input layer to the existing Luna Twin presentation. It does not replace Locate, Tour, the Spatial Card, the Level Rail, the top Oyi command bar, RepresentationPolicy, route traversal, runtime providers, or canonical object identity.

The interaction model is now:

- Locate: Oyi or the Spatial Card shows where a canonical destination is.
- Tour: Oyi drives the existing route and transition engine.
- Explore: the user manually drives the same camera/spatial state.

## Inherited spatial architecture

Explore uses the current CameraRig/OrbitControls camera owner and the existing Luna spatial model. Movement samples are reported back into the same live world-position path used by the Spatial Card and compact plans. Targeting resolves canonical refs from Three object `userData.canonicalRef`, then converts those refs through the existing Luna data provider and space lookup.

Operational truth remains outside geometry:

- External/rendered geometry is visual and spatial.
- Canonical Luna refs remain semantic identity.
- Runtime providers remain state and command authority.
- RepresentationPolicy remains the authorization/visibility gate.
- Oyi remains the existing intelligence/orchestration path.

## Explore input contract

`src/engine/spatial/exploreInput.ts` defines one generic action vocabulary:

- `MOVE_FORWARD`
- `MOVE_BACKWARD`
- `MOVE_LEFT`
- `MOVE_RIGHT`
- `LOOK`
- `INTERACT`
- `EXIT`

The circular touch controller and keyboard both call the same movement reducer. Movement intent is held while an input is active and cleared on release, cancellation, or mode exit.

## Touch controller

`src/engine/components/spatial/ExploreController.tsx` renders a compact bottom-right controller:

- circular glass base
- circular Up/Left/Right/Down buttons
- center Interact button
- small OYI shortcut using the existing Oyi logo asset
- small Exit control

The controller uses `pointerdown`, `pointerup`, `pointercancel`, and pointer capture so touch/iPad holds continue moving and release immediately stops movement. CSS sets `touch-action: none` and disables selection for the active controls.

## Keyboard controls

Keyboard input is captured only while Explore Mode is active:

- W / ArrowUp: forward
- S / ArrowDown: backward
- A / ArrowLeft: turn/move left axis
- D / ArrowRight: turn/move right axis
- E / Enter: interact
- Escape: exit Explore Mode

Typing in inputs, textareas, selects, and content-editable elements is ignored so normal UI entry remains safe.

## Movement and look behavior

`ExploreCameraDriver` moves the existing camera in the direction it is currently facing, using the existing OrbitControls target where available. Left/right rotates the look direction in V1; forward/backward translate the camera/target pair. Existing mouse/touch drag on the free viewport remains the look path while Explore is active, but it is handled as first-person target adjustment instead of OrbitControls orbiting the camera vertically. This keeps look and movement separate: looking changes orientation; movement changes horizontal position.

Movement is planar and grounded. The driver derives translation from camera yaw only: forward/backward use the horizontal camera forward vector and left/right strafe along the horizontal right vector. Pitch changes from looking up or down never contribute to translation. Camera Y is locked to the active walk plane during normal Explore movement; legitimate vertical changes remain owned by lift/stair/ramp/transition systems outside normal walking.

Movement uses a restrained velocity integrator with acceleration and damping, so held input feels smoother than a per-frame jump while release still stops promptly. The camera and Explore look target translate together by the same applied delta, preserving the current viewing direction while walking.

Movement is currently constrained to a conservative bounding rectangle derived from either the active Apartment A interior room extents or the selected level footprint. This is a reference constraint, not certified collision. It prevents unbounded drift but does not yet provide full wall/door collision physics.

## Contextual Interact and targeting

The driver raycasts from center screen and walks up hit objects until it finds a canonical ref. App-level `handleExploreInteract` then routes the action through existing systems:

- doors reuse transition bindings and `LunaRouteDriver`
- lifts reuse existing lift view/context behavior
- units and rooms reuse existing destination/selection paths
- assets use existing data-provider descriptors and card selection

If no raycast target is available, Interact falls back to the current selected canonical object. This keeps V1 usable while richer first-person targeting and reticle feedback continue to mature.

## Access and lift integration

Explore does not add an access engine or a lift engine. Door interaction uses the existing transition/access/route flow. Lift interaction uses existing lift canonical refs and context surfaces. Apartment A remains governed by the existing AccessResolver and simulated credential flow.

## Room awareness and Spatial Card integration

During movement, the driver samples real camera world position and asks `lunaExploreAwareness` to resolve the current canonical space from the Luna reference model. When a legitimate space change is detected, the same `currentSpaceRef` path used by Tour/Teleport is updated. The Spatial Card remains the context surface and the compact plan/live-dot machinery continues to be policy-gated.

## Oyi shortcut

The OYI secondary button opens the existing Oyi orb/conversation surface. It does not create a second Ask Oyi bar or a second assistant path.

## Privacy and permissions

RepresentationPolicy was not changed. Facility, Consumer, unrelated resident, and public boundaries continue to be enforced by existing policy and route/runtime checks. Explore movement and targeting do not grant private access merely because a controller exists.

## Performance notes

The controller stores movement intent as compact booleans. Camera updates happen inside the Three render loop. World-position reporting is throttled by distance change so movement does not rebuild the full app on every frame.

## Known limitations

- V1 uses bounded movement, not full architectural collision against every wall and opening.
- Center-screen targeting depends on canonical refs already attached to rendered objects.
- The live-dot proof for private Apartment A remains covered by existing Consumer policy/teleport browser tests; Presentation mode correctly does not expose private interior maps to Facility scope.
- Advanced gamepad, VR, avatar, running, jumping, crouching, and cinematic camera director behavior are deferred.


## Movement correction verification

`npm run test:explore:planar-browser` verifies the accepted controller with corrected grounded walking behavior. The browser proof looks upward, moves forward, looks downward, moves forward, strafes left, strafes right, and moves backward. In each case the logged Y delta is `0.0000`, and camera-target relative vectors remain stable while translating.
