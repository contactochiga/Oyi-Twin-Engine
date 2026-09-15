# Luna Electrical System V1 — Final Report

Status: **Complete.** Full deterministic + browser regression suite green, including explicit Elevator and Water Control Board regression checks. Zero new canonical operational assets were needed — the electrical reference chain was already complete end-to-end via existing `parentRef` links, unlike Water which needed a new intake asset.

## Screenshots

| # | Requirement | File |
|---|---|---|
| 1 | Normal Luna | `artifacts/luna-electrical-normal-baseline.png` |
| 2 | Whole-building Electrical Engineering/X-ray view | `artifacts/luna-electrical-whole-building.png` |
| 3 | B1 electrical plant | `artifacts/luna-electrical-b1-plant.png` |
| 4 | Vertical riser | `artifacts/luna-electrical-riser.png` |
| 5 | L06 electrical distribution | `artifacts/luna-electrical-l06-distribution.png` |
| 6 | Apartment 6A trace | `artifacts/luna-electrical-6a-trace.png` |
| 7 | Electrical Control Board beside the level rail | `artifacts/luna-electrical-board-auto-open.png`, `artifacts/luna-electrical-control-board.png` |
| 8 | Utility-powered state | `artifacts/luna-electrical-board-auto-open.png` (Utility tab, `utility_available: Yes`) |
| 9 | Generator/ATS reference simulation | `artifacts/luna-electrical-control-board.png` (Generator tab, Start/Stop, phase telemetry) |

Regression screenshots: `artifacts/luna-regression-elevator-board.png`, `artifacts/luna-regression-water-board.png`.

## What was reused (unchanged)

- All 6 existing B1 electrical assets (GRID-01, MDB-01, GEN-01, ATS-01, INV-01, METER-01), the electrical riser, the L06 branch, and all 4 existing 6A electrical assets (meter, DB, 2 lighting circuits, AC circuit).
- The already-complete `parentRef` chain from GRID-01 down to the apartment circuits.
- `SystemControlBoard` (shared shell, unmodified), the `recomputeWaterNetwork()`/`WaterPlantEquipment.tsx`/`lunaWaterBoard.ts` patterns as direct structural templates.
- Existing camera/navigation architecture — no new camera system.
- Extensive pre-existing Oyi vocabulary (system alias, 7 of the target phrases' asset aliases, the 6A electrical service-route termination).
- `RepresentationPolicy` — byte-hash re-verified unchanged (`test:lift`'s hash assertion still passes; also directly re-checked live in the browser suite).

## What was added

- **Data layer**: `utility_available` on GRID-01; upgraded derived telemetry on MDB-01/riser/branch/6A meter/6A DB (energization, voltage, load, supply_active); `phase`/`fault` fields on GEN-01; 2 new typed relationships (ATS `supplied_by` grid and generator); `faultAware` toggle + fault-aware `computeStatus` on the shared `generatorBehavior`.
- **Propagation**: `recomputePowerNetwork()` + `sequenceGeneratorPhase()` in `lunaSimulationProvider.ts` — deterministic utility-loss → ATS auto-transfer → generator STARTING→RUNNING sequencing → downstream re-energization cascade, and the reverse handback on utility restoration. The existing `grid-failure` scenario now drives this real propagation instead of hand-set static overrides.
- **Geometry**: `ElectricalPlantEquipment.tsx` — 6 reference-realistic equipment components (switchboard cabinet, ATS cabinet, generator set, inverter cabinet, meter, distribution board), wired into `OperationalAssetLayer.tsx` by exact ref, plus cable-run geometry (`B1_ELECTRICAL_PLANT_RUNS`, `APARTMENT_A_ELECTRICAL_RUNS`) reusing `PipeRun`.
- **Whole-building visual**: `RiserShaft` gained an optional `energized` prop (restrained emissive pulse, same technique as `PipeRun`'s `flowing`), applied to the electrical riser only — its existing full-height geometry alone satisfies the "vertical distribution visible through the tower" requirement.
- **Control surface**: `lunaElectricalBoard.ts`, `ElectricalAssetPanel.tsx`, `ElectricalControlBoard.tsx` — the third `SystemControlBoard` consumer, wired into `App.tsx` exactly like the Water board (auto-open on Engineering → Electrical, deterministic default tab, paired-tab pattern for the 6A meter/DB).
- **Oyi**: 5 vocabulary/parser fixes documented in `docs/LUNA_ELECTRICAL_REFERENCE_SPEC.md` §9 — all generic, cross-system fixes (one is a genuine pre-existing bug fix), not electrical-only special-casing.
- **Tests**: `scripts/verifyElectrical.mjs` (13 deterministic checks) and `scripts/verifyElectricalBrowser.mjs` (12 browser checks, including explicit Elevator and Water Control Board regression).
- **Docs**: `docs/LUNA_ELECTRICAL_REFERENCE_SPEC.md`, `artifacts/luna-electrical-reference.json`, this report.

## Left unresolved (DD08 and related)

Utility voltage arrangement, transformer requirement/capacity, generator capacity/fuel strategy, fault levels, cable/breaker/busbar sizing, discrimination/selectivity, earthing design, protection coordination, manufacturer/model, final containment spec, and per-floor DB registration for levels other than L06. Full list in the spec doc §10 and the reference JSON's `unresolvedDesignDecisions`.

## Test results

**Deterministic** (`npm run test:electrical`) — 13/13 PASS: canonical identity, utility-available baseline, full reference-chain continuity, ATS/relationship graph (exactly 2 electrical edges, no false connections), generator STARTING→RUNNING→STOPPING→STOPPED sequencing, generator fault blocks start, utility-failure propagation (ATS auto-transfer, generator auto-start, downstream de-/re-energization cascade), utility-restoration handback, Facility/Consumer representation boundaries, control-board registry sanity, all 10 Oyi target phrases, full Oyi controller round-trip (Start command + Consumer denial), reset consistency.

**Browser** (`npm run test:electrical:browser`) — 12/12 PASS: auto-open on Engineering → Electrical, whole-building view, 4-tab switching without a second board spawning, Start command producing real state change, Oyi system-selection, Oyi 6A power trace, Architecture/All Systems/Structure state preservation, clean board close, live Consumer privacy re-check, **Elevator Control Board regression**, **Water Control Board regression**.

**Full existing regression suite** — all green: `tsc --noEmit`, `npm run build`, `npm run lint` (warnings only, no new error-level issues; the one new immutability warning on `RiserShaft.tsx`'s emissive-pulse mutation matches the exact pre-existing pattern already accepted on `PipeRun`), `test:representation`, `test:presentation`, `test:architecture`, `test:lift` (9/9, RepresentationPolicy hash unchanged), `test:four-lift` (12/12), `test:control-surface:browser` (10/10), `test:water` (15/15), `test:water:browser` (8/8).

## Known limitations

- Camera auto-framing when focusing certain B1 equipment via the control board (e.g. the generator) doesn't always compose a tight shot of the specific geometry — it reuses the existing generic device-selection camera effect rather than a bespoke per-asset framing system, per the explicit "use existing camera architecture" instruction. The underlying geometry and telemetry are both correct and verified; this is a framing polish item, not a data or behavior gap.
- No isolation/protection point is modeled between MDB and the 6A DB (unlike Water's header valve), so energization is a straight cascade rather than something a user can locally isolate mid-chain. Not required by this phase's acceptance criteria.

## Recommended future work (not done this phase, per explicit STOP condition)

- **Water visual convergence**: bring Water's B1 plant and pipe-run geometry up to the realism bar this phase establishes for Electrical (recognizable cabinets/equipment vs. Water's current more schematic look), and consider extending `RiserShaft`'s new `energized` prop to the other three risers (water/fire/drainage/network) for a consistent illuminated-route language.
- Per-floor electrical branch registration beyond L06, if a future phase decides to generalize floor distribution across the building.
- A rectangular busway/trunking cross-section as a dedicated primitive, replacing `PipeRun`'s cylindrical stand-in for electrical containment specifically.

## Stop condition

Complete and fully verified. Per Part 18: no Fire, no HVAC, no generalization of Electrical beyond the reference chain, Water was not modified beyond the shared generic shell it already relies on (verified via explicit regression), no production/cloud systems touched, `RepresentationPolicy` unchanged (byte-hash re-verified).
