# Luna HVAC System V1 — Final Report

Status: **Complete.** Full regression green (including a real regression found and fixed mid-phase). No Access/CCTV/Network work begun. No new runtime/control architecture. `RepresentationPolicy.ts` unchanged.

## Screenshots

| # | Requirement | File |
|---|---|---|
| 1 | HVAC NORMAL | `artifacts/luna-hvac-normal-state.png` |
| 2 | Engineering → HVAC | `artifacts/luna-hvac-normal-state.png` (board auto-opens in the same capture) |
| 3 | Whole HVAC reference network | `artifacts/luna-hvac-whole-reference-network.png` |
| 4 | Outdoor condenser | `artifacts/luna-hvac-outdoor-condenser.png` |
| 5 | Indoor unit | `artifacts/luna-hvac-indoor-unit-selected.png` |
| 6 | Apartment 6A HVAC chain | `artifacts/luna-hvac-6a-chain-simulated-cooling.png` |
| 7 | HVAC Control Board | `artifacts/luna-hvac-control-board.png` |
| 8 | Simulated cooling | `artifacts/luna-hvac-6a-chain-simulated-cooling.png` |
| 9 | HVAC fault | `artifacts/luna-hvac-fault.png` |
| 10 | Recovery | `artifacts/luna-hvac-recovery.png` |
| 11 | Oyi HVAC investigation | `artifacts/luna-hvac-oyi-investigation.png` |
| 12 | Physical HVAC equipment close-up | `artifacts/luna-hvac-outdoor-condenser.png` (reused — see Known limitations) |

Screenshot 6/8 was captured after forcing a real runtime ON + 18°C setpoint change through `recomputeHvacNetwork()` — the live summary correctly reads RUNNING with the outdoor condenser showing active demand, all derived from the same real state. Screenshots 9/10 show a full fault → recovery cycle via a real state transition, matching the deterministic test's own proof.

## Existing HVAC evidence (from the audit)

Two controllable indoor split units with a real `climateBehavior` runtime, a shared outdoor condenser (asset-only), and a real Living Room temperature/humidity sensor already existed, plus a `connected_to` topology already linking both indoor units to the condenser. A separate, disconnected common-area rooftop plant asset also existed. See `docs/LUNA_HVAC_REFERENCE_SPEC.md` §1 for the full seven-point audit.

## Assets reused / canonical IDs

`LUNA-L06-APT-A-LIVING-AC-01`, `BED-01-AC-01`, `AC-OUTDOOR-01`, `LIVING-TH-01` — all pre-existing. **Zero new canonical operational assets were created.**

## Topology

`AC-OUTDOOR-01 <- connected_to <- {LIVING-AC-01, BED-01-AC-01}` (refrigerant), kept fully distinct from each unit's own `parentRef` chain through its electrical circuit. Exactly 2 typed edges exist for this reference chain — nothing inferred from geometry, verified by a deterministic test that never reads mesh positions.

## Runtime state

`resolveHvacState()` (`src/luna/runtime/lunaHvacResolver.ts`) — a pure derived function, never stored state, consumed identically by the Control Board, Oyi, and per-unit contextual panels. Building/reference-chain state is limited to `off | running | fault` (no invented "standby").

## Thermal simulation

Reuses the pre-existing ambient-tick interval (no second simulator). `recomputeHvacNetwork()` steps each zone's `room_temp_c` toward its setpoint when cooling or toward a 30°C reference ambient baseline otherwise, mirrors the Living Room's reading onto the real `LIVING-TH-01` sensor, and derives the outdoor condenser's `demand` flag from the two indoor units' own state. Every output is explicitly labelled `quality: "simulated"`, and every Oyi sentence includes "(reference simulation)" — SIMULATED THERMAL STATE is never presented as LIVE PHYSICAL TELEMETRY.

## Physical geometry

`HvacPlantEquipment.tsx` — an outdoor condenser (cabinet, fan grille, service panel, mounting frame) and an indoor split terminal (casing, discharge louvre, intake strip), both manufacturer-neutral REFERENCE DESIGN, replacing the generic marker box via the same by-ref dispatch pattern Water/Electrical/Fire equipment already use.

## Controls

Fifth `SystemControlBoard` consumer (`HvacControlBoard.tsx`), three real tabs (Condenser/Indoor Unit 01/Indoor Unit 02), a live `HvacStatusSummary` header widget. The outdoor condenser correctly exposes zero commands (no fabricated independent control authority). Commands flow UI → canonical asset → runtime/provider → state update → Twin → Oyi, never UI → geometry animation, matching every other system's control architecture in this Twin.

## Oyi

13 target phrases verified end-to-end (parser + narrative), listed in `artifacts/luna-hvac-reference.json`. The HVAC route deliberately navigates to the outdoor condenser rather than walking a fabricated parentRef-based "route" (see spec §9 for why). "Is there an HVAC fault?" correctly reuses the pre-existing generic `matchProblem` matcher rather than duplicating it.

## Permissions — a disclosed, deliberate finding

This is the first Control Board whose controllable target lives inside a private unit. The outdoor condenser (shared plant) is `CONTEXT_3D` for Facility. The two indoor units are resident-owned comfort devices — a **pre-existing, already-documented decision** (`lunaUnitMepAssets.ts`'s own comment) keeps them `HIDDEN` to Facility, `FULL_3D` only for the assigned resident. This phase honored that decision rather than reversing it (which would have required either modifying `RepresentationPolicy` or expanding the Facility-owned-unit allowlist into genuinely resident-private territory — neither is justified by this phase's scope). The Control Board's indoor-unit tabs render an honest boundary message for Facility instead of a silently blank panel.

## DD12 unresolved decisions

Overall HVAC strategy, cooling capacity, refrigerant/duct sizing, condensate routing, ventilation/dehumidification, noise, final condenser placement, manufacturer/model, and the rooftop plant's own strategy — all remain exactly as documented in the canonical decision registers. None were resolved or silently chosen by this phase.

## Safety/engineering boundaries

- The outdoor condenser exposes zero commands (verified by assertion).
- No condensate routing was fabricated — no canonical relationship exists for it.
- No cooling capacity, sizing, or manufacturer/model was invented anywhere.
- No new simulator, control architecture, or `RepresentationPolicy` change.

## Test results

- **Deterministic** (`npm run test:hvac`) — 15/15 PASS.
- **Browser** (`npm run test:hvac:browser`) — 16/16 PASS, all 12 required screenshots, full Elevator/Water/Electrical/Fire regression included.
- **A real regression was found and fixed mid-phase**: an early vocabulary pattern (`"the ac"`) was a substring of Electrical V1.1's own `"the active power path"` phrase, silently hijacking it. Confirmed via a genuine `verifyElectricalLiveOps.mjs` failure, fixed with longer, collision-free literal patterns, re-verified green.
- **Full regression re-run, all green**: `test:lift` (det+browser, RepresentationPolicy hash unchanged), `test:four-lift` (det+browser), `test:control-surface:browser`, `test:water` (det+browser), `test:electrical` (det+browser), `test:electrical-live-ops` (det+browser), `test:fire` (det+browser), `test:representation`, `test:architecture`, `test:presentation`, `tsc -b`, `npm run build`, `npm run lint`.

## Known limitations

- Camera framing for individual asset "tab" selections sometimes lands inside architecture geometry rather than a clean exterior framing — the same pre-existing camera-preset limitation already disclosed in the Physical Reality Convergence report, not introduced or fixed by this pass.
- The indoor-unit tabs are only meaningfully populated (state + commands) for the assigned resident, not Facility — a deliberate, disclosed consequence of §7's privacy finding, not a bug.
- The Bedroom zone has no dedicated registered sensor — its simulated temperature lives only on the AC unit's own state, disclosed rather than backed by a fabricated sensor asset.
- The rooftop common-area plant remains completely untouched and outside this reference chain's resolver, per the audit's own finding that it isn't proof of a whole-building strategy.

## Regressions checked

Four lifts, Elevator Control Board, Water reference chain + Control Board, Electrical V1/V1.1 (including live building-supply summary), Fire Control Board + investigation flow, Unified Control Surface, Presentation, Representation (byte-hash unchanged), Architecture — all explicitly re-verified green, including after the vocabulary-collision fix.

## Stop condition

Complete and fully verified. Per the brief's explicit instruction: no Access/CCTV/Network work begun, no new runtime/control/intelligence architecture, `RepresentationPolicy.ts` unchanged (byte-hash re-verified), no canonical IDs duplicated, no production/cloud changes.
