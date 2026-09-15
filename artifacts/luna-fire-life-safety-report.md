# Luna Fire & Life Safety System V1 — Final Report

Status: **Complete.** Full deterministic + browser regression green, including explicit Elevator/Water/Electrical regression checks re-run after every change. No HVAC, Access, CCTV, or Network work begun, per the brief's explicit stop condition.

## Screenshots

| # | Requirement | File |
|---|---|---|
| 1 | Fire NORMAL state | `artifacts/luna-fire-normal-state.png` |
| 2 | Whole-building Fire Engineering view | `artifacts/luna-fire-whole-building.png` |
| 3 | Alarm/detection network | `artifacts/luna-fire-alarm-network.png` |
| 4 | Fire-water network | `artifacts/luna-fire-water-network.png` |
| 5 | B1 Fire plant | `artifacts/luna-fire-b1-plant.png` |
| 6 | Fire riser | `artifacts/luna-fire-riser.png` |
| 7 | L06 fire zone | `artifacts/luna-fire-l06-zone.png` |
| 8 | Selected detector | `artifacts/luna-fire-selected-detector.png` |
| 9 | Simulated alarm state | `artifacts/luna-fire-simulated-alarm.png` |
| 10 | Fire Control Board | `artifacts/luna-fire-control-board.png` |
| 11 | Oyi incident investigation | `artifacts/luna-fire-oyi-investigation.png` |
| 12 | Recovery/reset state | `artifacts/luna-fire-recovery-state.png` |

Screenshots 1, 9, 12 directly show the live `data-fire-status-summary` widget reading NORMAL, ALARM (with originating device/zone identified), and NORMAL again after recovery — the acceptance criterion's core visual proof of the same canonical/runtime truth propagating through the 3D Twin, Control Board, and Oyi.

## Files changed

- `src/luna/runtime/lunaFireResolver.ts` (**new**) — `resolveFireState()`, `useFireState()`, `useFireEvents()`, `FireBuildingState`, `FireOperationalState`.
- `src/luna/runtime/lunaSimulationProvider.ts` — `FireEvent` interface, fire event log + `logFireEvent()`/`getFireEvents()`, `recomputeFireNetwork()` (independent alarm/hydraulic halves), edge-detection trackers, hooks in `execute()`/`simulateEvent()`/`resetAll()`.
- `src/luna/runtime/lunaRuntimeSeed.ts` — panel gained `active_zone_ref`/trouble check; riser and L06 fire branch upgraded from static/context-only to `{pressurized, pressure_bar}` derived telemetry.
- `src/luna/runtime/lunaScenarios.ts` — `smoke-alert` scenario rewritten to patch real state + call `recomputeFireNetwork()` (was hand-set static patches, the "V0" pattern Water/Electrical each started with too).
- `src/luna/operational/lunaEngineeringRelationships.ts` — one new `supplied_by` edge (pump → tank).
- `src/luna/intelligence/lunaVocabulary.ts` — L06 fire branch + 6A smoke detector aliases; fixed the fire system alias's pattern-sort bug.
- `src/luna/intelligence/lunaIntentParser.ts` — `matchFireStatus` matcher.
- `src/luna/intelligence/lunaExplain.ts` — `explainFireState()`, ref-anchored narrative branches.
- `src/luna/operational/FirePlantEquipment.tsx` (**new**) — panel/pump/tank/detector geometry.
- `src/luna/operational/OperationalAssetLayer.tsx` — Fire equipment dispatch + B1 plant runs wired into `LevelOperationalLayer`.
- `src/luna/operational/LunaRiserShafts.tsx` — fire riser wired to `pressurized` via `RiserShaft`'s `energized` prop.
- `src/luna/operational/lunaFireBoard.ts` (**new**) — 7-tab asset registry.
- `src/luna/operational/FireAssetPanel.tsx` (**new**) — generic asset panel template + `ActiveIncidentSummary`.
- `src/luna/operational/FireControlBoard.tsx` (**new**) — `FireStatusSummary` + board wrapper.
- `src/luna/policy/lunaUnitMepAssets.ts` — **disclosed fix**, see below.
- `src/App.tsx` — Fire board state/wiring, context-card guard extension.
- `scripts/verifyFire.mjs`, `scripts/verifyFireBrowser.mjs` (**new**).
- `package.json` — `test:fire`, `test:fire:browser` scripts.

## Existing assets reused

All 7 canonical Fire assets (`LUNA-B1-FIRE-PANEL-01`, `LUNA-B1-FIRE-PUMP-01`, `LUNA-B1-FIRE-TANK-01`, `LUNA-GROUND-FIRE-DET-01`, `LUNA-L06-APT-A-ENTRY-SMOKE-01`, `LUNA-RISER-FIRE-01`, `LUNA-L06-FIRE-BRANCH-01`) — **zero new canonical operational assets were created**, matching the non-negotiable "do not fabricate certified... invent" instructions in spirit and the general convention every prior system phase has followed.

## Alarm/detection topology

`LUNA-B1-FIRE-PANEL-01` ← `LUNA-GROUND-FIRE-DET-01` / `LUNA-L06-APT-A-ENTRY-SMOKE-01`. Panel derives `alarm_active` (any detector alarm/smoke true) and `active_zone_ref` (the originating detector). Independent `trouble` boolean models a controller fault unrelated to any alarm.

## Hydraulic topology

`LUNA-B1-FIRE-TANK-01` → `LUNA-B1-FIRE-PUMP-01` (new `supplied_by` edge) → `LUNA-RISER-FIRE-01` → `LUNA-L06-FIRE-BRANCH-01`. Pump Start/Stop produce real `pressure_bar` telemetry; riser and branch pressurization cascade from the pump. Deliberately **not coupled** to the alarm network — real fire pumps start on pressure drop from actual sprinkler/hydrant flow, not directly from the alarm signal.

## Runtime state / resolver / event model

See `docs/LUNA_FIRE_LIFE_SAFETY_REFERENCE_SPEC.md` §3–4 in full. Summary: `resolveFireState()` is a pure derived function (never stored state), `fireState` limited to `normal | alarm | trouble` (no invented standards terminology), event log capped at 40/newest-first piggybacking on the existing pub-sub.

## Simulation behavior

Uses the existing `smoke-alert` scenario and runtime provider — no separate Fire simulator. Sequence: NORMAL → smoke detected → detector alarm event → panel alarm_active=true → Building Fire State=ALARM → Control Board/event log/Oyi all reflect the same live truth. Recovery is symmetric: clearing the detector returns to NORMAL and logs "Alarm cleared".

## Oyi interactions

All 13 target phrases verified end-to-end (parser + narrative), listed in `artifacts/luna-fire-life-safety-reference.json`. One cross-system vocabulary bug was found and fixed: "fire-water" phrases previously resolved to the water system due to a substring match in the longest-pattern-first sort — fixed with explicit compound patterns on the fire alias, verified water's own phrasing is unaffected.

## Physical geometry

New `FirePlantEquipment.tsx`: wall-mounted alarm panel with a status-lamp face, pump/motor assembly with discharge manifold, cylindrical tank with support skirt, ceiling-mounted smoke detector disc — manufacturer-neutral, no invented model/brand. Fire riser reuses `RiserShaft` at its default round shape with a `pressurized`-driven glow.

## Safety boundaries preserved

- `LUNA-B1-FIRE-PANEL-01.availableCommands` is empty (verified by assertion) — silence/reset remain unmapped to any runtime command, the pre-existing architectural decision this phase respected rather than worked around.
- `explainFireState()` output always includes "(reference simulation)".
- No fire recall, firefighter lift certification, evacuation lift behavior, or emergency control authority was fabricated (DD20 untouched).
- No sprinkler activation hydraulics, pump sizing, or tank capacity were fabricated (DD11 unresolved).

## Unresolved DD11/DD15/DD20 items

Documented in full in the spec §13 and the reference JSON's `unresolvedDesignDecisions`. In short: fire engineering sizing/coverage/zoning (DD11), structural fire-rating coordination beyond Phase 13 (DD15), and elevator fire-mode/recall authority (DD20) all remain unresolved and were not fabricated.

## Representation policy — disclosed change

`RepresentationPolicy.ts` itself is byte-unchanged (re-verified via the `test:lift` hash assertion, unaffected by anything in this phase). A genuine pre-existing gap was found and fixed: `FACILITY_OWNED_UNIT_ASSET_REFS` in `lunaUnitMepAssets.ts` (the disclosed allowlist mechanism for Facility-owned service infrastructure inside a private unit) did not include the 6A smoke detector, causing Facility identity to see it as `HIDDEN` — discovered via a failing browser test at the "selected detector" screenshot step. Fixed by adding the detector to the allowlist with an explanatory comment (fire detectors are Facility/life-safety responsibility regardless of unit location, the same category as the already-listed meters/DBs/circuits). This is additive data only. The equivalent gap for the water leak sensor (`KITCHEN-LEAK-01`) was found during the same investigation and left unfixed, as out of scope for a Fire-only phase.

## Test results

- **Deterministic** (`npm run test:fire`) — 16/16 PASS.
- **Browser** (`npm run test:fire:browser`) — 16/16 PASS, all 12 required screenshots, Elevator/Water/Electrical regression included.
- **Full regression re-run, all green**: `test:lift` (deterministic + browser, RepresentationPolicy hash unchanged), `test:four-lift` (deterministic + browser), `test:control-surface:browser`, `test:water:browser`, `test:electrical:browser`, `test:electrical-live-ops` (deterministic + browser), `test:representation`, `test:architecture`, `test:presentation`, `tsc -b`, `npm run build`, `npm run lint`.

## Known limitations

- `fireWaterAvailable` reflects the tank's registered existence, not live level/pressure sensor telemetry (no such canonical field exists).
- Zoning is scoped to the one reference incident location (L06); no other floor has a registered fire branch.
- The alarm and hydraulic networks are intentionally never cross-triggered — a real deployment would still require a certified fire-engineering decision about any interlock, which this reference system does not presume to make.
- Camera auto-framing for individual B1 equipment (a limitation noted in prior phases) is unchanged here — out of scope, no new camera system was built.

## Regressions checked

Four lifts, Elevator Control Board, Water reference chain + Control Board, Electrical V1/V1.1 (including the live building-supply summary), Unified Control Surface, Presentation, Representation (byte-hash unchanged), Architecture — all explicitly re-verified green after every Fire-phase edit, including after the representation-policy data fix.

## Stop condition

Complete and fully verified. Per the brief's explicit instruction: no HVAC, no Access/CCTV/Network, no new runtime/control architecture, `RepresentationPolicy.ts` unchanged (byte-hash re-verified), no production/cloud changes.
