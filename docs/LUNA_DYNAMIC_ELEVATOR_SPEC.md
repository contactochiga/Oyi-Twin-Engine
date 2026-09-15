LUNA — DYNAMIC PASSENGER LIFT 02 SPECIFICATION

Revision 1 • 9 September 2026 • Design contract for a future implementation; no lift runtime or geometry changes in this phase.

**One canonical asset**

`LUNA-LIFT-PASS-02` remains the single elevator identity. It already appears as an operational device and as a core/shaft reference at current X=0, Z=0, with a 3×3m conceptual shaft footprint. Those are two representations of one elevator, not duplicate assets. Capacity, car dimensions, travel speed, drive/machine location, door configuration, pit/overhead and served floors are DESIGN DECISION REQUIRED (DD06).

Keep its physical assembly at building-fixed coordinates, independent of exploded floor transforms. Shaft void, car, car doors, landing doors, rails, controller, drive/traction, counterweight if applicable, pit equipment and overhead are component roles under that asset. Structural shaft walls/slab openings belong to their structural canonical objects and link to the lift; they are not extra elevator assets. Current `LUNA-STRUCT-CORE-01` wraps a shared core and must not be relabeled “Lift 02 shaft” wholesale.

**Current implementation audit**

- The catalog declares `call` and `select_floor`. The current runtime capability mapping exposes only `setPosition`; `call` is not implemented. Fire-service capability on the service lift is likewise not a current runtime action.
- `elevatorBehavior` takes `args.floor`, writes `state.floor` to the destination immediately and sets direction to `moving`. It checks fault/same floor, but does not itself validate the stop registry or a safe door sequence.
- The simulation provider waits 250ms for request handling, schedules an arrival after 2200ms and closes the door 1400ms later. This is a demo timer, not a travel-distance model; overlapping requests/timers require explicit cancellation in the new design. Its generic result can report ok even where a behavior message indicates a refused move.
- `ElevatorCabinLayer` lerps a 1.5×1.7×1.5m indicator toward the referenced floor datum +1.2m. It has no measured position, velocity, physically synchronized doors or rideable interior. Floor indication is currently the target, not reliable arrival telemetry.
- These observations are implementation gaps for the future dynamic asset, not instructions to modify the verified loader or policy now.

**Stable provider boundary and proposed state v2**

Retain `TwinRuntimeProvider.getState/listStates/subscribe/execute/simulateEvent` and the `RuntimeAssetState` outer envelope (`ref`, `status`, `state`, `availableCommands`, `source`, `updatedAt`). Add a documented, versioned payload inside `state`; do not create a second React elevator state store. Both simulation and a future physical adapter emit the same normalized payload. The renderer subscribes and presents it.

| state field | Proposed type / meaning |
|---|---|
| schemaVersion | `luna.elevator/2`; enables explicit legacy adapter behavior |
| positionY_m | Number or null; car finished-floor Y in the approved building datum, not its mesh centre or roof |
| positionQuality | `measured`, `simulated`, `estimated`, `unavailable`; never call interpolation measured |
| currentFloorRef | Registered served level or null while between landings; only indicates verified alignment |
| lastServedFloorRef | Last confirmed arrival; distinct from target and nearest floor |
| targetFloorRef | Admitted destination or null; setting a target does not move currentFloorRef |
| betweenFloorRefs | Optional ordered lower/upper refs while travelling; derived from approved stop/level table |
| direction | `up`, `down`, `idle`, `unknown` |
| speed_mps | Nonnegative speed magnitude or null if unavailable; never derived from raw mesh lerp |
| motionState | `idle`, `starting`, `accelerating`, `cruising`, `decelerating`, `leveling`, `stopped`, `unknown` |
| carDoor | `{state, progress, locked}`; state closed/opening/open/closing/obstructed/unknown; progress 0…1 or null |
| landingDoors | Map by approved floor ref, same door state/lock semantics; absent observation remains unknown |
| serviceState | `normal`, `inspection`, `out-of-service`, `fire-recall`, `emergency-power`, `fault`, `unknown`; modes reported by authority |
| faults | Typed code/severity/message/source/time list; empty only when known clear |
| allowedStopRefs | Registered car service topology; destination authorization is checked separately per requester |
| activeRequest | Request ID, kind, origin, destination, status and rejection reason; do not expose other occupants' personal data |
| sequence / sampledAt / quality | Monotonic sample version, source timestamp and freshness/validity; reject out-of-order updates |
| floor / door / fault | Temporary legacy projections for existing consumers; floor becomes last confirmed served floor, door/fault aggregate from normalized payload |

The proposed legacy floor semantics differ from today's target-first behavior. Implement a versioned adapter and update the new lift representation atomically; do not silently change old consumers and leave the current marker chasing stale arrival-only state. Unknown physical Y must remain null. A visual estimated position may be displayed with its quality label, but cannot establish door alignment or arrival.

**Physical and semantic anchors**

A stop record per approved served floor must contain canonical floor ref, building datum/version, car-floor alignment Y, shaft axis, landing doorway frame, lobby waiting point, threshold/crossing point, exit point, car boarding point and accessible approach envelope. Generate Y from the approved floor registry, never an independent hardcoded table. Current target datums in the building spec are not active engine coordinates until DD19 is promoted.

Use component keys such as `LUNA-LIFT-PASS-02::car`, `::car-door-left`, `::landing-door::<levelRef>` and `::shaft`. These are role keys, not new CanonicalRefs. An individually maintained controller may later receive a registered asset ref, linked to the parent lift, without replacing it. Shaft, car and door glTF pivots must be authored in compatible local frames; do not bake a floor or explode offset into the model.

For each of the 16 level interfaces, the JSON spatial programme records a candidate landing connection with **served status unresolved**. Do not assume all cars stop at Roof or provide private PH arrival. Lift 02's first demo requires approved Ground and at least one destination stop; use Ground→L06 as a proposed test route only after its stop/access/anchor checks. The four-car group dispatch strategy and PH stops remain DD06.

**Requests and authorization**

Preserve the existing command envelope `{assetRef, command, args}`. The future version should retain `setPosition` with `args.floor` as the compatibility destination-request adapter, validating that the argument is a known, served and requester-authorized floor. It must never mean “set raw physical Y.”

A distinct hall-call intent needs an explicitly approved command vocabulary extension, proposed `callLift`, mapped from catalog capability `call`. It would carry originFloorRef, direction (where required), requestId and request context. It is **not present in the current CommandName union**. `open`/`close` exist in that union but are not currently lift capabilities; door hold/reopen must be declared and admitted before exposure. Do not overload a motor-position command or renderer event to fake these capabilities.

Requests require authenticated actor context at the command gateway, canonical asset lookup, policy/capability checks, allowed destination, service state, validation and idempotent request ID. Request acknowledgement means accepted/rejected/queued, not arrival. Record normalized last-request status in runtime state; physical controller confirmations drive movement/doors. Repeat request IDs must not enqueue duplicate journeys. Request supersession, cancellation and timeout behavior must be explicit; do not leave orphaned timers.

Current Consumer lift representation is CONTEXT_3D, while assigned-home device control uses FULL_3D. That does not automatically grant passenger-request controls. A future admitted passenger-request capability/action gate must distinguish calling/riding from maintenance or fire operation. The current policy remains unchanged here; Consumer ride controls are an unresolved DD20 integration gate, not a UI-only exception. Facility control also requires an actual supported command. The first implementation can prove the sequence in an authorized local simulation context before expanding host action permissions.

No request may bypass door locks, overspeed/brake controls, inspection control, fire authority or emergency procedures. A physical adapter uses a supported manufacturer/controller interface; it does not directly operate a motor, brake or safety circuit. No physical command is executed by this specification.

**Deterministic simulation sequence**

| Phase | Required state / transition | Failure or interruption behavior |
|---|---|---|
| Hall call | Validate origin, request permission and service state; create request; queue/assign car | Rejected/unsupported request produces no motion; duplicate ID returns original status |
| Travel to origin | Close/verify doors before departure; provider integrates trajectory by elapsed time and configured simulation profile | Obstruction reopens/holds; lock failure inhibits simulated departure; fault cancels trajectory and reports state |
| Origin arrival | Provider reaches alignment datum, speed 0, currentFloorRef becomes origin; emit arrival | Passing a floor is not arrival; no open from an interpolated/estimated alignment |
| Open | Car and origin landing door opening progress derives from one provider sequence | Unrelated landing doors stay closed/locked or explicitly unknown |
| Enter | Camera crosses approved threshold only when car is aligned, stopped and boarding permitted | Entry camera is a viewing transition, not telemetry proof of occupancy |
| Destination request | Validate served and actor-authorized floor; assign target separately | Reject inaccessible/unknown floor without changing current state; same-floor request has defined no-travel handling |
| Close/depart | Provider door close progression and lock confirmation precede motion | Obstruction reopens; retry/timeout governed by simulation profile, not UI timer |
| Travel | Integrate Y, speed and motion phases independently of frame rate; floor rail tracks verified/estimated position honestly | Pause/resume advances from provider clock, not a resumed render-frame jump; faults/offline suspend ride controls |
| Destination arrival | Level accurately, stop, set currentFloorRef, emit arrival, open corresponding doors | Arrival event must match position/alignment/speed and request ID |
| Exit | Transfer camera to approved landing exit anchor; release follow mode; restore static navigation | Forced exit/fault/offline uses safe overview/lobby camera without claiming a physical passenger evacuation |

Simulation speed, acceleration, leveling tolerance, door timing, dwell and queue policy are explicit simulation-profile settings requiring DD06/DD20 approval. No final numeric equipment performance is invented. Test trajectory determinism at different render frame rates. The simulation provider owns motion/door updates; rendering may interpolate received samples but cannot change the provider's state or confirm completion. Current `simulateEvent` remains the sensor test interface; lift trajectory/fault testing needs a simulation-only provider test driver, not a physical command or a pretend sensor event.

For a physical provider, gateway/device sequence and source timestamps govern normalization. Lost/stale data clears confidence and disables unsupported actions; do not keep simulating a “physical” car through the building. Reconcile target/request vs actual controller feedback and report contradictory door/motion data. Any predictive visual interpolation stays labeled estimated and cannot satisfy an interlock.

**Representation matrix — same asset and runtime**

| Representation | Geometry / relationships |
|---|---|
| Architecture | Finished lobby/landing doors/car/interior; shafts concealed appropriately; car state still exists even if occluded |
| Elevator engineering | Shaft void, car, rails, doors, selected traction/controller/counterweight components and service clearances, subject to actual design |
| Structure | Referenced shaft walls, floor openings, pit and structural loads/relationships; equipment ref remains the same |
| All Systems | Lift plus approved power, fire, access, network and monitoring edges; existing graph additions require registration/review |
| Cutaway | Existing section view applied to admitted visual components; never a runtime mode or permission bypass |
| Explode | Floor presentation only; fixed shaft/car do not stretch. Disable boarding/follow ride in exploded presentation and restore normal geometry before entering; external inspection can remain available with a clear diagram state |

**Camera experiences and level rail**

1. External shaft: frame the shaft and moving car by the same lift ref, with adjustable occlusion/cutaway; no duplicated “external lift.”
2. Follow: maintain a car-relative inspection camera offset while provider Y changes. Own the camera through one navigation mode; do not let OrbitControls and a follow updater compete.
3. Lift lobby: reuse the Ground Lift Lobby identity and existing room navigation; add a calibrated wait/door anchor, not a replacement lobby scene.
4. Passenger interior: car-local eye/target anchors, controlled threshold transition and exit to the real destination lobby. No entry if representation/request/door conditions fail.
5. Engineering cutaway: frame car, rails and relevant service parts; retain the selected engineering representation independently from runtime.
6. Structural view: focus shaft wall/pit/opening context via linked structural refs without renaming or duplicating the elevator asset.

STATIC LEVEL MODE remains ordinary floor selection, isolation, contextual plans and camera navigation. ELEVATOR TRACKING MODE is a temporary navigation/view context `{mode, trackedAssetRef, previousStaticFloorRef, previousCameraAnchor}`. It reads runtime position; it does not overwrite canonical selection or dispatch a call on every floor crossing. Display aligned current floor when known and between-floor/progress indication during travel. A nearest-floor visual tick is explicitly not confirmed arrival. Track only approved floor anchors; unknown Y shows unavailable tracking rather than a fabricated floor.

Exiting follow mode, selecting a static floor, leaving the car, losing permission, losing valid telemetry or choosing a conflicting inspection mode clears tracking and restores the prior static level/camera or a safe existing overview. A destination choice is a deliberate request flow, not an accidental rail click. The second launcher still controls View, and Engineering Layers still controls representation; no new permanent old-style toolbar is introduced by this specification.

**Physical integration reference and boundaries**

Public KONE documentation demonstrates that a vendor-supported integration may expose calls, served floors, direction and door/call status. It is an example of an interface boundary, **not a selected Luna manufacturer** and not evidence that precise continuous Y/speed will be available. The eventual adapter must negotiate actual telemetry/capabilities and report unavailable fields honestly. [KONE Elevator Call API](https://dev.kone.com/api-portal/elevator-call-api/).

**Acceptance before realistic lift modeling**

Prove one canonical ref across all views; Ground/destination and stop authorization; provider-owned continuous simulation; command rejection/idempotency/queue behavior; doors cannot open in travel; car cannot depart with unconfirmed simulated door locks; arrival cannot precede alignment; interruption/fault/offline/recovery; no stale timers; same state seen externally and inside; correct floor tracking/reset; normal/explode/cutaway camera rules; Facility/Consumer policy boundaries; unchanged Oyi path; state survives geometry reload/LOD/fallback; and matched normalized telemetry from a mock physical adapter. Tests are software acceptance, not elevator safety certification.

Next implementation is a versioned local Lift 02 simulation/anchor proving step only after core/stop/datums and passenger-action authorization decisions are resolved. Full finished-car/shaft visuals and physical integration remain separate phases. No application or cloud change is made here.
