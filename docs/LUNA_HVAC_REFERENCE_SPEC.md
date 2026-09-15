# Luna HVAC System V1 — Spatial HVAC Network + Live Thermal State + Physical Equipment

Status: REFERENCE / CONCEPTUAL / SIMULATED. HVAC engineering strategy is unresolved (DD12) — this document describes ONE reference chain (Apartment 6A's two indoor split units and their shared outdoor condenser), never a whole-building HVAC claim.

## 1. Audit (performed before implementation)

**1. What HVAC already exists?** A substantially complete reference chain: two controllable indoor split units (`LUNA-L06-APT-A-LIVING-AC-01`, `BED-01-AC-01`) already ran on a real `climateBehavior` (on/target_temp_c/mode), a shared outdoor condenser (`LUNA-L06-APT-A-AC-OUTDOOR-01`, asset-only, no runtime row), and a real Living Room temperature/humidity sensor (`LUNA-L06-APT-A-LIVING-TH-01`) that already existed and drifted every 4s via a pre-existing ambient tick. A fully separate, disconnected common-area asset (`LUNA-ROOFTOP-HVAC-PLANT-01`, its own on/mode/supply_temp_c state) also exists — explicitly out of scope for this reference chain (see §2).

**2. Which assets already have canonical IDs?** All five: the two indoor units, the outdoor condenser, the Living Room sensor, and the rooftop plant. Zero new canonical assets were created this phase.

**3. What relationships already exist?** Both indoor units carried a `connected_to` edge to the outdoor condenser ("refrigerant-connected to") — the correct topology per Digital Building Standard §5. Each indoor unit's own `parentRef` is its electrical AC circuit (`LUNA-L06-APT-A-AC-CIRCUIT-01`) — a different relationship (how it's powered), never conflated with the HVAC connection.

**4. What geometry already exists?** None of the three HVAC devices had bespoke geometry — all rendered via the generic marker box, the primitive-placeholder gap this phase closes.

**5. What was missing?** Fault modeling, target-seeking thermal drift (the existing ambient tick was a pure random walk, not target-seeking), a building/reference-chain HVAC resolver, an HVAC Control Board, dedicated Oyi coverage for cooling-source/fault/setpoint/"why not cooling"/route questions, outdoor-unit runtime state, and HVAC vocabulary for the outdoor unit.

**6. What can legitimately be simulated?** On/off, mode, setpoint, deterministic temperature drift toward setpoint (cooling) or a reference ambient baseline (off/fault), a scenario-triggered fault, and an outdoor-unit `demand` flag derived from the two indoor units' own state — all reusing the existing provider/behavior/ambient-tick architecture.

**7. What remains DESIGN DECISION REQUIRED because DD12 is unresolved?** Overall HVAC strategy (splits vs. VRF vs. chilled water — this system stays "multi-split reference chain, strategy TBD"), cooling capacity, refrigerant pipe sizing, duct/AHU distribution beyond what's registered, condensate routing (no canonical drain relationship exists — none was invented), ventilation design, noise, final condenser placement, manufacturer/model, and the rooftop plant's own strategy/location.

## 2. Reference chain and network semantics

```
OUTDOOR CONDENSER (LUNA-L06-APT-A-AC-OUTDOOR-01)
  ↑ connected_to (refrigerant)
LIVING ROOM AC (LUNA-L06-APT-A-LIVING-AC-01)  ─┐
PRIMARY BEDROOM AC (LUNA-L06-APT-A-BED-01-AC-01) ─┘
  ↑ parentRef (electrical, separate relationship)
AC CIRCUIT → DB → METER
```

The rooftop common-area plant (`LUNA-ROOFTOP-HVAC-PLANT-01`) is deliberately NOT folded into this reference chain or its resolver — MEP Coordination Spec's own audit language already flags it as "a generic roof plant record... not proof of a whole-building HVAC strategy." Conflating the two would fabricate a connection that doesn't exist (Digital Building Standard §5: "never infer engineering connectivity merely because meshes visually touch" — the same principle applied to *canonical* data, not just geometry).

## 3. Building/reference-chain HVAC resolver — `resolveHvacState()`

`src/luna/runtime/lunaHvacResolver.ts` — one derived, zero-arg read, mirroring `resolveBuildingPower()`/`resolveFireState()`'s exact philosophy: computed fresh from canonical assets' live runtime rows every call, never stored/duplicated state.

```ts
type HvacBuildingState = "off" | "running" | "fault";
interface HvacZoneState { ref, label, zoneRef, state, on, fault, mode, targetTempC, roomTempC }
interface HvacOperationalState { hvacState, zones: HvacZoneState[], outdoorRef, outdoorDemand, quality: "simulated" }
```

`hvacState` is deliberately limited to `off | running | fault` — no "standby" is invented, since nothing in the current catalog legitimately models a distinct standby stage for these units (Part 6 of the brief: "only use states actually supported by the runtime model"). The HVAC Control Board's summary, the per-unit contextual panels, and Oyi's HVAC answers all call this exact function.

## 4. Deterministic thermal simulation

Reuses the EXISTING ambient-tick interval in `lunaSimulationProvider.ts` (the same 4-second loop that already drifted the Living Room sensor) — no second simulator was created. `recomputeHvacNetwork()`:

- Steps each zone's own `room_temp_c` toward its `target_temp_c` (when on and healthy) or toward a reference ambient baseline of 30°C (when off or faulted), at different rates (cooling responds faster than passive drift) plus a small bounded jitter for texture — deterministic, coherent, and explicitly labelled SIMULATED THERMAL STATE (`quality: "simulated"` on every resolver output, "(reference simulation)" in every Oyi sentence).
- Mirrors the Living Room's `room_temp_c` onto the real registered `LIVING-TH-01` sensor — one live truth, never two divergent readings for the same physical room. The Bedroom has no registered sensor, so its `room_temp_c` lives only on the AC unit's own state — disclosed, not a fabricated sensor asset.
- Derives the outdoor condenser's `demand` flag from whether either connected indoor unit is actually cooling (on && !fault) — the ONLY state the condenser carries, since it has zero independent commands (Part 2/13's "do not give the outdoor unit arbitrary start/stop controls" — already true in the existing schedule).
- Is hooked into `execute()` (so a real command produces an immediate nudge) and the ambient tick (so state keeps evolving between commands) — the exact same "explicit trigger + recompute" pattern Water/Electrical/Fire already established.

`climateBehavior` gained fault-awareness via the SAME `toggleBehavior(..., { faultAware: true })` guard the generator/pumps/ATS already use: a faulted unit refuses to start (state stays off, an explanatory message is returned — command execution itself still reports `ok:true`, matching the pump/generator precedent exactly) until the fault clears via the scenario engine's own "Normal Operations" reset. No user-facing `resetFault` command exists, by design.

## 5. Physical geometry

`src/luna/operational/HvacPlantEquipment.tsx` — manufacturer-neutral REFERENCE DESIGN geometry, matching the Physical Reality Convergence standard:

- **Outdoor condenser** — cabinet + top fan grille + side service panel + mounting frame/feet, fan spins (slow, restrained) only while `demand` is true (read from the asset's own runtime row).
- **Indoor unit** — flat wall-mounted casing + front discharge louvre + top/rear intake strip, the louvre glows while on and pulses while faulted (same restrained visual language as every other system's equipment this Twin has built).

Both replace the generic marker box via a `HVAC_EQUIPMENT_KIND` by-ref dispatch table in `OperationalAssetLayer.tsx`, the same pattern Water/Electrical/Fire equipment already use.

## 6. Control Board

`HvacControlBoard.tsx` — the fifth `SystemControlBoard` consumer, positioned beside the existing level rail exactly like Elevators/Water/Electrical/Fire. Three real tabs (`lunaHvacBoard.ts`): Condenser (default), Indoor Unit 01, Indoor Unit 02 — no "L06 HVAC"/"Apartment 6A HVAC" tab is listed since no such distinct canonical asset exists. A `HvacStatusSummary` header widget (reused `headerContent?` slot) shows the live reference-chain state, per-zone state and condenser demand — always visible, reading directly from `resolveHvacState()`.

## 7. Facility/Consumer boundary — a disclosed, deliberate limitation

This is the FIRST Control Board whose controllable target lives inside a private residential unit rather than common/plant infrastructure. `lunaUnitMepAssets.ts`'s own pre-existing comment already documents the decision: "the resident's own indoor split units stay apartment-devices and fully resident-only." This phase deliberately did **not** add the indoor units to `FACILITY_OWNED_UNIT_ASSET_REFS` — honoring both that prior decision and the brief's own non-negotiable "Do NOT modify RepresentationPolicy":

- **Outdoor condenser** — on the allowlist already (shared building plant, like the fire pump or a booster pump) → `CONTEXT_3D` for Facility.
- **Indoor units** — resident-owned comfort devices, same privacy category as lights/curtains → `HIDDEN` for Facility, `FULL_3D` for the assigned resident only.

**Consequence**: the HVAC Control Board's two indoor-unit tabs render an honest boundary message for Facility ("Resident-managed comfort device. Not visible to Facility...") rather than the generic asset panel — never a silently blank tab. Facility's real "authorized HVAC asset" under this reference chain is the outdoor condenser; investigation and control of the indoor units is the resident's own domain, exercised through the same interior device-interaction surface already used for lights/curtains — not a gap, a direct consequence of not fabricating new Facility authority over a resident's own comfort settings.

## 8. Oyi intelligence

All target phrases resolve from canonical/runtime truth, never inferred from the mesh:

| Phrase | Resolution |
|---|---|
| "What is the temperature in Apartment 6A?" | pre-existing `SPACE_SENSOR_ALIASES` → `LIVING-TH-01` |
| "Is the AC running?" / "Turn on the AC." | `LIVING-AC-01` (primary commandable unit) |
| "What is cooling Apartment 6A?" / "Is Apartment 6A cooling?" | aggregate → `AC-OUTDOOR-01` |
| "What is the current setpoint?" | `LIVING-AC-01` |
| "Show me the HVAC system." | existing generic `matchShowSystem` (no change needed) |
| "Show me the outdoor unit." | `AC-OUTDOOR-01` (new alias) |
| "Show me the indoor unit." | `LIVING-AC-01` (new alias) |
| "Is there an HVAC fault?" | pre-existing generic `matchProblem` (any "fault" phrase) + `system:"hvac"` — reused, not duplicated |
| "Why isn't Apartment 6A cooling?" | aggregate → `AC-OUTDOOR-01`, per-zone narrative explains why |
| "Show me the HVAC route." | navigates to `AC-OUTDOOR-01` directly — see §9 |
| "Set Apartment 6A to 22 degrees." | `LIVING-AC-01` via a new `hvac` entry in `UNIT_SYSTEM_TERMINATION` (command-resolution only, see §9) |

**Vocabulary collision found and fixed**: an early draft added a bare `"the ac"` pattern, which — via `findByPattern`'s plain substring matching — silently hijacked Electrical V1.1's own `"Show me the active power path."` phrase (`"the ac"` is a substring of `"the active"`). Confirmed via a real regression in `verifyElectricalLiveOps.mjs`, not a hypothetical. Fixed by using the full literal phrases `"turn on the ac"` / `"is the ac running"` instead — long enough to avoid the collision while still matching the brief's exact required wording.

## 9. HVAC route — a deliberate simplification, not a fabricated topology

The reference chain's real connectivity is the `connected_to` edge (outdoor ↔ indoor), not a `parentRef` chain — each indoor unit's own `parentRef` is its ELECTRICAL circuit. Walking that chain under an "HVAC route" label would silently mislabel the electrical supply path as HVAC routing, exactly what Part 5 of the brief forbids. `matchShowRoute`'s `hvac` branch therefore navigates directly to the outdoor condenser — the one real anchor at the source end of the already-rendered refrigerant connection lines — rather than invoking `buildServiceRoute()`'s parentRef walk at all. The same honest-anchor simplification Electrical's "active power path" and Fire's "affected floor" already established.

`UNIT_SYSTEM_TERMINATION`'s new `hvac` entry (`LUNA-L06-APT-A` → `LIVING-AC-01`) is used ONLY for resolving an ambiguous command target ("set Apartment 6A to 22 degrees") — never for routing.

## 10. Testing

- **Deterministic** (`npm run test:hvac`) — 15/15 PASS: canonical identity, reference topology (`connected_to` vs. electrical `parentRef`), outdoor-unit safety boundary (zero commands), OFF/RUNNING/FAULT resolution, deterministic temperature response toward setpoint, setpoint change, fault behavior (drifts toward ambient, not target), recovery, full Oyi parser phrase resolution, Oyi narrative correctness, Facility/Consumer representation boundaries (including the resident-privacy finding in §7), full Oyi controller round-trip (assigned resident allowed, Facility denied), Control Board registry.
- **Browser** (`npm run test:hvac:browser`) — 16/16 PASS: all 12 required screenshots, live summary widget, simulated cooling/fault/recovery end-to-end, Oyi investigation, state preservation through Architecture/All Systems/Structure switching, Elevator/Water/Electrical/Fire regression.
- **Full regression re-run**: `test:lift` (det+browser), `test:four-lift` (det+browser), `test:control-surface:browser`, `test:water` (det+browser), `test:electrical` (det+browser), `test:electrical-live-ops` (det+browser), `test:fire` (det+browser), `test:representation`, `test:architecture`, `test:presentation`, `tsc -b`, `npm run build`, `npm run lint` — all green after the vocabulary-collision fix, RepresentationPolicy hash unchanged.

## 11. Unresolved (DD12, not addressed by this phase, not fabricated)

Overall HVAC strategy, cooling capacity, refrigerant pipe/duct sizing, condensate routing (no canonical relationship exists), ventilation/dehumidification, noise, final condenser placement, manufacturer/model, and the rooftop plant's own strategy — all remain exactly as documented in the Canonical Building Spec / Master Equipment Schedule / MEP Coordination Spec decision registers. This phase did not resolve, and did not silently choose values for, any of them.
