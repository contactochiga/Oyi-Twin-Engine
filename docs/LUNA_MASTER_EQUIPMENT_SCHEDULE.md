LUNA — MASTER EQUIPMENT SCHEDULE

Revision 1 • 9 September 2026 • Functional coordination schedule; **not procurement, installed quantities, capacity selection or certification**.

The machine-readable schedule is [luna-equipment-schedule.json](/Users/ochigaidoko/Oyi-Twin-Engine/artifacts/luna-equipment-schedule.json). It contains every one of the 76 current operational records exactly once, plus 51 requirement families. Families reference existing records and are not extra assets. Each family carries type/system/parent-system, proposed location, count basis, classification, telemetry, possible command intents, upstream/downstream service, visibility, responsibility, 3D/animation requirements and decision references.

**Established counts and provenance**

User programme fixes three passenger lifts, one service/fire lift and two protected stairs. Four lift asset refs already exist; shafts/cars/doors in alternate views must not be counted as four more elevators. There are seven architectural core records: four lifts, two stairs, one representative service shaft. There are 117 conceptual level structural elements plus one fixed core and 80 conceptual sleeve markers. These are not operational equipment quantities.

| Current system enum | Local records |
|---|---:|
| electrical | 12 |
| water | 13 |
| fire | 6 |
| hvac | 2 |
| vertical-transport | 4 |
| security | 4 |
| access | 3 |
| network-edge | 7 |
| apartment-devices | 19 |
| drainage | 6 |

The current local schedule includes two domestic booster-pump records, one generator, one ATS, one inverter, one domestic tank, one treatment asset, one fire pump, one fire tank, four security CCTV records and one Oyi Edge/Core. Those counts describe current reference instances, not adequate engineered capacity or final procurement. There are 19 apartment-devices records at 6A; that enum includes meters/valve/smoke/intercom as well as lights and curtains. Do not multiply them by 43 or treat the enum as a physical-system boundary. Five representative MEP risers and five L06 branch records exist; no equivalent dedicated HVAC riser is modeled.

`existingAssets` preserves exact ref, ownerLevelRef, optional unitRef, parentRef, placeholder position, source fields/capabilities and runtime commands. Positions are reference placement, not approved coordinates. `registeredRoomRef` remains null where the catalog only supplies a location label. No room identity is inferred from “Electrical Room” text.

**Functional equipment schedule**

| Requirement | Equipment / existing identities | Proposed location | Behavior / unresolved design |
|---|---|---|---|
| EQ-PASS-LIFTS | Passenger elevators 01–03<br>`LUNA-LIFT-PASS-01`, `LUNA-LIFT-PASS-02`, `LUNA-LIFT-PASS-03` | Continuous shafts; landing stop matrix DD06 | controllable; DD06, DD20 |
| EQ-SERVICE-LIFT | Service/fire elevator 01<br>`LUNA-LIFT-SERVICE-01` | Continuous service shaft / protected lobbies | controllable; DD06, DD11, DD20 |
| EQ-LIFT-PARTS | Shafts, cars, doors, rails, pits, overhead, traction and controls<br>No registered instance yet | Each existing lift, component roles rather than new elevator assets | asset-only; DD06, DD07 |
| EQ-INTAKE | Utility intake<br>`LUNA-B1-ELECTRICAL-GRID-01` | B1 utility intake / provider-approved access | observable; DD08, DD15 |
| EQ-TRANSFORMER | Transformer, if utility/design requires<br>No registered instance yet | Utility-approved dedicated location; B1 only if permissible design | observable; DD08, DD15 |
| EQ-MDB | Main LV switchboard<br>`LUNA-B1-ELECTRICAL-MDB-01` | B1 main electrical room | observable; DD08 |
| EQ-GEN | Standby generator set(s), fuel and exhaust<br>`LUNA-B1-ELECTRICAL-GEN-01` | Dedicated generator/service zone; route intake/exhaust away from occupied air intakes | controllable; DD08, DD15, DD20 |
| EQ-ATS | ATS/changeover<br>`LUNA-B1-ELECTRICAL-ATS-01` | B1 electrical switchgear provision | controllable; DD08, DD20 |
| EQ-BESS | Inverter / battery storage<br>`LUNA-B1-ELECTRICAL-INV-01` | Battery/inverter service zone; separation/ventilation strategy pending | controllable; DD08, DD11 |
| EQ-DB | Floor/common/apartment DBs and circuits<br>`LUNA-L06-APT-A-DB-01`, `LUNA-L06-APT-A-LIGHTING-CIRCUIT-01`, `LUNA-L06-APT-A-LIGHTING-CIRCUIT-02`, `LUNA-L06-APT-A-AC-CIRCUIT-01` | Floor service cupboard and each dwelling service interface | asset-only; DD08, DD18 |
| EQ-ELEC-METERS | Common and apartment electricity meters<br>`LUNA-B1-ELECTRICAL-METER-01`, `LUNA-L06-APT-A-METER-ELEC-01` | Common meter room and apartment demarcation | observable; DD08, DD18 |
| EQ-ELEC-CONTAINMENT | Cable trays, conduits, electrical risers and floor branches<br>`LUNA-RISER-ELECTRICAL-01`, `LUNA-L06-ELECTRICAL-BRANCH-01` | Dedicated coordinated shafts/ceiling corridors | asset-only; DD07, DD08 |
| EQ-EARTHING | Earthing, bonding, surge and lightning protection<br>No registered instance yet | Site electrodes / electrical rooms / roof collection and down paths | asset-only; DD08, DD11 |
| EQ-UPS | ICT/control/emergency power and UPS provision<br>No registered instance yet | ICT/main control rooms; distributed life-safety backup as designed | observable; DD08, DD14 |
| EQ-WATER-INTAKE | Incoming water supply and backflow/isolation provision<br>No registered instance yet | B1/site supply demarcation | observable; DD09 |
| EQ-WATER-STORAGE | Domestic storage<br>`LUNA-B1-WATER-TANK-01` | B1 water plant; access/cleaning and overflow paths | observable; DD09, DD15 |
| EQ-WATER-TREAT | Treatment/filtration<br>`LUNA-B1-WATER-TREAT-01` | B1 water treatment zone | observable; DD09 |
| EQ-BOOSTERS | Domestic booster pumps<br>`LUNA-B1-WATER-BP-01`, `LUNA-B1-WATER-BP-02` | B1 water pump zone | controllable; DD09, DD20 |
| EQ-WATER-VALVES | Headers, isolation, control and pressure sensing<br>`LUNA-B1-WATER-VALVE-01`, `LUNA-L06-APT-A-UTILITY-VALVE-01` | B1 headers / accessible floor and unit demarcations | controllable; DD09, DD18 |
| EQ-WATER-METERS | Common and apartment water metering<br>`LUNA-B1-WATER-METER-01`, `LUNA-L06-APT-A-METER-WATER-01` | Common/floor-unit boundary | observable; DD09, DD18 |
| EQ-WATER-DISTRIBUTION | Water risers, branches and hot/cold distribution<br>`LUNA-RISER-WATER-01`, `LUNA-L06-WATER-BRANCH-01`, `LUNA-L06-APT-A-WATER-MAIN-01`, `LUNA-L06-APT-A-WATER-HOT-01`, `LUNA-L06-APT-A-WATER-COLD-01` | Shaft / ceiling service route / apartment wet zones | asset-only; DD09, DD05 |
| EQ-HOT-WATER | Domestic hot-water generation/return if required<br>No registered instance yet | Unit utility or central plant strategy unresolved | controllable; DD09, DD08 |
| EQ-DRAINAGE | Soil, waste, vent stacks and fixture branches<br>`LUNA-RISER-DRAINAGE-01`, `LUNA-L06-DRAINAGE-BRANCH-01`, `LUNA-L06-APT-A-DRAIN-01`, `LUNA-L06-APT-A-KITCHEN-DRAIN-01`, `LUNA-L06-APT-A-BATH-01-DRAIN-01` | Aligned wet shafts / branch ceiling zones | asset-only; DD10, DD05 |
| EQ-DISCHARGE | Main discharge and inspection access<br>`LUNA-B1-DRAINAGE-MAIN-01` | B1/site civil discharge interface | asset-only; DD10 |
| EQ-SUMP | Sump/sewage lifting equipment where gravity fails<br>No registered instance yet | Low points in B1; accessible isolated service zone | controllable; DD10, DD15 |
| EQ-STORM | Rainwater, roof outlets, overflow and attenuation provision<br>No registered instance yet | Roof/terraces/site; separate coordinated down paths | asset-only; DD10 |
| EQ-FIRE-WATER | Fire storage and pump set<br>`LUNA-B1-FIRE-TANK-01`, `LUNA-B1-FIRE-PUMP-01` | B1 dedicated fire water/pump provision | observable; DD11, DD20 |
| EQ-FIRE-DISTRIBUTION | Fire risers, sprinklers, hose reels/hydrants and test points<br>`LUNA-RISER-FIRE-01`, `LUNA-L06-FIRE-BRANCH-01` | Protected shafts / common floors / coverage zones | asset-only; DD11 |
| EQ-FIRE-ALARM | Alarm panels, detectors, call points and sounders<br>`LUNA-B1-FIRE-PANEL-01`, `LUNA-GROUND-FIRE-DET-01`, `LUNA-L06-APT-A-ENTRY-SMOKE-01` | Approved control location and zoned common/private detection | observable; DD11, DD18, DD20 |
| EQ-FIRE-INTERFACES | Fire doors, emergency lighting and lift/access/HVAC interfaces<br>No registered instance yet | Compartment boundaries, egress and technical interfaces | observable; DD11, DD06 |
| EQ-COOLING-PLANT | Cooling plant / condensers / pumps as chosen<br>`LUNA-ROOFTOP-HVAC-PLANT-01`, `LUNA-L06-APT-A-AC-OUTDOOR-01` | Roof technical zone or unit service balcony is current reference, not final strategy | controllable; DD12, DD08 |
| EQ-HVAC-TERMINALS | AHU/FCU/VRF/split terminals as applicable<br>`LUNA-L06-APT-A-LIVING-AC-01`, `LUNA-L06-APT-A-BED-01-AC-01` | Each approved thermal zone, common and private | controllable; DD12, DD18 |
| EQ-DUCTS | Ducts, supply diffusers, return grilles and condensate routes<br>No registered instance yet | Shaft/ceiling voids; ceiling heights and access coordinated | asset-only; DD12, DD10 |
| EQ-VENTILATION | Outside-air, parking, WC/kitchen and plant extract<br>No registered instance yet | B1 plant/parking, wet rooms, kitchens, occupied common areas | controllable; DD12, DD11, DD15 |
| EQ-ENVIRONMENT | Thermostats and environmental sensors<br>`LUNA-L06-APT-A-LIVING-TH-01` | Occupied/control zones, avoiding false whole-building coverage | observable; DD12, DD14 |
| EQ-CCTV | Cameras and coverage<br>`LUNA-GROUND-SEC-CAM-01`, `LUNA-GROUND-LOBBY-CAM-01`, `LUNA-B1-PARKING-CAM-01`, `LUNA-L06-COMMON-CAM-01` | Entrance, lobby, parking, common corridor; extend only from coverage design | observable; DD13, DD14 |
| EQ-RECORDING | NVR/recording, security/control workstation<br>No registered instance yet | Secure ICT/control room location unresolved B1/Ground | observable; DD13, DD14 |
| EQ-BUILDING-ACCESS | Entrance, resident, service and parking access<br>`LUNA-GROUND-ACCESS-MAIN-01`, `LUNA-B1-ACCESS-SERVICE-01`, `LUNA-GROUND-ACCESS-LIFT-LOBBY-01` | Ground entrance/lobby and B1 service; parking gate provision pending | observable; DD13, DD11 |
| EQ-UNIT-ACCESS | Apartment locks/readers/intercom/visitor interfaces<br>`LUNA-L06-APT-A-ENTRY-LOCK-01`, `LUNA-L06-APT-A-ENTRY-INTERCOM-01` | Each private entry boundary; current proof is 6A only | controllable; DD13, DD18, DD20 |
| EQ-LIFT-ACCESS | Lift readers, floor authorization and destination access<br>No registered instance yet | Ground/selected landings/car; linked to existing four lifts | observable; DD06, DD13, DD20 |
| EQ-CONNECTIVITY | Incoming connectivity, main rack, switches and gateways<br>`LUNA-B1-NET-GATEWAY-01` | B1 main ICT room, service paths to carrier interface | observable; DD14 |
| EQ-DATA-BACKBONE | Fiber risers and floor distribution<br>`LUNA-RISER-NETWORK-01`, `LUNA-L06-NETWORK-BRANCH-01` | Dry shafts and accessible floor ICT cupboards | asset-only; DD14, DD07 |
| EQ-WIFI | Common APs and apartment demarcation/router<br>`LUNA-GROUND-NET-WIFI-AP-01`, `LUNA-L06-APT-A-NET-ONT-01`, `LUNA-L06-APT-A-ROUTER-01` | Coverage-designed common ceilings / unit utility interface | observable; DD14, DD18 |
| EQ-EDGE | Oyi Edge/Core and local controllers<br>`LUNA-EDGE-CORE-01` | B1 ICT/control location; environmental and UPS protection | observable; DD14, DD20 |
| EQ-COMMON-LIGHTING | Common lighting and occupancy-controlled groups<br>No registered instance yet | Common corridors, lobbies, parking, amenities, roof and site | controllable; DD08, DD14 |
| EQ-PRIVATE-LIGHTING | Private lights, curtains and occupancy sensing<br>`LUNA-L06-APT-A-LIVING-LIGHT-01`, `LUNA-L06-APT-A-LIVING-CURTAIN-01`, `LUNA-L06-APT-A-LIVING-OCC-01` | Assigned home; full existing device list in inventory | controllable; DD18, DD20 |
| EQ-POOL-SYSTEMS | Pool circulation, filtration, treatment and monitoring<br>No registered instance yet | Club and Sky pool service zones; PH pools optional | controllable; DD16, DD09, DD10 |
| EQ-WASTE | Refuse handling, recycling, cleaning and BOH equipment<br>No registered instance yet | B1 collection/holding and floor service interfaces | asset-only; DD17, DD15 |
| EQ-FACADE-ACCESS | Facade/roof maintenance, fall protection and drainage access<br>No registered instance yet | Roof perimeter and designated facade access routes | asset-only; DD07, DD17 |
| EQ-SITE-SYSTEMS | Landscape irrigation, external lighting, EV charging provision<br>No registered instance yet | Site landscape / parking electrical provision | asset-only; DD01, DD08, DD09 |
| EQ-BMS-LEAK | Common BMS monitoring, leak sensing and integration interfaces<br>`LUNA-L06-APT-A-KITCHEN-LEAK-01` | Critical plant wet zones and unit leak example; no duplicate Oyi platform | observable; DD14, DD20 |

**Schedule interpretation**

Every missing quantity, capacity, manufacturer, model, plant strategy, port size or approved location remains **DESIGN DECISION REQUIRED**. No manufacturer/model is selected. Each major functional item must eventually be instantiated once, with a stable canonical ref, procurement identity if applicable, source IFC GUID crosswalk, physical envelope and ports. A motor/controller/door can have component role identity under its equipment parent; register a separate operational asset only if independently maintained/addressed, with a clear parent and no duplicate parent asset.

Classification is operational, not geometric. Passive rails, shafts, trays, valves without actuators and uninstrumented distribution are asset-only. Sensors/meters are observable. Commands appear only when capability plus provider support plus authorization agree. Existing catalog controllable does not mean every listed backend capability is implemented: elevator `call`/service `fire_service_mode`, intercom stream/release and fire-panel silence/reset are not generally mapped by today's runtime. Fire safety functions remain with the approved life-safety controller; the schedule's observation target does not remove existing capabilities or authorize remote suppression control.

Telemetry contracts must include value, unit, event/sample time, quality/freshness and source. Proposed telemetry is not claimed as currently available; exact initial fields and current supported commands are recorded separately in JSON. Keep raw device tokens in Edge adapters, normalized state in the runtime, and business/maintenance records in their canonical operational data layer. GLB contains neither occupancy/assignment truth nor command state.

Maintain the existing `OperationalSystem` vocabulary. Lighting/environment and other-building-systems above are schedule headings, not new engine enums. Unit electricity meters currently remain under apartment-devices; an additional physical-system association may be modeled later without cloning the asset. Structure remains in structuralCatalog.

**Placement, visibility and maintenance requirements**

Place each asset in a registered level/space with explicit floor-local, unit-local or building-fixed frame. Mark moving lifts building-fixed vertically, despite the current catalog's Ground ownerLevelRef. Record equipment/body, maintenance access, door swing, ventilation, lifting/removal and replacement-route envelopes separately. Space/clearance quantities are not fixed until supplier and engineer data is available. A clickable equipment marker does not make its surrounding room enterable.

Facility visibility follows existing RepresentationPolicy, including approved in-home service exceptions; resident controls apply only to assigned private equipment and allowed destinations. Consumer common-lift context is currently CONTEXT_3D, not a blanket operational control grant. The future passenger-request permission must be designed separately from maintenance controls, without changing policy in this phase. Cross-domain edges must not expose hidden endpoint locations/state through Oyi or engineering overlays.

Additional systems to resolve include hot-water generation, stormwater/flood handling, pool treatment, earthing/lightning, generator fuel/exhaust, ICT UPS, refuse/housekeeping, facade/roof maintenance, irrigation and possible EV loads. Gas, photovoltaics, refuse chutes, additional pools or specific central HVAC are not assumed installed; add only on an approved decision.

**Current instance register**

| Canonical ID | Type / system | Current location | Current classification / runtime commands |
|---|---|---|---|
| `LUNA-B1-ELECTRICAL-GRID-01` | power_system / electrical | Basement (B1) — Electrical Room | asset-only; none |
| `LUNA-B1-ELECTRICAL-MDB-01` | power_system / electrical | Basement (B1) — Electrical Room | asset-only; none |
| `LUNA-B1-ELECTRICAL-GEN-01` | power_system / electrical | Basement (B1) — Electrical Room | controllable; turnOn, turnOff, setMode |
| `LUNA-B1-ELECTRICAL-ATS-01` | controller / electrical | Basement (B1) — Electrical Room | controllable; setMode |
| `LUNA-B1-ELECTRICAL-INV-01` | power_system / electrical | Basement (B1) — Electrical Room | controllable; turnOn, turnOff |
| `LUNA-B1-ELECTRICAL-METER-01` | energy_meter / electrical | Basement (B1) — Electrical Room | observable; none |
| `LUNA-B1-WATER-TANK-01` | infrastructure_asset / water | Basement (B1) — Water Plant | observable; none |
| `LUNA-B1-WATER-TREAT-01` | infrastructure_asset / water | Basement (B1) — Water Plant | observable; none |
| `LUNA-B1-WATER-BP-01` | pump / water | Basement (B1) — Water Plant | controllable; turnOn, turnOff |
| `LUNA-B1-WATER-BP-02` | pump / water | Basement (B1) — Water Plant | controllable; turnOn, turnOff |
| `LUNA-B1-WATER-METER-01` | water_meter / water | Basement (B1) — Water Plant | observable; none |
| `LUNA-B1-WATER-VALVE-01` | switch / water | Basement (B1) — Water Plant | controllable; open, close |
| `LUNA-B1-FIRE-PANEL-01` | controller / fire | Basement (B1) — Fire Control Room | controllable; none |
| `LUNA-B1-FIRE-PUMP-01` | pump / fire | Basement (B1) — Fire Control Room | controllable; turnOn, turnOff |
| `LUNA-B1-FIRE-TANK-01` | infrastructure_asset / fire | Basement (B1) — Fire Control Room | asset-only; none |
| `LUNA-GROUND-FIRE-DET-01` | sensor / fire | Ground — Common Area | observable; none |
| `LUNA-ROOFTOP-HVAC-PLANT-01` | climate / hvac | Rooftop — Technical Zone | controllable; turnOn, turnOff, setMode |
| `LUNA-LIFT-PASS-01` | elevator / vertical-transport | Ground — Lift Lobby (current floor) | controllable; setPosition |
| `LUNA-LIFT-PASS-02` | elevator / vertical-transport | Ground — Lift Lobby (current floor) | controllable; setPosition |
| `LUNA-LIFT-PASS-03` | elevator / vertical-transport | Ground — Lift Lobby (current floor) | controllable; setPosition |
| `LUNA-LIFT-SERVICE-01` | elevator / vertical-transport | Ground — Lift Lobby (current floor) | controllable; setPosition |
| `LUNA-GROUND-SEC-CAM-01` | camera / security | Ground — Main Entrance | observable; none |
| `LUNA-GROUND-LOBBY-CAM-01` | camera / security | Ground — Lobby | observable; none |
| `LUNA-B1-PARKING-CAM-01` | camera / security | Basement Parking | observable; none |
| `LUNA-L06-COMMON-CAM-01` | camera / security | Level 6 Corridor | observable; none |
| `LUNA-GROUND-ACCESS-MAIN-01` | pedestrian_entrance / access | Ground — Main Entrance | observable; none |
| `LUNA-B1-ACCESS-SERVICE-01` | service_entrance / access | Basement (B1) — Service Entrance | observable; none |
| `LUNA-GROUND-ACCESS-LIFT-LOBBY-01` | lift_lobby / access | Ground — Lift Lobby | observable; none |
| `LUNA-B1-NET-GATEWAY-01` | gateway / network-edge | Basement (B1) — Network Room | observable; none |
| `LUNA-GROUND-NET-WIFI-AP-01` | gateway / network-edge | Ground — Common Area | observable; none |
| `LUNA-EDGE-CORE-01` | edge_node / network-edge | Basement (B1) — Network Room | observable; none |
| `LUNA-L06-APT-A-ENTRY-LOCK-01` | lock / apartment-devices | Level 06, Apartment A — Entry | controllable; lock, unlock |
| `LUNA-L06-APT-A-ENTRY-INTERCOM-01` | camera / apartment-devices | Level 06, Apartment A — Entry | controllable; none |
| `LUNA-L06-APT-A-LIVING-LIGHT-01` | light / apartment-devices | Level 06, Apartment A — Living Room | controllable; turnOn, turnOff |
| `LUNA-L06-APT-A-LIVING-LIGHT-02` | light / apartment-devices | Level 06, Apartment A — Living Room | controllable; turnOn, turnOff |
| `LUNA-L06-APT-A-KITCHEN-LIGHT-01` | light / apartment-devices | Level 06, Apartment A — Kitchen | controllable; turnOn, turnOff |
| `LUNA-L06-APT-A-BED-01-LIGHT-01` | light / apartment-devices | Level 06, Apartment A — Primary Bedroom | controllable; turnOn, turnOff |
| `LUNA-L06-APT-A-BED-02-LIGHT-01` | light / apartment-devices | Level 06, Apartment A — Bedroom 2 | controllable; turnOn, turnOff |
| `LUNA-L06-APT-A-BED-03-LIGHT-01` | light / apartment-devices | Level 06, Apartment A — Bedroom 3 | controllable; turnOn, turnOff |
| `LUNA-L06-APT-A-LIVING-CURTAIN-01` | curtain / apartment-devices | Level 06, Apartment A — Living Room | controllable; open, close, setPosition |
| `LUNA-L06-APT-A-BED-01-CURTAIN-01` | curtain / apartment-devices | Level 06, Apartment A — Primary Bedroom | controllable; open, close, setPosition |
| `LUNA-L06-APT-A-LIVING-AC-01` | climate / apartment-devices | Level 06, Apartment A — Living Room | controllable; turnOn, turnOff, setTemperature, setMode |
| `LUNA-L06-APT-A-BED-01-AC-01` | climate / apartment-devices | Level 06, Apartment A — Primary Bedroom | controllable; turnOn, turnOff, setTemperature, setMode |
| `LUNA-L06-APT-A-LIVING-TH-01` | sensor / apartment-devices | Level 06, Apartment A — Living Room | observable; none |
| `LUNA-L06-APT-A-LIVING-OCC-01` | sensor / apartment-devices | Level 06, Apartment A — Living Room | observable; none |
| `LUNA-L06-APT-A-ENTRY-SMOKE-01` | sensor / apartment-devices | Level 06, Apartment A — Entry | observable; none |
| `LUNA-L06-APT-A-KITCHEN-LEAK-01` | sensor / apartment-devices | Level 06, Apartment A — Kitchen | observable; none |
| `LUNA-L06-APT-A-UTILITY-VALVE-01` | switch / apartment-devices | Level 06, Apartment A — Utility | controllable; open, close |
| `LUNA-L06-APT-A-METER-ELEC-01` | energy_meter / apartment-devices | Level 06, Apartment A — Utility | observable; none |
| `LUNA-L06-APT-A-METER-WATER-01` | water_meter / apartment-devices | Level 06, Apartment A — Utility | observable; none |
| `LUNA-B1-DRAINAGE-MAIN-01` | infrastructure_asset / drainage | Basement (B1) — Drainage Plant | asset-only; none |
| `LUNA-RISER-ELECTRICAL-01` | riser / electrical | Vertical Service Shaft — B1 to Roof | asset-only; none |
| `LUNA-RISER-WATER-01` | riser / water | Vertical Service Shaft — B1 to Roof | asset-only; none |
| `LUNA-RISER-DRAINAGE-01` | riser / drainage | Vertical Service Shaft — B1 to Roof | asset-only; none |
| `LUNA-RISER-FIRE-01` | riser / fire | Vertical Service Shaft — B1 to Roof | asset-only; none |
| `LUNA-RISER-NETWORK-01` | riser / network-edge | Vertical Service Shaft — B1 to Roof | asset-only; none |
| `LUNA-L06-ELECTRICAL-BRANCH-01` | floor_branch / electrical | Level 6 — Riser Cupboard | asset-only; none |
| `LUNA-L06-WATER-BRANCH-01` | floor_branch / water | Level 6 — Riser Cupboard | asset-only; none |
| `LUNA-L06-DRAINAGE-BRANCH-01` | floor_branch / drainage | Level 6 — Riser Cupboard | asset-only; none |
| `LUNA-L06-FIRE-BRANCH-01` | floor_branch / fire | Level 6 — Riser Cupboard | asset-only; none |
| `LUNA-L06-NETWORK-BRANCH-01` | floor_branch / network-edge | Level 6 — Riser Cupboard | asset-only; none |
| `LUNA-L06-APT-A-NET-ONT-01` | ont / network-edge | Level 06 — Apartment A — Utility | observable; none |
| `LUNA-L06-APT-A-ROUTER-01` | router / network-edge | Level 06 — Apartment A — Utility | observable; none |
| `LUNA-L06-APT-A-DRAIN-01` | drain_point / drainage | Level 06 — Apartment A — Utility | asset-only; none |
| `LUNA-L06-APT-A-KITCHEN-DRAIN-01` | drain_point / drainage | Level 06 — Apartment A — Kitchen | asset-only; none |
| `LUNA-L06-APT-A-BATH-01-DRAIN-01` | drain_point / drainage | Level 06 — Apartment A — Primary Bathroom | asset-only; none |
| `LUNA-L06-APT-A-DB-01` | panel / electrical | Level 06 — Apartment A — Utility | asset-only; none |
| `LUNA-L06-APT-A-LIGHTING-CIRCUIT-01` | circuit / electrical | Level 06 — Apartment A — Utility | asset-only; none |
| `LUNA-L06-APT-A-LIGHTING-CIRCUIT-02` | circuit / electrical | Level 06 — Apartment A — Utility | asset-only; none |
| `LUNA-L06-APT-A-AC-CIRCUIT-01` | circuit / electrical | Level 06 — Apartment A — Utility | asset-only; none |
| `LUNA-L06-APT-A-AC-OUTDOOR-01` | condenser / hvac | Level 06 — Apartment A — Service Balcony | asset-only; none |
| `LUNA-L06-APT-A-WATER-MAIN-01` | distribution_point / water | Level 06 — Apartment A — Utility | asset-only; none |
| `LUNA-L06-APT-A-WATER-HOT-01` | distribution_point / water | Level 06 — Apartment A — Utility | asset-only; none |
| `LUNA-L06-APT-A-WATER-COLD-01` | distribution_point / water | Level 06 — Apartment A — Utility | asset-only; none |
| `LUNA-L06-APT-A-KITCHEN-FIXTURE-BRANCH-01` | distribution_point / water | Level 06 — Apartment A — Kitchen | asset-only; none |
| `LUNA-L06-APT-A-BATH-01-FIXTURE-BRANCH-01` | distribution_point / water | Level 06 — Apartment A — Primary Bathroom | asset-only; none |

The JSON expands this register with current state keys, actual policy snapshots, commands, relationships and proposed requirement links. Every current instance links to at least one requirement family; families are not exhaustive procurement instance counts. The JSON also expands all four lifts into component-role/landing-interface requirements (not additional assets), and includes six conceptual route requirements with current parent-chain evidence.

**Release gate**

Before realistic equipment modeling: confirm duty and selected strategy; approve canonical identity and location; validate space/maintenance/removal envelopes; approve system connections and required ports; specify observable/controllable capability contract; define material/animation roles; pass permission and coordinate checks; then import geometry. Unresolved dimensions cannot be filled by a convincing mesh.
