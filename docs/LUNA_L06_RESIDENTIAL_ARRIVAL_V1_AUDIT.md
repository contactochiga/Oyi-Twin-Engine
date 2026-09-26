# Luna Level 06 Residential Arrival V1 — current-state audit

**21 September 2026 · READ ONLY · No implementation.** Ground and L01 remain frozen. This report measures the inherited working tree, including its uncommitted work, rather than a clean branch or an earlier report. The companion [structured audit](../artifacts/luna-l06-residential-arrival-v1-audit.json) contains exact coordinates, source records/line references, adjacency edges, policy evaluations and measurement formulas.

**Finding:** the 20.90 × 3.40 m lobby exists as a canonical rectangle, but is not a coordinated, unobstructed residential gallery. The current render has a 1.625 m common-architecture vertical offset; the lift exit camera is outside the lobby; apartment approach points lie inside shafts; core walls and most slab penetrations remain uncoordinated. A materials-only pass cannot truthfully establish a functional arrival. No defect was corrected in this audit.

## 1. Authority, method and conventions

Measurements are in metres and square metres. **S** = source-defined parameter; **D** = arithmetic derived from current source; **R** = rendered/procedural construction. World Y is building datum unless explicitly identified as local. Decimal coordinates below retain the authored precision; tables of Euclidean distances show six decimals for legibility and the JSON retains calculation precision. These are reference-model measurements, not surveyed/as-built dimensions or engineered clearances.

Current TypeScript modules were evaluated without editing them. The actual app was inspected in a new local Chrome session at 1440 × 1000. A real Oyi route was requested from exterior to Ground and then Level 6; subsequent inspection cameras are identified separately. A temporary SHA-256 manifest covers 1,468 inherited files. Only the two requested reports are additions; no source/test repair, build-output regeneration, commit or cloud action was performed.

North in the plan below follows `l06FloorPlate.ts`: **+Z = north**. This is a local drawing convention, not verified geographic north. Older structural labels use “North” for −Z; do not use those labels as surveyed orientation. [GALLERY] [STRUCT]

## 2. Level envelope and vertical section

| Measurement | Current value | Class / authority |
|---|---:|---|
| Level identity / label | `LUNA-L06` / Level 6; parent `LUNA-TOWER` | S [PROGRAMME] |
| Base datum | +21.50 | D, cumulative `buildLevels()` [PROGRAMME] |
| Floor-to-floor | 3.25 | S `RESIDENTIAL_FLOOR_HEIGHT` [PROGRAMME] |
| Programme floor plate | 36 × 28 = **1,008** | S dimensions; D area [PROGRAMME] |
| Programme bounds | X −18…18; Z −14…14 | D [PROGRAMME] |
| L05 datum / upper boundary | 18.25 / 21.50 | D [PROGRAMME] |
| L07 datum / upper boundary | 24.75 / 28.00 | D [PROGRAMME] |
| Structural plate | 35.28 × 27.44 × 0.35 | S 0.98 envelope multiplier / thickness; D dimensions [STRUCT] |
| Structural plan bounds | X ±17.64; Z ±13.72 | D [STRUCT] |
| Structural slab bottom / top | 21.50 / **21.85** | D/R; non-podium positive thickness convention [STRUCT] |
| Structural gross / actual visual solid plan area | 968.0832 / 959.0832 | D: subtract only existing central 3 × 3 opening [OPENINGS] |
| Next structural slab underside | 24.75 | D [STRUCT] |
| Common floor box | Y 23.125…23.185, thickness 0.06 | R, **not at 21.50 datum** [COMMON] [PARENT] [MOUNT] |
| Common ceiling box | Y 25.495…25.555, thickness 0.06 | R, into L07 [COMMON] [PARENT] |
| Common panel-to-panel separation | **2.31** | D: 25.495 − 23.185; not coordinated building clear height |
| Common floor to L07 structural underside | **1.565** | D: 24.75 − 23.185, where slab exists |
| Apartment A generic room floor / ceiling underside | 21.58 / 23.87 | R: correct floor-origin offset, floor top +0.08; ceiling centre +2.4, thickness0.06 [INTERIOR] [ROOM] |
| Apartment A generic room clear height | **2.29** | D; does **not** describe current common geometry [ROOM] |

`LevelMassing` places its child origin at datum + height/2 = 23.125. `InteriorLayer` explicitly subtracts height/2; `L06CommonArchitecture` does not. The browser's actual world matrices confirm common floor centre23.155, ceiling centre25.525 and entrance-door base23.125. This is stronger evidence than the common component's nominal local `ZONE_HEIGHT=2.4` comment. The door/circulation error is not a new phase change. [PARENT] [MOUNT] [COMMON]

Ground/L01's corrected slab-below-datum convention is explicitly restricted to those podium levels. L06 still uses slab-above-datum. Apartment A's +0.08 room floor is consequently inside the 0.35 structural slab representation. These are overlapping presentation/structural layers, not a documented finish build-up. The outer `LevelMassing` full-height box and private `UnitVolume` boxes are massing/hit-target representations, not additional defensible construction layers. [STRUCT] [OPENINGS] [UNITMESH]

## 3. Common-area measurement schedule

| Canonical zone | Centre X/Z | Width × depth | Area | X bounds | Z bounds |
|---|---|---|---:|---|---|
| `LUNA-L06-LOBBY` — Passenger Lift Lobby | 0 / 0 | 20.9 × 3.4 | **71.06** | −10.45…10.45 | −1.7…1.7 |
| `LUNA-L06-STAIR-LINK-01` | −11.35 / 5.025 | 1.8 × 13.45 | **24.21** | −12.25…−10.45 | −1.7…11.75 |
| `LUNA-L06-STAIR-LINK-02` | 11.35 / 5.025 | 1.8 × 13.45 | **24.21** | 10.45…12.25 | −1.7…11.75 |

All three are source-defined rectangles, normalized as `common_area`, confidence1 / CONFIRMED. Areas/extents are derived. They represent one intended open circulation network, not three enclosed rooms. There are no authored common partition walls between them. The lobby touches each spur along a 3.4 m edge. Combined declared area is **119.48 m²**. [GALLERY] [MODEL]

The main rectangle deliberately contains passenger shafts27 m², service shaft10.88 m² and riser2.56 m². Subtracting those non-overlapping rectangles leaves **30.62 m²**, or **79.04 m²** including both spurs, *before* walls/clearance exclusions. Neither figure is net usable/certified circulation. The floor-plate overlap checker returns CLEAR /91pairs/0overlaps because lobby-to-core containment is explicitly allowlisted and the structural ring, rendered heights, leaves and camera paths are outside that check. [OVERLAP] [CORES]

Nominal lobby perimeter lengths are20.9/20.9/3.4/3.4 m (48.6 m total); spur perimeters1.8/1.8/13.45/13.45 m (30.5 m each). These are rectangle boundaries, **not a schedule of built walls**. Common floor and ceiling panels have those rectangle dimensions; a reliable new wall-finish quantity cannot yet be issued. Floor uses `lobbyFloorStone` (#ddd4c2, roughness0.35, metalness0.04); ceiling uses `ceilingSoffit` (#e4dcc9, roughness0.85). Selected floor switches to flat orange rather than Ground's coordinated stone tint. [COMMON] [MATERIALS]

The gallery is centred on the shafts. The service portion is merely identified in comments/blank sign geometry; no protected service lobby or service separation wall exists. Both spurs run north alongside C/D toward the two north-side stairs. A/B are on the south side and have no independent south egress spur. [GALLERY] [COMMON]

## 4. Apartment footprints and entrance schedule

Display study names 06A–06D below do not rename canonical identities.

| Unit | Centre X/Z | Width × depth | Exact rectangle area | X limits | Z limits |
|---|---|---|---:|---|---|
| `LUNA-L06-APT-A` / 06A | −8.181818 / −7.912636 | 15.652174 × 12.173913 | 190.548204536862 | −16.007905…−0.355731 | −13.9995925…−1.8256795 |
| `LUNA-L06-APT-B` / 06B | 8.181818 / −7.912636 | same | 190.548204536862 | 0.355731…16.007905 | same |
| `LUNA-L06-APT-C` / 06C | −6.1135 / 7.912636 | 8.673 × 12.173913 | 105.584347449 | −10.45…−1.777 | 1.8256795…13.9995925 |
| `LUNA-L06-APT-D` / 06D | 6.1135 / 7.912636 | same | 105.584347449 | 1.777…10.45 | same |

S dimensions/centres; D areas/bounds, `L06_UNIT_BOXES`. These are envelopes, not internal usable areas or room finish quantities. A has14 defined rooms including its projecting Balcony. B/C/D have shell volumes, not equivalent furnished interiors. [UNITS] [APT] [UNITMESH]

| Entrance door ID (prefix `LUNA-L06-APT-`) | Position X/Z | Faces common side | Local hinge | Leaf W×H | Access / runtime |
|---|---|---|---|---|---|
| `A-ENTRANCE-DOOR` | −2.5 / −1.825679 | north (+Z), assembly rotationπ | left | 1×2.1 | governed A lock; live swing |
| `B-ENTRANCE-DOOR` | 2.5 / −1.825679 | north (+Z), rotationπ | right | 1×2.1 | policy only; permanently closed visual leaf |
| `C-ENTRANCE-DOOR` | −4 / 1.825679 | south (−Z), rotation0 | left | 1×2.1 | policy only; permanently closed visual leaf |
| `D-ENTRANCE-DOOR` | 4 / 1.825679 | south (−Z), rotation0 | right | 1×2.1 | policy only; permanently closed visual leaf |

Door base **Y23.125**, leaf top25.225 for all four, despite route eyeY23.2 and intended floor datum21.5. Leaf thickness0.05; jamb sections0.08×(2.1+0.08)×0.14, centred X±0.54; head1.14×0.08×0.14 centred localY2.14. Generic open angleπ/2.3 =78.260869565…degrees, with per-frame easing `min(1,5*delta)`. Hinge names are local to each rotated assembly; do not substitute world-hand descriptions. No handles are constructed by `HingedDoor`. [DOORS] [COMMON] [HINGE]

A/B are on their north envelope faces, C/D on south faces. The gallery rectangle ends0.125679 m before each authored door axis. Shaft-to-apartment-boundary gap is only0.3256795 m on the passenger bank sides; actual wall thickness further consumes it. B/C/D are box shells without coordinated cut entrance openings. Their normalized door graph edges do not demonstrate a hole through the massing or an openable leaf. [UNITS] [CORES] [GALLERY] [UNITMESH]

Nearest envelope-side distance from each leaf edge to a unit corner: A/B1.644269 m (to inner X±0.355731); C/D1.723 m (to inner X±1.777). These are source-plane distances, **not clear approach widths**. Door-pair centre separations: A–B5 m; C–D8 m; A–C and B–D `sqrt(1.5²+3.651358²)` ≈3.947 m. Shaft/core interference is the controlling issue, not decorative spacing. [UNITS] [DOORS]

### 06A detail and discrepancy

The actual entrance assembly is **X−2.5/Z−1.825679**, width1 m. The Foyer's north opening is centred at world **X−2.5187745/Z−1.8256795**: local FoyerX5.6630435 + apartment originX−8.181818; local north edgeZ6.0869565 + originZ−7.912636. Thus leaf/opening centres differ **+0.0187745 m X** and **+0.0000005 m Z**. Both openings are1 m wide; their projected X overlap is0.9812255 m. This is an alignment measurement, not an approved clear opening, because the 1.625 m vertical assembly mismatch dominates. [APT] [APTFRAME] [DOORS]

The Foyer opening is in a0.12 m generic wall, full wall-height gap; it has no separately modelled engineered lintel. Its floor top is21.58 and wall runs21.5…23.9. Entrance leaf runs23.125…25.225. No correction is included. [ROOM] [INTERIOR]

Existing canonical smart lock `LUNA-L06-APT-A-ENTRY-LOCK-01`: local(5.681818,1.1,5.9), world(−2.5,22.6,−2.012636), capabilities lock/unlock. Existing intercom `…-ENTRY-INTERCOM-01`: local(6.3,1.6,5.9), world(−1.881818,23.1,−2.012636), stream.start/stream.stop/door_release. These are separate apartment-owned device representations, not hardware attached to the raised common door leaf. No equivalent B/C/D lock/reader/doorbell is defined. Intercom capability listing does not establish a separate authorized entry mechanism. [ASSETS] [MEPRENDER] [ACCESS]

## 5. Lift / service / stair schedule

| Canonical lift | Shaft centre X/Z | Footprint / area | L06 landing leaf-pair centre X/Y/Z | Nominal facing |
|---|---|---|---|---|
| `LUNA-LIFT-PASS-01` | −3 /0 | 3×3 /9 | −3 /22.6 /1.43 | +Z |
| `LUNA-LIFT-PASS-02` | 0 /0 | 3×3 /9 | 0 /22.6 /1.43 | +Z |
| `LUNA-LIFT-PASS-03` | 3 /0 | 3×3 /9 | 3 /22.6 /1.43 | +Z |
| `LUNA-LIFT-SERVICE-01` | 6.5 /0 | 3.2×3.4 /10.88 | 6.5 /22.6 /1.43 | +Z |

S source footprints and centres; R landing dimensions. All use the same reference moving-car system and L06 stopY21.5. Display names are Passenger Lift01/02/03 and Service/Fire Elevator. Portal spacing is3 m,3 m,3.5 m. The gap between passenger03 shaft and service shaft is0.4 m; passenger shafts meet atX±1.5. [CORES] [LIFT] [LIFTMESH]

Common lift assembly dimensions from `DynamicLift`:

- Each moving landing leaf0.59×2.2×0.07, closed centres shaftX±0.3, Y22.6/Z1.43. Open travel±0.6 per leaf; nominal portal gap1.2 m (jamb inside faces±0.6); fully separated leaves have1.21 m geometric inner gap. Do not describe one leaf as the full doorway.
- Threshold1.3×0.1×0.6, centre(shaftX,21.45,1.5), top21.5; Z1.2…1.8. It ends0.1 m beyond the common rectangleZ1.7.
- Jambs0.7×2.3×0.15, centres shaftX±0.95/Y22.65/Z1.425. Lintel width=shaft width, thickness0.3, depth0.15, centreY23.95/Z1.425. Outer portal width2.6 m gives0.4 m between passenger portal assemblies and0.9 m between passenger03/service assemblies.
- Passenger car floor2.1×2.1×0.16; service2.3×2.3×0.16. Top follows runtime positionY. Walls2.5 m high, side thickness0.1; backZ−1; car-doorZ1.02. Roof centre2.55 above car floor, thickness0.1. Approximate inside width2.0 m passenger/2.2 m service from wall inner faces; actual car front/back construction still uses shared literal Z positions rather than a service-specific interior design.
- Shaft sides thickness0.15; back centreZ−1.425 with thickness0.15. Service back/portal Z values are shared passenger literals despite3.4 m service depth: its representation is not a fully parameterized shaft enclosure.

All are R/procedural, not certified lift manufacturer dimensions. [LIFTMESH]

L06 leaves retain grey-blue `#657581`, roughness0.45/metalness0.25; bronze overrides exist only for Ground/L01. There are no L06 `GroundLiftControl` call-station meshes or landing readout canvases. Lift selection/runtime control exists through the existing canonical UI. Each car has its existing point light; no new L06 gallery lighting rig is defined. [LIFTMESH] [BATCH] [MOUNT]

### Actual arrival and available clearance

The generic lobby camera is `(shaftX, datum+1.65, 5)`, targeting `(shaftX,datum+1.35,0)`. Browser journey selected Passenger01 and arrived **(−3,23.15,5)**; the app selected `LUNA-L06-LOBBY`. Z5 is3.3 m beyond the lobby's north edge and is inside Apartment C's plan envelope atX−3. Passenger03 and service exits similarly fall within D; Passenger02 falls in the3.554 m central gap between C/D, which is not a registered circulation rectangle. The route's subsequent adjacency MOVE changes context only. [LIFT] [ARRIVAL] [CONTEXT] [DRIVER] [UNITS]

From landing door planeZ1.43 to near structural core-wall faceZ2.3 is0.87 m; the nominal passenger shaft frontZ1.5 to that wall is0.8 m. These cannot be accepted as a waiting area: C/D begin atZ1.8256795, and the common floor is raised. Passenger door plane to C/D boundary is0.3956795 m where their X ranges overlap; shaft front to boundary0.3256795 m. Within the registered lobby, passenger shaft front to lobby edge is only0.2 m; service front-to-lobby-edge is0 m. No credible minimum0.8 m route is established by those dimensions. [COREWALL] [CORES] [UNITS] [GALLERY]

The nearest entrance from actual Pass01 exit is06C, straight-line3.328109645…m, not06A. Its sightline toward the bank encounters core/door/box representations; the browser does not show a finished coherent three-lift gallery. Service lift shares the same volume and route mechanism; only a blank2.24×0.3×0.03 panel at(6.5,25.125,1.78) suggests separation. No protected service/fire arrival is modeled. [COMMON] [LIFTMESH]

### Protected stairs and riser

| Item | Footprint / bounds | Door / representation | Executable status |
|---|---|---|---|
| `LUNA-STAIR-01` | centre−14,9;3.5×5.5;19.25 m²; X−15.75…−12.25/Z6.25…11.75 | `LUNA-STAIR-01-L06-DOOR-01` at(−14,23.125,6.25),1.05×2.1, closed, unrotated | No physical continuous stair journey |
| `LUNA-STAIR-02` | centre14,9; same size; X12.25…15.75/Z6.25…11.75 | corresponding02door at(14,23.125,6.25), same | same |
| `LUNA-RISER-01` | centre−8,0;1.6×1.6;2.56 m²; X−8.8…−7.2/Z±0.8 | solid architectural shaft proxy, no service access door | service topology, not walkable room |

S footprints [CORES]; R doors [COMMON] [HINGE]. Full building shafts spanY−4…52.25. `CoreShaft` is a box, not a hollow stair enclosure with cut doorways. L06 representative stair structures are3×2.925×5 boxes centred(±14,23.125,9), not treads, risers, intermediate landings or flights. Their Y extent21.6625…24.5875 gives no walking/headroom proof. [STRUCT] [STAIRMESH]

Stair links touch the stair **side** boundaries; the doors are centred on the **south** faces atX±14/Z6.25. Door centre is1.75 m outside the spur edge; nearest door leaf edge is1.225 m outside it. A corner approach/landing is not authored. L06 stair door IDs appear in rendered geometry but are not included in normalized door relationships; stair core↔level graph edges are only connectivity intent. `LUNA_STAIR_CAPABLE_REFS` is empty. Missing: true flights, step dimensions, landing elevations, headroom sections, complete door/enclosure geometry, rated assemblies and admitted runtime route. No certified/functional egress is claimed. [GALLERY] [MODEL] [BINDINGS]

## 6. Routes and topology: graph versus physical journey

The source graph contains four lift↔L06 edges, two stair↔L06 edges, L06↔each common rectangle, and lobby↔each apartment via its entrance door. There is **no direct corridor↔stair-door edge**, no riser walking edge, and no detailed obstacle-aware common-gallery centreline. Graph shortest path is unweighted breadth-first search: it has no metric length or corridor width. [GRAPH] [MODEL]

`lunaL06Transitions` defines approach2.2 m outside door and arrival1.8 m inside, Y23.2. A/B approach Z+0.374321 atX−2.5/+2.5; C/D approach Z−0.374321 atX−4/+4. **All four lie inside passenger-shaft footprints.** Their4 m crossing paths cannot be treated as physically clear. The declared0.8 m traversal profile is a requirement, not measured available width. [TRANSITIONS] [CORES]

Distances below are **derived horizontal requested camera polylines from generic lift exit → apartment approach → door**, not a collision-free route. Add1.8 m for the subsequent inside waypoint. Exact formulas/straight-line distances for all16 combinations are in JSON. Physically clear route length and minimum width are **undetermined/blocked**, not zero and not a fabricated detour.

| Lift exit | 06A | 06B | 06C | 06D | Physically verified walkable? |
|---|---:|---:|---:|---:|---|
| Passenger01 | 6.852624 | 9.386578 | 7.666564 | 11.025153 | No |
| Passenger02 | 7.458033 | 7.458033 | 8.899502 | 8.899502 | No |
| Passenger03 | 9.386578 | 6.852624 | 11.025153 | 7.666564 | No |
| Service/fire | 12.319136 | 8.315301 | 13.995479 | 8.127337 | No |

Sources: [LIFT] [TRANSITIONS]. Straight-line generic camera-exit→06A distances are6.843967695,7.269105434,8.765836743 m for Pass01/02/03. Farthest doors from their respective exits:01→B8.765836743 m;02→A/B7.269105434 m;03→A8.765836743 m; service→A11.295569654 m. These do not bypass the preceding physical warning.

Route binding uses LIFT handoff, adjacency MOVE, and DOOR TRANSITION. A checks the existing credential/lock and actual leaf angle. Other static doors are treated as `OPEN_BOUNDARY_STATE` by the driver even while B/C/D rendered leaves are closed. Public/private admission remains a separate policy check. [DRIVER] [BINDINGS] [ROUTEPOLICY]

**Explore:** its horizontal movement/floor lock and shared camera are present. Its bound on isolated L06 is X±17.4/Z±13.4 (0.6 inset). But `allowStep` calls `podiumStepAllowed`, which returns true outside Ground/L01; it supplies no L06 wall/shaft/door/private-boundary collision checks. `resolveLunaExploreSpace` checks rectangles without an identity argument. The audit's keyboard W sample went from(0,23.15,5) to(0,23.15,1.5995031884306554), crossing the unperforated core-wall bandZ2.3…2.7 without stopping; Y stayed stable. Camera travel is therefore **not** proof of valid L06 manual circulation. No private entry was exercised in this audit. [STEP] [STEPBIND] [EXPLORE]

No authored common lounge furniture, planters or art obstructs these routes. Existing obstructions are architectural/core/floor inconsistencies, not furniture-placement problems. [COMMON]

## 7. Structure and ceiling feasibility

Core ring inner rectangle: X−9.4…8.8, Z±2.3; outer rectangleX−9.8…9.2,Z±2.7. Centre(−0.3,0), inner half-width9.1/half-depth2.3, wall thickness0.4. North/south wall segments19×0.4 plan; side segments0.4×4.6. Ring plan area18.88 m². It extends continuously from−4 to52.25, except authored Ground/L01 front apertures. There are **no L06 front apertures**. An inspection mode hiding the front ring is a visual reveal, not an architectural opening. [COREWALL] [WALLMESH] [OPENINGS] [PODIUM]

Core walls cross A/B/C/D boundary zones: e.g. north wallZ2.3…2.7 overlaps C and D envelopes, south wallZ−2.7…−2.3 overlaps A/B. This was not checked by the floor rectangle check. It constrains lift approaches, entry sightlines, wall panels, signage and any attempt to declare a continuous gallery. [UNITS] [COREWALL] [OVERLAP]

Six L06 columns `LUNA-STRUCT-L06-COL-01…06`: centres(−16.5,−12.5),(−16.5,12.5),(16.5,−12.5),(16.5,12.5),(0,−12.5),(0,12.5); each0.5×3.25×0.5 atworldcentreY23.125. No transfer beam at L06 is defined; the transfer record is at L01. These columns do not intersect the three common rectangles. The mid-north column occupies part of the unregistered3.554 m central strip between C/D; remaining side distances to unit envelopes are1.527 m each, before finishes. This does not make that strip canonical circulation. [STRUCT] [UNITS]

The L06 slab's visual opening is3×3 centred0,0, serving Passenger02 only. It does not subtract other lift, stair or riser footprints. Sleeve objects are representative markers, not boolean cuts. Common ceiling/floor boxes also span the shaft-containing lobby without holes. This audit does not extend the podium opening authorization to L06. [OPENINGS] [SLEEVES] [COMMON]

### Current versus feasible clear height

- **Current common local panel separation:2.31m**, but at incorrect elevations; only1.565 m remains to the next structural underside at the raised common floor. There is no coherent finished common clear height to accept as-is.
- **Current Apartment A generic room separation:2.29m**. Its nominal0.45 m service-zone proxy (`3.25−2.4−0.4`) applies only to flagged apartment rooms, not to the common gallery. It is not surveyed MEP space.
- **Raw structural upper bound:2.90m** from existing L06 slab top21.85 to L07 underside24.75. With a0.06 m ceiling entirely below that underside, the arithmetic upper bound becomes**2.84m**, before any additional floor finish, installation allowance, fittings or services. Any finish thickness reduces it.
- A2.7 m finished clearance could leave0.14 m between a0.06 m ceiling top and upper slab if walking on21.85, but the source has no coordinated service package proving that allocation. **2.7–2.84 m is a study possibility, not an approved achieved height.** A3 m finished common clearance is not supported by the current slab-above-datum geometry.

Changing the common render origin is a geometry correction; reconciling slab/walking datum/lift thresholds is a separate architectural decision. A ceiling adjustment alone cannot solve the1.625 m error or0.35 m slab/datum discrepancy. No second floor coordinate system or assumed service void is justified. [STRUCT] [COMMON] [INTERIOR] [ROOM]

## 8. MEP / services / façade constraints

| Common service | Position / relationship | Classification |
|---|---|---|
| `LUNA-L06-COMMON-CAM-01` | world(0,23.9,−3), floor-localY2.4 | canonical observable **simulated** CCTV; no listed control capabilities; outside registered lobby rectangle |
| Electrical floor branch | `LUNA-L06-ELECTRICAL-BRANCH-01`,(−8,21.5,−0.6) | canonical representative asset; simulated network continuity, no direct command capability |
| Water floor branch | corresponding WATER ref,(−8,21.5,−0.2) | same; representative water distribution |
| Drainage floor branch | DRAINAGE,(−8,21.5,0.2) | representative connection, not engineered drainage layout |
| Fire floor branch | FIRE,(−8,21.5,0.6) | representative pressure/network relationship; not sprinkler coverage |
| Data floor branch | NETWORK,(−8,21.5,1.0) | representative network topology |
| Five vertical risers | corresponding `LUNA-RISER-{ELECTRICAL,WATER,DRAINAGE,FIRE,NETWORK}-01`; sameX/Z, continuous−4…52.25 | represented continuous services, not construction routing |
| Five L06 sleeve markers | sameX/Z at21.5 | visual markers, no slab cuts |
| A lock/intercom | §4 | apartment-owned operational simulation; not generic common access readers |

Positions are S local, D world; sources [ASSETS] [MEP] [MEPRENDER] [SLEEVES]. Branches are rendered as markers, not detailed high-level ceiling runs. NETWORK Z1.0 exceeds the nominal architectural riserZ±0.8 by0.2 m; do not enclose/screen it without coordination. Electrical/water/fire/network simulated state derivation does not make these installed/live devices.

**Not currently defined for the common gallery:** HVAC unit/duct layout, concealed ventilation slots, general service plenum, sprinkler heads/coverage, common smoke detector, gallery light circuit and fixture schedule, dedicated common Wi-Fi AP/Edge box, local access reader, detailed drain/maintenance access panels. Apartment A HVAC/fire/devices are not common ceiling equipment. No MEP system was invented in this audit. [MEP] [ASSETS] [COMMON]

**Exterior/daylight:** no common-area window/glazing opening is registered. LobbyXextent±10.45/Z±1.7 is well inside36×28; spur outerX±12.25 and northZ11.75 leave5.75 m to side façade and2.25 m to north façade. The building's procedural external glazing/balcony ring is separate visual representation. It cannot establish a lobby window or a private-apartment sightline. Keep all future common decorative glazing subject to geometry/policy review. [GALLERY] [PROGRAMME] [FACADE]

## 9. Access and RepresentationPolicy audit

Current policy was evaluated for four identities; full per-ref results are in JSON. Table entries are **policy modes**, not a claim that every raw scene mesh is culled.

| Object | Assigned06A resident | Assigned06B resident | Facility | Public/guest |
|---|---|---|---|---|
| L06 / lobby / stair link | CONTEXT_3D | CONTEXT_3D | OPERATIONAL_2D | HIDDEN |
| 06A | FULL_3D | HIDDEN | OPERATIONAL_2D | HIDDEN (occupied) |
| 06B | HIDDEN | FULL_3D | OPERATIONAL_2D | HIDDEN (occupied) |
| 06C | HIDDEN | HIDDEN | OPERATIONAL_2D | FULL_3D (available sales lifecycle) |
| 06D | HIDDEN | HIDDEN | OPERATIONAL_2D | CONTEXT_2D (reserved) |
| A smart lock | FULL_3D | HIDDEN | HIDDEN | HIDDEN |
| Passenger/service lift assets | CONTEXT_3D | CONTEXT_3D | FULL_3D | HIDDEN |
| Stair01 core | CONTEXT_3D | CONTEXT_3D | FULL_3D | CONTEXT_3D |

Sources [POLICY] [LIFECYCLE]. A resident assigned elsewhere on L06 has the same common-mode result; own unit alone becomesFULL_3D. Facility-owned service assets inside A have the explicitCONTEXT_3D allowlist, not a right to the private interior. Public C sales visibility is not visitor authorization to enter L06: level/lifts are still hidden. There is no dedicated issued-visitor-credential lifecycle.

Passenger action admission is deliberately separate from asset representation: a resident assigned any L06 unit may use Passenger01/02/03 to Ground, **L01 and L06**. Older “Ground/L06 only” notes are stale. Service/fire is not resident admitted by this function. Facility has full simulated lift control. No fire-service certification/recall/evacuation authority is implied. [LIFTPOLICY] [ROUTEPOLICY] [LIFT]

Only A entry lock is in `ACCESS_GOVERNED_REFS`. TOUR entry for its assigned resident requests the simulated credential; code**4127**, currently defined by `SIMULATED_ACCESS_CODES["LUNA-L06-APT-A"]`, is accepted only with the matching resident assignment. Unrelated resident/public/Facility are denied; no master key or temporary Facility private access exists. Direct in-session assigned-resident unlock uses the existing non-credential command path. Authorization, physical lock state, leaf animation and camera crossing are distinct. B/C/D have no fabricated lock capability. Stairs/common boundaries have no governed door access state. [ACCESS] [RESOLVER] [DRIVER]

**Enforcement gap requiring review:** `LunaLevel` always mounts A's `InteriorLayer`; `UnitVolume` and `useRoomOpacity` use level/focus opacity, not a per-unit policy cull. Thus policy and UI denial cannot be equated with removal of private geometry from the render tree. In addition, L06 Explore's step admission lacks private boundary checks, and awareness can resolve a unit solely by position. The audit does not certify privacy-safe manual traversal merely because route/device policy tests pass. Do not weaken policy or add transparent portals that worsen sightlines. [MOUNT] [UNITMESH] [ROOMFADE] [EXPLORE] [STEP]

## 10. Known L06 ingestion failure — reproduced, untouched

Current first failing assertion is `scripts/verifyIngestionV2.mjs` line101:

`derivedL06Plan.outline.depth > 0 && derivedL06Plan.outline.depth <= LUNA_L06_FLOOR_PLAN.outline.depth`

Expected positive depth≤**28**; actual **30.999185**. Width32.01581≤36 passes. The assertion message is “derived outline must be a real, positive extent that fits within the declared tower footprint”. This audit evaluated the same source inputs and comparison without running the report-writing verification script or modifying its expectation. [INGEST] [PLAN] [DERIVE]

Cause: normalized Apartment A now includes the Balcony room, centreZ−14.7495925/depth1.5, southern edge−15.4995925. `symmetricEnclosingExtent` takes twice the largest absolute extent, giving2×15.4995925=30.999185. It is a centred envelope, not the asymmetric union depth29.499185. [APT] [APTSPATIAL] [DERIVE]

The Balcony projects1.4995925 m beyond the tower's−14 face. The current procedural façade already has a1.7 m external balcony band (outerZ−15.7); the Balcony lies within that band. Therefore this is **not proof that the core/common gallery was enlarged or that an apartment internal room accidentally moved**. It exposes a scope mismatch between the declared tower outline and ingestion including an external balcony, plus stale test expectations. Whether the authoritative plan outline should include projections is a design/data-contract decision, not something this audit resolves. [FACADE] [PROGRAMME]

There is a further **unreached** stale comparison immediately afterward: derived regions now number21 (4units+3common+14Arooms), while the assertion compares against7 top-level unit/common regions. It would fail independently after the outline issue is resolved; it is not reported as an additional executed test failure. The floor-plate checker returns CLEAR because it checks unit envelopes/common rectangles/cores, not nested balcony rooms or rendered core walls. [INGEST] [MODEL] [OVERLAP]

Classification: **KNOWN PRE-EXISTING TEST/INGESTION ISSUE — NOT FIXED.** Common architecture failures identified above have their own source evidence and are not attributed to this assertion.

## 11. Current browser visual state

Observed on local Chrome at1440×1000 after real Oyi Ground→L06 route. Facility context was used, not an authorized A interior entry. Real arrival camera(−3,23.15,5), target(−3,22.85,0). Three further explicitly assigned inspection cameras examined the gallery, A entrance and west stair; they are inspection evidence, not walking proof. Camera coordinates and world-matrix samples are retained in JSON. Temporary screenshots remained in `/tmp`; no extra repository evidence files were added.

| Category | Current observation / source corroboration | Grade |
|---|---|---|
| Floor | thin raised common panels; blue/background/massing dominates arrival rather than continuous stone walking plane | EXISTING / PLACEHOLDER |
| Walls | continuous core/shaft masses, ghosted boxes; no coherent finished gallery boundary | EXISTING / PLACEHOLDER |
| Ceiling | plain panels at wrong height; overlaps other-floor construction | EXISTING / PLACEHOLDER |
| Lift portals | repeated grey-blue reference doors/jambs/thresholds; working simulated cars | EXISTING / PLACEHOLDER (runtime usable) |
| Apartment doors | timber rectangles/frames visibly floating; A live, others static | EXISTING / PLACEHOLDER |
| Signage | service blank panel; no readable physical LEVEL06 /06A–D wayfinding | MISSING as usable wayfinding |
| Gallery light fixtures | no authored common fixture system; inherited scene/car lighting only | MISSING |
| Furniture / planting / artwork | no common-area schedule or visible composition | MISSING |
| Materials | flat source stone/wood/ceiling materials; no frozen Ground/L01 finish system applied here | EXISTING / PLACEHOLDER |
| Access hardware | A canonical lock/intercom positioned in apartment frame; no common reader/call-panel treatment | EXISTING / PLACEHOLDER for A; MISSING common |

The real arrival screenshot shows a large raised brown door leaf above the lift presentation and intersecting translucent masses. The card labels Passenger Lift Lobby but shows “Occupied private residence — shown as an operational shell only.” That is a current presentation/context discrepancy, not evidence that the lobby is a private apartment. The app is rendering, not a black-screen failure in this session. [COMMON] [LIFTMESH] [MOUNT] [CONTEXT]

## 12. Reuse and design-intent feasibility

Ground/L01 optimized resources are suitable reusable **families**, without changing their frozen schedules:

| Resource | Safe future reuse / condition |
|---|---|
| `groundInteriorMaterials` | cached local stone/timber/fabric maps, bronze/plaster/light/foliage factories; no remote texture dependency [FINISH] |
| `createInteriorConstruction`, `appendInteriorFurniture` | indexed/merged primitives and shared planter foliage strategy; avoid unnecessary new furniture payload [SHARED] |
| `DecorativeBatch` | static local matrices, parent world transforms preserved, instanced leaves, restricted shadow casting, decorative raycast ignored [BATCH] |
| `GroundLiftControl` | actual canonical lift context and runtime floor/direction readout; **current Z2.83 placement is podium-specific**, cannot be blindly copied into blocked L06 [BATCH] |
| `GroundInteriorLettering` | one custom atlas and merged planes for subtle level/unit labels; canonical IDs unchanged [SIGNS] |
| L01 composition/render pattern | nearby-level visibility and bounded unshadowed warm lights, reuse rather than third independent system [L01] |

| Proposed gallery element | Feasibility classification | Constraint |
|---|---|---|
| Premium stone on existing surfaces | SAFE VISUAL ADDITION | material substitution only; correct floor origin/layers before final installation |
| Warm timber wall panels | INSUFFICIENT INFORMATION for final layout | no agreed gallery wall boundaries; must not conceal required core openings |
| Bronze/dark-metal details | SAFE VISUAL ADDITION | existing mesh surfaces; avoid reducing clearances |
| Refined passenger portals | REQUIRES GEOMETRY CHANGE first | landing/core-wall openings and standing plane uncoordinated |
| Refined apartment portals | REQUIRES GEOMETRY CHANGE first | raised leaves; A centre mismatch; B/C/D closed shell opening truth |
| Concealed HVAC | INSUFFICIENT INFORMATION | no common distribution/plant/void; operational objects would require canonical definitions |
| Warm surface-mounted/emissive fixture treatment | SAFE VISUAL ADDITION after shell coordination | shallow non-operational presentation; no fictitious light-circuit state |
| Deep recessed lighting/coffers | INSUFFICIENT INFORMATION | structure and real installation depth must be coordinated |
| Restrained artwork / minimal planting | SAFE VISUAL ADDITION conditionally | only after proven walkway/egress keep-clear zones; no currently approved placement |
| LEVEL06 and06A–D display wayfinding | SAFE VISUAL ADDITION | use real IDs, appropriate privacy projection, no operational renaming |
| Full-depth new lobby windows | CONFLICTS WITH CURRENT SOURCE | no common façade frontage/opening |
| New walkable gallery/apartment/core boundaries | REQUIRES CANONICAL GEOMETRY CHANGE | if correcting model boundaries rather than only aligning existing visual transforms |

This is an assessment, not approval to implement. No material/asset was instantiated into L06 by the audit. A finished “quiet private residential gallery” is feasible as a direction, but its physical approach zone requires coordination first.

## 13. Current topology diagrams

Not to scale; X increases right, +Z is local north. Internal dimensions and offsets above control.

```text
                          +Z / N (local convention)
                        tower north face Z = +14
 X=-18   [STAIR01]  |west link| [ 06C ] gap [ 06D ] |east link| [STAIR02]  X=+18
          x=-14       -11.35     -6.1135      6.1135     11.35      x=14
          z=9                    z=7.912636                        z=9
       doors south faceZ6.25 -- NOT on the links' shared side faces
                     L1 exit(-3,5) in C; L2 exit(0,5) in gap;
                                   L3/service exits in D
                  C door(-4,1.825679)   D door(4,1.825679)
        ------ CORE FRONT WALL Z=2.3..2.7 crosses C/D; no L06 portals ------
               gallery rectangle Z=-1.7..1.7, X=-10.45..10.45
             [RISER]       [PASS01][PASS02][PASS03] [SERVICE]
               -8             -3      0      3        6.5
                          all landing doors face +Z at Z1.43
                  A door(-2.5,-1.825679) B door(2.5,-1.825679)
        ------ CORE BACK WALL Z=-2.7..-2.3 crosses A/B --------------------
                    [       06A       ] [       06B       ]
                        z=-7.912636        z=-7.912636
                        tower south face Z = -14
                  A Balcony projects to Z=-15.4995925
```

The core wall is shown displaced vertically in the ASCII only for legibility: its exact plan bands are given in §7. Shafts **occupy** the nominal gallery; the drawing must not be read as a separate empty lobby in front of them. [GALLERY] [CORES] [UNITS] [COREWALL]

```text
Canonical graph:
 Ground common → passenger lift node → LUNA-L06 → LUNA-L06-LOBBY
                                                    ├─door→06A
                                                    ├─door→06B
                                                    ├─door→06C
                                                    └─door→06D
 LUNA-L06 ─adjacency→west/east stair-link common rectangles
 LUNA-L06 ─stair-intent→Stair01/02  [NOT executable/bound]
 LUNA-L06 ─lift→Service/fire        [Facility control; shared geometry]
 Riser: service relationships only; no walking edge

Actual arrival sequence:
 GROUND LIFT GALLERY
       ↓ existing admitted passenger action / live simulated car + doors
 PASSENGER LIFT
       ↓ L06 runtime stop Y21.5
 L06 CAMERA EXIT (shaftX,23.15,5)  [outside canonical lobby rectangle]
       ↓ adjacency MOVE changes context; does not move camera
 “PASSENGER LIFT LOBBY” CARD
       ↓ DOOR transition approach currently inside shaft
 06A [assigned resident + credential + actual A leaf]
 06B/C/D [policy admission; static closed leaves; no fabricated locks]
```

## 14. Conflict and decision register

**A. Existing geometry defects:** common/door origin+1.625; common ceiling in L07; slab/finish datum overlap; A18.7745mm opening misalignment; B/C/D no coordinated wall openings; stale A normalized STATIC_BOUNDARY label. These have independent code evidence, not inferred from screenshots alone. [COMMON] [PARENT] [ROOM] [MODEL]

**B. Circulation conflicts:** shafts contained in nominal gallery;0.2/0 m frontal strip; all apartment approach points inside shafts; generic lift exits in C/D/unregistered gap; core wall across exit route; stair spur meets wrong side relative to door; Explore has no L06 obstacle/private threshold enforcement. No valid metric route/minimum-clear-width acceptance can be issued. [GALLERY] [TRANSITIONS] [STEP]

**C. Structural constraints:** preserve four shaft locations, two stair footprints, riser and six columns. Continuous core-ring walls require explicit approach coordination; L06 slab has only Lift02 opening. No L06 transfer structure or stair flight design to silently reinterpret. [CORES] [STRUCT] [OPENINGS]

**D. MEP/ceiling constraints:** uncoordinated raised ceiling;2.90 m raw structural bound; no real common MEP plenum/duct/sprinkler schedule. Network riser outside nominal box; CCTV outside lobby rectangle. [MEP] [ASSETS]

**E. Access/policy constraints:** preserve own-home-only physical A admission, no Facility master key, no B/C/D fabricated locks, passenger-specific destination admission, separate service capability. Audit raw-mesh and manual-boundary enforcement before making private sightlines more transparent. [POLICY] [ACCESS] [EXPLORE]

**F. Known test/ingestion issues:** depth30.999185 versus28 from projecting balcony and symmetric extent semantics; latent21-versus7 region expectation. Neither fixed. Older70ms podium sampler/opening-trace timing issues were not rerun and are not explanations for L06 geometry. [INGEST] [DERIVE]

**G. Safe visual-only opportunities:** shared stone/bronze material family on preserved surfaces, atlas-based display wayfinding, reuse of existing canonical readout/control family once its mounting surface is valid, restrained non-operational shallow fixture presentation. These do not authorize obstruction or new live assets. [FINISH] [SIGNS] [BATCH]

**H. Changes requiring canonical/structural coordination:** changing lobby boundaries/arrival positions/transitions, reconciling structural-slab top with lift/walking datum, core-wall and slab apertures, stair-door connectivity and true landings, apartment opening/assembly coordinates, source envelope semantics. Even a visual-origin correction must be documented and revalidated against runtime/canonical bindings.

**I. Missing design information:** approved residential gallery wall plan, finished-floor build-up, actual lift manufacturer portal/threshold details, protected stair sections/landings/doors/headroom, service/fire lobby strategy, ceiling services, fire strategy, maintenance access, common daylight openings, verified north, coordinated privacy-safe render visibility. The reference source is not a construction-issue model.

## 15. Smallest safe next implementation scope — recommendation only

1. **Coordinate the existing shell before finishes:** resolve floor-origin error and the slab/walking/lift threshold convention; reconcile apartment assembly/opening positions; establish a genuine clear arrival apron and approach paths using fixed existing shafts/units. The present20.9×3.4 rectangle cannot simply be called a clear gallery. Any necessary boundary/structural edits require explicit, separately documented scope.
2. **Coordinate vertical circulation interfaces:** demonstrate car/threshold clearance and existing-shaft openings; make core-front portals real. Preserve shaft IDs/stops/coordinates. Keep stairs PARTIAL until approved flights/landings/headroom/door truth exists; do not invent egress.
3. **Bind navigation to the measured result:** replace context-only assumptions with real shared-space waypoints, respect A AccessResolver and B/C/D truth, extend existing conservative movement admission to L06 only under implementation authorization. Verify representation and raw-mesh privacy as well as route policy.
4. **Then apply a small reused finish package:** shared stone floor, restrained timber/bronze on valid surfaces, established portal/control/lettering family, sparse shallow warm fixtures. No new independent L06 material/plant system, no decoration before the keep-clear map is proven.
5. **Performance:** merged/indexed static batches, shared cached textures, instance repeats, decorative raycast exclusion, near-level visibility, few unshadowed lights. Measure comparable human-eye stationary/movement samples; do not copy Ground/L01 FPS as an L06 result.

Defer functional stairs, engineered HVAC/fire layout, new common windows, apartment furnishing, any B/C/D operational access system, and all Ground/L01/exterior changes. This audit does not authorize or perform the recommendation.

## 16. Read-only verification and stop

The two requested deliverables are the only permitted additions. Inherited files are verified by SHA-256 against the pre-audit1,468-file manifest; final verification **PASS: all 1,468 inherited files are byte-identical, none missing**. The aggregate manifest digest is in the JSON. Source-derived modules and browser navigation were used solely for inspection. Browser activity changed only its isolated local simulated session, not app files or production. Temporary helper scripts/data/screenshots were kept outside the repository.

**Audit complete. Implementation not started. Ground/L01/exterior/Apartment A and the known failing test remain unchanged.**

## Source index

Every bracketed authority key resolves below to the current source file and record line. Where a table says D or R, its arithmetic/transform is stated in the text; the key identifies the source inputs. The JSON also stores the source-file SHA-256 and exact unrounded route calculations.

[PROGRAMME]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/lunaProgramme.ts:16 "TOWER_FOOTPRINT; LEVEL_SPECS; buildLevels"

[UNITS]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/lunaProgramme.ts:108 "L06_UNIT_BOXES"

[CORES]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/lunaProgramme.ts:173 "LUNA_CORES"

[GALLERY]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/architecture/l06FloorPlate.ts:77 "L06_LOBBY; L06_STAIR_LINK_WEST/EAST"

[DOORS]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/architecture/l06FloorPlate.ts:128 "L06_APARTMENT_DOORS"

[OVERLAP]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/architecture/l06FloorPlate.ts:172 "INTENTIONAL_CONTAINMENT; checkL06FloorPlateCoordination"

[COMMON]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/architecture/L06CommonArchitecture.tsx:24 "CirculationZone; ApartmentEntranceDoor; stairDoors"

[PARENT]: /Users/ochigaidoko/Oyi-Twin-Engine/src/engine/components/LevelMassing.tsx:48 "restY and parent group transform"

[MOUNT]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/LunaLevel.tsx:119 "L06 common architecture and UnitVolume mounting"

[STRUCT]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/structure/lunaStructuralElements.ts:22 "slabFor; perimeterColumnsFor; STAIRS"

[COREWALL]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/structure/lunaStructuralElements.ts:178 "LUNA_STRUCTURAL_CORE_WALL"

[WALLMESH]: /Users/ochigaidoko/Oyi-Twin-Engine/src/engine/components/StructuralCoreWall.tsx:56 "four hollow-ring segments; frontOpenings"

[OPENINGS]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/structure/LunaStructuralLayer.tsx:28 "slabVisuals and LunaStructuralCore"

[PODIUM]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/architecture/podiumCoordination.ts:26 "PODIUM_CORE_OPENINGS restricted to Ground/L01"

[LIFT]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/lift/lunaLift.ts:26 "LIFT_DEFINITIONS; LIFT_STOPS; liftCamera"

[LIFTMESH]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/lift/DynamicLift.tsx:25 "Doors; DynamicLift"

[HINGE]: /Users/ochigaidoko/Oyi-Twin-Engine/src/engine/components/HingedDoor.tsx:13 "HingedDoor pivot, frame, thickness, animation"

[INTERIOR]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/InteriorLayer.tsx:17 "floor offset; serviceVoid; RoomWithMaterials"

[ROOM]: /Users/ochigaidoko/Oyi-Twin-Engine/src/engine/components/InteriorRoom.tsx:75 "InteriorRoom walls, floors, ceilings"

[APT]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/interiors/lunaInteriors.ts:151 "Foyer geometry/doors; Balcony record"

[APTFRAME]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/architecture/l06AptAFrame.ts:76 "L06_APT_A_MASSING_FRAME"

[APTSPATIAL]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/architecture/apartmentSpatial.ts:39 "normalizedApartmentRooms; apartmentWorldPoint"

[MODEL]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/ingestion/lunaSpatialModel.ts:236 "buildL06CommonAreas; buildL06ApartmentDoors; buildCores"

[GRAPH]: /Users/ochigaidoko/Oyi-Twin-Engine/src/engine/spatial/navigationGraph.ts:68 "buildNavigationGraph; shortestPath (unweighted)"

[TRANSITIONS]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/transitions/lunaL06Transitions.ts:24 "APPROACH_DISTANCE; ARRIVAL_DISTANCE; buildEntrancePair"

[BINDINGS]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/transitions/lunaRouteTransitions.ts:30 "LUNA_STAIR_CAPABLE_REFS; transition bindings"

[DRIVER]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/transitions/LunaRouteDriver.tsx:81 "boundaryStateFor; MOVE handling"

[ARRIVAL]: /Users/ochigaidoko/Oyi-Twin-Engine/src/App.tsx:582 "onExitLiftCar; onFlyToLiftLanding"

[CONTEXT]: /Users/ochigaidoko/Oyi-Twin-Engine/src/App.tsx:507 "onRouteCurrentSpaceChange"

[EXPLORE]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/explore/lunaExploreAwareness.ts:34 "resolveLunaExploreSpace; lunaExploreBounds"

[STEP]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/explore/podiumWalkability.ts:27 "podiumStepAllowed: only Ground and L01"

[STEPBIND]: /Users/ochigaidoko/Oyi-Twin-Engine/src/App.tsx:1186 "Explore allowStep binding"

[POLICY]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/policy/lunaRepresentationPolicy.ts:52 "resolveAssetMode; resolveUnitMode; resolveLevelMode"

[LIFTPOLICY]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/runtime/lunaPassengerAccess.ts:4 "passengerStopAllowed"

[ROUTEPOLICY]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/transitions/lunaRoutePolicy.ts:30 "lunaIsRouteEdgeAllowed"

[LIFECYCLE]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/policy/lunaUnitLifecycle.ts:9 "LUNA_UNIT_LIFECYCLE"

[ACCESS]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/runtime/lunaSimulationProvider.ts:433 "ACCESS_GOVERNED_REFS; SIMULATED_ACCESS_CODES; resolveAccessAuthorization"

[RESOLVER]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/runtime/lunaAccessTransitionResolver.ts:16 "lunaAccessTransitionResolver"

[ASSETS]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/operational/lunaOperationalAssets.ts:407 "common CCTV; apartment entry lock/intercom"

[MEP]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/operational/lunaMepBackbone.ts:56 "RISERS; LEVEL_06_BRANCHES"

[MEPRENDER]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/operational/OperationalAssetLayer.tsx:355 "LevelOperationalLayer and UnitOperationalLayer floor-relative transforms"

[SLEEVES]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/structure/lunaMepSleeves.ts:30 "LUNA_MEP_SLEEVES representative markers"

[MATERIALS]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/lunaMaterials.ts:237 "interiorWall; furnitureWood; ceilingSoffit; lobbyFloorStone"

[FACADE]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/LevelFacade.tsx:183 "ResidentialFacade procedural glazing and 1.7 m balcony ring"

[INGEST]: /Users/ochigaidoko/Oyi-Twin-Engine/scripts/verifyIngestionV2.mjs:101 "depth outline assertion; subsequent unit subset assertion"

[DERIVE]: /Users/ochigaidoko/Oyi-Twin-Engine/src/engine/spatial/floorControl.ts:43 "symmetricEnclosingExtent; deriveFloorPlanSpec"

[PLAN]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/policy/lunaFloorPlans.ts:126 "LUNA_L06_FLOOR_PLAN"

[STAIRMESH]: /Users/ochigaidoko/Oyi-Twin-Engine/src/engine/components/CoreShaft.tsx:32 "CoreShaft solid box proxy"

[UNITMESH]: /Users/ochigaidoko/Oyi-Twin-Engine/src/engine/components/UnitVolume.tsx:34 "UnitVolume: solid placeholder; level fade, not policy gate"

[ROOMFADE]: /Users/ochigaidoko/Oyi-Twin-Engine/src/engine/hooks/useRoomOpacity.ts:22 "level/focus opacity; not a privacy cull"

[SHARED]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/architecture/groundInterior/interiorConstruction.ts:10 "createInteriorConstruction; appendInteriorFurniture"

[FINISH]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/architecture/groundInterior/groundInteriorMaterials.ts:8 "cached finishMap; groundInteriorMaterials; metric UVs"

[BATCH]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/architecture/groundInterior/GroundInteriorFinishes.tsx:19 "DecorativeBatch; GroundLiftControl"

[SIGNS]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/architecture/groundInterior/GroundInteriorLettering.tsx:12 "GroundInteriorLettering custom atlas signs"

[L01]: /Users/ochigaidoko/Oyi-Twin-Engine/src/luna/architecture/L01InteriorFinishes.tsx:25 "L01InteriorFinishes shared component consumption"
