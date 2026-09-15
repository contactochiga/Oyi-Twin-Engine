# Luna Electrical System V1 — Reference Spec

Status: REFERENCE DESIGN — not procurement, not certified electrical engineering. Follows `LUNA_DIGITAL_BUILDING_STANDARD.md`'s own "identity → state → control surface → intelligence" order, and is the direct structural sibling of `LUNA_DOMESTIC_WATER_REFERENCE_SPEC.md`.

## 1. Reference chain

```
LUNA-B1-ELECTRICAL-GRID-01   (Utility / Incoming Supply)
  -> LUNA-B1-ELECTRICAL-MDB-01   (Main Electrical Distribution Board — also fills the
                                   "switchgear/protection" role; no separate switchgear/
                                   transformer asset is registered, see §2)
       -> LUNA-B1-ELECTRICAL-ATS-01   (ATS / Changeover — supplied_by GRID-01 primary,
                                        supplied_by GEN-01 standby)
       -> LUNA-B1-ELECTRICAL-INV-01   (Inverter / Battery Backup, representative)
       -> LUNA-B1-ELECTRICAL-METER-01 (Main building electricity meter)
  -> LUNA-RISER-ELECTRICAL-01   (vertical riser, full building height)
       -> LUNA-L06-ELECTRICAL-BRANCH-01   (L06 floor distribution)
            -> LUNA-L06-APT-A-METER-ELEC-01   (Apartment 6A meter)
                 -> LUNA-L06-APT-A-DB-01   (Apartment 6A distribution board)
                      -> LUNA-L06-APT-A-LIGHTING-CIRCUIT-01/02, LUNA-L06-APT-A-AC-CIRCUIT-01
                           -> real apartment loads (lights, AC)

LUNA-B1-ELECTRICAL-GEN-01 (Standby Generator) sits alongside the ATS, not in this
downward chain — it is a SOURCE the ATS selects, not a distribution step.
```

This chain was already complete end-to-end via existing `parentRef` links before this phase — unlike Water, no new canonical asset was required to close a gap. See §6 for what this phase actually added (relationships, telemetry, propagation, geometry, control surface).

## 2. Scope decisions (what was and was not invented)

- **MDB-01 fills both "main intake/distribution" and "switchgear/protection".** The accepted Master Equipment Schedule has no registered switchgear or transformer instance (`EQ-TRANSFORMER`: "No registered instance yet"). Creating a separate switchgear asset to literally match the reference image's power-flow diagram would be inventing scope beyond the accepted catalog. MDB-01 is treated as the single registered asset occupying that conceptual position.
- **No transformer asset created**, per the brief's explicit instruction not to invent utility voltage arrangement or transformer requirement/capacity (DD08).
- **No per-floor branch data was fabricated for floors other than L06.** Only L06 has a registered floor branch (`LUNA-L06-ELECTRICAL-BRANCH-01`); the whole-building "vertical distribution is visible" requirement is satisfied honestly by the riser's own full-height geometry (see §5), not by inventing DB icons at every floor the way the reference image shows.
- **ATS `setMode` and generator `setMode` are not exposed as control-board buttons.** A zero-argument button press would silently default the source/mode argument rather than represent a real operator decision — this would be exactly the "unsafe/fabricated manual switching semantics" Part 8 prohibits. Start/Stop (turnOn/turnOff) remain real, meaningful, zero-arg commands and stay available.

## 3. New typed relationships

ATS-01's `parentRef` is MDB-01 (its physical/distribution position), which doesn't express the two sources it actually switches between. Two new edges, mirroring the exact pattern the water riser's standby-supply edge established:

```
{ from: "LUNA-B1-ELECTRICAL-ATS-01", type: "supplied_by", to: "LUNA-B1-ELECTRICAL-GRID-01", label: "primary source (utility)" }
{ from: "LUNA-B1-ELECTRICAL-ATS-01", type: "supplied_by", to: "LUNA-B1-ELECTRICAL-GEN-01", label: "standby source (generator)" }
```

## 4. Runtime state model

| Asset | New/extended fields | Behavior |
|---|---|---|
| GRID-01 | `utility_available: boolean` | `readOnlyBehavior` — critical when false |
| MDB-01 | `energized`, `voltage_v`, `load_pct` (derived) | `readOnlyBehavior` — critical when de-energized |
| GEN-01 | `phase: "stopped"\|"starting"\|"running"\|"stopping"`, `fault: boolean` (new) | `generatorBehavior`, now `faultAware` via `toggleBehavior(..., {faultAware:true})` |
| ATS-01 | unchanged shape (`source`, `auto_mode`, `fault`) | `atsBehavior`, now auto-driven by `recomputePowerNetwork()` when `auto_mode` |
| RISER-ELECTRICAL-01 | `energized` (derived) — upgraded from static/context-only | `readOnlyBehavior` |
| L06-ELECTRICAL-BRANCH-01 | `energized` (derived) — upgraded from static/context-only | `readOnlyBehavior` |
| METER-ELEC-01 (6A) | `supply_active` (new, derived) | `readOnlyBehavior` |
| DB-01 (6A) | `energized` (new, derived) — stays `asset-only` classification | `readOnlyBehavior` |

`generatorBehavior` is shared with `LUNA-ROOFTOP-HVAC-PLANT-01`; both the `faultAware` change and the `fault`-checking `computeStatus` addition are safe there since that asset never sets `state.fault`.

## 5. Deterministic power propagation — `recomputePowerNetwork()`

Lives in `lunaSimulationProvider.ts`, the direct sibling of `recomputeWaterNetwork()`, run through the same `setAssetState()` choke point, never wired into `setAssetState()` itself.

- **Trigger refs**: `GRID-01`, `ATS-01` (command execution on either calls it). Generator `turnOn`/`turnOff` route through `sequenceGeneratorPhase()` instead, which itself calls `recomputePowerNetwork()` once the phase transition lands.
- **`sequenceGeneratorPhase(target)`**: provider-owned believable timing (same principle as `scheduleElevatorArrival`) — `start` sets `running:true, phase:"starting"` immediately, then after ~3s promotes to `"running"` if the generator is still commanded on. `stop` sets `phase:"stopping"` immediately, then after ~1.5s settles to `"stopped"`.
- **Auto-transfer / auto-start-on-loss / auto-stand-down** (ATS in `auto_mode` only):
  - Utility lost + generator in auto mode + not already starting/running/faulted → `sequenceGeneratorPhase("start")`.
  - Utility available again AND the ATS was actually sourced from the generator → `sequenceGeneratorPhase("stop")`. Scoped to "was actually drawing from the generator" specifically so a manual generator test-run (utility fine throughout) is never auto-aborted by the network recompute.
  - ATS `source` flips to whichever of grid/generator is actually live.
- **Cascade**: `MDB.energized = !ATS.fault && ((source==="grid" && utilityAvailable) || (source==="generator" && generatorRunning))`. Riser, branch, 6A meter's `supply_active`, and 6A DB's `energized` all mirror MDB's energized state one-for-one — no isolation point is modeled between MDB and 6A yet (unlike water's header valve), so this is a straight cascade.
- **`grid-failure` scenario** was rewritten to drive this real propagation (`utility_available:false` + `recomputePowerNetwork()`) instead of hand-setting six separate static overrides — matching the exact fix pattern applied to Water's three scenarios.

## 6. Physical geometry — `ElectricalPlantEquipment.tsx`

Reference-realistic, manufacturer-neutral geometry (never a manufacturer/model claim), replacing generic markers for B1 plant + 6A distribution, following `WaterPlantEquipment.tsx`'s exact per-mesh `useSystemAssetOpacity` pattern:

- `SwitchboardCabinetGeometry` — floor-mounted plinth + cabinet + door + vent louvre + an energized-state indicator lamp. Used for both GRID-01 and MDB-01 (see §2).
- `ATSCabinetGeometry` — smaller cabinet with two source-indicator lamps (grid/generator) that light according to the live `source` field.
- `GeneratorSetGeometry` — skid base, engine/alternator body, radiator with a slow-spinning cooling fan while STARTING/RUNNING, canopy hood, exhaust stack.
- `InverterCabinetGeometry` — slim cabinet with a battery-charge fill band (same technique as the water tank's level fill).
- `ElectricityMeterGeometry` — shallow wall/panel-mounted box with a recessed display face that dims when supply is inactive. Used for both METER-01 and the 6A meter.
- `DistributionBoardGeometry` — flush wall panel with a hinged door and a breaker-row texture. Used for the 6A DB.

Cable containment reuses `PipeRun` (documented as a neutral stand-in; a rectangular busway cross-section is future work, not fabricated here) for both the B1 plant's internal runs (GRID→MDB, MDB→ATS, GEN→ATS, MDB→INV, MDB→METER) and the 6A meter→DB run, all following registered `parentRef`/relationship pairs only.

## 7. Whole-building visual treatment

`RiserShaft` gained an optional `energized` prop driving the same restrained emissive-pulse technique as `PipeRun`'s `flowing` (0.35 ± 0.15 sine pulse when energized, dimmed to 0.08 when not), applied only to the electrical riser (the other four risers are untouched — extending them is documented as future Water/Fire/Drainage/Network visual-convergence work, not done here). Because `RiserShaft` already renders a continuous B1-to-roof cylinder, this alone gives the "vertical distribution visible through the whole tower" reading Part 6 asks for without any new per-floor geometry.

## 8. Control surface

Third `SystemControlBoard` consumer (`lunaElectricalBoard.ts` / `ElectricalAssetPanel.tsx` / `ElectricalControlBoard.tsx`), same shell, same generic `AssetRows`/`RelationshipList`/`CommandButtons` pattern as `WaterAssetPanel.tsx`. 8 tabs: Utility, Main Dist., ATS, Generator, Inverter, Riser, L06 Dist., 6A Meter (paired with the 6A DB, same paired-tab pattern as water's meter/valve).

## 9. Oyi extensions

Existing vocabulary/route/relationship mechanisms already covered most of the brief's target phrases. Gaps found and fixed:
- Missing aliases for the L06 branch and 6A meter/DB (added).
- `matchShowRoute`'s power-phrase detection only recognized "what powers X"; broadened to any standalone "power"/"powers" so "what supplies power to X" and "trace power to X" also default to the electrical system.
- A pre-existing bug where `matchShowRoute`'s final unresolved-fallback branch dropped `system` from its returned intent (fixed; also benefits every other system's route phrases, not just electrical).
- "l06" added as a level alias (previously only "level 6"/"floor 6"/"the sixth floor" resolved).
- "main electrical distribution" added as an MDB-01 alias, and the L06 branch's longest pattern was deliberately extended so `findByPattern`'s longest-pattern-first sort doesn't let MDB-01's "distribution board" pattern win over the L06-specific phrase.

## 10. Unresolved (DD08, explicitly out of scope)

Utility voltage arrangement, transformer requirement/capacity, generator capacity and fuel strategy, fault levels, cable/breaker/busbar sizing, discrimination/selectivity, earthing design, protection coordination, manufacturer/model, final containment spec, and per-floor DB registration for levels other than L06.
