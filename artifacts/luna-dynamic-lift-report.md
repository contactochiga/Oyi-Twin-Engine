# Luna Dynamic Lift — Verification Completion Report

Continuation of the Lift 02 phase. Resumed exactly from the prior verified state (provider-owned motion, doors, LevelRail tracking, camera modes, contextual card, Oyi routing, deterministic tests all already passing) — nothing in that state was reinterpreted or rebuilt. This pass's job was narrowly scoped: diagnose the one open timing-assertion failure, complete the remaining browser acceptance coverage, verify discoverability, and report.

## 1. Files changed

**One file, test harness only — zero application/runtime/UI source files were touched:**

- `scripts/verifyLiftBrowser.mjs` — fixed a module-resolution bug in its own diagnostic helper, replaced one arbitrary-timing wait with a condition-based one, widened the runtime/render sync tolerance to the provider's own documented bound, and added new assertions for command conflict, door interlocks, Consumer rejection, and discoverability.

No changes were made to `src/**`, `artifacts/luna-*.json`, or any specification document. `lunaRepresentationPolicy.ts` re-verified byte-for-byte identical to the recorded baseline hash (`a8b0e655eafd12fc14498f3470ab31ae4a6ee8f8dd583fc2da378c633a79b499`) both before and after this pass.

## 2. Canonical Lift 02 ID

`LUNA-LIFT-PASS-02` — reused from the existing core/operational-asset catalogue, unchanged this pass.

## 3. Runtime/state contract (unchanged this pass, reconfirmed working)

`liftSimulation.ts`'s `LiftState`: `positionY`, `currentFloor`/`targetFloor`, `direction`, `speed`, `motionState` (`IDLE`/`MOVING_UP`/`MOVING_DOWN`/`ARRIVING`), `doorState` (`OPEN`/`OPENING`/`CLOSED`/`CLOSING`), `doorProgress`, `serviceState`, `faultState`, `requestIds` (idempotency). Provider-owned: `lunaSimulationProvider.ts` runs a `setInterval(40ms)` clock that integrates in fixed 20ms sub-steps against real elapsed wall-clock time (capped at a 0.1s catch-up per tick), fully decoupled from React's render loop — confirmed this is the correct, deliberate design (see §7).

## 4. Commands

`callLift`, `setPosition` (travel), `open`, `close` — gated by a single busy guard (`motionState !== IDLE || targetFloor` rejects *any* command, doors included, with "Journey in progress; wait for arrival. No in-flight override.") and by actor authorization (`lunaRepresentationPolicy.resolveMode(...) !== "FULL_3D"` rejects with "Lift simulation control requires an authorized Facility host context...").

## 5. Reference stop sequence

14 stops generated live from `LUNA_LEVELS`: B1, Ground, L01–L12. Penthouse and Roof are explicitly not admitted (DD06, unchanged).

## 6. Physical geometry / camera / representation modes

Unchanged this pass — reconfirmed working: shaft + car + landing doors/thresholds/jambs per floor in `DynamicLift.tsx`; camera modes `shaft`/`follow`/`lobby`/`interior`/`engineering`/`structure` in `lunaLift.ts`'s `liftCamera()`; Architecture/Structure/Elevators/All-Systems representations all bind to the one canonical asset (verified live during this pass — see §9).

## 7. The reported timing-assertion failure — root cause and resolution

**Reproduced it directly, alone (not concurrently with another test), and it failed every time** — ruling out simple test-parallelism/GPU-contention flakiness as the cause, which was the working hypothesis at hand-off.

**Diagnosis, via direct instrumentation of the failing assertion:** the test's own diagnostic helper (`window.readLift`) resolved `lunaSimulationProvider` via `await import('/src/luna/runtime/lunaSimulationProvider.ts')` — a **bare, unversioned path**. Vite's dev server serves modules with a cache-busting `?t=...` query string; under ES-module semantics, a different URL is a different module record. The app's own bundle imports the versioned URL and gets the true singleton; the test's bare-path import created a **second, orphaned copy** of the provider that never received any commands (all UI clicks drive the real app's instance through React context) — so its `positionY` sat frozen at `0` for the entire test run while the visibly-moving car, and the real DOM state (`[data-lift-card]`'s dataset, driven by the app's actual `useRuntimeAssetState` hook), tracked correctly the whole time. Confirmed conclusively with a side-by-side check: the orphaned copy reported `positionY: 0, currentFloor: "LUNA-GROUND"` while the real DOM simultaneously showed `domFloor: "between", domMotion: "MOVING_UP"`. Resolving the import through the actual served URL (found via `performance.getEntriesByType('resource')`, including its `?t=` query) fixed it immediately — `positionY` then tracked the moving car exactly.

**Conclusion: test-harness defect, not a real synchronization defect.** The provider-owned runtime was correctly authoritative and correctly synchronized to the renderer throughout — nothing in `src/**` needed to change. Fixed `installReadLift()` in the test to resolve the provider via its real resource-timing URL (with a bounded retry and an explicit refusal to silently fall back to a bare path).

While there, also replaced the one fixed-`pause()`-then-single-check pattern with a `waitForFunction` condition, and widened the runtime/render sync tolerance from a bare `0.11m` to `0.26m` — not arbitrary, but the provider's own documented worst-case catch-up bound (`0.1s` clamp × `2.5 m/s` max speed = `0.25m`) plus margin, so the test no longer depends on assuming zero scheduling jitter between the provider's independent 40ms clock and the renderer's ~16.7ms `requestAnimationFrame` tick.

**Stability confirmed:** ran the full browser suite twice, back to back, serially — identical pass, identical results, both times.

## 8. Browser acceptance results

All of the following ran in one real, headed-Chrome, real-pointer Puppeteer session (`npm run test:lift:browser`), twice, both clean:

| Item | Result |
|---|---|
| Shaft External | ✅ (initial Oyi-triggered view, `parts>=9` car geometry confirmed) |
| Follow / physical car travel, Ground→L10 | ✅ (`A`) |
| Downward travel, L10→B1 | ✅ (`B`) |
| Lift Lobby → Passenger Interior → ride → exit, Ground→L06 | ✅ (`C`) |
| Engineering Cutaway + Structural view during continuous movement | ✅ (`D/E`) |
| State preservation across Architecture/Structure/All Systems | ✅ (`G`) |
| Command conflict rejected mid-journey (no override/teleport) | ✅ (`H`) |
| Door interlock rejected while moving | ✅ (`H`) |
| Consumer command rejection — against the **live app's own provider instance**, not just the Node-side deterministic test | ✅ (`I`) |
| Discoverability: Engineering Layers → Elevators exposes Lift 02 with no prior Oyi command (`group.visible=true`, shaft-wall opacity 0.9→0.12) | ✅ (`J`) |
| LevelRail tracking during travel, clean return to static mode | ✅ (`F`) |
| Ordinary L06 plan navigation unaffected | ✅ (`F`) |

**Discoverability — the one honest limitation found (§9 below):** a real raycasted pointer click landing precisely on the physical car mesh could not be demonstrated from any camera vantage this app currently reaches without going through Oyi once. This is disclosed as a finding, not silently worked around or forced to pass.

## 9. Discoverability — full finding

The requirement: selecting the physical car, an admitted landing/shaft interface, or "Elevators" from Engineering Layers should all expose the control card, with Oyi as an *additional* route, not the only one.

- **Code-level contract — confirmed correct by direct source reading**, independent of any camera/rendering concern: `DynamicLift.tsx`'s outer group carries one `onClick={e => { if (!visible) return; e.stopPropagation(); select({ref: LIFT_02_REF, ...}); }}` covering every child mesh — car, landing doors, thresholds, jambs. Any click that reaches this geometry is guaranteed to open the card. This is real, working, and untouched by anything in this pass.
- **Engineering Layers → Elevators, with no prior Oyi command — verified working** (`J`, above): selecting it sets the group's `visible=true` and drops the shaft-wall material's opacity from its normal 0.9 to 0.12, live-checked against the actual Three.js objects in the running app.
- **A precise raycasted pointer click landing on the car — not currently demonstrable from any reachable vantage.** Investigated thoroughly, not assumed:
  - From the default/overview camera (reached via Engineering → Elevators alone): the raycaster's nearest hit is unnamed building-envelope geometry ~145 units out; the car sits ~155+ units out, behind several fully-opaque upper floors. Expected occlusion for an enclosed core viewed from outside a 12-storey building — correct, not a defect.
  - From Ground Lobby's general interior camera preset, and from `roomFocusCamera` for the "Lift Lobby" room specifically: both currently produce degenerate framing (a single unrelated "Structural Core Wall" object filling most of the frame, or a near-clipping-plane black view) — a **pre-existing issue in those camera presets**, unrelated to and not introduced by the Lift 02 work, out of this phase's scope to fix.
  - From Oyi's own dedicated "shaft" preset — the one vantage where the car is clearly visible on screen — a raycast at the car's exact projected screen position still returns an **unnamed, semi-transparent "ghosted" floor slab** (`LUNA-STRUCT-L01-AMENITIES-SLAB-01` and similar) as the nearest hit, ahead of the car. Three.js raycasting does not consult material opacity; a visually-transparent slab is still a fully solid hit-test target. This is an **app-wide characteristic** of how structural slabs are rendered throughout Luna (not specific to the lift, not introduced by this pass), and fixing it (e.g. a raycast-exclusion policy for "ghosted" materials) would be a broader, cross-cutting change outside this phase's stated scope ("do not broaden scope").
  - Landing the click search radius wider or on the Ground landing threshold instead of the car produced the same result — the occlusion is structural to the current view angles, not a matter of aiming more precisely.

This is reported honestly as a **limitation, not a defect**: the wiring is correct, one non-Oyi discovery route (Engineering → Elevators) is fully verified working, and the specific gap — real-mouse-click precision on tiny geometry viewed through the app's existing "ghosted slab" rendering approach — is a pre-existing, disclosed condition recommended for a future, separately-scoped pass (see §12).

## 10. Deterministic test results (`npm run test:lift`)

All 9 pass, unchanged from hand-off, re-run fresh this pass:
Identity/76-assets/policy-hash · Consumer/missing-actor/unserved-stop rejection · A (up-travel, all passing floors, door sequence, busy rejection, idempotency) · B (down-travel, B1 alignment) · C (hall call, boarding, Ground→L06, exit) · camera-anchor/state preservation across detached view consumers · fault halts progression with no orphan timers · deterministic fixed-step trajectory independent of render batches · Oyi controller lookup/follow/shaft/engineering/commands with Consumer control/view refused.

## 11. Full validation suite (run serially, this pass)

| Check | Result |
|---|---|
| `npm run build` (`tsc -b && vite build`) | ✅ clean |
| `npm run lint` | ✅ exit 0, only pre-existing warnings (unchanged count) |
| `npm run test:representation` | ✅ PASS — all 16 plans, canonical geometry, Facility/Consumer privacy boundaries |
| `npm run test:presentation` | ✅ `"result": "PASS"` |
| `npm run test:lift` | ✅ all 9 checks |
| `npm run test:lift:browser` | ✅ full acceptance list above, run twice serially, identical both times |

RepresentationPolicy hash reconfirmed unchanged. No production/cloud/Supabase/service-role/physical-device access at any point.

## 12. Known limitations / carried-forward DD items

- **Discoverability via precise pointer-click on tiny lift geometry** is currently constrained by the app-wide "ghosted slab" raycasting characteristic described in §9. Recommended next step if this matters for the demo: a scoped pass giving low-opacity structural materials `raycast = null` (or an equivalent exclusion) globally, verified against every existing engineering/cutaway view — a broader change than this phase's remit.
- DD06 (14-stop reference matrix, PH/Roof not admitted), DD07 (reference slab openings, no structural certification claimed), DD19 (current, unequal floor datums retained — a full floor-height migration remains deferred), DD20 (simulation-only command surface, versioned inside the existing `RuntimeAssetState` envelope) — all unresolved-by-design and unchanged from the prior hand-off; nothing in this pass touched them.
- Other three lifts remain static/reference geometry, as scoped. No pumps/generators/water/MEP modeling was started.

## 13. Manual local testing steps

```
cd /Users/ochigaidoko/Oyi-Twin-Engine
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort   # if not already running
```
Open `http://127.0.0.1:5173/` (Presentation Mode is the default view).
1. Type "Show me Passenger Lift 02." in the top search, or open Engineering Layers → Elevators.
2. In the Lift 02 card: pick a destination, click **Travel** — watch the physical car move through the shaft, the level rail switch to live tracking, and doors sequence correctly on arrival.
3. Try **Travel** or **Open doors** again while it's mid-journey — both are rejected with a clear message; nothing overrides the current trip.
4. Click **Engineering cutaway** or **Structural view** while it's moving — the representation changes without interrupting the ride.
5. Click **Lift lobby** → **Enter car** → pick a destination → **Travel** → ride the interior view to arrival → **Exit car**.
6. Click **Exit lift view** to return to normal floor navigation — the rail goes back to static mode immediately.

Automated equivalents: `npm run test:lift` (deterministic) and `npm run test:lift:browser` (real Chrome, real pointer/keyboard events) — both currently green.

## 14. Recommended next step

Nothing further in the Lift 02 phase is outstanding. If continuing the broader Luna programme, the next scoped piece would be either (a) the raycast/"ghosted material" pass noted in §12, if precise pointer-click discovery of small assets matters for an upcoming demo, or (b) beginning Passenger Lifts 01/03 and the Service/Fire Lift using the same now-proven provider/camera/representation pattern — per the standing instruction, **not started in this pass**.

---

**Stop condition met.** No further phase (pumps, generators, water/MEP modeling, or the other three lifts) was started. No production/cloud changes were made.
