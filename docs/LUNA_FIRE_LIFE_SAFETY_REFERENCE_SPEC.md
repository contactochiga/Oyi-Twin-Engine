# Luna Fire & Life Safety System V1 — Spatial Fire Network, Live Building Safety State, Deterministic Incident Simulation

Status: REFERENCE DESIGN — not procurement, not certified fire engineering, not a certified fire alarm/control system. Builds on the existing Phase 3C/4/13 canonical Fire assets and MEP backbone; this document covers only what Fire V1 adds.

## 0. Safety authority rule (non-negotiable, preserved throughout this phase)

Oyi is not the certified fire panel. Twin geometry is not the certified fire panel. Simulation is not certification. Fire/life-safety decisions and interlocks remain under approved life-safety controllers and engineered systems.

Oyi in this system: observes, spatially locates, correlates, explains, investigates, presents state, simulates a deterministic reference incident. Oyi does **not**: disable life safety, bypass alarms, suppress fire protection, override the pump unsafely, control lifts in fire mode, or issue evacuation commands.

Concretely:
- `LUNA-B1-FIRE-PANEL-01`'s `availableCommands` is **empty** — silence/reset are deliberately never mapped to any runtime command (`CAPABILITY_TO_COMMAND` in `lunaRuntimeSeed.ts` documents this explicitly, unchanged from before this phase).
- `explainFireState()`'s output always includes the literal string "(reference simulation)".
- The reference incident is triggered only through the existing scenario/runtime architecture (`smoke-alert` scenario, or directly patching detector state) — never a separate "Fire simulator."

## 1. Two distinct networks

Fire is modeled as two independently-computed networks, matching real-world semantics and authority:

**(A) Fire Alarm / Detection / Control** — `LUNA-B1-FIRE-PANEL-01` (controller) → `LUNA-GROUND-FIRE-DET-01` / `LUNA-L06-APT-A-ENTRY-SMOKE-01` (detectors) → panel `alarm_active`/`active_zone_ref`/`trouble` → building fire state.

**(B) Fire Hydraulic / Suppression** — `LUNA-B1-FIRE-TANK-01` (storage) → `LUNA-B1-FIRE-PUMP-01` (pump) → `LUNA-RISER-FIRE-01` (riser) → `LUNA-L06-FIRE-BRANCH-01` (floor zone termination).

These are computed by two independent halves of `recomputeFireNetwork()` in `lunaSimulationProvider.ts` and are **not coupled to each other**: starting the pump does not raise an alarm, and an alarm does not auto-start the pump. This mirrors real fire-pump behavior (pressure-drop-triggered by actual sprinkler/hydrant flow, not by the alarm signal) and directly honors the brief's "different semantics and authority" instruction. No generic "Fire pipe" was created.

## 2. Reference incident chain

Scoped to L06 / Apartment 6A, the one location with a fully detailed canonical MEP presence:

```
Smoke condition (reference simulation)
  -> LUNA-L06-APT-A-ENTRY-SMOKE-01 smoke = true
  -> Detector alarm received (event)
  -> LUNA-B1-FIRE-PANEL-01 alarm_active = true, active_zone_ref = detector
  -> Building Fire State = ALARM
  -> Oyi identifies source (detector), affected level (L06)
  -> Facility gets spatial investigation context (Fire Control Board Active Incident section)
```

Separately, where supported by the hydraulic network: `LUNA-B1-FIRE-TANK-01` → `LUNA-B1-FIRE-PUMP-01` (Start command) → `LUNA-RISER-FIRE-01` pressurizes → `LUNA-L06-FIRE-BRANCH-01` pressurizes. No sprinkler-head activation hydraulics are fabricated — pump/riser/branch pressurization is the full extent of what is modeled (DD11 unresolved, see §9).

## 3. Building-level fire state — `resolveFireState()`

`src/luna/runtime/lunaFireResolver.ts` — one derived, zero-arg read, computed fresh every call from the canonical assets' live runtime rows plus the fire event log, exactly matching `resolveBuildingPower()`'s philosophy. The Fire Control Board's summary, the 3D X-ray, and Oyi's fire-status answers all call this exact function.

```ts
type FireBuildingState = "normal" | "alarm" | "trouble";

interface FireOperationalState {
  fireState: FireBuildingState;
  alarmActive: boolean;
  troubleActive: boolean;
  originatingZoneRef: string | null;
  originatingZoneLabel: string | null;
  affectedLevelRef: string | null;
  activeAlarmDeviceCount: number;
  pump: { running: boolean; fault: boolean; pressureBar: number };
  fireWaterAvailable: boolean;
  riserPressurized: boolean;
  controllerCommunicationOk: boolean;
  firstEvent: FireEvent | null;
  lastEvent: FireEvent | null;
  quality: "simulated";
}
```

`fireState` is deliberately limited to `normal | alarm | trouble` — no PRE_ALARM/SUPERVISORY/PARTIALLY_ISOLATED/RESETTING terminology is invented, since nothing in the current canonical catalog legitimately models a distinct investigation/supervisory/partial-isolation stage. `fireWaterAvailable` is kept structurally distinct from `riserPressurized`: availability reflects the tank's registered existence (the reference baseline — no tank-level telemetry is modeled, DD11), pressurization reflects live pump-driven state.

## 4. Event log

`FireEvent { id, at, label, detail? }`, capped at 40, newest-first, exported via `lunaRuntimeInternals.getFireEvents()`. Piggybacks on the exact same `notify()`/`subscribe()` pub-sub every asset-state change already uses — no second event architecture. Module-level "previous state" trackers (`lastFireAlarm`, `lastFireTrouble`, `lastFirePumpRunning`) detect genuine edges so events log once per real transition, never per poll. Logged labels: Detector alarm received, Alarm cleared, Controller trouble/fault, Controller trouble cleared, Fire pump started, Fire pump stopped. Cleared on `resetAll()`.

## 5. React consumption

`useFireState()` / `useFireEvents()`, co-located in `lunaFireResolver.ts`, subscribe to `lunaSimulationProvider.subscribe()` — the same broad, recompute-on-every-change shape `useBuildingPowerState()`/`useElectricalEvents()` already use, since these are genuinely cross-asset derived values.

## 6. New canonical relationship

Exactly one new typed edge, mirroring the water/electrical precedent of parentRef representing one hierarchy (alarm/control: pump's parentRef is the panel) while a typed edge represents the real physical/hydraulic dependency:

```ts
{ from: "LUNA-B1-FIRE-PUMP-01", type: "supplied_by", to: "LUNA-B1-FIRE-TANK-01", label: "fire water supplied by" }
```

The registered fire-water route (`buildServiceRoute` to `LUNA-L06-FIRE-BRANCH-01`) therefore honestly follows the actual parentRef chain — Panel → Pump → Riser → Branch — even though this means the route technically starts at the alarm panel rather than the tank. This was not "fixed" by altering parentRef; the `supplied_by` edge is the separate, correct hydraulic-source documentation, consistent with how Water/Electrical already handle this exact distinction.

## 7. Physical geometry

`src/luna/operational/FirePlantEquipment.tsx` (new) — manufacturer-neutral, recognizable equipment:
- **Fire Alarm Panel** — wall-mounted cabinet with a status-lamp face (green/amber/red reflecting normal/trouble/alarm).
- **Fire Pump** — pump/motor assembly with a discharge manifold, distinct from generic block geometry.
- **Fire Tank** — cylindrical storage vessel with a support skirt.
- **Smoke Detector** — ceiling-mounted low-profile disc, distinct from the generic sensor marker used elsewhere.

The fire riser reuses the engine-shared `RiserShaft` primitive with `shape="round"` (unchanged from its default — fire containment reads as round pipe, unlike electrical's rectangular duct) and gained a `pressurized`-driven glow via the existing `energized` prop, semantically repurposed (no shape change).

## 8. Fire Control Board

Fourth real `SystemControlBoard` consumer (`src/luna/operational/FireControlBoard.tsx`), positioned beside the existing Elevators/Water/Electrical boards. 7 asset-selector tabs (`lunaFireBoard.ts`): Panel (default), Grd. Detector, 6A Detector, Pump, Tank, Riser, L06 Zone. `FireStatusSummary` header widget (reused `headerContent?` slot from Electrical V1.1) shows the live building fire state, originating zone, pump state — always visible regardless of focused tab, `data-fire-status-summary`/`data-fire-state` attributes for test/automation hooks.

`FireAssetPanel.tsx` reuses the generic `AssetRows`/`RelationshipList`/`CommandButtons` template from Water/Electrical. The fire panel's command list renders empty by construction (see §0) — this directly satisfies "do not give every asset an ON/OFF button" without any special-casing. A new `ActiveIncidentSummary` component appears only when `fireState !== "normal"`, showing origin, affected level, active device count, and the live event narrative — the investigation surface distinct from equipment control.

## 9. Oyi fire intelligence

All 13 target phrases resolve from canonical/runtime/event truth (never inferred from visuals):

| Phrase | Resolution |
|---|---|
| "What is the fire status of Luna?" | query → Panel, narrative via `explainFireState()` |
| "Are there any fire alarms?" | query → Panel |
| "Where is the alarm?" | query → Panel (narrative names the originating device/zone) |
| "What triggered the alarm?" | query → Panel |
| "Show me the affected floor." | navigate → `LUNA-L06-FIRE-BRANCH-01` |
| "Show the detector." | asset → the 6A entry smoke detector (bare "the detector", anchored on the reference incident's own device) |
| "Show the fire system." | system view |
| "Show the fire riser." | asset → `LUNA-RISER-FIRE-01` |
| "Show the fire pump." | asset → `LUNA-B1-FIRE-PUMP-01` |
| "Is the fire pump running?" | query → Pump |
| "Show the fire-water path to L06." | route → L06 fire branch, system=fire |
| "What devices responded to this incident?" | query → Panel |
| "Are there any fire system faults?" | query → Panel |
| "Show the active incident." | query → Panel |

New matcher `matchFireStatus` in `lunaIntentParser.ts` (inserted after `matchBuildingPower`), plus new vocabulary aliases for `LUNA-L06-FIRE-BRANCH-01` and `LUNA-L06-APT-A-ENTRY-SMOKE-01`. `explainFireState(fire)` in `lunaExplain.ts` builds the one canonical narrative, always including "(reference simulation)":

> "Luna's fire system is currently ALARM (reference simulation). Origin: Entry Smoke Detector, LUNA-L06. 1 device currently active. Fire pump is stopped. Controller communication is OK. Most recent event: Detector alarm received, moments ago."

**Vocabulary bug fixed along the way**: `findByPattern`'s longest-pattern-first sort resolved "fire-water" to the water system (its "water" alias, 5 chars, is a substring match) instead of fire. Fixed by adding explicit `"fire-water"`/`"fire water"` patterns (10-11 chars) to the fire system alias, so fire's entry now sorts above water's for this specific compound phrase — verified no regression to water's own phrasing.

## 10. Representation policy

`RepresentationPolicy.ts` itself is byte-unchanged (verified via the existing hash assertion in `test:lift`). B1 fire plant equipment (panel/pump/tank) remains `HIDDEN` to Consumer identities — same common/building-infrastructure privacy boundary as Water/Electrical B1 plant. The 6A smoke detector is `FULL_3D` for the assigned resident and `HIDDEN` for any other resident, and `FULL_3D` for Facility.

**Disclosed fix**: `FACILITY_OWNED_UNIT_ASSET_REFS` in `lunaUnitMepAssets.ts` (the existing allowlist mechanism for Facility-owned service infrastructure physically inside a private unit — meters, DBs, circuits, water mains, drains) did **not** previously include the 6A smoke detector, a genuine pre-existing gap discovered via a failing browser test. Fixed by adding `LUNA-L06-APT-A-ENTRY-SMOKE-01` with an explanatory comment: fire detectors are Facility/life-safety responsibility regardless of unit location, the same category as the meters/DBs already on the list. This is additive **data** only — `RepresentationPolicy.ts` code is untouched. The equivalent gap for the water leak sensor (`KITCHEN-LEAK-01`) was identified but left unfixed as genuinely out-of-scope for this phase (not a fire asset).

## 11. Deterministic incident simulation

No separate "Fire simulator" — the existing `smoke-alert` scenario (`lunaScenarios.ts`) patches `smoke: true` on the 6A detector, then calls `lunaRuntimeInternals.recomputeFireNetwork()` to propagate through the real cascade (same pattern every other scenario uses). Sequence: NORMAL → smoke detected → detector alarm event → panel `alarm_active=true` → building fire state = ALARM → Oyi/Control Board/event log all reflect the same live truth. Recovery: clearing `smoke` and recomputing returns the building to NORMAL and logs "Alarm cleared".

## 12. Tests

- **Deterministic** (`npm run test:fire`, `scripts/verifyFire.mjs`) — 16/16: canonical identity, NORMAL state, detector alarm → ALARM resolution with originating device/level, event ordering, alarm clear/recovery, controller trouble/fault, fire pump state (independent hydraulic cascade), fire-water route continuity, alarm/hydraulic relationship continuity (exactly 1 typed edge, nothing inferred from mesh proximity), Fire Control Board registry, Oyi parser phrase resolution, Oyi narrative correctness, Facility/Consumer representation boundaries, full Oyi controller round-trip (Facility allowed, Consumer denied), safety boundary (zero panel commands).
- **Browser** (`npm run test:fire:browser`, `scripts/verifyFireBrowser.mjs`) — 16/16: all 12 required screenshots, live summary widget, simulated alarm propagation end-to-end, Oyi incident investigation, recovery state, state preservation through Architecture/All Systems/Structure view switching, live Consumer privacy re-check, Elevator/Water/Electrical regression.
- **Full regression re-run**: `test:lift` (deterministic + browser), `test:four-lift` (deterministic + browser), `test:control-surface:browser`, `test:water:browser`, `test:electrical:browser`, `test:electrical-live-ops` (deterministic + browser), `test:representation`, `test:architecture`, `test:presentation`, `tsc -b`, `npm run build`, `npm run lint` — all green, zero regressions.

## 13. Unresolved design decisions (not addressed by this phase, not fabricated)

- **DD11** (fire engineering — pump sizing/duty, tank capacity/replenishment, sprinkler/hose-reel coverage and activation hydraulics, zoning beyond L06, detector spacing/coverage standard, manufacturer/model) — entirely unresolved. No sprinkler activation was fabricated.
- **DD15** (structural/fire-rating coordination beyond what Phase 13 already modeled) — unchanged, unresolved.
- **DD20** (elevator fire-mode/recall authority) — explicitly **not** touched. No fire recall logic, firefighter lift certification, evacuation lift behavior, or emergency control authority was fabricated. The Service/Fire Lift (DD06/DD11/DD20) remains its own unresolved boundary, documented previously and unchanged here.
- Panel silence/reset commands — deliberately unmapped, not a gap to be closed casually; any future exposure of these would be a life-safety-authority decision, not an engineering convenience.
- Real fire-water tank telemetry (level/pressure sensing) — not modeled; `fireWaterAvailable` is a structural baseline, not live sensor truth.
