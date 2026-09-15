LUNA — DOMESTIC WATER REFERENCE SYSTEM V1

Revision 1 • 10 September 2026 • **Reference-design coordination spec for one complete domestic cold-water chain, B1 to Apartment 6A. Not certified hydraulic engineering, procurement, or construction approval.**

Built to `LUNA_DIGITAL_BUILDING_STANDARD.md`. Audited against `LUNA_MASTER_EQUIPMENT_SCHEDULE.md`, `LUNA_MEP_COORDINATION_SPEC.md`, `luna-equipment-schedule.json` and `luna-spatial-program.json` before any code changed — see "Audit findings" below. Every existing canonical identity is reused unchanged; every new one is additive.

## Audit findings (Part B)

The existing codebase already implements most of the required chain, built across Phases 3C, 5, 10 and 13. This phase's real job is smaller than "build a water system" — it is: complete the chain's two open ends (incoming supply, bathroom fixture coverage), make the pump/valve states affect each other, and give it a control board, an engineering view and Oyi intelligence, reusing everything else exactly as it stands.

**Already real and reused unchanged:**
- Full canonical chain, `parentRef`-walkable end to end: `LUNA-B1-WATER-TANK-01` → (siblings) `LUNA-B1-WATER-TREAT-01` / `LUNA-B1-WATER-BP-01` / `LUNA-B1-WATER-BP-02` → `LUNA-RISER-WATER-01` (parents to BP-01) → `LUNA-L06-WATER-BRANCH-01` → `LUNA-L06-APT-A-UTILITY-VALVE-01` → `LUNA-L06-APT-A-METER-WATER-01` → `LUNA-L06-APT-A-WATER-MAIN-01` → `{LUNA-L06-APT-A-WATER-HOT-01, LUNA-L06-APT-A-WATER-COLD-01}` → `LUNA-L06-APT-A-KITCHEN-FIXTURE-BRANCH-01` / `LUNA-L06-APT-A-BATH-01-FIXTURE-BRANCH-01`.
- Real runtime state + commands already wired for `LUNA-B1-WATER-BP-01`/`BP-02` (`pumpBehavior()`, `turnOn`/`turnOff`, duty (BP-01 running) / standby (BP-02 idle) by initial state, with an existing `supplied_by` edge documenting BP-02's standby role) and `LUNA-B1-WATER-VALVE-01` / `LUNA-L06-APT-A-UTILITY-VALVE-01` (`valveBehavior`, `open`/`close`).
- Observable telemetry already live for `LUNA-B1-WATER-TANK-01` (`level_pct`), `LUNA-B1-WATER-TREAT-01` (`running`/`fault`), both meters (`reading_m3`, ambient-drifting every 4s).
- Three water-relevant scenarios already exist and are reused, not duplicated: `water-pressure-fault` (BP-01 faults, tank reads low), `pump-failure` (BP-01 fails, BP-02 takes over), `apartment-leak` (kitchen leak auto-closes the apartment valve).
- `PipeRun`/`Sleeve`/`AccessPanel`/`ServiceZone` (`MepComponents.tsx`) — building-agnostic two-point run/penetration primitives, already used for HVAC refrigerant lines, reused here for water pipe geometry rather than inventing new geometry.
- `"water"` is already a full `OperationalSystem` member: colored (`SYSTEM_COLOR.water = "#4fb0e8"`), labeled, present in the Engineering tray, and automatically faded/revealed by `useSystemAssetOpacity` — zero `App.tsx` change needed for the Engineering Water layer to work once assets are tagged `system: "water"`.
- Facility/Consumer visibility already correct by construction: `lunaRepresentationPolicy.ts`'s existing, **unmodified** rule set gives Facility `FULL_3D` on all common B1/riser/branch water plant, `HIDDEN` to residents on the same (water isn't `vertical-transport`, the one common-asset exception residents get); 6A's own water assets resolve `FULL_3D` for the assigned 6A resident and `CONTEXT_3D` for Facility via the existing `FACILITY_OWNED_UNIT_ASSET_REFS` allowlist.

**Open ends this phase closes:**
- No incoming-supply/backflow demarcation asset exists yet (`EQ-WATER-INTAKE`: `existingCanonicalRefs: []`) — the chain currently starts at the tank with nothing upstream of it.
- Only the Primary Bathroom (`LUNA-L06-APT-A-BATH-01`) and Kitchen have a fixture branch; Bathrooms 2 and 3 (both real registered rooms) have none, and BATH-01's own branch is hot-only — no cold branch exists for it.
- Pump/valve state changes are currently local to their own row only — no downstream pressure/flow response exists (`LUNA-RISER-WATER-01`/`LUNA-L06-WATER-BRANCH-01` carry no runtime state at all today, `staticStatus: "normal"` unconditionally).
- No 3D geometry distinguishes a tank from a pump from a valve — every water asset renders as `OperationalAssetMarker`'s generic tinted box today.
- No control board, Engineering trace UI, or Oyi water phrases exist yet.

**Discrepancies documented, not silently resolved:**
- `LUNA-B1-WATER-BP-01`/`BP-02` parent directly to `LUNA-B1-WATER-TANK-01`, not sequentially through `LUNA-B1-WATER-TREAT-01` (treatment is a `parentRef` sibling of the pumps, not upstream of them). This parentRef is **not changed** by this phase — an existing relationship, left exactly as it stood. A new `supplied_by` edge (see "New relationships" below) documents the pumps' real functional dependence on treatment without touching the existing chain.
- The equipment schedule's own `ROUTE-REQUIREMENT-water.currentExampleParentChainSourceToDestination` stops at the apartment meter; the real asset graph already continues through `WATER-MAIN-01`/`HOT-01`/`COLD-01`/fixture branches. Not corrected here (it is the schedule JSON's own documentation artifact, out of this phase's file scope) — flagged for a future schedule-refresh pass.
- Apartment 6A's `roomRequirements` register three ensuites (BATH-01/02/03) plus one **unresolved** guest WC (`ROOM-LUNA-L06-A-GUEST-WC`, `canonicalRef: null`, DD05). **No guest WC canonical ref is created by this phase.** Cold-water fixture coverage below only extends to the three already-registered, already-canonical bathrooms plus the kitchen.
- DD09 (domestic water and hot water: supply reliability, demand/storage, treatment technology, pressure zones, pump duty/head, hot-water generation/return, backflow) remains fully **DESIGN DECISION REQUIRED**. Every value below not already supported by the existing accepted catalog is marked REFERENCE DESIGN, chosen only to the precision a working conceptual simulation needs.

## Reference chain (Part C)

```
Incoming supply (NEW, REFERENCE DESIGN)
  → Domestic storage tank (existing)
  → Treatment/filtration (existing, functional position documented via new supplied_by edge)
  → Booster pump set, duty BP-01 / standby BP-02 (existing)
  → Main header / isolation valve (existing — LUNA-B1-WATER-VALVE-01, newly connected into the graph)
  → Main vertical riser (existing, now carries live derived pressure/flow telemetry)
  → L06 floor branch (existing, now carries live derived telemetry)
  → 6A isolation valve + meter (existing)
  → 6A cold-water distribution: main → cold manifold (existing)
  → fixture branches: Kitchen (existing) + Bathrooms 01/02/03 (01 extended, 02/03 new)
```

**New canonical assets (all additive — no existing ref renamed, moved, or duplicated):**

| New ref | Role | Classification | Parent |
|---|---|---|---|
| `LUNA-B1-WATER-INTAKE-01` | Incoming supply / backflow-isolation demarcation (EQ-WATER-INTAKE, previously unregistered) | observable | — (new source; tank now parents to this) |
| `LUNA-L06-APT-A-BATH-01-FIXTURE-BRANCH-02` | Primary bathroom cold branch (WC/basin/shower reference group) | asset-only | `LUNA-L06-APT-A-WATER-COLD-01` |
| `LUNA-L06-APT-A-BATH-02-FIXTURE-BRANCH-01` | Bathroom 2 cold branch | asset-only | `LUNA-L06-APT-A-WATER-COLD-01` |
| `LUNA-L06-APT-A-BATH-03-FIXTURE-BRANCH-01` | Bathroom 3 cold branch | asset-only | `LUNA-L06-APT-A-WATER-COLD-01` |
| `LUNA-L06-APT-A-BATH-02-DRAIN-01` | Bathroom 2 waste connection | asset-only | `LUNA-L06-APT-A-DRAIN-01` |
| `LUNA-L06-APT-A-BATH-03-DRAIN-01` | Bathroom 3 waste connection | asset-only | `LUNA-L06-APT-A-DRAIN-01` |

`LUNA-B1-WATER-TANK-01` gains a `parentRef` of `LUNA-B1-WATER-INTAKE-01` (previously unset — additive, not a change to an existing relationship).

**New typed relationships** (`lunaEngineeringRelationships.ts` — additive, no existing edge altered):

| from | type | to | Why |
|---|---|---|---|
| `LUNA-B1-WATER-BP-01` | `supplied_by` | `LUNA-B1-WATER-TREAT-01` | Documents treatment's real functional position upstream of boosting without touching the existing `parentRef` chain. |
| `LUNA-B1-WATER-BP-02` | `supplied_by` | `LUNA-B1-WATER-TREAT-01` | Same, standby pump. |
| `LUNA-RISER-WATER-01` | `isolated_by` | `LUNA-B1-WATER-VALVE-01` | Gives the building-main header valve a real semantic connection into the chain it isolates — "which valve isolates the water riser?" now resolves directly. |

DD09/DD15 govern final capacity, treatment technology, pressure zoning and B1 room allocation — none of that is decided here; the new intake/header connections exist only to complete the chain's identity graph for tracing and simulation.

## Hot water — explicitly not solved (DD09)

`LUNA-L06-APT-A-WATER-HOT-01` (existing) remains a bare distribution point with no generation, storage or return plant behind it. This phase models **cold-water truth only**, per Part F's explicit instruction. No hot-water asset, capability, or command is added or implied controllable.

## Wastewater reference path (Part G)

Already real for Kitchen and Bathroom 1: `LUNA-L06-APT-A-KITCHEN-DRAIN-01` / `LUNA-L06-APT-A-BATH-01-DRAIN-01` → `LUNA-L06-APT-A-DRAIN-01` (wet-area stack connection) → `LUNA-L06-DRAINAGE-BRANCH-01` → `LUNA-RISER-DRAINAGE-01` → `LUNA-B1-DRAINAGE-MAIN-01` (discharge reference). Bathrooms 2/3 gain the same pattern via the two new drain refs above. Soil/waste/vent and fresh-water stay two entirely separate graphs (separate riser refs, separate `system` tags, no shared node) — never merged for color or convenience. No gradient, invert level, pipe sizing or vent strategy is claimed; drainage direction (fixture → discharge) is the opposite of the water graph's direction (source → fixture) by design, matching `LUNA_MEP_COORDINATION_SPEC.md`'s explicit warning that the two must not be read as mirror images of one graph.

## Runtime/simulation behavior (Part E)

Reuses `TwinRuntimeProvider`/`lunaSimulationProvider` exclusively — no new state architecture. One new pure function, `recomputeWaterNetwork()`, runs through the existing `setAssetState()` choke point after any water-relevant command or scenario patch (booster pump start/stop, either isolation valve open/close):

- **Header/riser pressure** = the higher of the two booster pumps' own `pressure_bar` among those currently `running` and fault-free, or `0` if none are — `0` if the B1 header valve (`LUNA-B1-WATER-VALVE-01`) is closed regardless of pump state. Written to `LUNA-RISER-WATER-01.state.pressure_bar` / `.flow_status`.
- **L06 branch** mirrors the riser's pressure/flow (no per-floor restriction modeled — the same reference simplification the riser/branch pair already uses for every other system).
- **Apartment supply** — `LUNA-L06-APT-A-METER-WATER-01.state.supply_active` = riser pressure `> 0` AND the apartment's own isolation valve is open. Closing either the building header valve or the 6A valve alone is enough to read `supply_active: false` at the meter — the isolation-valve effect the brief requires, demonstrable from either end of the chain.

This is deterministic and conceptual, not certified hydraulics — no pipe friction, elevation head, or simultaneous-demand modeling. Booster pump commands, duty/standby (BP-01 running / BP-02 standby by default, already-existing configuration), and the three existing scenarios are otherwise unchanged.

## Truth-status summary

| Element | Status |
|---|---|
| Existing B1 plant / riser / branch / 6A chain (reused) | REFERENCE DESIGN (unchanged from prior phases) |
| New intake, header connection, bathroom fixture/drain branches | REFERENCE DESIGN (new, this phase) |
| Pump/valve/tank telemetry and commands | SIMULATED |
| Downstream pressure/flow propagation | SIMULATED (deterministic, conceptual) |
| Tank capacity, pump duty/head, pipe diameters, pressure zoning, treatment technology, hot-water strategy, manufacturer/model | **DESIGN DECISION REQUIRED** (DD09) — none resolved by this phase |
| Guest WC | **DESIGN DECISION REQUIRED** (DD05) — no canonical ref exists; none created |

See `artifacts/luna-domestic-water-report.md` for the completed implementation, test results, and screenshots.
