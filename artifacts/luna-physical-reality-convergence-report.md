# Luna Physical Reality / Visual Convergence V1 — Final Report

Status: **Complete for this pass's scope.** Full regression green. No HVAC/Access/CCTV/Network work begun. No operational/runtime/control/intelligence architecture changed.

## Screenshots

| # | Requirement | File |
|---|---|---|
| 1 | B1 overall | `artifacts/luna-pr-01-b1-overall.png` |
| 2 | Water plant | `artifacts/luna-pr-02-water-plant.png` |
| 3 | Water riser | `artifacts/luna-pr-03-water-riser.png` |
| 4 | L06 water branch | `artifacts/luna-pr-04-l06-water-branch.png` |
| 5 | Apartment 6A water connection | `artifacts/luna-pr-05-6a-water-connection.png` |
| 6 | Electrical plant | `artifacts/luna-pr-06-electrical-plant.png` |
| 7 | Electrical riser | `artifacts/luna-pr-07-electrical-riser.png` |
| 8 | Active generator path | `artifacts/luna-pr-08-active-generator-path.png` |
| 9 | Fire plant | `artifacts/luna-pr-09-fire-plant.png` |
| 10 | Fire riser | `artifacts/luna-pr-10-fire-riser.png` |
| 11 | Alarm network | `artifacts/luna-pr-11-alarm-network.png` |
| 12 | Whole-building engineering X-ray | `artifacts/luna-pr-12-whole-building-xray.png` |
| 13 | Combined systems view | `artifacts/luna-pr-13-combined-systems-view.png` |
| 14 | Normal architectural view | `artifacts/luna-pr-14-normal-architectural.png` |

Screenshot 8 was captured after forcing a real utility-loss transition through the existing runtime (`recomputePowerNetwork()`) — the Electrical Control Board correctly reads GENERATOR/Running/82% fuel/Main Bus Energized, proving the geometry-and-control convergence responds to live runtime truth, not a staged label. Screenshot 11 was captured mid-reference-incident (6A smoke detector alarmed) — the detector geometry itself glows red and the Fire Control Board's Active Incident section names the origin and affected level, live.

## Files changed

- `src/luna/operational/WaterPlantEquipment.tsx` — `BoosterPumpGeometry` gained suction/discharge stubs, a local discharge valve body, and a runtime-pressure-driven gauge needle.
- `src/luna/operational/FirePlantEquipment.tsx` — `FirePumpGeometry` gained the equivalent additions (own reference pressure range).
- `src/engine/components/MepComponents.tsx` — `CableTray` gained an optional `flowing?: boolean` prop (mirrors `PipeRun`'s existing emissive-pulse pattern).
- `src/luna/operational/OperationalAssetLayer.tsx` — B1 electrical plant runs and the apartment meter→DB run switched from `PipeRun` to `CableTray` (with `flowing` preserved via the existing `sourceGate`/electrical-meter logic — zero behavior lost).
- `src/luna/LunaPlantRoom.tsx` — three new `ServiceZone`/`AccessPanel` pairs (Electrical/Water/Fire Plant Room), sized from each cluster's real asset footprint.
- `src/engine/hooks/useSceneMode.ts` — investigated and reverted; see §Known limitations. Byte-identical to its pre-pass state.

## Systems covered

Water, Electrical, Fire — the three plant-equipment systems named in the brief's Priority 1. Elevators inspected, confirmed as the benchmark, not modified. HVAC/Access/CCTV/Network explicitly not started.

## Canonical assets reused

All pump/tank/panel/cabinet geometry changes render **existing** canonical refs — zero new operational/canonical assets were created. Six new **zone/access** refs were added (`LUNA-B1-{ELECTRICAL,WATER,FIRE}-PLANT-{ZONE,ACCESS}-01`), the same semantic-marker category (not operational equipment) as the pre-existing riser maintenance gallery, following its exact precedent.

## Runtime: untouched

`lunaSimulationProvider.ts`, every `recompute*Network()` function, every resolver (`resolveBuildingPower`, `resolveFireState`), every Control Board, and every Oyi matcher/parser file are byte-unchanged. This was verified structurally (no edits to any runtime/intelligence/control file) and functionally (all deterministic + browser regression suites for every system pass unchanged).

## Topology preservation

No new relationship, route, or parentRef was invented or altered. The one new geometry-only wiring is `CableTray`'s `flowing` prop reading the *same* `runFlowing(run.sourceGate)` value the pre-existing `PipeRun` call already read — a like-for-like primitive swap, not a new connectivity claim. `ServiceZone`/`AccessPanel` markers carry no relationships at all (same as the riser gallery precedent).

## Visual improvements

- Pump assemblies now show suction/discharge connections, a local valve, and a live pressure gauge — reading as a complete skid rather than an isolated shape (brief §3, satisfied).
- Electrical cable runs now render as flat tray/trunking cross-sections matching the riser's own busway shape, not round pipe (brief §5/§11, satisfied).
- B1's three plant clusters are now spatially demarcated with their own translucent zone + service-door markers (brief §1 Priority 1 / §13, satisfied at the "minimum necessary" level the brief asks for).

## Known limitations (disclosed, not silently worked around)

- **"All Systems" architecture transparency was investigated and reverted.** A fix was implemented and confirmed (via debug instrumentation) to compute the intended reduced opacity target correctly on every level, but it did not produce a visually legible transparency effect in the rendered scene, unlike the pre-existing single-system fade mechanism (which does work, confirmed by direct screenshot comparison — see spec §6). Root cause not conclusively isolated within this pass's budget. The `"all"` code path was reverted to its exact original state rather than ship an ineffective change; the brief's underlying visual goal is met instead via the already-working single-system fade, used for screenshot #12.
- Camera framing for individual asset "tab" selections (e.g. the water riser screenshot) sometimes lands inside architecture geometry rather than a clean exterior framing — this is pre-existing camera-preset behavior, not introduced or fixed by this pass (out of scope: the brief says do not rebuild the camera system).
- No plant-room walls were built (deliberately — see spec §5); the three zones are translucent semantic markers, not physical enclosure. A future pass could add real walls once camera-preset interaction with solid B1 geometry is separately verified safe.
- Materials pass (§8) found nothing requiring change — documented as an audit outcome, not a gap.
- Elevators, HVAC, Access, CCTV, Network — untouched, per the brief's explicit boundary.

## Regressions checked (all green)

`tsc -b`, `vite build`, `oxlint` (0 errors, pre-existing warnings only), `verifyRepresentation`, `verifyArchitecture`, `verifyPresentation`, `verifyLift` (deterministic + browser), `verifyFourLift` (deterministic + browser), `verifyControlSurface`, `verifyWater` (deterministic + browser), `verifyElectrical` (deterministic + browser), `verifyElectricalLiveOps` (deterministic + browser), `verifyFire` (deterministic + browser). RepresentationPolicy byte-hash confirmed unchanged via `verifyLift`'s own hash assertion (`PASS Identity, 82 assets, 14 current unequal datums, policy byte hash`).

## Stop condition

Complete per this pass's scope. Per the brief's explicit instruction: no HVAC begun, no new runtime/control/intelligence architecture, `RepresentationPolicy.ts` unchanged, no canonical IDs duplicated, no production/cloud changes.
