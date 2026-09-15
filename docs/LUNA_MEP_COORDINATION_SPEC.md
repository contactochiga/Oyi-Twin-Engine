LUNA — MEP SPATIAL COORDINATION SPECIFICATION

Revision 1 • 9 September 2026 • **Conceptual coordination requirements; not certified engineering or construction routes.**

The canonical programme and master equipment schedule are the inputs. This specification extends the meaning of the existing MEP backbone without changing its implementation. No pipes, ducts, circuits, room boundaries or system capacities are approved by a renderer.

**Existing evidence and gaps**

[src/luna/operational/lunaMepBackbone.ts](/Users/ochigaidoko/Oyi-Twin-Engine/src/luna/operational/lunaMepBackbone.ts) explicitly describes a representative graph: five B1-to-roof risers, five L06 floor branches and 6A service terminations. The risers are electrical, water, drainage, fire and network. HVAC currently has a 6A outdoor condenser connected to two indoor units and a generic roof plant record; it has no complete vertical HVAC distribution scheme. These are not proof of a whole-building HVAC strategy.

[serviceRoute.ts](/Users/ochigaidoko/Oyi-Twin-Engine/src/engine/serviceRoute.ts) walks one `parentRef` chain, bounded to 12 hops, terminating on a missing or repeated parent. It can return a partial chain; that is not evidence of complete engineering connectivity. [lunaServiceRoutes.ts](/Users/ochigaidoko/Oyi-Twin-Engine/src/luna/intelligence/lunaServiceRoutes.ts) maps only 6A's electrical/water/drainage/fire/network terminations; there is no whole-building termination register. The existing seven typed relationships supplement parentRef for isolation, protection, monitoring, shared condenser connection and standby water supply. Do not create a parallel graph by inferring proximity.

Important current distinctions:

- Electrical `parentRef` is a service association, not a single-line circuit drawing. The final utility/generator/ATS/bus arrangement needs explicit approved electrical relationships.
- The water riser parents to BP-01; a `supplied_by` edge links BP-02 as standby. Preserve both refs; pump-group hydraulic duty is still design work.
- Hot-water distribution exists as a representative node downstream of the apartment water main, but heat generation/storage/return is not modeled.
- The primary bathroom fixture branch currently parents only to the hot-water node; that must not be mistaken for complete hot/cold fixture service.
- The smoke detector's parent through a fire branch does not make it part of a sprinkler water circuit. Separate alarm/control signal topology from hydraulic fire distribution in approved design.
- Drainage's source-to-terminal graph display is inverse to actual wastewater flow. `LUNA-B1-DRAINAGE-MAIN-01` is a discharge reference, not a water source.
- Existing 80 sleeve markers are torus/reference markers, not cut slab openings or approved fire stopping. The fixed service/core geometry and exploded per-floor visuals have distinct transforms.

**Semantic and spatial layers**

Keep the existing operational and engineering relationship types: `supplied_by`, `drains_to`, `powered_by`, `protected_by`, `connected_to`, `monitored_by`, `isolated_by`, `routed_through`. Do not overload spatial containment as distribution ownership. A room owns location; a system relationship describes service. A selectable shaft, structural wall, pipe and pump may relate without becoming the same object.

A future coordinated route must carry the following design record. This is a documentation schema, not a newly implemented API:

| Field | Contract |
|---|---|
| routeSpecId / revision / status | Stable specification key and revision; conceptual, engineer-reviewed or approved-design status |
| system / medium / function | Existing system association plus medium, e.g. potable cold water, soil, refrigerant, alarm signal or power |
| endpointCanonicalRefs | Registered equipment/space IDs; proposed endpoints use requirement IDs separately and cannot render as canonical |
| fromPort / toPort | Named physical/service ports under the relevant canonical asset, including flow direction, local frame and compatibility |
| semanticRelationships | Existing directed edge type and endpoints; primary parentRef remains unchanged until reviewed migration |
| ownerLevelRef / traversedLevels | Floor-local segment or continuous building-fixed run; never duplicate a full riser per floor |
| coordinateFrame / points | Metres, Y-up, approved datum; ordered polyline points remain null until coordinated |
| envelope / insulation / access | Physical outer envelope separate from maintenance/replacement clearance; sizes unresolved until design |
| capacity / design conditions | Load, pressure, temperature, voltage, flow, gradient etc. as applicable, with units and engineer provenance |
| sleeves / compartments | Structural-element refs, penetration spec refs, fire/acoustic/waterproof seal requirements |
| valves / controls / sensors | Existing or registered refs and explicit isolation/protection/monitoring relationships |
| source crosswalk | IFC/native IDs and drawing revision; no operational authority in GLB |
| verification | Clash result, access review, hydraulic/electrical/airflow evidence and approval owner/date; not merely a mesh intersection test |

buildingSMART distinguishes distribution systems from their connection ports, which supports preserving service identity and connectivity independently from shape. This is a reference mapping, not an IFC import implementation or a claim that the project is IFC-certified. [IfcDistributionSystem](https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/IfcDistributionSystem.htm), [IfcDistributionPort](https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/HTML/lexical/IfcDistributionPort.htm).

**System coordination chains**

| System | Required coordination chain | Existing anchors to preserve | Engineering decisions |
|---|---|---|---|
| Electrical | Utility → transformer if required / approved standby source → main distribution/changeover → riser → floor DB/branch → unit meter/DB/protection → final circuit/load | GRID-01, MDB-01, GEN-01, ATS-01, INV-01; LUNA-RISER-ELECTRICAL-01; L06 branch; 6A meter/DB/circuits | DD08: topology, demand/diversity, ratings, protection, selectivity, containment, segregation, earthing, backup loads. Supply arrows are design requirements, not a rewrite of current parentRef. |
| Domestic water | Approved incoming supply → storage/treatment in designed order → booster/header/pressure zoning → riser → floor branch → isolation/meter → cold/hot distribution → fixtures | B1 tank/treatment/BP-01/BP-02/valve; water riser; L06 branch; 6A valve, meter, main/hot/cold and fixture branches | DD09: demand, source quality, storage, duty/standby, pressure, hot-water plant and return, testing/access. |
| Drainage | Fixture → local waste/soil branch → stack → base collection → gravity discharge or lifting plant if required → approved discharge; vents rise to approved termination | 6A kitchen/bath drains → DRAIN-01 → L06 branch → drainage stack → B1 main | DD10: correct flow direction, invert/slope, soil/waste/vent separation, inspection, pumping, foul/storm separation, roof overflows. Do not force a potable-water source/plant template onto gravity drainage. |
| Fire hydraulic | Fire storage/source → pump/header → fire riser → floor control/test branch → sprinkler/hydrant/hose-reel terminals as designed | B1 fire tank/pump, fire riser, L06 fire branch | DD11: design duty, zoning, coverage, supervision, maintenance and cause/effect; quantities not yet selected. |
| Fire alarm/control | Approved panel/network → loop/interface → zoned detectors/call points/sounders → supervised cause/effect interfaces | B1 fire panel, Ground detector, 6A smoke detector | DD11: distinct medium from sprinkler water; independently supervised interfaces to lifts/access/HVAC. |
| HVAC | Strategy-dependent plant/outdoor equipment → distribution medium (air/water/refrigerant) → riser/branch/control → AHU/FCU/indoor terminal → occupied load; return/extract/condensate coordinated separately | Generic roof plant, 6A outdoor unit, two indoor units and `connected_to` relationships | DD12: strategy, loads, ventilation/dehumidification, noise, refrigerant/duct/pipe routes, condensate, access and smoke interfaces. |
| Network/data | Carrier handoff → rack/switch/edge → fiber backbone → floor distribution → demarcation/controller/AP → device or home endpoint | B1 gateway / LUNA-EDGE-CORE-01; network riser; L06 branch; ONT; home router; Ground AP | DD14: physical topology, resilience, ports, cable media, pathways, segmentation, PoE/power and local autonomy. |

Full canonical refs and current parent/typed edges are preserved in [luna-equipment-schedule.json](/Users/ochigaidoko/Oyi-Twin-Engine/artifacts/luna-equipment-schedule.json). Abbreviations above are explanatory labels, not additional IDs.

**HVAC design basis remains open**

Required load zones: each apartment living/bedroom zone; kitchen and bathroom exhaust; common lobbies/corridors as the environmental strategy requires; Club pool/occupied lounge; Sky Bar/support rooms; technical/ICT rooms; B1 parking/plant ventilation; refuse/cleaning areas; lift/core smoke interfaces where the fire strategy requires them. Do not assume all corridors are mechanically cooled or one thermostat covers an entire floor.

Candidate strategies to compare are individual/unit multi-splits, zoned VRF, and central chilled-water with appropriate terminal/air systems. Compare peak/block/part-load demand, humidity and outside-air delivery, metering/ownership, plant footprint, shaft/ceiling space, condenser/exhaust discharge, refrigerant implications, maintenance, noise and emergency operation. None is selected by the existing generic roof plant. Hot-water generation is a separate public-health/energy decision.

Load calculation inputs must be approved room geometry/envelope, climate/design conditions, solar/orientation, occupancy/schedules, internal equipment/lighting, ventilation/infiltration and sensible/latent loads. The need to evaluate internal and external loads is supported by ASHRAE's load-calculation guidance; these documents do not supply Luna capacities or declare a jurisdictional standard. [ASHRAE load-calculation committees](https://www.ashrae.org/technical-resources/technical-committees/section-4-0-load-calculations-and-energy-requirements), [ASHRAE residential load-calculation chapter](https://handbook.ashrae.org/Handbooks/F21/IP/f21_ch17/f21_ch17_ip.aspx).

**Spatial coordination rules**

1. Core/shaft reservation: separate functions by required safety, water/electrical compatibility and maintainability. One 1.6×1.6m representative service shaft is not an approved container for every service. Keep electrical/data/fire/water/drainage/HVAC/service continuity, with exact shaft counts and sizes under DD02/07/11/12.
2. Horizontal service distribution: use accessible common ceilings/service corridors before private room routes where appropriate. Reserve actual clear depth after structural slab/beams, insulation, hangers and crossing services. Existing serviceVoid flags on selected wet/common rooms are clues, not a ceiling coordination plan.
3. Wet-stack strategy: align every ensuite, guest WC, kitchen and utility connection vertically; document exceptions/offsets. Reserve soil, waste, vent, water and access zones. Each fixture group needs complete service ports; fixture counts follow the apartment programme.
4. Penetrations: bind each opening to the actual slab/wall and crossing service envelope; record opening size, position, permitted tolerances, fire/acoustic/water seal and approval. Do not drill a structural member because a route polyline crosses it. Structural sign-off precedes final holes.
5. Maintenance: model access-panel opening/swing, technician work zone, isolation access, filter pull, motor removal, valve reach and lifting approach separately from visible equipment. Dimensions remain supplier/engineer decisions. A collision-free static object can still be unmaintainable.
6. Replacement routes: B1 service entrance/loading → service corridor → equipment room; upper-floor equipment via the approved service lift/load/door envelope → landing → service route. Record turning/swept volume, removable panels and hoisting needs; do not assume the service lift can carry every plant item.
7. Drainage/site: confirm external levels and gravity feasibility before placing B1 pumps or outlet elevations. Resolve waterproofing, flood backflow and overflows with civil/public-health engineers. Stormwater is a separate functional system even if the renderer groups it under drainage.
8. Fire/escape: coordinate protected stair/lobby compartments, fire-door swings and alarm/ventilation/lift/access cause-effect with the appointed fire designer. No life-safety behavior is inferred from shared system colors or routed proximity.
9. Privacy: attach each route/port to real canonical owners. Common and private route fragments must be independently admit-able; a service trace must not expose hidden home geometry or telemetry. Existing approved Facility service exceptions remain authoritative.
10. Coordinates: current floor transforms and target elevations must never mix. Fixed risers and lift shafts stay building-fixed; per-floor branches inherit the level frame. Explode adds presentation transforms only. At floor/riser interfaces, exploded disconnects must be visibly labeled as a diagram, not false physical pipe continuity. No runtime state changes when engineering/view modes change.

**Oyi and operational use**

Oyi follows registered service relationships to assets and permitted spatial anchors. “Show the Water route to 6A” must still use the existing controller and termination resolver; new floors need registered terminations and complete graph validation before support is claimed. “Which valve isolates this?” uses isolated_by; “what does standby pump 02 serve?” retains the existing supplied_by edge. A route can be highlighted without granting entry into every space it passes through.

Physical sensors and controllers integrate through Edge and the same runtime/provider contracts. Route geometry never decides whether a valve is open or power is live. Mark offline/stale/estimated data explicitly. Fire, elevator, electrical interlocks and equipment protection remain in approved controllers; Oyi submits only admitted supported requests.

**Coordination release gates**

Per system/floor: validate registered endpoint and port identities; matching units/frame/datum; complete upstream/downstream semantics; graph cycles/missing-parent detection; physical route and size; hard/soft clash checks; slope/bend/support requirements; compartment/penetration approval; maintenance/replacement access; public/private visibility; and source drawing/engineer review. Confirm that plans, equipment bodies, routes, anchors and operational graphs agree by canonical ref. Record failed checks and decision IDs, not just a green visualization.

All current routes remain **conceptual/reference** until this evidence exists. No certified engineering design, source-model geometry, application changes or cloud work is included.
