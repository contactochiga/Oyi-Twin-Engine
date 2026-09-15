# Luna Electrical System V1.1 — Live Operational State + Physical/Visual Convergence — Final Report

Status: **Complete.** V1's identity/topology/geometry/control-board/Oyi foundations were preserved unmodified in shape; this was a convergence pass. Full deterministic + browser regression green, including explicit Elevator and Water regression checks re-run after every change.

## Screenshots

| # | Requirement | File |
|---|---|---|
| 1 | Utility powering Luna | `artifacts/luna-electrical-live-utility-powering.png` |
| 2 | Utility failure | `artifacts/luna-electrical-live-utility-failure.png` |
| 3 | Generator starting | `artifacts/luna-electrical-live-generator-starting.png` |
| 4 | Generator powering Luna | `artifacts/luna-electrical-live-generator-powering.png` |
| 5 | ATS state | `artifacts/luna-electrical-live-ats-state.png` |
| 6 | Utility restoration | `artifacts/luna-electrical-live-utility-restoration.png` |
| 7 | Whole-building Electrical X-ray | `artifacts/luna-electrical-live-whole-building-xray.png` |
| 8 | Realistic B1 electrical equipment | `artifacts/luna-electrical-live-b1-equipment.png` |
| 9 | Riser/floor distribution | `artifacts/luna-electrical-live-riser-distribution.png` |
| 10 | L06 active power trace | `artifacts/luna-electrical-live-l06-trace.png` |
| 11 | Apartment 6A trace | `artifacts/luna-electrical-live-6a-trace.png` |
| 12 | Electrical Control Board with live building source | `artifacts/luna-electrical-live-control-board.png` |

Screenshots 1, 2, 4, 6 directly show the new `CURRENT BUILDING SUPPLY` widget reading UTILITY, NONE, GENERATOR, and UTILITY again across a full outage/restoration cycle — the acceptance criterion's core visual proof.

## Files changed

- `src/luna/runtime/lunaPowerResolver.ts` (**new**) — `resolveBuildingPower()`, `useBuildingPowerState()`, `useElectricalEvents()`.
- `src/luna/runtime/lunaSimulationProvider.ts` — event log, `sequenceAtsTransfer()`, transition-edge event logging, cooldown events, `frequency_hz`/`current_a` telemetry, updated `resetAll()`.
- `src/luna/runtime/lunaRuntimeSeed.ts` — seed `transitioning:false` on ATS-01, `frequency_hz`/`current_a` on MDB-01.
- `src/engine/components/spatial/SystemControlBoard.tsx` — additive `headerContent?` prop.
- `src/luna/operational/ElectricalControlBoard.tsx` — `BuildingSupplySummary` widget.
- `src/luna/operational/OperationalAssetLayer.tsx` — per-run `sourceGate` active-path emphasis.
- `src/luna/operational/ElectricalPlantEquipment.tsx` — switchboard door segmentation, generator control panel, ATS transitioning flicker.
- `src/engine/components/RiserShaft.tsx` — additive `shape?: "round" | "duct"` prop.
- `src/luna/operational/LunaRiserShafts.tsx` — electrical riser uses `shape="duct"`.
- `src/luna/intelligence/lunaIntentParser.ts` — `matchBuildingPower`, `matchQuery`/`matchShowRoute` extensions, two pre-existing bug fixes.
- `src/luna/intelligence/lunaVocabulary.ts` — "utility"/"l06" aliases.
- `src/luna/intelligence/lunaExplain.ts` — `explainBuildingPower()`, ref-anchored narrative branches.
- `scripts/verifyElectrical.mjs` — timing updated for the new observable ATS transfer step (functional assertions unchanged).
- `scripts/verifyElectricalLiveOps.mjs`, `scripts/verifyElectricalLiveOpsBrowser.mjs` (**new**).
- `package.json` — two new test scripts.

## Existing canonical assets reused

All of V1's 6 B1 assets, riser, L06 branch, and 4 6A assets — zero new canonical operational assets were created in V1.1, matching the non-negotiable "do not duplicate canonical assets" instruction. All new fields (`transitioning`, `frequency_hz`, `current_a`) are additive telemetry on already-existing assets.

## Runtime changes / source resolver / telemetry / events

See `docs/LUNA_ELECTRICAL_LIVE_OPERATIONS_SPEC.md` §1–5, §9 in full. Summary: `resolveBuildingPower()` is a pure derived function (never stored state) read by every consumer alike; `sequenceAtsTransfer()` gives the ATS changeover a real ~1s observable window; the event log is a capped, newest-first array piggybacking on the provider's existing `notify()`/`subscribe()` pub-sub.

## Oyi changes

12/12 target phrases verified end-to-end (parser + `explainAsset` narrative), listed in the reference JSON. Two generic (non-electrical) bugs were found and fixed along the way: a route-matcher fallback that dropped its resolved `system`, and a missing "l06" level alias — both benefit every system, not just Electrical.

## Physical geometry / route improvements

Switchboard cabinet gained door segmentation; generator gained a control panel; ATS lamps now flicker together during changeover; the electrical riser alone now renders as a rectangular busway/duct rather than a round pipe (new optional `RiserShaft` prop, every other riser unaffected). Cable runs now individually track which physical path is actually live via `sourceGate`, rather than all glowing together whenever anything is energized.

## Reference assumptions (all explicitly REFERENCE DESIGN/SIMULATED)

415V / 50Hz / 118A nominal MDB telemetry; ~3s generator start, ~1s ATS transfer, ~1.5s generator cooldown — all documented in the reference JSON's `referenceAssumptions`.

## Unresolved DD08 items

Unchanged from V1 — see spec §10 and the reference JSON. Explicitly still unresolved and not fabricated in this phase: real UPS/BESS-as-a-supply-source modeling, Solar, transformer/switchgear sizing, cable/breaker/busbar sizing, discrimination, earthing, protection coordination, manufacturer/model, final containment spec, per-floor DB registration beyond L06.

## Tests

- **Deterministic** (`npm run test:electrical-live-ops`) — 12/12 PASS: resolver correctness (normal/failure/starting/running/transferring/restoration/cooldown/generator-failure-during-outage/NONE), inverter non-fabrication, L06/6A energization mirroring, active power-path resolution, event history ordering and completeness, Oyi "what are we running on"/"why generator" narratives, full controller round-trip, reset consistency.
- **Browser** (`npm run test:electrical-live-ops:browser`) — 16/16 PASS: all 12 required screenshots, live summary widget reading UTILITY→NONE→GENERATOR→UTILITY correctly through a full cycle, Oyi end-to-end, state preservation through Architecture/All Systems/Structure view switching, **Elevator Control Board regression**, **Water Control Board regression** (including a live command round-trip).
- **Full existing regression re-run**: `test:electrical` (13/13, timing updated for the new observable ATS step, all assertions otherwise unchanged), `test:water` (14/14), `test:lift` (9/9, RepresentationPolicy hash unchanged), `test:four-lift` (12/12), `test:representation`, `test:presentation`, `test:architecture`, `tsc --noEmit`, `npm run build`, `npm run lint` (no new error-level issues).

## Known limitations

- `activeSource` never emits `"inverter"` or `"mixed"` as a stable state by design (see spec §2) — this is a deliberate non-fabrication choice, not an oversight.
- No isolation/protection point exists between MDB and the 6A DB (unchanged from V1) — energization is still a straight cascade.
- The duct-shaped riser is a visual read improvement only, not a containment engineering spec (DD07 unresolved).
- Camera auto-framing for individual B1 equipment (noted as a V1 limitation) is unchanged in V1.1 — out of scope, since the brief explicitly forbids building a new camera system.

## Regressions checked

Four lifts, Elevator Control Board, Water reference chain, Water Control Board, Electrical V1 itself, Unified Control Surface, Presentation, Representation (byte-hash unchanged), Architecture, Oyi — all green, all explicitly re-verified after the ATS-transfer timing change and every subsequent edit.

## Stop condition

Complete and fully verified. Per the brief's explicit instruction: no Fire, no HVAC, no new Electrical application/runtime/control architecture, Water untouched beyond the shared generic shell it already relied on (regression-verified), `RepresentationPolicy` unchanged (byte-hash re-verified), no production/cloud changes.
