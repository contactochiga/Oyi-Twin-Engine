LUNA — DIGITAL BUILDING STANDARD

Revision 1 • 10 September 2026 • **Authoritative, read-before-implementation standard. Not construction approval, procurement authority, or a change to any existing runtime/policy behavior.**

This document exists because the elevator work (Dynamic Lift 02, then its four-lift generalization, then the Unified Spatial Control Surface) produced a working, verified pattern for how a Luna engineering system should be built — spatially credible, operationally simulated, canonically identified, and controllable through one reusable grammar. This standard extracts that pattern into fourteen locked principles so every future system (water, electrical, fire, HVAC, access, CCTV, network/edge) is built the same way, on purpose, instead of by accident. It supersedes no existing specification; `LUNA_CANONICAL_BUILDING_SPEC.md`, `LUNA_MASTER_EQUIPMENT_SCHEDULE.md`, `LUNA_MEP_COORDINATION_SPEC.md` and `LUNA_DYNAMIC_ELEVATOR_SPEC.md` remain authoritative for their own domains — this document is the cross-cutting standard those domains, and every future one, must be read against before implementation begins.

## 1. Physical reality

If an element is intended to physically exist in Luna, its final representation should be recognizable, dimensionally plausible and spatially credible — a viewer familiar with the equipment category should be able to identify it without relying solely on a text label.

Development placeholders are permitted temporarily but must remain **explicitly classified** as placeholders/reference geometry (in code comments, in the canonical schedule, and in any report describing them). An abstract box is allowed as a stand-in during active development; it is never allowed to silently become the final representation of physical equipment. Every placeholder carries a visible trail back to the requirement it stands in for.

## 2. Architectural reality

Walls, slabs, glazing, stairs, lift lobbies, corridors, doors, shafts, apartments, plant rooms and other spaces must eventually become actual architectural elements with coordinated dimensions and relationships — not painted labels on procedural volumes.

A label such as `LOBBY` does not constitute a finished lobby. A room reference existing in the canonical schedule is an identity, not proof of a built, dimensioned, reviewed space. See `LUNA_CANONICAL_BUILDING_SPEC.md`'s decision register (DD01–DD19) for the current, honestly-tracked gap between programme and built architecture.

## 3. Operational reality

If equipment operates, its operational state belongs to the Oyi Runtime/provider architecture. **Geometry represents state; geometry never owns operational truth.**

A pump mesh spinning or a valve mesh rotated open is a *rendering* of a state that lives in `TwinRuntimeProvider`/`lunaSimulationProvider`. No component may derive "is this pump running" from anything other than reading the runtime's state for that canonical ref. This is the exact discipline the lift work already established (`liftSimulation.ts` owns motion truth; `DynamicLift.tsx` only renders it) and it now applies to every future system without exception.

## 4. Simulation parity

Simulation and future physical integrations must use the same canonical asset/state/command contracts wherever technically possible. **The provider changes. The building identity does not.**

A future Edge adapter replacing the deterministic simulation for a real pump must write into the same `RuntimeAssetState` envelope, against the same canonical ref, honoring the same command contract — the UI, Oyi, and every consumer of that state should not need to know whether the number came from a simulation clock or a physical sensor.

## 5. Engineering reality

Connections between systems/assets must be explicit semantic relationships and coordinated routes. **Never infer engineering connectivity merely because meshes visually touch.**

`serviceRoute.ts` walks an explicit `parentRef` chain; the seven typed relationship edges (`supplied_by`, `drains_to`, `powered_by`, `protected_by`, `connected_to`, `monitored_by`, `isolated_by`) are the only other source of connectivity truth. A pipe mesh passing near a valve mesh in 3D space proves nothing about whether that valve actually isolates it — only a registered relationship does. `LUNA_MEP_COORDINATION_SPEC.md` §"Semantic and spatial layers" already establishes this; this standard makes it a permanent, cross-system rule, not a water/electrical-specific one.

## 6. MEP reality

Building services must ultimately form complete service chains:

```
SOURCE → PLANT → DISTRIBUTION → RISER → FLOOR BRANCH → ISOLATION/CONTROL → TERMINAL/LOAD
```

Supply and waste/drainage remain separate networks — a fixture's cold-water supply and its waste connection are two distinct chains with distinct directionality (supply flows source→fixture; drainage flows fixture→discharge), never merged into one graph or one visual color regardless of how close their geometry sits.

## 7. Equipment realism

Major equipment must eventually use recognizable, engineering-realistic physical representations. Pumps should resemble pumps. Valves should resemble their actual valve class (gate, ball, check, butterfly — not one generic sphere/box standing in for all). Tanks should resemble tanks. Electrical equipment should resemble the appropriate equipment category.

**Do not invent manufacturer/model/procurement truth.** Where manufacturer/model is not selected, classify geometry as **REFERENCE DESIGN** — realistic enough to be recognizable and dimensionally plausible, explicit that it is not a specific procured product.

## 8. Behavioural realism

Where equipment has meaningful operational behavior, simulation should represent it credibly. Examples given: pump start/stop, valve open/close, lift movement/doors, gate/door movement, generator running/stopped, tank level, flow/pressure, alarms/faults.

**Do not fabricate certified physics where a deterministic conceptual model is sufficient.** The lift's fixed-step integration (`liftSimulation.ts`) is the reference example: physically coherent (position, velocity, acceleration behave sensibly) without claiming to be a certified elevator-dynamics model. Water/electrical/HVAC simulations should hold to the same bar — plausible, responsive, deterministic; not hydraulically or electrically certified.

## 9. Spatial traceability

Oyi should eventually be capable of tracing relevant upstream/downstream relationships spatially. Example: `Apartment 6A → floor branch → riser → header → booster → treatment → storage`.

This trace must walk the same canonical relationship graph principle 5 requires — never a geometry-proximity shortcut — and must respect the same privacy/authorization boundaries as every other Oyi interaction (a trace does not leak a hidden endpoint's location or state to an unauthorized viewer; see principle 13/`LUNA_MEP_COORDINATION_SPEC.md` §9).

## 10. Truth status

Preserve explicit distinction between:

| Status | Meaning |
|---|---|
| TARGET / PROGRAMME | Locked intent, not yet designed or built |
| REFERENCE DESIGN | A credible conceptual design used to make simulation/visualization work, explicitly not a final engineered/procured answer |
| SIMULATED | State/behavior produced by the deterministic Oyi Runtime, not a live physical reading |
| ENGINEER/ARCHITECT APPROVED | Reviewed and signed off by the accountable discipline |
| INSTALLED | Physically built/fitted on site |
| LIVE PHYSICAL | Backed by a real Edge/integration feed, not simulation |
| DESIGN DECISION REQUIRED | An open decision register item (DDxx) blocking a specific unresolved value |

**Visual realism must never upgrade truth status.** A beautifully modeled pump is still SIMULATED/REFERENCE DESIGN until an Edge adapter and an engineering approval say otherwise — better geometry never promotes an asset up this ladder by itself.

## 11. Environmental reality

Geographic location, local time and weather/environmental data are source state. Sun/day/night/golden-hour/rain/cloud/environment effects are representations of that state.

Future LIVE and PRESENTATION/SIMULATION environmental modes must remain distinguishable — a viewer must always be able to tell whether the sky/lighting reflects a real feed or a chosen preset. **Weather is not implemented in this phase** (Part A of the current brief is documentation-only for this principle; no weather code is introduced by the water reference system in Part B onward).

## 12. Interface philosophy

Preserve:

```
Building → Floor → Space → Asset → Control
```

and:

```
LOCATE → ENTER → OPERATE
```

The building remains the dominant interface — no engineering system's control surface should compete with or obscure the 3D building for primacy.

Use the reusable control grammar established by `SystemControlBoard` (`src/engine/components/spatial/SystemControlBoard.tsx`), proven first by `ElevatorControlBoard`:

```
System → Asset Selector → Asset State → Commands → Views
```

Every future system's control board is a `SystemControlBoard` fed system-specific tabs and content — never a new, parallel control-panel architecture. **Avoid creating permanent dashboards for every engineering system** — a system's board opens when that system is the active Engineering layer or one of its assets is focused, and otherwise stays out of the way, exactly like the elevator board does today.

## 13. Information vs. control

Primary operational controls (state display, commands, view switches) belong in the established left-side control zone (the `SystemControlBoard` pattern). Deeper information — history, events, maintenance records, analytics, Oyi's own explanations — belongs on contextual/right-side informational surfaces, not crowded into the control zone.

This is a direction, not a rigid rule requiring every system to build both surfaces immediately — see the Unified Spatial Control Surface v1 report for how this was established cleanly with one system (elevators) without redesigning everything else.

## 14. Source-of-truth separation

Preserve permanently, across every system, forever:

| Layer | Owns |
|---|---|
| **EXTERNAL MODEL** | Visual/spatial representation (geometry, materials, GLB) |
| **OYI CANONICAL MODEL** | Identity + semantics + relationships (canonical refs, parentRef, typed edges) |
| **OYI RUNTIME** | State + telemetry + commands (`TwinRuntimeProvider`, `RuntimeAssetState`) |
| **REPRESENTATION POLICY** | Authorization + visibility (`lunaRepresentationPolicy`, unchanged by any future system) |
| **OYI INTELLIGENCE** | Understanding + orchestration + spatial interaction (`TwinIntelligenceController`, deterministic parser) |
| **EDGE / INTEGRATIONS** | Physical connectivity (future adapters into the same Runtime contract) |

No layer may reach into another's jurisdiction. A geometry component never writes state. A canonical model entry never contains operational truth (glTF extras carry no command state — `LUNA_CANONICAL_BUILDING_SPEC.md` already establishes this for architecture; it is universal). RepresentationPolicy is never modified opportunistically by a feature that merely wants a different visibility outcome — if a system needs new authorization behavior, that is its own explicit, reviewed change, not a side effect of adding equipment.

## How to use this document

Before implementing any future Luna engineering system (water generalization beyond the 6A reference chain, electrical, fire, HVAC, access, CCTV, network/edge):

1. Read this standard in full.
2. Read the domain's own authoritative spec/decision register for what is TARGET/PROGRAMME vs. already REFERENCE DESIGN vs. DESIGN DECISION REQUIRED.
3. Audit existing canonical identities for that domain before creating anything — reuse, never duplicate.
4. Build geometry, runtime wiring, control board and Oyi intelligence against the contracts above, in that order of dependency (identity → state → control surface → intelligence), matching how the elevator system and the first water reference chain were both built.
5. Mark every unresolved value DESIGN DECISION REQUIRED rather than silently choosing one.

See `LUNA_DOMESTIC_WATER_REFERENCE_SPEC.md` for the first non-elevator system built to this standard.
