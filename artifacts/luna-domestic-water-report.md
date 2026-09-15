# Luna Digital Building Standard + Domestic Water Reference System V1 — Report

Luna's first complete, spatially traceable, realistically represented and operationally simulated building-service chain: incoming supply → B1 plant → riser → L06 branch → Apartment 6A fixtures, plus the standard that future systems (water generalization, electrical, fire, HVAC, access, CCTV, network/edge) will be built against.

## 1. Files changed

**New:**
- `docs/LUNA_DIGITAL_BUILDING_STANDARD.md` — the 14 locked principles (Part A).
- `docs/LUNA_DOMESTIC_WATER_REFERENCE_SPEC.md` — audit findings + reference chain design (Parts B/C).
- `src/luna/operational/WaterPlantEquipment.tsx` — recognizable tank/treatment/pump/valve geometry.
- `src/luna/operational/lunaWaterBoard.ts` — Water Control Board asset registry.
- `src/luna/operational/WaterAssetPanel.tsx` — per-asset state/commands/relationships content.
- `src/luna/operational/WaterControlBoard.tsx` — Luna-specific `SystemControlBoard` consumer.
- `scripts/verifyWater.mjs`, `scripts/verifyWaterBrowser.mjs` — deterministic + browser test suites.
- `artifacts/luna-domestic-water-reference.json`, this report.

**Modified (all additive except one CSS fix):**
- `src/luna/operational/lunaMepBackbone.ts` — new intake asset, 3 bathroom cold fixture branches, 2 bathroom drains.
- `src/luna/operational/lunaOperationalAssets.ts` — `LUNA-B1-WATER-TANK-01` gains a `parentRef` (previously unset).
- `src/luna/policy/lunaUnitMepAssets.ts` — new refs added to the existing Facility-owned-unit-asset allowlist.
- `src/luna/operational/lunaEngineeringRelationships.ts` — 3 new typed edges (see §7).
- `src/luna/runtime/lunaRuntimeSeed.ts` — new intake row; riser/branch upgraded from static to derived telemetry; 6A meter gains `supply_active`.
- `src/luna/runtime/lunaSimulationProvider.ts` — new `recomputeWaterNetwork()` pure function, hooked into `execute()` and `resetAll()`.
- `src/luna/runtime/lunaScenarios.ts` — 3 existing water scenarios now also call the new recompute function.
- `src/luna/operational/OperationalAssetLayer.tsx` — dispatches the 4 new equipment components by ref; new B1/6A `PipeRun` geometry.
- `src/engine/components/MepComponents.tsx` — `PipeRun` gains an optional `flowing` prop (default false, backward-compatible).
- `src/luna/intelligence/lunaIntentParser.ts` — 3 small, generic regex broadenings (`plant`, `trace`, `isolation` — none water-specific).
- `src/App.tsx` — Water Control Board wiring, mirroring the elevator board pattern exactly.
- **`src/engine/components/spatial/SystemControlBoard.tsx`** — real bug fix: tabs now wrap and have a `minWidth`, fixing a flexbox overflow where more than ~5 tabs would spill outside the board's glass background onto the raw canvas underneath, becoming unclickable in some camera states. Found via the 8-tab water board; also benefits the existing 4-tab elevator board and every future consumer of this shell.
- `scripts/verifyLift.mjs` — hardcoded catalog-size assertion updated 76→82 (see §3).

**Not touched:** `RepresentationPolicy` (hash re-verified identical), `TwinRuntimeProvider`/`TwinDataProvider` interfaces, `TwinIntelligenceController`, the four-lift system, the Ground asset pipeline, Facility/Consumer scope architecture, GLB pipeline.

## 2. Canonical assets — reused vs. added

**Reused unchanged (21 refs):** the full pre-existing B1 plant (tank, treatment, both pumps, meter, header valve), riser, L06 branch, 6A valve/meter, apartment main/hot/cold distribution, kitchen and primary-bathroom fixture branches, and the full drainage chain (main, riser, branch, 6A drain, kitchen drain, primary-bath drain). See `luna-domestic-water-reference.json` for the exact list.

**Added (6 refs, all new, none duplicating anything):**

| Ref | Role |
|---|---|
| `LUNA-B1-WATER-INTAKE-01` | Incoming supply / backflow demarcation (EQ-WATER-INTAKE, previously unregistered) |
| `LUNA-L06-APT-A-BATH-01-FIXTURE-BRANCH-02` | Primary bathroom cold branch (existing branch there was hot-only) |
| `LUNA-L06-APT-A-BATH-02-FIXTURE-BRANCH-01` | Bathroom 2 cold branch (had none before) |
| `LUNA-L06-APT-A-BATH-03-FIXTURE-BRANCH-01` | Bathroom 3 cold branch (had none before) |
| `LUNA-L06-APT-A-BATH-02-DRAIN-01` | Bathroom 2 waste connection |
| `LUNA-L06-APT-A-BATH-03-DRAIN-01` | Bathroom 3 waste connection |

`LUNA-B1-WATER-TANK-01` gained a `parentRef` of the new intake — previously unset, so this is additive, not a change to an existing relationship.

## 3. Discrepancy handled: catalog size assertion

`scripts/verifyLift.mjs` asserted a hardcoded total-asset count (76). Adding 6 legitimate new assets makes this 82. Updated with a comment explaining why — a mechanical consequence of real catalog growth, not a masked regression (every other assertion in that suite, including the RepresentationPolicy byte hash, is untouched and still passes).

## 4. Physical equipment created (Part D)

Four new recognizable equipment components (`WaterPlantEquipment.tsx`), replacing the generic tinted box every other operational asset still uses, for the 6 refs that warrant it (tank, treatment, both pumps, both valves):

- **Water tank** — cylinder body + domed cap + an inner fill band whose height tracks live `level_pct`, so tank level reads spatially.
- **Treatment unit** — squat housing + filter canister, a distinct silhouette from both tank and pumps.
- **Booster pump** (×2) — volute body + motor + base plate, with a slow shaft-coupling rotation while `running` (subtle, not an arcade spin).
- **Isolation valve** (×2, B1 header and 6A) — body + handle that visibly rotates between open (parallel to the pipe) and closed (perpendicular).

All reuse the existing `useSystemAssetOpacity`/`useSelection`/`useRuntimeAssetState` hooks exactly like every other operational asset — geometry renders state, never owns it (Standard §3). REFERENCE DESIGN throughout: recognizable equipment category, no manufacturer/model claimed (Standard §7).

**Piping:** reused the existing `PipeRun` primitive (previously only used for HVAC refrigerant lines) for the B1 plant's own connections (intake→tank, tank→each pump, each pump→header) and Apartment 6A's distribution (main→hot/cold, cold→each of 4 fixture branches, hot→primary bath). `PipeRun` gained one new optional prop, `flowing`, driving a restrained emissive pulse when the riser reports `flow_status: "flowing"` — Part K's flow visualization, reusing the same slow-pulse language `OperationalAssetMarker` already uses for critical status.

## 5. Reference assumptions (REFERENCE DESIGN, explicitly disclosed)

- Treatment sits functionally upstream of boosting (documented via a new `supplied_by` edge) without changing the existing `parentRef` chain, where both pumps and treatment already parent to the tank as siblings — an existing relationship, deliberately left alone.
- Riser/header pressure model: the higher of the running, fault-free pumps' own `pressure_bar`, gated to 0 by the header valve — a deterministic conceptual model, not hydraulic engineering (no friction, elevation head, or simultaneous-demand modeling).
- Cold-water fixture branches are one grouped connection point per wet room (matching the existing kitchen/primary-bath convention), not individually modeled WC/basin/shower taps.

## 6. Unresolved DD09/DD10/DD15 — not silently resolved

- **DD09** (domestic water and hot water): tank capacity, pump duty/head, pipe diameters, pressure zoning, treatment technology, hot-water generation/return, and manufacturer/model all remain undecided. `LUNA-L06-APT-A-WATER-HOT-01` stays a bare distribution point with no plant behind it — Part F's explicit "cold-water truth only" instruction.
- **DD10** (drainage/stormwater): no gradient, invert level, pipe sizing, or vent design claimed anywhere in the new drain points.
- **DD15** (B1 service allocation): `LunaPlantRoom`'s procedural floor slab is unchanged and still explicitly not an approved plant-room boundary.
- **Guest WC**: `ROOM-LUNA-L06-A-GUEST-WC` has `canonicalRef: null` in the spatial program — no canonical ref was created for it. Cold-water coverage extends only to the three already-registered, already-canonical bathrooms plus the kitchen.

## 7. Runtime states, commands, telemetry model

| Asset class | State fields | Commands |
|---|---|---|
| Pump (BP-01/02) | `running`, `pressure_bar`, `fault` | `turnOn`/`turnOff` (labeled Start/Stop; `resetFault` deliberately not exposed — real capabilities are power.on/power.off only, fault is scenario-only, matching the pre-existing `pumpBehavior()`) |
| Valve (header, 6A) | `open` | `open`, `close` |
| Tank | `level_pct` | none (observable) |
| Riser / L06 branch | `pressure_bar`, `flow_status` (derived) | none — upgraded this phase from static context-only rows to real telemetry |
| 6A meter | `reading_m3` (existing, ambient-drifting), `supply_active` (new, derived) | none |

**Telemetry model** — one new pure function, `recomputeWaterNetwork()`, called through the exact same `setAssetState()` choke point every command/scenario already uses (never a parallel state store): riser pressure = max of running/fault-free pumps' pressure, zeroed if the header valve is closed; branch mirrors riser; apartment `supply_active` = riser pressure > 0 AND the apartment's own valve is open. Triggered after any water-relevant command, after the three existing water scenarios, and after `resetAll()`.

## 8. Water relationships (typed edges, upstream/downstream traversal)

Three new edges, all additive:

| From | Type | To |
|---|---|---|
| `LUNA-B1-WATER-BP-01` | `supplied_by` | `LUNA-B1-WATER-TREAT-01` |
| `LUNA-B1-WATER-BP-02` | `supplied_by` | `LUNA-B1-WATER-TREAT-01` |
| `LUNA-RISER-WATER-01` | `isolated_by` | `LUNA-B1-WATER-VALVE-01` |

Combined with the pre-existing `parentRef` chain (now complete end-to-end via the new intake) and the pre-existing `isolated_by` edge from `LUNA-L06-APT-A` to its own valve, Oyi can now correctly answer "which valve isolates the water riser?" (the header valve) and "the nearest isolation point for Apartment 6A" (the apartment's own valve, not the far header) — two structurally different, both correct, answers.

## 9. Wastewater relationships

Already real for kitchen and primary bathroom (`LUNA-L06-APT-A-KITCHEN-DRAIN-01`/`BATH-01-DRAIN-01` → `DRAIN-01` → `L06-DRAINAGE-BRANCH-01` → `RISER-DRAINAGE-01` → `B1-DRAINAGE-MAIN-01`); extended to bathrooms 2 and 3 via the same pattern. Soil/waste stays a fully separate graph from fresh water — no shared node, no shared riser, opposite direction (fixture → discharge vs. source → fixture) as `LUNA_MEP_COORDINATION_SPEC.md` requires.

## 10. Apartment 6A fixture coverage

| Room | Cold branch | Hot branch | Drain |
|---|---|---|---|
| Kitchen | existing | — (cold only, as before) | existing |
| Bathroom 1 (primary) | **new** | existing | existing |
| Bathroom 2 | **new** | — (DD09 unresolved) | **new** |
| Bathroom 3 | **new** | — (DD09 unresolved) | **new** |
| Guest WC | not created — unregistered (DD05) | — | — |

All three registered bathrooms now have real cold-water and drainage coverage, not just the primary.

## 11. Water Control Board behavior (Part I)

Reuses `SystemControlBoard` (proven by the elevator work) with zero elevator-specific code touched — the second system to use the pattern, confirming it's genuinely reusable. 8 tabs from real registered assets only: Tank, Treatment, Pump 01, Pump 02, Header, Riser, L06 Branch, 6A Meter (the last showing its paired isolation valve's state/commands alongside, since they're operated together at one physical demarcation point). Respects classification exactly — a tank shows no pump commands, riser/branch (asset-only-turned-observable) show no commands, only genuinely controllable assets show Start/Stop or Open/Close. Deterministic default focus (Tank); switching tabs reuses the *existing* generic device-selection camera effect (`setSelected` → `assetFocusCamera`) — zero new camera code. Opens automatically from Engineering → Water or any water asset selection; closes cleanly when neither condition holds.

## 12. Oyi interactions (Part J)

All 8 target phrases verified working end-to-end (parser → controller → scene → board), via 3 small, generic parser broadenings (not water-specific: `plant`, `trace`, `isolation` as additional trigger words on already-existing, cross-system matchers):

1. "Show me the water system." → `show_system`, opens the board.
2. "Show the B1 water plant." → `show_system` + level target, via the same combination logic "Show Level 6 structure" already used.
3. "Show Booster Pump 01." → asset navigation, already worked via a pre-existing alias.
4. "Start Booster Pump 01." → already worked via a pre-existing `synonymFallback` (start→turnOn) mechanism — no change needed.
5. "Show the water riser." → already worked via a pre-existing alias.
6. "Show me what supplies water to Apartment 6A." → `show_route`, walks the now-complete chain.
7. "Trace water from the B1 plant to Apartment 6A." → same `show_route` path, `trace` keyword added.
8. "Show the nearest isolation point for Apartment 6A." → `show_relationship`, `isolation` keyword added, correctly resolves to the apartment's own (nearest) valve via the pre-existing edge, not the far header.

## 13. Tests and results

**Deterministic (`npm run test:water`, 15/15 PASS):** canonical identity preservation, pump start/stop independence, duty/standby, downstream pressure/flow response, isolation-valve effect from both ends, tank telemetry, B1→L06→6A route continuity, upstream/downstream graph traversal, no false mesh-proximity connections, Facility/Consumer boundary, control-board registry, all 8 Oyi phrases at the parser level, a full controller round-trip that actually starts a pump, state preservation across scenario/reset cycles.

**Browser (`npm run test:water:browser`, real Chrome, all PASS):** Engineering → Water auto-opens the board; tab switching updates one persistent board; commands from the board produce real, visible runtime changes; both Oyi phrases tested live; Architecture/All Systems/Structure switching preserves state; board closes cleanly; Consumer privacy re-verified live.

**While building the browser suite, found and fixed a real bug** (not a test artifact): `SystemControlBoard`'s tab row used bare `flex: 1` with no `min-width` override, so with enough tabs (8, water's case) the row's total minimum content width exceeded the board's fixed 268px, and flexbox let it overflow horizontally rather than shrink — the trailing tabs rendered outside the board's glass background, directly over the 3D canvas, uninteractable in some camera states. Fixed with `flexWrap: "wrap"` + `minWidth: 44` + ellipsis truncation. Verified the existing 4-tab elevator board is visually unaffected (`test:control-surface:browser` still 10/10).

**Full regression suite, all green:** `tsc --noEmit`, `oxlint` (no new warnings), `vite build`, `test:representation` (RepresentationPolicy hash unchanged), `test:presentation`, `test:architecture`, `test:lift` (9/9), `test:lift:browser` (11/11), `test:four-lift` (12/12), `test:four-lift:browser` (8/8), `test:control-surface:browser` (10/10), `test:water` (15/15), `test:water:browser` (8/8).

## 14. Manual local testing instructions

```
cd /Users/ochigaidoko/Oyi-Twin-Engine
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```
Open `http://127.0.0.1:5173/` (Presentation Mode is the default).
1. Open Engineering Layers → Water — the Water Control Board opens automatically beside the level rail, focused on the Tank.
2. Click through the 8 tabs — same board updates each time, never a second card.
3. On Pump 01 or Pump 02, click Stop then Start — watch `pressure bar`/`flow status` on the Riser tab respond in real time.
4. Close the header Valve (Header tab) — watch the 6A Meter tab's `supply active` flip to No, even though the 6A valve itself is untouched; reopen to restore.
5. Ask Oyi: "Show me what supplies water to Apartment 6A." — the full source-to-destination chain is named in Oyi's response and the board focuses a real asset in it.
6. Ask Oyi: "Show the nearest isolation point for Apartment 6A." — focuses the apartment's own valve (6A Meter tab), not the B1 header.

Automated: `npm run test:water` (deterministic) and `npm run test:water:browser` (real Chrome) — both green.

## 15. Known limitations

- The pre-existing "ghosted structural slab" raycast characteristic (documented in `luna-dynamic-lift-report.md` §9) applies equally here — not solved, per every prior phase's same disclosed scope boundary. Engineering-layer selection and Oyi remain the two reliable discovery routes.
- Headless-browser testing of rapid, consecutive camera-flying interactions can leave a stuck 3D hover tooltip (no continuous real mouse movement to dismiss it) — a test-environment artifact worked around in `verifyWaterBrowser.mjs` via hit-test-verified clicks, not a real user-facing issue.
- Cold-water fixture branches are one grouped connection per wet room, not individually modeled WC/basin/shower taps — proportionate to the existing kitchen/primary-bath convention, not a gap introduced here.

## 16. Recommended generalization path

Not started here, per instruction — the reference chain is scoped to B1 → L06 → Apartment 6A only:
- Whole-building water: replicate the L06 branch pattern to every residential floor once DD02 (floor coordination) and DD19 (datum revision) are resolved — the riser, header, pumps and tank already serve the whole building conceptually, only the floor branches/terminations need multiplying.
- Hot water (DD09): once a generation/storage/return strategy is chosen, `LUNA-L06-APT-A-WATER-HOT-01` already exists as the attachment point — no restructuring needed.
- The Water Control Board / `SystemControlBoard` pattern is now proven twice (elevators, water) — Electrical, Fire, HVAC, Access, CCTV and Network/Edge can each follow the same identity → runtime → board → Oyi build order documented in `LUNA_DIGITAL_BUILDING_STANDARD.md`.

---

**Stop condition met.** No whole-building plumbing generalization was started. No other engineering system was started. No production/cloud changes were made. RepresentationPolicy unchanged (hash re-verified). Four-lift system unaffected (re-verified, both suites green). Ground asset pipeline untouched.
