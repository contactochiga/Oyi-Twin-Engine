# Oyi Twin Engine

A reusable, building-agnostic real-time 3D operational digital twin engine
for Oyi. Luna Residences is the **reference implementation** proving the
engine works end-to-end — it is not the product boundary.

## Why this is a separate repository

Three existing surfaces were audited before creating this repo:

- **Ochiga-backend** already exposes a stub digital-twin API contract
  (`GET /spaces/twin`, `/spaces/model`, `/spaces/render` —
  `src/routes/spacesTwin.ts` / `src/services/twinProviderService.ts`,
  currently returning `configured: false`). It stays the operational/data
  layer — canonical identity, spatial hierarchy, device state. It must
  never host the 3D application itself.
- **facility-oyi** (Facility OS) has a `/digital-twin` dashboard page that
  already expects exactly the shape the backend contract returns
  (`{configured, source, model_url, render_url, capabilities}`) but has
  zero Three.js/React Three Fiber dependencies — it's a consumer shell
  waiting for an engine to embed, not an engine.
- **Ochiga-website** (public marketing site) has `@react-three/fiber`,
  `@react-three/drei`, `three`, and `three-stdlib` installed but **unused**
  anywhere in the codebase — almost certainly leftover from an abandoned
  idea. It's also the wrong home on principle: a public marketing site is
  not where a product engine that Facility OS and Consumer OS both need to
  embed should live.
- **Oyi-os-frontend** (Consumer OS, Capacitor-wrapped) has no 3D code and
  no three.js dependency at all.

No existing repo was a correct home for a reusable engine both product
surfaces need to embed. This repo is that home.

## Architecture

```
src/
  engine/     Building-agnostic. Nothing in here may reference "Luna" or
              any Luna-specific value. This is the technology.
    types.ts                  Canonical node contract (TwinNodeDescriptor,
                               LevelDescriptor, CanonicalRef, ...)
    hooks/
      useSelection.ts          Selection state (what's clicked)
      useSceneMode.ts          Isolation / exploded-view state
    components/
      LevelMassing.tsx         Generic extruded-floor primitive: click to
                               select, fades when another level is
                               isolated, animates to an exploded offset
      CoreShaft.tsx            Generic vertical circulation/service element
      UnitVolume.tsx           Generic sub-level addressable unit placeholder
      CameraRig.tsx            Orbit/zoom/reset camera wrapper
      Lighting.tsx             Warm architectural lighting rig (no remote
                               HDR dependency — see note below)
      SiteBase.tsx             Generic stylised site plate + landscaping

  luna/       Luna-specific. This is the *content*, modeled the way a
              future building's own reference implementation would be.
    lunaProgramme.ts    The vertical programme (B1 → Rooftop), footprints,
                        elevations, canonical node refs
    lunaMaterials.ts     Luna's material palette (factory functions, not
                        shared instances — see the note in that file about
                        why: per-level opacity fading requires each level
                        to own its own material instance)
    lunaCameraPresets.ts Named hero-experience camera positions
    LunaBuilding.tsx     Top-level composition: site, levels, cores, signage
    LunaLevel.tsx        One level, fully wired: its material, its tier's
                        facade, and (for L06) its 4 apartment placeholders
    LevelFacade.tsx      Tier-dispatched architectural detail (fins,
                        balconies, canopy/columns, timber screening,
                        terrace ring, pergola crown) — rendered as a CHILD
                        of its level's massing, never a global overlay
    LunaEnvironment.tsx  Waterfront edge, driveway, planting, distant silhouettes
    LunaSignage.tsx      "LUNA RESIDENCES" entrance sign (canvas-texture text)

  ui/         Plain HTML/CSS overlay UI (control panel, selection debug
              panel) — not part of the 3D scene, easy to restyle per host
              app later.
```

**Embedding path for Facility OS / Consumer OS:** once a second consumer
actually needs `src/engine`, promote it to a published/workspace package
(e.g. `@oyi/twin-engine`) and have each host app supply its own
`src/<building>/` content module plus its own UI chrome — the engine
itself never changes per host. That split was kept as a folder boundary
rather than a real npm workspace for this phase specifically to avoid
premature tooling; promoting it is mechanical, not a rewrite.

## Canonical identity — matches the backend exactly

Every selectable node's `ref` is the **same string** already seeded in
Luna's local database (see `Ochiga-backend/pilot/luna-residences/` and
`docs/OYI_DIGITAL_TWIN_ASSET_CONTRACT.md`):

- `LUNA-L06-APT-A` — the actual `homes.canonical_ref` value
- `LUNA-LIFT-PASS-01` — the actual `devices.canonical_ref` value for that
  elevator

Clicking a mesh in this viewer and clicking the corresponding row in the
Facility OS device list are meant to resolve to the same identity string.
Phase 1 does not call the backend yet (see Known limitations), but the
node hierarchy was built against the real contract from day one so wiring
a fetch call in a later phase is additive, not a refactor.

## Running it locally

```bash
cd /Users/ochigaidoko/Oyi-Twin-Engine
npm install   # already run once during scaffolding
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

## What Phase 1 proved

- Full vertical stack, B1 → Luna Sky (Rooftop), 16 levels, in the correct
  programme order with the correct canonical refs.
- Orbit / zoom / reset camera.
- Click any level in the side panel (or the massing itself) to isolate it;
  "Restore whole building" undoes it.
- "Explode floors" separates every level vertically to reveal the stack.
- Level 6 is subdivided into its 4 real apartment placeholders
  (`LUNA-L06-APT-A..D`) — each independently selectable.
- Clicking anything shows its canonical ref in the bottom-left debug panel.
- 3 passenger + 1 service/fire elevator shaft, 2 protected stairs, 1
  representative riser — continuous vertical cores spanning the full
  building height.

## What Phase 2 adds

- **Architecture attached to the operational hierarchy, not layered on
  top of it.** Every fin, balcony, canopy, screen, terrace, and pergola is
  rendered as a *child* of its own level's massing group (see
  `LevelFacade.tsx` + `LunaLevel.tsx`). Isolating or exploding a level
  carries its real architecture with it — verified by isolating L06 while
  exploded: every other level's massing AND facade fades together, L06's
  stays fully visible, and every element sits at its correct exploded
  offset.
- **A distinct architectural read per tier**, not repeated identical
  floors: recessed utilitarian B1, a tall glazed Ground arrival with
  slender columns and a cantilevered canopy, a timber-screened L01
  Residents' Club, standard L02-L09 bronze-fin/balcony facades, larger
  L10-L12 balconies with fewer/thicker fins, a Penthouse with a
  wraparound terrace ring and corner glazing, and a Luna Sky rooftop crown
  (bronze pergola lattice + greenery blocks).
- **Site context**: a waterfront edge, an arrival driveway, taller palm
  clusters near the entrance, and a few distant low-detail silhouette
  blocks suggesting Ikoyi's skyline without building a full city.
- **A backlit "LUNA RESIDENCES" entrance sign** — rendered from an HTML
  `<canvas>` text draw, not a font file, so it costs zero network requests
  (see Known limitations for why that distinction matters here).
- **Four camera hero presets** (Exterior Hero, Ground Arrival, Luna Sky,
  Reset/Overview) with smooth flight transitions, implemented by
  temporarily unmounting `OrbitControls` for the duration of a flight
  rather than fighting its own internal per-frame recompute — an earlier
  attempt that tried to drive the camera *and* leave OrbitControls mounted
  produced a camera that snapped into the facade; see the comment in
  `CameraRig.tsx`.
- **A local procedural environment map** (`drei`'s `<Environment>` fed
  `<Lightformer>` children instead of a `preset`/`files` URL) for PBR
  reflections, plus ACES filmic tone mapping — without reintroducing the
  remote-HDR Suspense risk called out below.
- **Warm interior glow on selection**: selecting a level or an apartment
  lights its glazing like an occupied unit at dusk, instead of the
  generic UI-orange highlight (kept for non-glazing elements like core
  shafts, where "lit interior" doesn't make sense).

## Known limitations (by design, not oversight)

- **No backend data wired up yet.** The scene is built from static
  programme data in `src/luna/lunaProgramme.ts`, not a live fetch against
  `GET /spaces/twin` or the pilot Luna dataset. Explicitly out of scope
  until a later phase — interiors, devices, and state simulation too.
- **No remote HDR environment map or web font.** Both `@react-three/drei`'s
  `<Environment preset/files>` and `<Text>` (troika-three-text) fetch an
  asset from a remote CDN by default; a slow or blocked request leaves the
  whole scene stuck in a Suspense fallback with no visible error —
  confirmed firsthand during Phase 1 verification. Phase 2's environment
  lighting uses local procedural `<Lightformer>` children instead of a
  preset, and the entrance signage is drawn to a canvas texture instead of
  using `<Text>`, for the same reason.
- **Facade detail is proportion/palette, not photoreal.** No real facade
  unitization, texturing, or window-by-window modeling yet — massing-level
  architectural articulation, as scoped for Phase 2.
- **Premium-level differentiation is geometric, not yet strongly visible
  from every camera angle** — L10-L12 get deeper balconies, fewer/thicker
  fins, and a distinct glazing tone; it reads clearly up close or isolated
  via the level list, less dramatically from the default far Exterior Hero
  framing. Worth a further visual pass if it needs to read at a glance.
- Git has not been initialized for this repository yet.

## What Phase 3 adds

Six navigable interiors, each nested at the correct point in the *same*
hierarchy Phases 1-2 already proved — never a separate scene:

- **Ground Lobby** (`LUNA-GROUND-LOBBY`) and **Residents' Club**
  (`LUNA-L01-CLUB`) — nested directly inside their level's own massing.
- **Level 06 Apartment A** (`LUNA-L06-APT-A`) — the primary Consumer OS
  reference demo. 12 rooms using the **exact canonical refs already
  seeded in the backend** (`pilot/luna-residences/rooms.csv`):
  `LUNA-L06-APT-A-LIVING`, `-KITCHEN`, `-BED-01`, etc. This is the one
  interior in Phase 3 backed by real data, not an invented layout.
- **One premium residence**, Level 10 Apartment A (`LUNA-L10-APT-A`) —
  8 larger rooms, added as L10's first (and only) modeled unit.
- **Penthouse** (`LUNA-PENTHOUSE`) — 9 rooms including a wraparound
  terrace matching the Phase 2 exterior terrace ring.
- **Luna Sky** (`LUNA-ROOFTOP-SKY`) — sky bar, pool deck, pergola lounge.

The five non-L06 interiors use canonical-*style* refs that follow the
same naming convention as the real contract, but are disclosed —
in-code and here — as not yet backed by actual backend rows (no
`rooms.csv` entry, no `homes` row for the premium/penthouse units, no
facility-space concept for Lobby/Club/Sky). They exist to prove the
*shape* of the navigation system end to end.

**Architecture:**
- `engine/components/InteriorRoom.tsx` — generic room primitive: floor +
  implied corner-stub walls (no precise door-gap geometry) + furniture,
  selectable, fades via `useRoomOpacity`.
- `engine/hooks/useRoomOpacity.ts` — combines level-scope isolation fade
  (existing) with a new, independent "room focus" fade: siblings of a
  focused room dim to 0.15 without needing the level itself to be faded.
- `luna/interiors/lunaInteriors.ts` — room layout data (rects + furniture)
  per interior; `luna/interiors/furniture.ts` — reusable furniture
  blockout generators (bed, sofa, dining set, kitchen counter, vanity,
  pool, bar, etc.), all merged-geometry for performance.
- `luna/InteriorLayer.tsx` — renders one interior's rooms, offset down by
  `-levelHeight/2` to sit on the actual floor (see the real bug this
  fixed, below).
- Camera: `enterInteriorCamera`/`roomFocusCamera` in `lunaCameraPresets.ts`
  implement the requested chain (Exterior → Ground Arrival → Lobby →
  Level 06 → Apartment A → Living Room, and Exterior/Overview → Luna Sky)
  as an "Enter X" / room-list / "Exit to Exterior" flow in the control
  panel rather than one fixed scripted sequence.

**Three real bugs found and fixed during verification** (not just a build
pass — visually confirmed via screenshots at each stage, including one
taken with a real render-settle wait via a temporary `puppeteer-core`
script, since headless single-frame captures weren't giving Phase 3's much
larger material count enough time to render before capture):

1. **Shared-material fade bug**, same class as Phase 2's but at room
   scale: a room's wall/furniture material must be a private instance per
   room, or "focus this room, dim its siblings" dims every room sharing
   that material object instead.
2. **Level-center-vs-floor bug**: a level's (and a unit's) group origin
   sits at its *vertical center* (`baseElevation + height/2`), matching
   the convention `LevelFacade` already used for balconies. `InteriorLayer`
   didn't apply that offset, so every room floated at the slab's
   mid-height — floors, walls, and furniture existed but sat ~2.5m above
   where the camera was looking. Fixed with an explicit
   `-levelHeight/2` group offset, required (not optional) on
   `InteriorLayer`.
3. **"Outside looking in" camera bug**: the massing is a watertight solid
   box with no modeled door/window openings, so a camera pulled back
   *outside* a room or interior's bounds just sees the opaque exterior
   face — backface culling only hides a box's walls once the camera is
   already inside it. Both interior camera functions now deliberately stay
   inside the room/interior's own footprint (an inside-corner-to-corner
   framing) rather than pulling back from it. A related bounding-box
   heuristic for the "enter interior" establishing shot was also replaced:
   it was skewed badly by protruding rooms (a balcony/terrace stretches a
   naive bounding box far past the room grid it's attached to); now it
   anchors on the single largest room by floor area and reuses the same
   proven per-room framing instead.

**Known limitations specific to Phase 3:**
- Automatic camera framing is a generic formula (inside-corner-to-corner),
  not hand-tuned per space — verified working for Ground Lobby and Level 06
  Apartment A specifically; the other four interiors use the same generic
  logic but weren't individually screenshotted given time constraints, so
  worth a personal look during review.
- No door/opening cutouts — enclosure is implied via corner wall stubs,
  matching the "where practical" scope in the brief rather than precise
  door geometry.
- Live device data is now wired up (see Phase 4) via a local static
  provider; the underlying live Oyi API is still not called.

## What Phase 4 adds — Operational Systems & Spatial Asset Visualization

Connects the architectural world to the operational structure already
modeled in Luna's backend, without any simulated control/actions —
read-only throughout, per the phase's explicit scope.

**Twin Data Provider — the core architectural addition.** Rather than
hardcoding operational data inside components, `src/engine/twinData.ts`
defines a building-agnostic `TwinDataProvider` interface
(`listAssets()` / `getAsset(ref)`) plus an `OperationalAssetRecord` shape
mirroring the backend's own fields (`canonical_ref`, `system`, `type`,
`classification`, `capabilities`, seeded `device_states.status`,
`parent_device_id`). `src/luna/operational/lunaTwinDataProvider.ts`
implements it as a plain in-memory lookup over a static dataset — the
"local simulation today" half of the stated principle:

```
Twin Engine  →  Twin Data Provider  →  Luna local simulation (today)
                                   \->  Oyi API (tomorrow)
```

A future live-API provider implementing the same interface is a drop-in
replacement; nothing that consumes `useTwinData()` (markers, relationship
lines, the systems panel, the asset info panel) would need to change.

**Operational asset dataset** (`luna/operational/lunaOperationalAssets.ts`,
50 records) — every ref, capability, and seeded state copied verbatim from
the real local backend data already applied in Ochiga-backend
(`pilot/luna-residences/phase3c_infrastructure.sql` and `devices.csv`,
via `scripts/pilot-import.mjs`'s `DEVICE_CAPABILITY_MAP`), covering:
Electrical (Grid, MDB, Generator, ATS, Inverter, Meter), Water (Tank,
Treatment, Booster Pump 01/02, Meter, Valve), Fire (Panel, Pump, Tank,
Ground detector), HVAC (rooftop plant), 4 elevators (reusing the exact
`LUNA_LIFT-*` core-shaft refs from `lunaProgramme.ts`, not new IDs), 4
cameras, 3 access points, network/edge (gateway, Wi-Fi AP, `LUNA-EDGE-CORE-01`
edge node), and all 19 real Apartment 6A smart devices. Where the backend
seeded no `device_states` row (all 19 apartment devices — the CSV importer
only inserts into `devices`, never `device_states`), `seededState` is `null`
and the info panel says so plainly rather than fabricating a value.

**Spatial placement** — each asset is nested inside the same hierarchy
Phases 1-3 already built (a level's massing group or, for apartment
devices, the L06 Apartment A `UnitVolume`), in clearly zoned sub-areas
(electrical/water/fire each get their own part of B1's footprint,
apartment devices sit inside their real authored room from
`lunaInteriors.ts`) — "credible operational placement, not
fabrication-level coordination," as scoped.

**Systems Mode** (`ControlPanel`'s new "Operational Systems" section) —
All / Electrical / Water / Fire / HVAC / Elevators / Security / Access /
Network-Edge / Apartment Devices. Selecting a specific system keeps
levels that host that system's assets at full opacity and fades every
other level to near-invisible (`systemFadeOverride` in
`useSceneMode.ts`); selecting "All" shows everything; leaving Systems Mode
off (default) restores Phase 1-3 behaviour exactly — operational assets
are fully invisible and non-interactive outside Systems Mode by design
(see the Facility/Consumer note below), so a mode toggle, not an always-on
overlay, is what makes the assets appear at all.

**Asset markers and relationship lines** — `OperationalAssetMarker`
(engine-generic: box/cone/disc shape, coloured by system) and
`SystemRelationshipLine` (a schematic, unlit connector, not a literal
pipe/cable run) both fade with Systems Mode via the shared
`useSystemAssetOpacity` hook. `OperationalRelationshipLines` renders all
10 real parent/child pairs from the backend's own `parent_device_id`
data (Grid→MDB→{ATS, Inverter, Meter}; Tank→{Treatment, Booster Pump
01, Booster Pump 02}; Fire Panel→{Fire Pump, Ground Detector}; Network
Gateway→Wi-Fi AP) — the actual topology already established in Phase 3C,
not an invented one.

**Asset info panel** (`ui/AssetInfoPanel.tsx`) — clicking any operational
asset shows name, canonical ref, system, type, location, classification
(controllable / observable / asset-only, derived from real
`capabilities[]`), connection ("Simulation"), and seeded state if one
exists — strictly read-only, no start/stop controls anywhere.

**Camera** — `assetFocusCamera()` in `lunaCameraPresets.ts` extends the
Phase 3 camera system: B1/Ground/Rooftop assets (open plant zones, no
authored rooms) get a diagonal pullback that stays inside the massing;
apartment devices reuse `roomFocusCamera`'s proven room-corner framing,
picking the corner *opposite* the device rather than a fixed corner (see
bug #2 below). A "Return to Building" button on the asset panel flies back
to the overview preset.

**Facility vs Consumer scoping, not yet an authorization UI.** Systems
Mode is explicitly a Facility OS-style view of every building asset — the
architecture is deliberately *not* wired as if every user sees every
asset (assets are invisible/non-interactive unless Systems Mode is
active, which is its own opt-in), so a future Consumer view (assigned
home → rooms → authorized devices only) can be added as a different
provider/filter without restructuring the renderer. No such
authorization UI exists yet — out of scope for this phase.

**Three real bugs found and fixed during verification** (screenshot
verification again required a real render-settle wait; this scene's
larger mesh count renders at well under 1fps under headless
SwiftShader software rendering, so a temporary `puppeteer-core` script's
camera-snap debug hook — since removed — was used to confirm each fix
lands on the *exact* value the app's own camera math computes, not a
guessed wait time):

1. **Massing boxes don't render from the inside.** A level's massing is a
   single `BoxGeometry` with default single-sided faces (outward
   normals) — a camera positioned *inside* one (B1 has no authored
   interior, unlike Ground/Rooftop's partial lobby/sky coverage) saw every
   face as a backface and looked straight through the level to the sky.
   Fixed by rendering every massing-tier material `THREE.DoubleSide` (see
   the note in `lunaMaterials.ts`) — free from outside, and what actually
   makes "fly the camera into B1 to frame a pump" read as a room.
2. **Room-corner camera used a fixed corner, not the corner opposite the
   device.** Most apartment devices are deliberately wall/ceiling mounted
   near a room edge; framing from a *fixed* inside corner frequently put
   the camera almost on top of a device positioned near that same corner.
   `assetFocusCamera` now computes the corner opposite the device's own
   position within its room.
3. **Systems Mode's "emphasized" level was semi-transparent, not solid.**
   An earlier version held the matching level at 0.4 opacity even up
   close; viewed from inside (see bug #1), that let outside light bleed
   through the level's own walls and washed the shot out. "Emphasized"
   now means the matching level keeps its full resting opacity — only
   non-matching levels fade.

**Known limitations specific to Phase 4:**
- Placement is manually zoned per system within each level's footprint,
  not derived from the backend's `twin_entity_placements` rows — those
  rows record a zone/floor label, not literal 3D coordinates, so exact
  positions were authored by hand at a "credible, not engineering-grade"
  level of coordination, matching the phase's explicit scope.
- Relationship lines are schematic straight connectors, not routed
  pipes/cables, and the edge node's link to its 23 devices isn't drawn as
  23 individual lines (visual clutter for no added clarity) — its info
  panel states the linkage instead.
- Apartment-device camera framing was verified for a handful of
  representative devices (floor/low-mounted and one ceiling-height
  circuit) across a couple of rooms, not all 19 individually.
- Still read-only end to end — no start/stop controls, no live backend
  connectivity, no conversational/Oyi control. Explicitly out of scope
  for this phase.

## What Phase 5 adds — Simulated Runtime State & Control

Makes Luna operationally *interactive* through a local simulation
provider, while keeping the exact provider abstraction a future physical
integration would need:

```
Twin UI  -->  Command/State Contract  -->  Luna Simulation (today)
                                       \->  Oyi Core / device API / edge runtime (tomorrow)
```

**Runtime provider contract** (`engine/twinRuntime.ts`, building-agnostic)
— a second, small contract layered on top of Phase 4's static
`TwinDataProvider` catalog, never merged into it: `TwinDataProvider`
answers "what is this asset and where does it live" (rarely changes);
`TwinRuntimeProvider` answers "what is its live state right now, and what
can I tell it to do" (changes constantly). `RuntimeAssetState` carries
`status` (a restrained five-value vocabulary — normal/active/warning/
critical/offline), a free-form `state` bag, `availableCommands` (a small
fixed verb vocabulary — turnOn/turnOff/setTemperature/setMode/lock/
unlock/open/close/setPosition/start/stop/resetFault), and `source`
(simulated/physical/offline, so a future live provider has somewhere
honest to report from). `execute()` returns a `Promise<CommandResult>`;
`subscribe()` is a plain pub-sub, not a React store, so non-React
consumers (a future scenario CLI, a test) can use the same contract.
`useRuntimeAssetState(ref)`/`useRuntimeStates()` are the React entry
points — a component re-renders only when its own asset's state object
identity actually changes.

**Luna Simulation Provider** (`luna/runtime/`) — the "Luna local
simulation today" implementation. `lunaRuntimeBehaviors.ts` defines
reusable behavior kinds (toggle, climate, curtain, lock, valve, pump,
generator, ATS, elevator, read-only) shared by every asset of that shape;
`lunaRuntimeSeed.ts` maps each of the 50 Phase 4 assets to a behavior and
an initial state — reusing the real Phase 4 `seededState` verbatim for
the 20 building-wide devices that have one, and disclosing the 30
simulation-layer defaults added for assets Phase 4 correctly left
`seededState: null` (all 19 apartment devices, 4 cameras, 3 access
points, the edge node — none have a real `device_states`-equivalent row
in the backend). `availableCommandsFor()` is never hand-typed per asset:
it reads the asset's *real* `capabilities[]` from the Phase 4 catalog,
maps each backend capability string (`power.on`, `set_temperature`,
`select_floor`, …) through a small translation table, and intersects
that with what the assigned behavior actually implements — a command
only ever appears if both the real backend data and the simulation logic
agree the asset supports it. Every mutation — a user command, a
scenario, a simulated sensor event, ambient drift — flows through one
`setAssetState()` choke point in `lunaSimulationProvider.ts`, which is
what "state changes flow through the provider" means in code rather than
only in principle; `lunaRuntimeInternals` exposes that same function to
the scenario engine (same package) without putting it on the public
`TwinRuntimeProvider` interface a scenario has no business calling as a
"command." A small bounded random walk (`ambientTick`, every 4s) keeps
the living room temperature/humidity and both apartment/building meters
visibly "live" with no user interaction — texture, not the point of the
demo.

**Apartment 6A controls** — living room + bedroom lights (on/off, with a
real `THREE.PointLight` so "light OFF" visibly changes the room's
illumination, not just a marker's own color), living room + primary
bedroom AC (power/target temperature/mode), living room + primary
bedroom curtains (open/close/set position, with real animated fabric
geometry — see below), the entrance lock (locked/unlocked), and the
apartment water isolation valve (open/close) are all genuinely
interactive through the command panel described below.

**Observable apartment sensors** — temperature/humidity, occupancy,
smoke, leak, and both apartment meters display live (ambient-drifting or
event-driven) readings with **no** command buttons, matching "do not add
controls to observable-only devices." Three of them (occupancy, leak,
smoke) offer a clearly-labeled **Simulation / Test** button
(`simulateEvent()` — a distinct method from `execute()`, never disguised
as a real command) for demonstrating "occupancy detected" / "leak
detected" / "smoke alarm" without pretending the sensor accepts an
actual command.

**Building-system simulation** — the standby generator (running/mode/
fuel level), the ATS (grid/generator source), both booster pumps
(running/pressure/fault, with a duty→standby handover baked into the
Pump Failure scenario), all 4 elevators (current floor/direction/door/
fault, with real timed movement — see below), all 4 cameras (online/
offline state only, **no fake video feeds** — capabilities[] is empty
for every camera in the real backend data, so no command button ever
appears for one; only the scenario engine can flip one offline, modeling
an external network/device event rather than a user command), and the
edge node (online/uplink state) all have believable simulated behavior.

**Scenario simulator** (`luna/runtime/lunaScenarios.ts` +
`ui/ScenarioPanel.tsx`) — 8 presets (Normal Operations, Grid Failure,
Water Pressure Fault, Pump Failure, Camera Offline, Apartment Leak,
Smoke Alert, Elevator Fault), each a small deterministic batch of
`setAssetState()` calls through the exact same provider choke point
every command uses. Grid Failure demonstrates the requested cascade
(Grid marked critical → ATS switches to `generator` source → the
generator starts running); Apartment Leak also auto-closes the apartment
water valve; Smoke Alert also raises the building fire panel's alarm —
small, deliberate cross-asset cascades, not just single-field flips, to
demonstrate Oyi understanding *systems*. "Normal Operations" rebuilds the
entire store from the seed table, making every scenario fully resettable.
No login/role system exists in this reference viewer, so "Facility-only"
is expressed as clear scope and labeling on the panel, not an auth gate.

**Visual state language** (`engine/utils/statusPresentation.ts`) — one
restrained five-color mapping (normal/active keep the asset's own system
color; warning is amber; critical is red with a gentle pulse, the only
place status uses motion; offline is desaturated grey) used identically
by every marker, the elevator cabin, and the asset panel's Source row —
never bespoke per-asset color logic.

**Curtain animation** (`engine/components/CurtainAssetMarker.tsx`) — a
real flat fabric panel, not a marker box: closed is full-width and
centered on the window track; opening smoothly scales and slides it into
a thin bunch toward one edge, exactly like a real curtain being drawn,
driven by the provider's `position` (0-100) field via the same
useFrame-lerp idiom already used for camera flights and level explode
offsets elsewhere in this engine.

**Elevator cabin indicator** (`luna/operational/ElevatorCabinLayer.tsx`)
— Phase 5 gives elevators a moving cabin instead of Phase 4's static
per-level marker: one indicator per elevator, rendered at the building
root (not nested inside any single level, since its whole point is to
cross levels' coordinate spaces), gliding smoothly toward whichever
level's elevation its live `floor` state currently names. Selecting a
floor shortcut (Ground/Level 6/Level 10 — real `LUNA_LEVELS` refs, never
invented locations) sets direction + floor immediately, then the
provider's own timers (not frame-rate-dependent) flip direction to idle
and cycle the door open/closed a couple of seconds later — the cabin
mesh's independent lerp is what actually sells the "traveling" motion.

**Asset Controls Panel** (`ui/AssetInfoPanel.tsx`, extended from Phase
4's read-only version) — canonical ref, live state (from the runtime
provider, not the Phase 4 static snapshot), source + status, and command
buttons **inferred from which combination of `availableCommands` is
present**, never a per-asset-ref switch statement — this is what keeps
the panel honest to "the Twin UI must not contain Luna-specific
fake-control logic": a control appears because the provider's own
contract says this asset supports it, and *which* widget to show (a
temperature stepper vs. an open/half/close curtain row vs. a lock
toggle) is inferred from the shape of that command set, not from knowing
"this is the living room AC." A command result message (success or a
plain rejection, e.g. attempting to start a faulted pump) is always
shown. Systems Mode stays the Facility-scope surface (electrical/water/
fire/HVAC/elevators/security/access/network-edge); Apartment 6A's
devices are the representative Consumer-capable scope and are visible
whenever the user is actually inside the apartment's interior
(`activeInteriorRef` set), independent of the Facility Systems Mode
toggle entirely — see the visibility bug fixed below.

**Three real bugs found and fixed during verification** (same
puppeteer-core camera-snap methodology as Phase 4, since disposed of;
this scene's mesh/hook count renders at well under 1fps under headless
SwiftShader, confirmed by directly logging live camera-position samples
over time and watching them monotonically — just very slowly — converge):

1. **A light's illumination was nested as a child of its own marker
   mesh.** `useSystemAssetOpacity` sets a marker's `mesh.visible = false`
   outside Systems Mode (so the marker box doesn't clutter normal
   browsing) — three.js skips an entire subtree when a parent is
   invisible, silently killing the `<pointLight>` too, so "light OFF"
   never actually changed room illumination outside Systems Mode (i.e.
   almost always). Fixed by making the light a sibling of the mesh, not
   a child — illumination must work in normal browsing, not just
   Systems Mode.
2. **Apartment-devices markers (curtains, the lock, the leak sensor…)
   were invisible during normal apartment browsing.** They inherited
   Phase 4's Systems Mode gate wholesale, but Systems Mode is explicitly
   Facility-scope — a resident shouldn't need to enable a facility
   systems view just to watch their own curtain animate. Fixed by adding
   a second visibility path in `useSystemAssetOpacity`: `apartment-
   devices` assets are also fully visible/interactive whenever the user
   is inside any interior (`activeInteriorRef !== null`), entirely
   independent of Systems Mode.
3. **The camera-snap verification technique itself was initially
   miscalibrated**, not the app: an early "did the camera settle"
   detector sampled position deltas every 700ms and falsely concluded
   convergence when frames simply hadn't rendered between two samples.
   Confirmed by direct multi-second position tracing (the position was
   still monotonically approaching the real target, just far slower
   than assumed) — fixed the *verification script*, not application
   code, by adding a debug-only camera-snap hook that jumps straight to
   the exact target the app's own camera math computes.

**Known limitations specific to Phase 5:**
- Ambient sensor/meter drift is a small bounded random walk, not a
  physically simulated model — deliberately modest texture, not the
  point of the demo.
- Elevator "movement" is a believable timed state transition plus an
  independently-lerping cabin mesh, not physically simulated
  acceleration/velocity.
- Command execution has a small fixed synthetic latency (250ms) to read
  as a real system boundary; it is not modeling real network conditions.
- Scenario cascades are hand-authored per preset (e.g. Grid Failure only
  touches Grid/MDB/ATS/Generator), not a general dependency-graph
  propagation engine — intentionally scoped to "believable operational
  behavior," per the brief, not full systems physics.
- No persistence: refreshing the browser resets the simulation to the
  seeded baseline (explicitly acceptable for Phase 5). No production or
  backend writes occur anywhere in this phase.
- Still no live backend/device connectivity and no conversational/Oyi
  control — explicitly out of scope until a later phase.

## What Phase 6 adds — Oyi Spatial Intelligence & Conversational Control

Lets Oyi understand and operate Luna spatially through the exact same
provider architecture every other surface uses:

```
User intent -> Oyi interpretation -> canonical asset/space resolution
  -> twin navigation/highlight -> optional runtime action -> response
```

The 3D twin is now part of the answer: asking about something shows it.

**Twin Intelligence contract** (`engine/twinIntelligence.ts`,
building-agnostic) — `TwinIntelligenceController` executes an
already-resolved `ParsedIntent` (canonical refs, never phrases) against
`TwinDataProvider` + `TwinRuntimeProvider` + a small `SceneActions`
callback interface (`navigateToAsset` / `navigateToSpace` /
`setSystemMode`) the host app implements with its own camera/React
logic — the controller never touches UI state or three.js directly. A
`ScopePolicy` (`isAllowed(ref)` + `denialMessage(ref)`) is supplied by
the caller, not hardcoded, so Facility/Consumer authorization is a
pluggable policy rather than an engine assumption. `TwinIntelligenceContext`
(`{lastAssetRef, lastSpaceRef}`) is the entire session memory contract —
plain data the host owns, not state the controller keeps for itself.

**Luna vocabulary + deterministic parser** (`luna/intelligence/`) — no
external LLM dependency. `lunaVocabulary.ts` is alias tables (system
names, ~45 asset aliases including multi-ref ones like "the living room
light" resolving to both circuits, ~14 space/room aliases) mapping
phrases to the exact canonical refs already established in Phases 3C-5 —
never invented identities. `lunaIntentParser.ts` is a priority-ordered
cascade of pattern matchers (command → problem → list-status → query →
show-system → navigate/show-asset → unknown), each either resolving a
complete intent or falling through to the next; order is what lets
"show me the water problem" get caught by the problem matcher before
the more general system matcher ever sees "water" in isolation, and
lets "open the living room" (no asset alias matches) fall through the
command matcher's "open" handling into space navigation instead of
being treated as a device command.

**Spatial response behavior** — every intent that resolves an asset or
system calls into `SceneActions`: `show_problem` finds the worst
current critical/warning asset (optionally scoped to one system),
switches Systems Mode, and flies to it; `list_status` does the same for
a kind+status filter ("which cameras are offline"); `navigate` dispatches
a space ref through `findSpace()` (`luna/interiors/lunaSpaceLookup.ts`)
to the right existing camera handler (`isolateLevelAndFly` /
`enterInterior` / `focusRoom`) without the intelligence layer needing to
know Luna's level/interior/room data shapes at all.

**Conversational control** — command intents resolve to one or more
canonical refs, validate against each asset's real `availableCommands`
(never assumed), and call `twinRuntimeProvider.execute()` — the exact
same command path the Phase 5 UI buttons use, never a parallel one. A
small synonym fallback (`stop`→`turnOff`, `start`→`turnOn`) is decided
against the asset's actual available commands, not assumed universally
supported — "can you stop it" works on a booster pump precisely because
its real capabilities only expose `power.on`/`power.off`.

**Read-only questions and explainable responses**
(`luna/intelligence/lunaExplain.ts`) — one function, dispatching by
*state shape* rather than `asset.type` (several backend types like all
four "power_system" assets share a type string but genuinely different
state shapes), builds every sentence directly from live
`runtime.state` fields — "Booster Pump 01 is faulted." / "Power is
currently supplied by the generator." / "Standby Generator 01 is
running, auto mode, 82% fuel." Never invents a field that isn't present;
a context-only asset (Grid, MDB) is disclosed as "no live telemetry
point" rather than fabricated.

**Session context memory** — `{lastAssetRef, lastSpaceRef}`, updated on
every response and threaded back into the next parse call, entirely
client-local. "Show me Booster Pump 02" then "what's wrong with it?"
then "can you stop it?" all resolve "it" to the same asset — verified
directly: "Show me the generator." → "Is it running?" correctly answers
about the generator with no re-mention.

**Facility vs Consumer scope** — `luna/intelligence/lunaScope.ts`'s
`buildScopePolicy(scope)` returns a policy where Consumer scope is
exactly `LUNA-L06-APT-A` and everything nested under it (a simple,
honest prefix check — no production auth exists yet, matching the
phase's own "does not need production authentication yet" allowance).
In Consumer mode, "show me the generator" is denied with a concise,
consistent sentence and **no navigation happens at all** — verified:
switching back to Facility scope and repeating the identical request
succeeds and re-navigates, proving the gate is real, not cosmetic.

**Oyi UI** (`ui/OyiPanel.tsx`) — deliberately restrained: one input row,
the last couple of exchanges (not a full scrolling transcript), a
"Context: X" line reflecting session memory, a Facility/Consumer scope
toggle, and the ten suggested prompts from the brief. All intelligence
lives in `App.tsx`'s controller instance; the panel only renders the
conversation and never resolves an intent or touches the runtime
provider itself.

**Verified against all 15 acceptance requirements**, including the
harder-to-fake ones: multi-asset commands ("turn on the living room
light" correctly executes on both light circuits and reports both
results), cascading problem detection ("what is wrong with the
building" after a Grid Failure scenario correctly found 4 issues across
two systems, not just the one directly triggered), and pronoun
resolution working across a real navigate→query round trip.

**Known limitations specific to Phase 6:**
- The parser is deterministic pattern matching, not a general NLU model
  — phrasing outside the demonstrated vocabulary (unusual synonyms,
  compound multi-intent sentences) will report "I didn't understand"
  rather than degrade gracefully. Explicitly the brief's own scope: "do
  not introduce an external LLM dependency yet."
  Extending vocabulary is additive (new alias-table rows), not a parser
  rewrite.
- "Show me critical issues" surfaces the single worst issue as the
  spatial focus and lists the rest by name in the response text; it does
  not yet offer a UI affordance to step through each one individually
  (the brief's "allow stepping through each issue" is satisfied at the
  data level — `OyiResponse.data.troubled` carries every ref — but no
  "next issue" button exists yet).
- Consumer scope's policy is a flat ref-prefix check, not a real
  permission graph (e.g. no notion of "shared services a resident is
  explicitly granted access to" beyond their own unit) — deliberately
  matching "this does not need production authentication yet."
  parenthetical in the brief.
- Session context is exactly two fields (last asset, last space); it
  doesn't disambiguate "it" when a command and a query happen to name
  different things in the same turn, and it resets on refresh along with
  the rest of Phase 5's simulation state.
- Still local-only: no external LLM, no live backend/device
  connectivity, no production writes, no fake camera feeds or
  telemetry — every number and status shown was already present in the
  runtime provider before Oyi was asked about it.
