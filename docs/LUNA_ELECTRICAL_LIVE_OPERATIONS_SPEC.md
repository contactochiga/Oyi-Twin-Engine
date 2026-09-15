# Luna Electrical System V1.1 — Live Operations & Physical/Visual Convergence

Status: REFERENCE DESIGN — not procurement, not certified electrical engineering. A convergence pass on top of the already-complete and verified `LUNA_ELECTRICAL_REFERENCE_SPEC.md` (V1). V1's identity/topology/geometry/control-board/Oyi foundations are unchanged in shape; this document covers only what V1.1 adds.

## 1. Building-level live power truth — `resolveBuildingPower()`

`src/luna/runtime/lunaPowerResolver.ts` is the single derived read every consumer shares. It is **not** stored state — it is computed fresh from the canonical assets' live runtime rows (GRID-01, MDB-01, GEN-01, ATS-01, INV-01) plus the electrical event log, every time it's called. The Electrical Control Board's summary widget, the 3D X-ray's active-path emphasis, and Oyi's building-power answers all call this exact function — there is no second, independently-maintained notion of "what source are we on" anywhere in the system.

```ts
interface BuildingElectricalState {
  activeSource: "utility" | "generator" | "inverter" | "mixed" | "none";
  utilityAvailable: boolean;
  generator: { phase, running, fault, fuelPct };
  inverter: { on, batteryPct } | null;   // informational only — see §2
  ats: { source, autoMode, fault, transitioning };
  mainBusEnergized: boolean;
  voltageV; frequencyHz; currentA; loadPct;   // reference/simulated telemetry
  transition: "stable" | "transferring";
  activeFaults: string[];
  lastTransition: ElectricalEvent | null;
  quality: "simulated";
}
```

`activeSource` only ever resolves to `"utility"`, `"generator"`, or `"none"` given the current canonical topology — `"mixed"` is reserved for the ATS's momentary break-before-make changeover window (surfaced separately via `transition: "transferring"`), and `"inverter"` is never emitted (see §2). Solar is absent entirely: no such canonical asset exists, and none was invented.

## 2. Inverter/battery — deliberately not a supply source

`LUNA-B1-ELECTRICAL-INV-01` ("Inverter / Battery Backup, Representative") is surfaced in `BuildingElectricalState.inverter` for information (on/off, battery %), because that is genuinely what its canonical state models. It is **not** wired into `recomputePowerNetwork()`'s cascade, has no independent-supply behavior, and its `parentRef` is MDB-01 (it receives from the bus, not the reverse). Treating it as a building supply source would fabricate a role it doesn't have. A future phase that wants to model real UPS/BESS behavior should do so by extending the inverter's own canonical state and the cascade — not by reinterpreting today's simple on/off toggle.

## 3. Real-time causal source transitions

`lunaSimulationProvider.ts` gained, on top of V1's `recomputePowerNetwork()`/`sequenceGeneratorPhase()`:

- **`sequenceAtsTransfer(newSource)`** — the ATS's changeover is now a real, briefly-observable two-step process (`transitioning: true` → ~1s → `source` flips, `transitioning: false`), not an atomic label flip. While transitioning, the bus has no live source (`mainBusEnergized` is false during that window) — a real break-before-make changeover.
- **Transition-edge event logging** — `recomputePowerNetwork()` tracks the previous utility-available/generator-fault/main-bus-energized values (module-level, not asset state) and logs an event exactly once per genuine transition, never per poll.
- **Generator cooldown** — the existing STOPPING phase is now explicitly logged as "Generator cooldown started"/"Generator cooldown completed", matching the reference sequence's own terminology.
- **Auto-stand-down scoping preserved from V1**: only stands the generator down when the ATS was *actually* sourced from it and utility is back — a manual generator test-run while utility is fine is never auto-aborted.

Reference sequence, exactly as required and verified by `scripts/verifyElectricalLiveOps.mjs`:

```
Utility lost          -> Generator start initiated -> Main distribution de-energized
(~3s)                 -> Generator available (RUNNING)
                       -> ATS transfer initiated (TRANSFERRING, ~1s)
                       -> ATS transferred to Generator -> Main distribution energized

Utility restored       -> Generator cooldown started + ATS transfer initiated (parallel)
(~1-1.5s)              -> ATS transferred to Utility, Generator cooldown completed
```

**Generator failure during outage**: if GEN-01 faults while it is the live source, `generatorRunning` becomes false, `mainBusEnergized` correctly drops to false, and `activeSource` truthfully resolves to `"none"` — downstream (riser/branch/6A) de-energizes rather than showing a fabricated partial state. The auto-start guard (`!genState.fault`) prevents a retry loop.

## 4. Event log

`ElectricalEvent { id, at, label, detail? }`, capped at 40, newest-first, exported via `lunaRuntimeInternals.getElectricalEvents()`. Logged transitions: Utility supply lost/restored, Generator start initiated, Generator available, Generator cooldown started/completed, Generator fault/fault cleared, ATS transfer initiated, ATS transferred to Generator/Utility, Main distribution energized/de-energized. Cleared on `resetAll()`. This is the one event architecture — no second event/notification system was created; it piggybacks on the exact `notify()`/`subscribe()` pub-sub every asset-state change already uses.

## 5. React consumption — `useBuildingPowerState()` / `useElectricalEvents()`

Both hooks (co-located in `lunaPowerResolver.ts`) subscribe to `lunaSimulationProvider.subscribe()` — the same broad subscription shape `useRuntimeStates()` already uses — and recompute on every store change, since these are genuinely cross-asset derived values, not one ref's own state.

## 6. Electrical Control Board — live building-supply summary

`SystemControlBoard` gained one new optional prop, `headerContent?: ReactNode`, rendered between the title row and the tab selector — generic and building-agnostic (any future system's own cross-asset summary can use the same slot; Elevators/Water are unaffected since they don't pass it). `ElectricalControlBoard.tsx`'s `BuildingSupplySummary` component uses it to render:

```
CURRENT BUILDING SUPPLY
GENERATOR
Utility        Unavailable
Generator      Running
ATS            Generator
Main Bus       Energized
```

Colored by source (green/utility, amber/generator, red/none), `data-building-supply-source` exposes the machine-readable state for tests. Always visible regardless of which asset tab is focused.

## 7. Oyi live power understanding

No new intent architecture. Extensions, all additive to `src/luna/intelligence/`:

- **`matchBuildingPower`** (new, in `lunaIntentParser.ts`, runs before `matchQuery`) — resolves phrases naming no specific asset ("what is the building running on", "what is powering Luna") to `GRID-01`, and causal phrases ("why are we on generator", "what happened to utility") to `GEN-01`. Both are real, pre-existing canonical refs — never a fabricated anchor.
- **`matchQuery`'s space-handling extended** — "is Apartment 6A powered" reuses the *same* unit→termination mapping (`lunaServiceRoutes.ts`) the existing route path already used; "what source is L06 using" resolves to `LUNA-L06-ELECTRICAL-BRANCH-01` (L06 remains the one floor with a registered branch — no generalization).
- **`matchShowRoute`'s power-phrase detection broadened** from literal "what powers X" to any standalone "power"/"powers" wording, and a small default (`"active power path"` / `"where the power is coming from"` → the Apartment 6A meter, the one fully-detailed reference chain) replaces a dead-end "which device did you mean" for these two specific phrasings.
- **Two pre-existing bugs fixed** (surfaced by this work, not electrical-specific): `matchShowRoute`'s final unresolved-fallback dropped the resolved `system` from its returned intent; `LUNA-L06` had no bare "l06" alias.
- **`lunaExplain.ts`** — `explainBuildingPower(power)` builds the one canonical narrative sentence from `resolveBuildingPower()`, always including the most recent real transition from the event log. `GRID-01` and `GEN-01` both resolve to this narrative (never two divergent explanations of the same live state); `L06-ELECTRICAL-BRANCH-01`/`METER-ELEC-01`/`DB-01` gained an `"energized" in s` fallback branch that also names the live source when energized.

Example (verified verbatim in `scripts/verifyElectricalLiveOps.mjs`):

> "Luna is currently running on generator supply. Utility is unavailable. Generator 01 is running normally, 82% fuel. The ATS is on generator. Main distribution is energized. Most recent transition: ATS transferred to Generator, moments ago."

## 8. Physical/visual convergence

- **Per-run active-path emphasis** — `B1_ELECTRICAL_PLANT_RUNS` gained a `sourceGate: "utility" | "generator" | "bus"` field; each cable run's `flowing` pulse now reflects whether *that specific path* is live right now (GRID→MDB only glows on utility, GEN→ATS only glows on generator), read directly from `resolveBuildingPower().activeSource` — never a second, independently-derived notion of which path is active.
- **ATS changeover is visible** — both source lamps flicker together during `transitioning` instead of one being solid-lit, so the break-before-make window reads physically, not just in text.
- **Switchboard cabinet** (GRID-01/MDB-01) — single flat door replaced with two door leaves + handles and a visible seam, reading as a real segmented switchgear panel run rather than one cabinet.
- **Generator set** — gained a control/annunciator panel with a fault/running indicator lamp, the visual tell that reads "generator set" rather than "engine block".
- **Electrical riser** — `RiserShaft` (engine-shared primitive) gained an optional `shape?: "round" | "duct"` prop; the electrical riser alone now renders as a rectangular busway/trunking cross-section instead of a round pipe, a closer physical read for electrical containment. Water/drainage/fire/network risers are byte-for-byte unchanged (prop defaults to `"round"`).

## 9. Telemetry

`MDB-01` gained `frequency_hz` (50 nominal when energized, 0 otherwise) and `current_a` (a flat reference figure, 118A when energized) alongside V1's `voltage_v`/`load_pct` — explicitly reference/simulated nominal values, never measured, never invented to a false precision. `quality: "simulated"` on `BuildingElectricalState` matches the existing `RuntimeAssetState.source` convention for the same reason.

## 10. Unresolved (DD08 and related — unchanged from V1, not addressed by this convergence pass)

Utility voltage arrangement, transformer requirement/capacity, generator capacity/fuel strategy, fault levels, cable/breaker/busbar sizing, discrimination/selectivity, earthing design, protection coordination, manufacturer/model, final containment spec, per-floor DB registration beyond L06, real UPS/BESS-as-a-supply-source modeling, Solar.
