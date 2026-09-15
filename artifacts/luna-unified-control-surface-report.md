# LUNA — Unified Spatial Control Surface v1

Status: **Complete and verified.** Elevator runtime, RepresentationPolicy, camera architecture, and Oyi parser/controller were not modified — this pass is UI/control-location only.

## What changed

The elevator control surface moved from an isolated bottom-right card to one persistent, tabbed **Elevator Control Board** anchored beside the existing left-side level/system rail. The board is Luna's first consumer of a new, building-agnostic **`SystemControlBoard`** shell (`System → Asset Selector → Asset State → Commands → Views`), designed so future systems (Water, Electrical, Fire, HVAC, Access, CCTV, Network/Edge) can reuse the exact same pattern later without any elevator-specific code.

| File | Role |
|---|---|
| `src/engine/components/spatial/SystemControlBoard.tsx` | New. Generic, reusable shell — title, tabs, collapse toggle, glass chrome. No system-specific knowledge. |
| `src/luna/lift/LiftControlsPanel.tsx` | New. All lift-specific content (state rows, destination selector, Call/Travel/Open/Close, view buttons, DD06/DD11/DD20 disclosure) extracted from the old card so it can be embedded in either surface without duplicated logic. |
| `src/luna/lift/ElevatorControlBoard.tsx` | New. Luna-specific: feeds `SystemControlBoard` the four canonical lifts as tabs, renders `LiftControlsPanel` for the focused one. |
| `src/luna/lift/LiftContextCard.tsx` | Slimmed to a thin wrapper around `LiftControlsPanel` inside the old `ContextCard` chrome. Kept alive, but no longer reachable for lift refs (see below) — nothing was deleted. |
| `src/App.tsx` | Wires the board into the `.luna-rail` flex container; derives visibility/focused-tab as plain expressions (no new parallel state); bypasses the old bottom-right card for lift refs only. |
| `src/App.css` | One line: `gap: 10px` added to `.luna-rail` so the rail and board don't touch. |

### Visibility and focus — derived, not new state

```
elevatorBoardOpen = interactionScope === "facility" && (activeSystem === "vertical-transport" || activeLift !== null)
focusedLiftRef    = activeLift?.ref ?? LIFT_02_REF
```

Both are plain expressions computed from state that already existed (`activeSystem`, `activeLift`, `interactionScope`) — there is no new "which lift is the board showing" state to fall out of sync. `LIFT_02_REF` (the golden reference lift) is the deterministic default before anything has ever been focused, matching the existing default used throughout the four-lift phase.

Tab clicks call the same `showLiftView(ref, ...)` function every other lift-focusing path in the app already uses (spatial click, Oyi selection) — switching tabs is not a new code path, it's the existing, already-verified camera/LevelRail ownership-transfer logic reused for a third trigger.

### The three discoverability routes

1. **Engineering → Elevators** sets `activeSystem = "vertical-transport"` → board opens immediately, no camera flight beyond the standard engineering-layer reframe every system already does.
2. **Spatial click on any of the four lifts** → the existing selection effect calls `showLiftView(ref, "shaft")` → board opens, focused on that lift.
3. **Oyi** (`"Show me Passenger Lift 03"`, `"Follow the Service Lift"`, etc.) → routes through the same `showLiftView` call via `sceneActions.navigateToAsset`/`assetView` → board opens, focused on that lift. Oyi remains an additional route, never the only one.

If pointer picking is blocked by the pre-existing ghosted-slab raycast limitation (documented in `artifacts/luna-dynamic-lift-report.md` §7 — semi-transparent slabs remain solid raycast targets in Three.js regardless of visual opacity), Engineering-system selection is the reliable fallback; no renderer-wide picking rewrite was attempted, per the brief.

### Information vs. control

Primary operational controls (state, Call/Travel/Open/Close, view switches) now live in the left-side board. The bottom-right `ContextCard` surface still exists for every non-lift "other" selection (devices, sensors, etc.) — untouched — establishing the pattern without a wholesale redesign.

## Verification

### Full regression suite — all green

```
tsc -p tsconfig.app.json --noEmit         PASS (0 errors)
npm run lint                              PASS (pre-existing warnings only, no new ones)
npm run build                             PASS
npm run test:representation               PASS — RepresentationPolicy hash unchanged
npm run test:presentation                 PASS
npm run test:lift                         PASS (9/9 deterministic cases)
npm run test:lift:browser                 PASS (11/11 real-browser cases, incl. Consumer rejection)
npm run test:four-lift                    PASS (12/12 deterministic cases)
npm run test:four-lift:browser            PASS (8/8 real-browser cases)
npm run test:control-surface:browser      PASS (10/10 — new, this phase)
```

Two pre-existing browser scripts (`verifyLiftBrowser.mjs`, `verifyFourLiftBrowser.mjs`) needed a small update: they used to click the old bottom-right card's ✕ ("Close") button to fully deselect a lift. Since that button is no longer reachable for lift refs (control moved to the board, which has no equivalent ✕ — it auto-hides once neither Elevators engineering nor a lift focus is active), both scripts now use `"Exit lift view"` (+ switching Engineering away from Elevators where needed) to reach the same fully-closed state. This is a test-harness adaptation to the relocated control surface, not a weakening of what's tested — every original assertion in both suites still runs and still passes.

### New script: `scripts/verifyControlSurface.mjs` (`npm run test:control-surface:browser`)

Covers the brief's 11-item checklist end to end, against the real running app (not a mock):

| # | Verified |
|---|---|
| 1 | Engineering → Elevators opens the board with **no** Oyi command |
| 2 | Default focused tab is deterministic — Passenger Lift 02 |
| 3 | Switching 01→02→03→Service updates the **same** board (DOM count stays at 1 throughout); Service tab discloses the DD06/DD11/DD20 note |
| 4 | Commanding the focused tab (Lift 01, Travel) leaves Lift 02/03/Service all `IDLE` |
| 5 | Cycling all four tabs while Lift 01 and Lift 03 are both mid-flight disturbs neither — both arrive at their original destinations |
| 6 | Follow (clicked from the board) tracks the currently focused lift via LevelRail |
| 7 | Switching tabs then Follow transfers LevelRail/camera ownership cleanly to the new lift |
| 8 | "Exit lift view" restores the LevelRail to `static` mode |
| 9 | Oyi ("Show me Passenger Lift 03") still opens/focuses a lift on the same board |
| 10 | Consumer boundary unchanged — `elevatorBoardOpen` itself is gated on `interactionScope === "facility"`, and the live provider still rejects a Consumer identity mid-focus |
| 11 | Existing lift/four-lift suites remain green (see table above) |

Raw pass/fail JSON: `artifacts/luna-control-surface-browser-results.json`. All 10 items passed on the first corrected run; full log reproduced below.

```
1: Engineering -> Elevators immediately opens the unified control board with no Oyi command required
2: default focused tab is deterministic (Passenger Lift 02, aria-selected + data-lift-ref both confirm)
3: switching 01 -> 02 -> 03 -> Service updates one persistent board (never a second board), Service tab discloses the DD-required note
4: commanding the selected tab (Lift 01 Travel) leaves every other canonical lift IDLE — commands are scoped to the focused lift only
5: cycling through all four tabs while Lift 01 and Lift 03 are both mid-flight never disturbs either lift's destination — both arrive correctly
6: Follow (clicked from the board) tracks the currently focused lift (Lift 01) via LevelRail
7: switching the active lift (tab 01 -> tab 03) then Follow transfers camera/LevelRail ownership cleanly to the newly selected lift
8: exiting control (Exit lift view) restores the LevelRail to normal static floor navigation
9: Oyi ("Show me Passenger Lift 03") still opens/selects a lift, correctly focusing its tab on the same unified board — Oyi remains an additional route, not the only one
10: Consumer permission boundary unchanged — elevatorBoardOpen itself is gated on interactionScope==="facility", and the live provider still rejects a Consumer identity commanding the currently-focused lift
```

### One honestly-disclosed limitation, not fixed here (matches the brief's scope)

`interactionScope` (Facility vs. Consumer) is currently only switchable from the older, non-presentation dev-harness UI (`OyiPanel`'s Facility/Consumer buttons, gated by `!presentationMode`) — it is not reachable from Presentation Mode, where the new board lives. This is a **pre-existing** condition of the app, unrelated to this pass: the dev-harness branch and the Presentation-Mode branch (`luna-rail`, the new board, `OyiOrb`) are mutually exclusive render paths, and this was already true before this phase touched anything. Because of that, "Consumer permissions remain unchanged" was verified the same way the pre-existing lift suites already verify it — directly against the live `runtime.execute()` authorization boundary with a Consumer identity — rather than by fabricating a UI path that doesn't exist. The code-level gate added this phase (`elevatorBoardOpen` requiring `interactionScope === "facility"`) reuses the exact same scope check that already gated spatial lift selection before this change.

## Screenshots

- `artifacts/luna-control-surface-auto-open.png` — board opening automatically from Engineering → Elevators, default Lift 02 focused
- `artifacts/luna-control-surface-service-tab.png` — Service Lift tab focused, DD06/DD11/DD20 disclosure visible, all four shafts + tabs + level rail visible together
- `artifacts/luna-control-surface-follow-transfer.png` — after switching tabs 01 → 03 and re-engaging Follow, camera/rail now tracking Lift 03
- `artifacts/luna-control-surface-oyi-select.png` — board opened and focused via Oyi ("Show me Passenger Lift 03"), proving Oyi remains a working, additional route

## Preserved, unmodified (spot-checked this pass)

Four-lift runtime architecture · independent per-lift state (`liftRemainders` Map) · provider-owned motion (`advanceLiftClock`) · RepresentationPolicy (hash re-confirmed identical) · LevelRail tracking mechanism · camera architecture (`liftCamera`, `followTarget`) · Engineering Layers · Cutaway/Explode · Facility/Consumer permission boundary in `runtime.execute()` · GLB asset pipeline · Oyi parser/controller (`lunaIntentParser.ts`, `TwinIntelligenceController`) — none were touched; only their existing entry points were reused.

## Stop condition

This UI/control refinement is complete. Per the brief: **stopping here** — water/plumbing controls are not started.
