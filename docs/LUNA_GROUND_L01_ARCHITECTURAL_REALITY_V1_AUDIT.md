# Luna Ground + L01 Architectural Reality V1 — Phase 1 audit

**Status: READ-ONLY AUDIT COMPLETE — NO ARCHITECTURAL IMPLEMENTATION.**

Audited 20 September 2026 against the existing local working tree, including inherited uncommitted work. This is a measurement of `LUNA_REFERENCE_DESIGN`, not an approved/as-built building, a certified structural assessment or a fire-egress approval. The exterior phase was not continued. The companion JSON records numeric dimensions, polygons, canonical IDs, relationships, source hashes and read-only live-scene observations.

## 1. Findings that govern the next phase

- **Ground:** `LUNA-GROUND`, 44 × 34 m, **1,496 m²** gross, datum **0**, floor-to-floor **5 m**. **L01:** `LUNA-L01-AMENITIES`, 40 × 30 m, **1,200 m²** gross, datum **5**, floor-to-floor **3.5 m**. These are the current executable programme values, not the earlier conceptual 4.5 m L01 assumption. [P]
- Ground has **three registered interior zones**: Reception, Waiting Lounge and Lift Lobby. They total **322 m²**, within a computed **459.2 m² bounding rectangle**. Neither figure is net usable area. L01 has **two registered amenity rooms**, Pool and Lounge, each **144 m²**. [ROOMS] [GALLERY] [MODEL]
- Ground is not currently a five-metre-clear grand lobby. Its decorative ceiling field underside is **Y=2.37**, dropped soffit **Y=2.24**. The opaque procedural shell floor ends at **Y=0.16**, giving **2.21 m / 2.08 m** geometric clearance respectively. A reception pendant hangs down to **Y=1.42**, only **1.26 m** above that surface. Where no decorative ceiling is present, shell-only height is **4.68 m**. L01 room clearance is **2.29 m**. These are mesh separations, not a coordinated finished-floor schedule. [SHELL] [LOBBY] [CEIL] [ROOM_RENDER]
- **A genuine double-height Ground/L01 volume is not supported now. Classification C: architectural/structural geometry change required.** The L01 slab has only a Lift 02 shaft opening, not an atrium. Ground's roof skin and L01's massing also separate the storeys. [SLAB_HOLE] [SHELL] [MASS]
- The strongest **geometric study zone** is the existing **14 × 6 m Reception footprint**, X=−7…7, Z=3…9. It is aligned with the entrance and does not cut a registered L01 amenity room. It still requires a structural slab cut; it is not authorization or proof of structural feasibility. [ROOMS] [STRUCT]
- Important conflicts include an entrance-axis structural column, unperforated structural core walls in front of lift doors, missing multi-lift/stair slab openings, L01 rooms overlapping stairs, an unformed pool, and a transfer plate intersecting service-void volumes. The audit reports these without changing them.

## 2. Measurement authority, method and limits

**SOURCE-DEFINED (S):** executable canonical/catalog constants. **DERIVED (D):** arithmetic from those constants. **PROCEDURAL/RENDERED (R):** current mesh construction; a decorative mesh does not establish a canonical window, room or operational device. **ANALYSIS CANDIDATE (A):** a future-study rectangle, explicitly not current architecture. **NOT CURRENTLY DEFINED (N):** no corresponding definition in the audited programme, spatial model, renderer or operational catalog; never substitute a zero dimension.

Units are metres and square metres. World +Y is up; +Z is the entrance/front side. X/Z origin is the building centre. No geographic north is inferred. Measurements use the rest/non-exploded building frame. A level child uses `worldY = level.baseElevation + level.height/2 + localY`; lobby/interior children subtract `level.height/2` again. Operational asset mounting positions use the level's base datum. [MASS] [MOUNT] [LAYER] [ASSET_RENDER]

Dimensions such as 13.8 are exact decimal results of source expressions; JavaScript may serialize them as 13.799999999999999. No dimension has been resized or rounded to an architectural module. Live GPU float bounds are retained separately in JSON, not substituted for source arithmetic. Area means X/Z footprint unless specifically stated otherwise.

The audit read the canonical exports, evaluated their current values through local Vite SSR, and inspected the live scene at `http://127.0.0.1:5173/` without commands, clicks, navigation or edits. Ground's scene status was **procedural**, with envelope bounds (−22,0,−17)…(22,5,17). Imported Ground can replace visual content through the existing pipeline; this report describes the default actually observed, not an arbitrary imported model. Structural visibility and ceiling opacity vary by representation, but hiding a mesh does not create an architectural opening. [MOUNT]

No browser journey, collision certification, full regression, engineering approval or photoreal acceptance is claimed by this audit. Source comments were checked against executable formulas; several comments are stale. Full source locators and hashes are in the source register/JSON.

## 3. Ground and L01 envelope / area schedule

| Item | Ground | L01 | Authority |
|---|---:|---:|---|
| Canonical ID | `LUNA-GROUND` | `LUNA-L01-AMENITIES` | S [P] |
| Display label | Ground | Level 1 — Residents' Club | S [P] |
| Base / next datum | 0 / 5 | 5 / 8.5 | S/D [P] |
| Floor-to-floor | 5 | 3.5 | S [P] |
| Gross width × depth | 44 × 34 | 40 × 30 | S [P] |
| Gross area | 1,496 | 1,200 | D: width × depth [P] |
| X extents | −22…22 | −20…20 | D [P] |
| Z extents | −17…17 | −15…15 | D [P] |
| Structural slab plan | 43.12 × 33.32 | 39.2 × 29.4 | D: footprint × 0.98 [STRUCT] |
| Structural slab gross area | 1,436.7584 | 1,152.48 | D [STRUCT] |
| Slab area after existing 9 m² visual hole | 1,427.7584 | 1,143.48 | R/D [SLAB_HOLE] |
| Structural slab thickness / Y range | 0.35 / 0…0.35 | 0.35 / 5…5.35 | S/D [STRUCT] |
| Rendered interior floor skin | Zone floors 0…0.06; whole shell floor 0…0.16 | Room floors 5…5.08; massing bottom face at 5 | R [LOBBY] [SHELL] [ROOM_RENDER] [MASS] |
| Outer wall representation | 5 m shell walls, 0.16 thick | Full 40 × 3.5 × 30 massing box; no authored outer-wall thickness | R [SHELL] [MASS] |
| Interior wall representation | Open zones; reception feature wall 2.4 high | Two rooms, 2.4 high, 0.12 thick | R [LOBBY] [ROOM_RENDER] |
| Ceiling | Three decorative patches; otherwise shell roof underside 4.84 | Room ceiling underside 7.37; massing top 8.5 is not a room ceiling specification | R [CEIL] [SHELL] [ROOM_RENDER] |
| Registered room/zone area sum | 322 | 288 | D [ROOMS] [GALLERY] |
| Gross plate less room/zone areas | 1,174 | 912 | D; **unallocated, not usable circulation** |

Ground and B1 share 44 × 34 m in plan. L01 steps inward **2 m on each of four sides** relative to Ground; L02 steps inward another **2 m at each X side and 1 m at each Z side** relative to L01. These are plate differences, not registered accessible terraces. [P]

### L01 slab / void determination

L01 has a near-full structural slab, **one 3 × 3 m Lift 02 hole at X/Z=±1.5**, a full massing box, and two separately rendered room floors. No atrium, partial-floor mezzanine or Ground overlook is defined. The visual front ledge is an exterior accessory, not a mezzanine. The structural slab catalog is rectangular; only its renderer subtracts the Lift 02 hole. The transfer plate above has no equivalent hole. [SLAB_HOLE] [MASS] [L01_FACADE] [TRANSFER]

## 4. Vertical section: B1 → Ground → L01 → L02

| Level | Datum / floor-to-floor | Structural slab Y / thickness | Ceiling / overhead geometry | Service void | Resulting clearance |
|---|---|---|---|---|---|
| B1 | −4 / 4 | −4…−3.65 / 0.35 | Ground slab begins Y=0; no continuous B1 finished-ceiling datum is established by these floor definitions | No uniform floor-wide void specified | **3.65** slab-top to Ground slab underside, where no other obstruction; not certified finished-room height |
| Ground | 0 / 5 | 0…0.35 / 0.35 | Lobby field 2.37…2.43, soffit underside 2.24, pendant bottom 1.42; shell roof 4.84…5 | Reception/Lifts have `serviceVoid` metadata, but their specialized Ground renderer does **not** instantiate the generic ServiceZone | **2.21 field / 2.08 soffit / 1.26 pendant** from shell floor top 0.16; **4.68** shell-only elsewhere |
| L01 | 5 / 3.5 | 5…5.35 / 0.35 | Room ceilings 7.37…7.43; transfer plate 7.9…8.5 over X=±18.5, Z=±14.5 | Two reference boxes Y=7.4…8.1, each 0.7 high, intersect transfer by 0.2 vertically | **2.29** room floor 5.08 to ceiling underside 7.37; **2.55** structural top 5.35 to transfer underside 7.9 where it applies |
| L02 | 8.5 / 3.25 | 8.5…8.85 / 0.35 | Next datum 11.75; no Ground/L01-style complete room ceiling schedule established here | No common uniform void established in this audit | **2.9** structural slab-top to next datum; not an assertion about every apartment ceiling |

Section sources: [P] [STRUCT] [TRANSFER] [LOBBY] [CEIL] [SHELL] [LAYER] [ROOM_RENDER]. B1 and L02 gross structural slabs are respectively 43.12 × 33.32 and 35.28 × 27.44; the latter gross area is 968.0832 m², rendered 959.0832 m² after the same 9 m² hole. [STRUCT] [SLAB_HOLE]

**Finish-datum discrepancy:** Ground's own zone floor would give 2.31/2.18 m to field/soffit, but the opaque shell surface is 0.10 m higher. In Structure view the 0.35 slab top gives only 2.02/1.89 m. L01's structural slab similarly overtops its room floor by 0.27 m; a structural-top-to-ceiling calculation gives 2.02 m. These competing surfaces must be coordinated before treating any datum as a construction finished-floor level. Removing/hiding them for a view does not reconcile the geometry.

**Double-height classification:** A—already supported: **NO**. B—visual treatment only: **possible only as a visual impression within existing volumes**, not an actual overlook or connected two-storey space. C—genuine double height: **YES, requires geometry change**. D—structural acceptability of a future cut: **UNKNOWN**, no engineered reinforcement/load-path design is present.

## 5. Ground canonical/spatial inventory

All rectangles below are source-backed; no new rooms are assigned. Room IDs stay unchanged.

| ID / label | Centre X,Z | Width × depth / area | Boundary X; Z | Architecture, connections and use |
|---|---|---|---|---|
| `LUNA-GROUND-LOBBY` — Ground Lobby | −5.65, 1 | 28.7 × 16 / 459.2 | −20…8.7; −7…9 | **Computed bounding rectangle**, not a fourth room. Normalized common-area/entry destination; includes gaps and structural/core overlap. [MODEL] |
| `LUNA-GROUND-LOBBY-RECEPTION` — Reception | 0, 6 | 14 × 6 / 84 | −7…7; 3…9 | Open zone, floor/ceiling, existing 4 m desk, feature wall. Shares 12.1 m semantic edge with Lift Lobby at Z=3; no connecting door record. [ROOMS] [LOBBY] |
| `LUNA-GROUND-LOBBY-LOUNGE` — Waiting Lounge | −15, −2 | 10 × 10 / 100 | −20…−10; −7…3 | Open zone, seating and planter, own ceiling. 4.9 m unallocated X gap to Lift Lobby; no corridor polygon or door joins them. [ROOMS] [LOBBY] |
| `LUNA-GROUND-LOBBY-LIFTS` — Lift Lobby | 1.8, −2 | 13.8 × 10 / 138 | −5.1…8.7; −7…3 | Zone wraps the four shafts and their portals; **138 m² is not clear gallery floor**. Existing registry console is not instantiated by GrandLobbyArchitecture. [GALLERY] [LOBBY] |
| `LUNA-EXTERIOR-ENTRANCE-PLAZA` | No bounded room polygon | N | Approach point (0,1.7,22) | Named exterior navigation origin, not a measured enclosure. [TRANSITION] |
| `LUNA-GROUND-ACCESS-MAIN-01` | (0,0,16) door base | See entrance schedule | +Z side | Real animated entrance and normalized door; observational access asset, not a governed lock. [ENTRY] [MODEL] |
| Four lifts, two stairs, representative riser | See core schedule | See §9–10 | Fixed full-height cores | Shared infrastructure, not additional Ground amenity rooms. [C] |

All three Ground zones are discoverable/selectable under existing interior lookup/plan logic. The normalized navigation graph represents **the whole Ground Lobby as one common-area node**; it does not separately certify a physical route through each zone. Facility-managed common-level representation permits Facility `FULL_3D`, resident/public `CONTEXT_3D`; operational assets follow separate policy. These facts do not establish a locked resident-only lobby threshold. [MODEL_BUILD] [PLANS] [POLICY]

**NOT CURRENTLY DEFINED as separate spaces:** concierge, secondary lounge, security/control room, management office, mail/parcel, guest WC, Ground service corridor/entrance, dedicated plant/electrical/ICT rooms. “Reception” exists, so reception/concierge intent must not be described as a wholly missing lobby; concierge is simply not a separate canonical function or room.

## 6. L01 canonical/spatial inventory

| ID / label | Centre X,Z | Width × depth / area | Boundary X; Z | Doors, adjacency and current architecture |
|---|---|---|---|---|
| `LUNA-L01-CLUB` — Residents' Club | Aggregate interior; no independent enclosing polygon | Two-room sum 288 | Union of two separated rectangles | Interior grouping, not a central open hall. [ROOMS] |
| `LUNA-L01-CLUB-POOL` — Pool | −14.5,0 | 9 × 16 / 144 | −19…−10; −8…8 | 0.12 walls, floor, ceiling; unregistered 1 m full-height gap at (−14.5,5,−8); 6 × 12 pool box and two loungers. Overlaps Stair 01 by 6.125 m². [ROOMS] [ROOM_RENDER] [FURNITURE] [C] |
| `LUNA-L01-CLUB-LOUNGE` — Lounge | 14.5,0 | 9 × 16 / 144 | 10…19; −8…8 | Same enclosure, gap at (14.5,5,−8), seating group. Overlaps Stair 02 by 6.125 m². [ROOMS] [ROOM_RENDER] [C] |
| Core/lifts/stairs/riser | Same X/Z as Ground | See core schedule | Full-height | No separately registered L01 Lift Lobby room or service corridor. [C] [LIFT_RENDER] |

The default “south” opening in `InteriorRoom` means **−Z**, not survey south. Each room has one 1.0 × 2.4 m wall gap, without lintel, leaf, frame, separate door ID or access actuator. Wall-centre-line perimeter is 50 m; rendered wall runs total 49 m excluding the 1 m gap, each 2.4 m high. Inside-wall rectangle is **8.88 × 15.88 = 141.0144 m²**, before stairs, furniture or structure. This is not a verified net usable area. [ROOM_RENDER]

The pool box lies at **Y=4.845…4.995**, below the room floor Y=5…5.08, with no slab cut, basin, drains or treatment plant. It cannot be treated as a coordinated operational swimming pool. Both rooms' walls stop at Y=7.4 and ceilings have underside Y=7.37. [ROOMS] [FURNITURE] [ROOM_RENDER]

**NOT CURRENTLY DEFINED:** gym/wellness, meeting/business rooms, toilets/changing, L01 plant rooms, service rooms, dedicated lift gallery, canonical terrace, mezzanine, overlook or atrium. The source explicitly discusses removing an earlier central Gym idea; that comment does not authorize restoring it. Pool and Lounge are normalized amenity nodes, but their free adjacency to the level is not a physical corridor design. [ROOMS] [MODEL_BUILD] [GRAPH]

## 7. Main entrance and arrival interface

| Measurement / behavior | Current fact | Authority |
|---|---|---|
| Canonical identity | `LUNA-GROUND-ACCESS-MAIN-01` | S [ENTRY] [ASSETS] |
| Door base / orientation | (0,0,16), entrance on +Z; incoming travel toward −Z | S [ENTRY] [TRANSITION] |
| Nominal opening | 3.6 wide × 2.8 high | S [ENTRY] |
| Leaves | Two sliding leaves, each 1.8 × 2.8 × 0.03 | R/D [SLIDING] |
| Travel / maximum central clear | Each leaf travels 1.8 × 0.92 = 1.656; central clear **3.312** | R/D [SLIDING] |
| Track | 5.4 × 0.12 × 0.24; centre Y=2.84 | R/D [SLIDING] |
| Fixed side glazing | Each 1.8 × 2.8 × 0.03, centres X=±2.78, Z=16 | R/D [SLIDING] |
| Added side panes | Each 2.2 × 2.8 × 0.03, centres X=±4.5 | R [ENTRY] |
| Outer entrance jambs / header | Jambs X=±3.4, 0.18 × 3 × 0.3; header 7 × 0.35 × 0.3 at Y=3.17 | R [ENTRY] |
| Threshold | 7.36 × 0.04 × 0.25, top Y=0.04 | R/D [SLIDING] |
| Recess | 1 m behind podium front Z=17; 1.15 m behind external glass plane Z=17.15 | D [ENTRY] [GROUND_FACADE] |
| Physical sequence | (0,1.7,22) → (0,1.7,16) → (0,1.7,10) | S/D [TRANSITION] |
| Access | `NONE` on entry transition; canonical access-point record is observable, no lock/unlock capability | S [TRANSITION] [ASSETS] [ACCESS] |
| Animation | Existing sliding progress / opening-clearance flow; required traversal clear width 0.9 | S/R [SLIDING] [TRANSITION] |

The normalized door correctly links exterior plaza to Ground Lobby **logically**, and its animation is real. The architecture is not fully coordinated: the transition crosses the structural column centred at X=0,Z=14; its endpoint Z=10 is 1 m outside the aggregate lobby boundary ending at Z=9; its low threshold is buried below the shell floor top. No behavior was changed to conceal these facts.

The current porte-cochère is **27.28 × 9 m**, X=±13.64, Z=18…27, slab Y=4.68…5, thickness 0.32. Supports are at X=±12.76,Z=26.6, each 0.3 × 4.7 × 0.3. Timber soffit underside is Y=4.651; downlight underside is Y=4.617. Its main box stops 1 m in front of the podium edge and 2 m in front of the recessed door; a complete physical connection is not proven by that box. These are existing exterior measurements, not a proposed entrance redesign. [GROUND_FACADE]

## 8. Glazed frontage from the interior side

| Component | Geometry | Meaning / limitation |
|---|---|---|
| Ground front shell aperture | Width 40.48, X=±20.24; Y=0.2…4.3; 1.76-wide side piers; 0.7-high head band | Actual procedural removal of opaque backing; not 20 registered windows. Central plinth omission follows entrance width. [SHELL] |
| Ground glass | Two side sheets 18.44 × 4.1 × 0.12; central 3.6 × 1.5 header; plane Z=17.15 | Central entry glass omission at Y=0…2.8; door assembly is behind this plane. [GROUND_FACADE] |
| Ground mullions | 2.024 m grid across 40.48; 0.055 × 4.1 × 0.16; centre-grid member omitted for entrance | Procedural frame rhythm, not room/window IDs. Ground head bar is at Y=4.52, above sheet top4.3. [GROUND_FACADE] |
| Ground decorative posts | X=−22…22 at4.4 intervals, centre omitted; 10 posts, 0.35 × 5 × 0.35 at Z=17.5 | Typical clear interval4.05; central interval8.45. Not the structural column set. [GROUND_FACADE] |
| Ground opaque sides/rear | 0.16-thick side and rear walls, height5 | No registered side/rear windows in Ground rooms. [SHELL] [MODEL_BUILD] |
| L01 external glass | Front and rear each36 × 2.73 × 0.12; X=±18; Z=±15.066; Y=5.385…8.115 | Exterior representation only: full opaque massing behind it. No registered room opening in either amenity. [L01_FACADE] [MASS] |
| L01 frame grid | 20 bays at1.8; 21 vertical members0.045 × 2.73 × 0.15 per face | Not authoritative operable-window schedule. [L01_FACADE] |
| Existing L01 timber rhythm | 22 slats per face, spacing40/21; size0.18 × 2.975 × 0.3 atZ=±15.25 | Existing visual detail, no proposal to add or redesign it. [L01_FACADE] |
| L01 ledge | One front28 × 2.2 × 0.2 slab, X=±14, Z=15.4…17.6, Y=5…5.2 | Source comment says front/back, but only **front** is instantiated. No canonical terrace, door or overlook. [L01_FACADE] |

Ground interior views to the front depend on the room ceiling patches, reception wall, posts and structural column, not just transparent exterior glass. L01 room front walls are at Z=8, **7 m behind the floor edge**; they have no windows. Exterior glazing is not evidence of interior daylight to those rooms. The normalized model's Ground/L01 window inventory is empty. [ROOMS] [ROOM_RENDER] [MODEL_BUILD]

## 9. Lifts and Ground passenger gallery

| Canonical asset | Shaft centre X,Z | Shaft W × D; extents X/Z | Ground door base | L01 door base | Facing |
|---|---|---|---|---|---|
| `LUNA-LIFT-PASS-01` | −3,0 | 3 × 3; −4.5…−1.5 / −1.5…1.5 | (−3,0,1.43) | (−3,5,1.43) | +Z |
| `LUNA-LIFT-PASS-02` | 0,0 | 3 × 3; −1.5…1.5 / −1.5…1.5 | (0,0,1.43) | (0,5,1.43) | +Z |
| `LUNA-LIFT-PASS-03` | 3,0 | 3 × 3; 1.5…4.5 / −1.5…1.5 | (3,0,1.43) | (3,5,1.43) | +Z |
| `LUNA-LIFT-SERVICE-01` | 6.5,0 | 3.2 × 3.4; 4.9…8.1 / −1.7…1.7 | (6.5,0,1.43) | (6.5,5,1.43) | +Z |

All table values: S/R/D [C] [LIFT] [LIFT_RENDER]. Ground and L01 are stops on all four existing lift definitions. No duplicate identities have been created.

Common portal construction is **1.2 m between jamb inner faces**, with two **0.59 × 2.2 × 0.07 m** leaves. Jamb centres are liftX±0.95, size0.7 × 2.3 × 0.15; lintel centre is stopY+2.45, height0.3. Threshold size is1.3 × 0.1 × 0.6 at `(liftX,stopY−0.05,1.5)`. Floor anchor is `(liftX,stopY,1.5)`. Passenger portal centres are3 m apart; P03→service is3.5 m; nominal opening-edge gaps are1.8/2.3 m. Passenger shafts touch in plan; P03→service shaft gap is0.4 m. [LIFT_RENDER] [C]

Passenger car floor is **2.1 × 2.1 × 0.16 m**; service car floor is **2.3 × 2.3 × 0.16 m**. Car roof underside is2.5 m above stop/car datum, side walls are0.1 thick, car-door plane isZ=1.02. These are renderer dimensions, not certified clear cabin dimensions/capacity. The renderer shares back-wall Z=−1.425 and landing Z=1.43 even for the deeper service shaft. Canonical shaft span is−4…52.25; rendered pit extends to−5.7 with top−5.4 and shaft sides begin−5.4. Motion derives from canonical runtime `positionY`. [LIFT_RENDER]

**Gallery availability:** the registered Lift Lobby is **13.8 × 10 = 138 m²** (X=−5.1…8.7,Z=−7…3), but includes37.88 m² of shaft footprints and parts of the core walls. Most of its depth is behind the +Z-facing doors. Door planeZ=1.43 to semantic front boundaryZ=3 is only **1.57 m**; this is not clear lobby depth because the core front wall occupiesZ=2.3…2.7. No opposite enclosed gallery wall is registered, so a precise door-to-opposite-wall clearance cannot be claimed. [GALLERY] [C] [CORE_WALL]

The code comment says width13, but formula `(8.1−(−4.5))+2×0.6` gives **13.8**. The formula is authoritative. The Ground waiting camera at `(liftX,1.65,5)` is **outside** the Lift Lobby rectangle and, for Lift02, at the reception desk footprint. Landing anchors carry Ground lobbyRef but L01 lobbyRef is null. [GALLERY] [LIFT] [LIFT_RENDER]

**Access:** Facility uses existing capabilities and policy; assigned L06 residents can currently command passenger travel to Ground/L06 only. L01 is a physical stop but not admitted by `passengerStopAllowed`. Resident access does not confer service/fire-lift or engineering rights. No physical call-panel/indicator model is authored beside these portals; an operational UI is not physical hardware. [PASSENGER] [POLICY] [LIFT_RENDER]

## 10. Stairs, service/fire and riser schedule

| Object | Plan / world span | Doors and route truth | Keep accessible |
|---|---|---|---|
| `LUNA-STAIR-01` | Centre(−14,9),3.5 × 5.5 =19.25 m²; X=−15.75…−12.25,Z=6.25…11.75; Y=−4…52.25 | Ground door `LUNA-STAIR-01-DOOR-01` at(−14,0,6.25),1.05 × 2.1; no L01 door definition | Entire footprint and −Z approach; final required approach envelope not defined |
| `LUNA-STAIR-02` | Centre(14,9),same size; X=12.25…15.75,Z=6.25…11.75; same Y span | Ground door `LUNA-STAIR-02-DOOR-01` at(14,0,6.25),same size; no L01 door definition | Same |
| Service/fire lift | Centre(6.5,0),3.2 × 3.4 | Uses same bank and door plane; Ground sign at(6.5,2,1.78),2.24 × 0.3 × 0.03 | Landing, shaft, pit, controls and future certified service approach; no separated route presently |
| `LUNA-RISER-01` | Centre(−8,0),1.6 × 1.6 =2.56 m²; X=−8.8…−7.2,Z=−0.8…0.8; Y=−4…52.25 | Representative full-height box; no maintenance-room door/working clearance | Shaft, sleeve locations and future access route |

Sources: [C] [LOBBY] [HINGED] [CORE_RENDER] [MODEL] [ROUTE].

Ground stair leaves are0.05 thick, left-hinged locally, fixed `open={false}`. The component could swing byπ/2.3 radians, but those doors are registered `STATIC_BOUNDARY` and have no actuated route binding. The code's enclosure length runs alongZ; actual stair-flight direction, treads, riser count, intermediate landings, ratings and final exits are **NOT CURRENTLY DEFINED**. Ground has two3 × 4.5 × 5 representative stair-structure boxes at(±14,2.5,9), Y=0.25…4.75; L01 has no equivalent stair-structure record. Graph served-level relationships include B1/Ground/L01/L02, but do not prove walking between them. [TRANSFER] [CORE_RENDER] [ROUTE]

West Ground door planeZ=6.25 lies3.25 m beyond Waiting Lounge frontZ=3. This is unallocated separation, not a certified clear approach. On L01 both protected stair footprints overlap the amenity rooms atZ=6.25…8. Do not cover these footprints, shaft faces or door approaches with finishes or furniture based on the current plan alone.

## 11. Structural coordination

| Element | Exact definition | Implication |
|---|---|---|
| Ground columns `LUNA-STRUCT-GROUND-COL-01…06` | Centres in order: (−19,2.5,−14),(−19,2.5,14),(19,2.5,−14),(19,2.5,14),(0,2.5,−14),(0,2.5,14); each0.5 × 5 × 0.5 | Columns01–04 sit outside lobby zones; **06 lies directly on arrival path** |
| L01 columns `LUNA-STRUCT-L01-AMENITIES-COL-01…06` | (−17.5,6.75,−12.5),(−17.5,6.75,12.5),(17.5,6.75,−12.5),(17.5,6.75,12.5),(0,6.75,−12.5),(0,6.75,12.5); each0.5 × 3.5 × 0.5 | Front centre column limits an entry-side future void; not on Ground's same grid |
| `LUNA-STRUCT-CORE-01` | CentreXZ(−0.3,0),outer19 × 5.4=102.6 m²; X=−9.8…9.2,Z=−2.7…2.7; inner18.2 × 4.6=83.72; wall thickness0.4; ring area18.88 m² | Four unperforated full-height bars; front bar blocks landing approach when represented |
| `LUNA-STRUCT-L01-TRANSFER-01` | Centre(0,8.2,0),37 × 0.6 × 29; X=±18.5,Z=±14.5,Y=7.9…8.5; plan1,073 m² | Catalog type `transfer-beam`, but actual geometry is a broad solid plate; constrains any future double-height ceiling |
| Floor slabs | See envelope/section schedule | Only Lift02 hole; not a fully coordinated structural floor |
| Stair structures | Ground only,3 × 4.5 × 5 each | Representative boxes, not structural stair flights |

Sources: [STRUCT] [TRANSFER] [CORE_WALL] [SLAB_HOLE]. Six columns per level are explicitly **representative**, not evidence of a complete engineered frame. Ground/B1 columns align; Ground→L01 offsets are1.5 m inX at outer columns and1.5 m inZ; L01→L02 outer columns step1 m inX. No complete transfer/load-path model resolves all offsets. No separate conventional beam grid is defined for these two floors.

The core ring plus two protected stair footprints occupy **141.1 m² of bounding/exclusion footprint** (102.6+2×19.25); do not add the internal lift/riser boxes again. Ring wall material footprint itself is18.88 m². These are different area concepts, not a usable-floor deduction. The gallery rectangle overlaps the ring and shafts. [C] [CORE_WALL]

## 12. MEP, ceiling and operational constraints

Ground owns **11 operational records**, including four lifts. L01 owns **zero** in the current operational catalog. This does not mean no systems should be designed; it means they must not be invented as existing equipment. Asset mount points are distinct from full mesh bounds. [ASSETS] [ASSET_RENDER] [STORM]

| Ground asset | World mount X,Y,Z | Current classification / relationship |
|---|---|---|
| `LUNA-GROUND-FIRE-DET-01` | 16,2.3,13 | Observable detector; parent `LUNA-B1-FIRE-PANEL-01` |
| `LUNA-LIFT-PASS-01` | −3,0,2.3 | Controllable canonical lift; catalogue mount, not shaft centre |
| `LUNA-LIFT-PASS-02` | 0,0,2.3 | Same distinction |
| `LUNA-LIFT-PASS-03` | 3,0,2.3 | Same distinction |
| `LUNA-LIFT-SERVICE-01` | 6.5,0,2.3 | Controllable service/fire lift; no certified fire performance implied |
| `LUNA-GROUND-SEC-CAM-01` | 0,2.6,15 | Observable entrance CCTV |
| `LUNA-GROUND-LOBBY-CAM-01` | 0,2.6,3 | Observable; above decorative ceiling height, at feature-wall/lobby boundary |
| `LUNA-GROUND-ACCESS-MAIN-01` | 0,0.2,16 | Observable access point; animated door base isY=0 |
| `LUNA-GROUND-ACCESS-LIFT-LOBBY-01` | 9,0.2,−4.5 | Observable, uninstrumented; X is0.3 beyond current gallery edge |
| `LUNA-GROUND-NET-WIFI-AP-01` | −16,2.4,13 | Observable; parent `LUNA-B1-NET-GATEWAY-01`; outside Waiting Lounge footprint |
| `LUNA-SITE-STORM-DISCHARGE-01` | 12,0,16 | Asset-only storm interface; not a formed drain/channel |

Table sources: first ten [ASSETS], final [STORM]. All are reference/simulated definitions, not claims of installed/live devices.

| Continuous system | Canonical riser | X,Z / renderer section | Relationship |
|---|---|---|---|
| Electrical | `LUNA-RISER-ELECTRICAL-01` | −8,−0.6 /0.3 × 0.16 | Parent B1 MDB |
| Water | `LUNA-RISER-WATER-01` | −8,−0.2 /radius0.16 | Parent B1 booster pump |
| Drainage | `LUNA-RISER-DRAINAGE-01` | −8,0.2 /radius0.16 | Parent B1 main drainage |
| Fire | `LUNA-RISER-FIRE-01` | −8,0.6 /radius0.16 | Parent B1 fire pump |
| Network | `LUNA-RISER-NETWORK-01` | −8,1 /radius0.16 | Parent B1 network gateway; exceeds representative shaftZ edge by0.36 |

All five extendY=−4…52.25. Each has a sleeve marker at GroundY=0 and L01Y=5, at the sameX/Z, refs `LUNA-SLEEVE-GROUND-{SYSTEM}-01` and `LUNA-SLEEVE-L01-AMENITIES-{SYSTEM}-01` (`NETWORK-EDGE` suffix for network). **Markers are not slab cuts.** Exact IDs and positions are enumerated in JSON. [RISERS] [RISER_RENDER] [RISER_SHAPE] [SLEEVES] [SLAB_HOLE]

L01 has two source-backed concealed-service volumes: Pool/Lounge `-SERVICE-VOID`, centres(±14.5,7.75,0), size8.46 × 0.7 × 15.04, Y=7.4…8.1. Their `-ACCESS-PANEL` centres are(±14.5,7.38,0), each0.6 × 0.02 × 0.6. They are representative spaces/panels, not completed duct layouts. Ground Reception/Lifts carry `serviceVoid:true`, but the specialized GrandLobby renderer does not create those generic boxes/panels. [LAYER] [MOUNT] [MEP_RENDER]

Ground ceiling decoration comprises14 downlights (Reception4, Waiting Lounge4, Lift Lobby6), three four-sided linear-light seams and one reception pendant. Downlights are0.16 × 0.02 × 0.16 atY=2.38…2.4. They use emissive presentation materials, not individual controllable lighting assets. [CEIL]

**NOT CURRENTLY DEFINED for these floors:** floor HVAC equipment/duct branches/diffusers, common thermostats, coordinated sprinkler branches/heads, emergency-light layout, common lighting circuits, dedicated ICT/electrical rooms, domestic-water/drainage room branches, pool plant, drains and changing/WC fixtures. Existing vertical risers and distant whole-building plant do not establish these missing floor installations. `LevelOperationalLayer` creates plant runs for B1 and storm runs for Roof, not Ground/L01 distribution. [ASSET_RENDER]

## 13. Ground circulation and bottlenecks

The implemented logical route is:

```text
LUNA-EXTERIOR-ENTRANCE-PLAZA
  -- animated MAIN entrance, access NONE --> LUNA-GROUND-LOBBY
  -- graph common-area adjacency --> LUNA-GROUND
  -- lift boarding relationship --> PASS-01 / PASS-02 / PASS-03 / SERVICE-01
```

Reception/Waiting Lounge/Lift Lobby remain zones of the same interior; there is no registered sequence of measured corridors between them. The two Ground stair doors connect the aggregate lobby to the two stair refs as **static boundaries**. A separate `SERVICE ENTRY → SERVICE CORRIDOR → SERVICE/FIRE LIFT` route is **NOT CURRENTLY DEFINED on Ground**. B1 has a service-access asset, not evidence of a Ground service door. [MODEL] [MODEL_BUILD] [GRAPH] [ROUTE] [ACCESS]

| Measurement | Exact result | Interpretation |
|---|---:|---|
| Entrance clear width at full opening | 3.312 | Leaf-derived, not nominal3.6 [SLIDING] |
| EntranceZ16 → Reception frontZ9 | 7 | Straight plan separation [ENTRY] [ROOMS] |
| Entrance → Reception centreZ6 | 10 | Not a collision-checked route |
| Entrance → existing desk frontZ5.35 / centreZ5 | 10.65 / 11 | Desk exists already [LOBBY] [FURNITURE] |
| Entrance → Lift02 doorZ1.43 | 14.57 | Straight axis, currently obstructed [ENTRY] [LIFT_RENDER] |
| Entrance → P01/P03 door | √(14.57²+3²) | Straight diagonal, not routed distance |
| Entrance → service door | √(14.57²+6.5²) | Same limitation |
| Reception/Lift Lobby shared semantic edge | 12.1 | X=−5.1…7 atZ3; feature wall affects use [ROOMS] [GALLERY] |
| Feature-wall right endX5.95 → Reception rightX7 | 1.05 | Nominal within-zone bypass width, not validated clear route [LOBBY] |
| Waiting Lounge → gallery X gap | 4.9 | X=−10…−5.1; unallocated, contains core/riser constraints nearZ0 |
| Ground column centre spacing | 19 along half front/rear row;28 between front/rear | Clear face spacings18.5/27.5, not a full corridor grid [STRUCT] |

The minimum **registered corridor width is unknown**, because corridors are not bounded. The1.05 m potential reception-wall bypass and1.57 m nominal landing apron cannot be marketed as coordinated accessible circulation. The entrance path physically intersects a structural reference column; reception furniture and the front core wall interrupt a straight journey to the lift. No collision/runtime changes were made.

## 14. L01 circulation and future-void consequences

Current graph topology is `Lift → L01 → Pool/Lounge`, with stair-to-level edges. The actual room openings face−Z atZ=−8, while lift portals face+Z atZ=1.43. A physical path has to go around the core and reach those back-side room openings; the graph's adjacency is not that authored path. [GRAPH] [ROOM_RENDER] [LIFT_RENDER]

The gross central band between room boundaries is20 m wide (X=−10…10), but the core outerX=−9.8…9.2 leaves only **0.2 m west / 0.8 m east** at that crossing. Including room wall thickness, outside-wall-to-core gaps are **0.14 / 0.74 m**. Those slots are not a convincing primary passenger route. Room-to-floor-edge strips are1 m nominal/0.94 beyond wall faces. Front and rear bands between room endsZ=±8 and level edges±15 are7 m gross; columns and stairs interrupt the front band. [ROOMS] [ROOM_RENDER] [CORE_WALL] [P] [STRUCT]

A void over Reception would remove X=±7,Z=3…9 from L01's unallocated central/front area. Only0.3 m remains between void's rear edgeZ3 and core frontZ2.7, so it **cannot** be assumed to provide a continuous gallery directly along the lift bank. East/west edge routes, lift discharge, both protected stair approaches, guards and room access would require deliberate coordination. Existing stair/amenity overlaps already undermine those routes. No statement of compliant egress or feasible resident circulation is justified yet.

## 15. Double-height feasibility — study only

These are analysis rectangles, not new canonical IDs or proposed approved dimensions. Rank considers geometry only. Structural capacity, reinforcement, compartmentation and smoke control remain unknown.

| Candidate / rank | X/Z extents; dimensions | Ground / L01 area affected | Consequences |
|---|---|---:|---|
| **Existing Reception — BEST FIT** | X−7…7,Z3…9;14 × 6 | 84 /84 m² | No registered L01 Pool/Lounge area removed; avoids columns/core/stairs in plan. Cut L01 structural slab, remove corresponding Ground roof/L01 massing floor, coordinate existing ceiling/pendant/feature wall, establish guarded overlook and circulation. Core-to-edge gap0.3 is not a passage. |
| **Reception extended toward front — POSSIBLE** | X−7…7,Z3…12.25;14 × 9.25 |129.5 /129.5 m² | Terminates at nearest L01 centre-column faceZ12.25 with **zero allowance**. This is a limiting envelope, not a usable design size. New guard/finish/circulation setbacks must reduce it. Ground columnZ14 remains unresolved. |
| **Front approach apron — POOR FIT** | X−7…7,Z9…15;14 × 6 |84 /84 m² | Intersects Ground column(0,14) and L01 column(0,12.5); cannot become a column-free grand volume through visual treatment. |
| **Waiting Lounge — POOR FIT** | X−20…−10,Z−7…3;10 × 10 |100 /100 m² gross | Overlaps90 m² of L01 Pool. Only96 m² lies inside L01 structural slab (west edge−19.6); off entrance axis and requires amenity/basin redesign. |
| **Core / current gallery centre — NOT FEASIBLE under preservation constraint** | Core outerX−9.8…9.2,Z±2.7;19 × 5.4 |102.6 /102.6 m² | Contains lift shafts, risers and enclosing structure; cannot be converted into an open atrium while preserving them. |

Sources/derivation: [ROOMS] [STRUCT] [TRANSFER] [CORE_WALL] [ENTRY]. Existing Reception extent is source-defined; extension/front-apron envelopes are explicit audit calculations.

For the best-fit zone, the existing transfer underside atY=7.9 would limit a hypothetical combined volume to **7.74 m above Ground shell floor0.16** (or7.55 m above structural slab top0.35). The gross Ground+L01 datums total8.5 m; **8.5 is not achievable clear height under the existing transfer**. These are conditional dimensions only, after removal/cutting of separating geometry. The current ceiling remains2.21/2.08 m.

Visible engineering consequences for every cut include: interrupted slab continuity, missing engineered edge support, potential relocation of decorative ceiling/lights, maintaining the five riser paths and future branch routes, lift-landing discharge, preserving two egress stairs, new guarding/compartmentation and unresolved smoke strategy. No certified service layout establishes that a candidate is free of future MEP. No equipment, slab or route was moved.

## 16. Human-scale readiness

The3.312 m full entrance opening has useful gross width, but the floor/threshold levels are contradictory. Ground lobby field2.21/soffit2.08 m and the1.26 m pendant clearance do not support the intended tall residential arrival. L01 rooms are2.29 m clear; their1 m door gaps have no detailed heads/leaves. Gallery138 m² must not be mistaken for usable passenger standing space. The core wall in front of doors and missing slab penetrations are coordination blockers before finishes. [SLIDING] [CEIL] [SHELL] [ROOM_RENDER] [CORE_WALL] [SLAB_HOLE]

Stair approach clearance, separated service-route width, wheelchair turning areas, evacuation capacity and maintenance clearances are not source-defined. The geometric numbers above are not substitutes for those requirements. No particular regulatory standard has been assumed.

## 17. Architectural surface inventory for future finishing

“Safe finish” means a later material/texture treatment of the same mesh without changing extents, openings, picking, semantic refs, access, clipping or opacity/policy behavior. It does not authorize implementation now. Material factory names are reported instead of inventing real-world product specifications.

| Ground surface | Dimensions / geometry | Current material | Significance / future treatment |
|---|---|---|---|
| Entire shell floor / roof |44 × 34 ×0.16 each;floor0…0.16,roof4.84…5 | `exteriorMaterials.limestone` | Envelope significant; finish-only possible, layered-floor conflict must stay disclosed [SHELL] |
| Lobby zone floors |14 ×6;10 ×10;13.8 ×10, thickness0.06 | `lobbyFloorStone` (#ddd4c2) | Canonical zone picking; finish-only safe if binding retained [LOBBY] [MATERIALS] |
| Ground side/rear shell walls |Two34 ×5 ×0.16;rear44 ×5 ×0.16 | limestone | Preserve envelope; no new opening implied [SHELL] |
| Front opaque shell |Two1.76 ×5 piers;40.48 ×0.7 head; split0.2-high plinth | limestone | Preserve existing entrance/glass cutouts [SHELL] |
| Reception feature wall |11.9 ×2.4 ×0.18, centre(0,1.2,3.1) | `receptionFeatureWall` (#a89478) | Existing visual wall, circulation obstruction; material-only safe, moving requires coordination [LOBBY] [MATERIALS] |
| Reception desk |4 ×1.1 ×0.7; lip3.6 ×0.06 ×0.7; backpanel3.84 ×1.6 ×0.15 | `furnitureStone` | Existing representation, not new concierge capability; retain approach clearances [LOBBY] [FURNITURE] |
| Lobby ceiling fields |11.8 ×3.8;7.8 ×7.8;11.6 ×7.8, thickness0.06 atY2.4 | `ceilingFeature` | Decorative, low; changing height is a visual-geometry coordination task [CEIL] |
| Perimeter soffits |1.1-wide bands,0.16 drop around each zone;areas39.16,39.16,47.52 m² | `ceilingSoffit` | Same caution; preserve lighting/camera clearances [CEIL] |
| Ground columns |Six0.5 ×5 ×0.5; four-face area10 m² each | `basementConcrete` in structure view | Canonical structure: only finish overlay preserving size/policy; no concealment of conflict [STRUCT] |
| Front decorative posts / glass |§8 | dark aluminium / lobby glass / bronze frame details | Visual finish possible; do not claim canonical window records [GROUND_FACADE] |
| Entrance leaves / frames |§7 | lobby glass/dark aluminium family | Canonical door, animated clearance/picking must stay exact [ENTRY] [SLIDING] |
| Four lift portals |§9 | renderer metal/threshold colours | Canonical dynamic asset, not detachable decorative doors [LIFT_RENDER] |
| Two stair doors |1.05 ×2.1 leaves,0.05 thick | `furnitureWood`, dark-aluminium frame | Canonical static boundaries; cannot obstruct or pretend actuated [LOBBY] [HINGED] |
| Core wall faces |Front/back19 m long;side inner runs4.6; Ground height5 | `basementConcrete` | Canonical structure; no covering uncoordinated portal openings [CORE_WALL] |
| Service sign |2.24 ×0.3 ×0.03 at(6.5,2,1.78) | `signagePanel` | Visual identification only [LOBBY] |
| Canopy underside/supports |§7 | timber, bronze/dark aluminium, limestone bases | Existing exterior frozen; measured only [GROUND_FACADE] |

Soffit band areas = room area − `(width−2.2)×(depth−2.2)`: Reception84−44.84=39.16; Lounge100−60.84=39.16; Lift138−90.48=47.52. [CEIL]

| L01 surface | Dimensions / geometry | Current material | Significance / future treatment |
|---|---|---|---|
| Massing floor/top/sides |40 ×30 bottom/top;3.5-high exterior box; no wall thickness | `amenityStone` | Semantic level shell, opaque backing; making openings is more than a finish [MASS] [MASS_MAT] |
| Pool room floor |9 ×16 ×0.08 atY5…5.08 | `floorWet` (#7fa9b0) | Canonical room floor; basin not formed [ROOM_RENDER] [MATERIALS] |
| Lounge room floor |9 ×16 ×0.08 | `floorLiving` (#c9b79a) | Canonical room floor [ROOM_RENDER] [MATERIALS] |
| Room walls |Each2×16 runs, 9 rear/front split by1 m gap;49 m total centre-line run×2.4h;0.12 thick | `interiorWall` (#efe9dd) | Keep room/door boundaries; stair overlap unresolved [ROOM_RENDER] |
| Two room ceilings |9 ×16 ×0.06 each;underside7.37 | cloned `interiorWall` | Preserve engineering reveal, room focus, clearances [ROOM_RENDER] |
| Ceiling access panels |Two0.6 ×0.02 ×0.6 atY7.38 | MEP AccessPanel material | Maintain maintenance access and Engineering visibility [LAYER] [MEP_RENDER] |
| Structural columns |Six0.5 ×3.5 ×0.5;four-face area7 m² each | `basementConcrete` | Canonical; no moves [STRUCT] |
| Structural slab / transfer underside |39.2 ×29.4 with3×3hole /37 ×29 broad plate | `basementConcrete` | Canonical structural extents; any atrium requires change [STRUCT] [SLAB_HOLE] [TRANSFER] |
| Core / lift portals |Same X/Z as Ground, shifted landing datum5 | Existing core/lift materials | Preserve vertical interfaces [CORE_WALL] [LIFT_RENDER] |
| Front/rear glass / timber rhythm |§8 | exterior glazing/metal; timber screen | Visual only over opaque shell, not current interior openings [L01_FACADE] |
| Front ledge / planters |28 ×2.2 ledge;3 planters1.3 ×0.6 ×1.32 atX−12.8,0,12.8,Z17.3 | balcony slab / PlanterFinish | Not accessible canonical terrace;0.4gap/0.36overhang unresolved [L01_FACADE] |
| Pool and lounge objects |Existing6×12 pool box, two loungers, seating/rug/lamp | Generic `furnitureWood` renderer | Reference geometry only, not final fixtures/equipment [ROOMS] [LAYER] [FURNITURE] |

No independent Ground/L01 skirting, shadow-gap profile, wall service panel schedule or wayfinding zone polygon is defined. Material-level treatment of existing surfaces is the safe future scope; additions requiring clearance/egress/maintenance assumptions need design decisions first.

## 18. Current versus intended programme matrix

| Design element | Currently exists? | Canonical? | Visual-only aspect | Geometry change required for intended concept? | Safe to add later? |
|---|---|---|---|---|---|
| Grand Lobby | Ground Lobby with3 zones | Yes, aggregate + zone refs | Specialized open-plan rendering | For truly grand/double-height form: yes | Finish existing surfaces first; new form needs decision |
| Reception | Existing84 m² zone +desk | Zone yes;desk not operational asset | Desk/backdrop | No for materials; yes for changed layout | Preserve zone/routes |
| Concierge | No separate function/space | No | Could reuse reception meaning only after decision | New programme/position if separate | Not implicitly authorized |
| Main Lounge | Waiting Lounge100 m² | Yes | Seating | No for existing finish | Yes, within preserved footprint/clearance |
| Secondary Lounge | N | No | None | Needs allocation | Decision required |
| Double-height volume | No | No | Tall exterior impression only | **Yes, structural slab and shells** | Not finish-only |
| L01 overlook | No | No | Exterior ledge is unrelated | Void/guard/circulation needed | Decision required |
| Passenger Lift Gallery |138 m² zone wraps shafts | Yes | Ceiling/floor zone | Real clear gallery requires coordination | Finish-only cannot solve walls/shafts |
| Resident access threshold | Observable main/lift access refs | Asset refs yes | Door main animated; no governed common lock | Controlled boundary/actuator integration if required | Not fake reader/unlock UI |
| Mail/Parcel | N | No | None | Needs room/allocation | Decision required |
| Management office | N | No | None | Needs room/allocation | Decision required |
| Guest WC | N on either floor | No | None | Needs room/plumbing/drainage | Decision required |
| Separated service route | No Ground/L01 corridor | Service lift yes | Sign only | Needs real circulation/access design | Decision required |
| L01 Residents' Lounge |144 m² Lounge | Yes | Existing seating | Stair conflict before accepted layout | Materials possible, conflict not solved |
| L01 amenity rooms |Pool +Lounge only | Yes | Pool is shallow box | Pool/stair/MEP coordination required | No invented gym/wellness/business rooms |
| Terrace |Front ledge only | No terrace space | Yes | Access/guard/support/connection needed | Cannot call it usable terrace yet |

Existence sources: [ROOMS] [MODEL_BUILD] [ASSETS] [ACCESS] [L01_FACADE]. “Safe later” is scope guidance for a separate phase, not implementation performed here.

## 19. Topology diagrams — not to scale

Coordinates and boundary schedules above take precedence over ASCII. `C` is a structural column; `R` the representative riser; `P1/P2/P3/S` the four shafts. Arrows show named/logical connections, not collision-free routes.

```text
GROUND 44 X 34                       -Z rear = -17
X=-22  +---------------------------------------------------+ X=22
       | C(-19,-14)       C(0,-14)          C(19,-14)        |
       |                                                   |
 Z=-7  | +Waiting Lounge+  +--- Lift Lobby x=-5.1..8.7 ---+ |
       | | x=-20..-10   |  |                               | |
 Z=0   | |              | R| P1   P2   P3     S            | |
       | +--------------+  | doors face +Z at1.43         | |
 Z=2.7 |         [core front wall across lift approaches]   |
 Z=3   |                    +Reception x=-7..7-------------|
       |                    | wall at3.1;desk at5           |
 Z=6.25|   stair01 door      |                    stair02 door
 Z=9   | [STAIR01 x=-14]     +Reception end9    [STAIR02 x=14]
 Z=11.75  stair ends                                 stair ends
 Z=14  | C(-19,14)        C(0,14) !!entry axis  C(19,14)    |
 Z=16  |                 MAIN sliding door                  |
 Z=17  +---------------- front shell/glazing ----------------+
 Z=18            canopy rear edge (not at shell)
 Z=22                exterior approach (0,22)
 Z=27            canopy front edge / vehicle arrival
                       +Z front / arrival
```

```text
L01 40 X 30                         -Z rear = -15
X=-20 +---------------------------------------------------+ X=20
      | C(-17.5,-12.5)  C(0,-12.5)    C(17.5,-12.5)        |
      |           rear unallocated band                    |
Z=-8  | +-1m gap------+                    +-1m gap------+ |
      | | POOL        |                    | LOUNGE       | |
      | | x=-19..-10  | [R P1 P2 P3 S]     | x=10..19     | |
Z=0   | | 9 x16       | [core outer19x5.4] | 9 x16        | |
Z=3   | |             | [Reception study   |              | |
      | |             |  zone below only] |              | |
Z=6.25| |STAIR01 overlaps                  STAIR02 overlaps |
Z=8   | +----6.125m2--+                    +--6.125m2-----+ |
Z=9   | [STAIR01]     (no current void)        [STAIR02]    |
Z=11.75 stair ends                              stair ends |
Z=12.5| C                 C                       C         |
Z=15  +-------------- opaque massing front ----------------+
Z=15.4          visual ledge begins after0.4 gap
Z=17.6          ledge ends; no canonical access/overlook
```

```text
Y=11.75  next datum above L02
         L02 datum8.5; floor slab8.5..8.85; FTF3.25
Y=8.50   =================== L02 datum ===================
Y=7.90   [ L01 transfer plate7.9..8.5, no holes ]
Y=7.37   L01 room ceiling underside; service box7.4..8.1
         Pool      core/lifts/stairs      Lounge
         NO ATRIUM / NO MEZZANINE / NO OVERLOOK
Y=5.35   ------ L01 structural slab top ------------------
Y=5.00   ====== L01 datum; slab5..5.35; Lift02 hole only ==
Y=4.84   ------ full Ground shell roof underside ---------
Y=2.37   Ground lobby field underside (soffits2.24)
Y=1.42   Reception pendant bottom
Y=0.35   Ground structural slab top (mode-dependent view)
Y=0.16   Ground opaque shell floor top; zone floors0.06
Y=0.00   ===== Ground datum; structural slab0..0.35 =======
         B1 to Ground: lift stops-4 ->0;
         stairs have logical connectivity, no full flights
Y=-3.65  B1 structural slab top
Y=-4.00  ===== B1 datum; slab-4..-3.65 ====================
```

## 20. Conflict / decision register

No issue below was fixed. The known L06 ingestion issue remains outside this audit and was not retested or used to explain any Ground/L01 finding.

### A. Existing geometry defects

- **D01:** overlapping shell/room/structural floors and buried entrance threshold.
- **D02:** reception pendant1.26 m above currently highest opaque architectural floor surface.
- **D06:** L01 Pool and Lounge each overlap protected stairs6.125 m², contrary to the registry clearance comment.
- **D07:** pool below floor with no formed basin.
- **D10:** entrance transition assigns GroundLobby at a point1 m outside its bounding rectangle.

### B. Architectural coordination issues

- **D03–D05:** entrance-axis column, unperforated core wall, incomplete lift/stair/riser penetrations including transfer and visual skins.
- **D08–D09:** L01 service-void/transfer overlap and external glazing backed by opaque massing.
- **D11–D13:** desk/feature-wall obstruction, waiting camera at desk footprint, stale access/camera positions and network run outside representative shaft.
- **D15–D17:** L01 resident lift admission mismatch, unattached/noncanonical terrace impression and incomplete canopy-to-podium connection.
- **D19:** static-source cross-level Explore awareness risk; no interactive reproduction claimed.
- **D20:** shifting representative column grids without a complete load path.

### C. Missing source information

- **D14/D18:** stair flights/landings/egress discharge; measured common/service routes; proper walkable corridor polygons.
- Wall-clear usable areas, final floor/ceiling build-ups, structural reinforcement and transfer/load capacities.
- Ground/L01 operational lighting, HVAC/ventilation, sprinkler/smoke design, wet-service branches, pool plant and sanitary programme.
- Interior-side L01 window openings, accessible terrace boundary/guarding, common security threshold/actuator design.
- Fire ratings, smoke/atrium strategy, occupancy loads and access/maintenance clearance requirements.

### D. Design decisions required before implementation

1. Adopt a coordinated finished-floor/slab convention; retain current coordinates until separately approved.
2. Confirm whether to pursue any true double-height opening and commission/define the structural/egress implications.
3. Resolve the entrance column and actual passenger-gallery route, without changing identities or hiding structure to imply resolution.
4. Reconcile Pool/Lounge versus protected stairs and pool basin/plant requirements.
5. Decide programme allocation for concierge, parcels, management, WC and separate service circulation, rather than naming leftover floor as rooms.
6. Define L01 resident stop entitlement through existing authorization, not a visual permission bypass.
7. Resolve ceiling/service zones, registered openings and required access clearances before detailed finishes.

### E. Safe visual-only work for a later authorized phase

Material/texture/light-response refinement of existing floors, walls, ceilings, frames, existing desk/seating and portal surfaces, keeping every geometry extent, semantic binding, interaction, clipping and authorization projection intact. Sign/text refinements can use existing sign surfaces without inventing operational access. **No such work was performed.** Low ceilings, stair conflicts and opaque glazing backing will remain unresolved by material changes alone.

### F. Changes requiring canonical/spatial geometry coordination

Any L01 slab cut; change to structural columns/core/transfer; new mezzanine/overlook; changed floor datums; stair or lift openings; relocated room envelopes; new service corridor/entrance; a real pool basin; canonical exterior windows; new sanitary rooms; changed door/access boundary; navigation boundary amendments. Some current visual-skin edits are renderer-only, but making them represent a new habitable volume still requires coordinated semantic/structural decisions.

The JSON contains the complete D01–D20 register with individual source references and `fixed:false` for every item.

## 21. Verification and handoff

This audit evaluated current executable measurements and cross-checked named objects in the local live scene, including Ground envelope, entrance, stair doors, slabs, transfer, core and lift landing groups. It did not invoke commands, move the camera, change persisted runtime, run migrations or contact production/cloud services. Empty status groups have no geometry; their null serialized bounds are not missing building meshes.

Validation for this documentation task consists of JSON parsing, formula/source-reference checks, and byte-for-byte preservation of the inherited tracked/untracked working files. **Verification result: 81 audit checks passed; all 932 inherited tracked/untracked files remain byte-for-byte identical. Only the two requested audit deliverables were added.**

Application build/lint/browser regression suites were intentionally not rerun because this is a no-implementation audit and several existing suites write artifacts. Previous exterior test results are not reclassified or claimed as new results.

**Next phase input:** the existing Reception rectangle is the best geometric study location, but a genuine two-storey Grand Arrival is an explicit architectural/structural change. The current common-area model requires floor, core, entrance, stair, circulation and service coordination before photoreal finishes can make it believable. This audit stops here.

## Source register

Every bracketed source key above resolves below. Line ranges refer to this audited working-tree revision; JSON includes source SHA-256 values. Arithmetic tables cite all source inputs and distinguish renderer dimensions from canonical records.

- **[P]** [src/luna/lunaProgramme.ts:16](../src/luna/lunaProgramme.ts#L16) — lines 16–68; `LUNA_FOOTPRINT / LEVEL_SPECS / buildLevels`.
- **[C]** [src/luna/lunaProgramme.ts:173](../src/luna/lunaProgramme.ts#L173) — lines 173–181; `LUNA_CORES`.
- **[ROOMS]** [src/luna/interiors/lunaInteriors.ts:366](../src/luna/interiors/lunaInteriors.ts#L366) — lines 366–416; `LUNA_GROUND_LOBBY / LUNA_L01_CLUB`.
- **[GALLERY]** [src/luna/architecture/groundLobbyLayout.ts:18](../src/luna/architecture/groundLobbyLayout.ts#L18) — lines 18–56; `GROUND_LIFT_LOBBY_LAYOUT / GROUND_LIFT_LOBBY_MARGIN`.
- **[MOUNT]** [src/luna/LunaLevel.tsx:104](../src/luna/LunaLevel.tsx#L104) — lines 104–118; `LevelMassing visual / GrandLobbyArchitecture / InteriorLayer`.
- **[MASS]** [src/engine/components/LevelMassing.tsx:48](../src/engine/components/LevelMassing.tsx#L48) — lines 48–98; `restY / BoxGeometry / visual override`.
- **[SHELL]** [src/luna/exterior/GroundExteriorEnvelope.tsx:19](../src/luna/exterior/GroundExteriorEnvelope.tsx#L19) — lines 19–46; `GroundExteriorEnvelope / t=.16`.
- **[LOBBY]** [src/luna/architecture/GrandLobbyArchitecture.tsx:39](../src/luna/architecture/GrandLobbyArchitecture.tsx#L39) — lines 39–152; `ROOM_HEIGHT / LobbyZone / furniture / stair doors`.
- **[CEIL]** [src/luna/architecture/GrandLobbyCeiling.tsx:31](../src/luna/architecture/GrandLobbyCeiling.tsx#L31) — lines 31–115; `SOFFIT_DROP / SOFFIT_BAND / field / downlights / pendant`.
- **[LAYER]** [src/luna/InteriorLayer.tsx:14](../src/luna/InteriorLayer.tsx#L14) — lines 14–99; `WALL_HEIGHT / SLAB_CLEARANCE / ServiceZone / RoomWithMaterials`.
- **[ROOM_RENDER]** [src/engine/components/InteriorRoom.tsx:73](../src/engine/components/InteriorRoom.tsx#L73) — lines 73–238; `WALL_THICKNESS / default opening / floor / wall / ceiling`.
- **[STRUCT]** [src/luna/structure/lunaStructuralElements.ts:20](../src/luna/structure/lunaStructuralElements.ts#L20) — lines 20–90; `slabFor / perimeterColumnsFor / SLAB_THICKNESS / COLUMN_SIZE`.
- **[TRANSFER]** [src/luna/structure/lunaStructuralElements.ts:121](../src/luna/structure/lunaStructuralElements.ts#L121) — lines 121–185; `TRANSFER / STAIRS / LUNA_STRUCTURAL_CORE_WALL`.
- **[SLAB_HOLE]** [src/luna/structure/LunaStructuralLayer.tsx:25](../src/luna/structure/LunaStructuralLayer.tsx#L25) — lines 25–55; `slabVisuals / Sleeve markers`.
- **[CORE_WALL]** [src/engine/components/StructuralCoreWall.tsx:50](../src/engine/components/StructuralCoreWall.tsx#L50) — lines 50–67; `four wall bars / revealFront`.
- **[CORE_RENDER]** [src/engine/components/CoreShaft.tsx:26](../src/engine/components/CoreShaft.tsx#L26) — lines 26–48; `CoreShaft box representation`.
- **[ENTRY]** [src/luna/architecture/GroundEntrance.tsx:39](../src/luna/architecture/GroundEntrance.tsx#L39) — lines 39–97; `GROUND_ENTRANCE_* / frame / side glass`.
- **[SLIDING]** [src/engine/components/SlidingGlassDoor.tsx:32](../src/engine/components/SlidingGlassDoor.tsx#L32) — lines 32–116; `leafWidth / slideDistance / frame / threshold`.
- **[HINGED]** [src/engine/components/HingedDoor.tsx:13](../src/engine/components/HingedDoor.tsx#L13) — lines 13–100; `hinge / leaf / frame / opening animation`.
- **[GROUND_FACADE]** [src/luna/LevelFacade.tsx:321](../src/luna/LevelFacade.tsx#L321) — lines 321–420; `GroundFacade`.
- **[L01_FACADE]** [src/luna/LevelFacade.tsx:428](../src/luna/LevelFacade.tsx#L428) — lines 428–482; `AmenityFacade`.
- **[LIFT]** [src/luna/lift/lunaLift.ts:26](../src/luna/lift/lunaLift.ts#L26) — lines 26–77; `LIFT_DEFINITIONS / LIFT_STOPS / liftCamera / interfaces`.
- **[LIFT_RENDER]** [src/luna/lift/DynamicLift.tsx:24](../src/luna/lift/DynamicLift.tsx#L24) — lines 24–104; `Doors / DynamicLift / car / shaft / landing anchors`.
- **[PASSENGER]** [src/luna/runtime/lunaPassengerAccess.ts:4](../src/luna/runtime/lunaPassengerAccess.ts#L4) — lines 4–7; `passengerStopAllowed`.
- **[POLICY]** [src/luna/policy/lunaRepresentationPolicy.ts:35](../src/luna/policy/lunaRepresentationPolicy.ts#L35) — lines 35–104; `resolveAssetMode / resolveLevelMode / resolveMode`.
- **[ACCESS]** [src/luna/runtime/lunaAccessResolver.ts:40](../src/luna/runtime/lunaAccessResolver.ts#L40) — lines 40–56; `ACCESS_POINT_REFS / instrumented state`.
- **[TRANSITION]** [src/luna/transitions/lunaTransitions.ts:21](../src/luna/transitions/lunaTransitions.ts#L21) — lines 21–55; `LUNA_MAIN_ENTRANCE_TRANSITION`.
- **[ROUTE]** [src/luna/transitions/lunaRouteTransitions.ts:20](../src/luna/transitions/lunaRouteTransitions.ts#L20) — lines 20–50; `lift / stair / passage bindings`.
- **[MODEL]** [src/luna/ingestion/lunaSpatialModel.ts:155](../src/luna/ingestion/lunaSpatialModel.ts#L155) — lines 155–217; `buildDoors / buildGroundLobby`.
- **[MODEL_BUILD]** [src/luna/ingestion/lunaSpatialModel.ts:311](../src/luna/ingestion/lunaSpatialModel.ts#L311) — lines 311–324; `buildLunaReferenceModel`.
- **[GRAPH]** [src/engine/spatial/navigationGraph.ts:68](../src/engine/spatial/navigationGraph.ts#L68) — lines 68–95; `lift / stair / common-area adjacency`.
- **[PLANS]** [src/luna/policy/lunaFloorPlans.ts:231](../src/luna/policy/lunaFloorPlans.ts#L231) — lines 231–245; `Ground and L01 room/core plan derivation`.
- **[EXPLORE]** [src/luna/explore/lunaExploreAwareness.ts:11](../src/luna/explore/lunaExploreAwareness.ts#L11) — lines 11–68; `resolveLunaExploreSpace / lunaExploreBounds`.
- **[ASSETS]** [src/luna/operational/lunaOperationalAssets.ts:262](../src/luna/operational/lunaOperationalAssets.ts#L262) — lines 262–495; `Ground fire / lifts / cameras / access / Wi-Fi records`.
- **[ASSET_RENDER]** [src/luna/operational/OperationalAssetLayer.tsx:355](../src/luna/operational/OperationalAssetLayer.tsx#L355) — lines 355–375; `LevelOperationalLayer floor offset / representative runs`.
- **[RISERS]** [src/luna/operational/lunaMepBackbone.ts:56](../src/luna/operational/lunaMepBackbone.ts#L56) — lines 56–126; `RISERS`.
- **[STORM]** [src/luna/operational/lunaMepBackbone.ts:644](../src/luna/operational/lunaMepBackbone.ts#L644) — lines 644–654; `LUNA-SITE-STORM-DISCHARGE-01`.
- **[RISER_RENDER]** [src/luna/operational/LunaRiserShafts.tsx:29](../src/luna/operational/LunaRiserShafts.tsx#L29) — lines 29–44; `full-height RISERS rendering`.
- **[RISER_SHAPE]** [src/engine/components/RiserShaft.tsx:43](../src/engine/components/RiserShaft.tsx#L43) — lines 43–50; `duct and round dimensions`.
- **[SLEEVES]** [src/luna/structure/lunaMepSleeves.ts:1](../src/luna/structure/lunaMepSleeves.ts#L1) — lines 1–40; `LUNA_MEP_SLEEVES`.
- **[MEP_RENDER]** [src/engine/components/MepComponents.tsx:263](../src/engine/components/MepComponents.tsx#L263) — lines 263–325; `AccessPanel / ServiceZone`.
- **[FURNITURE]** [src/luna/interiors/furniture.ts:85](../src/luna/interiors/furniture.ts#L85) — lines 85–160; `pool / loungers / receptionDesk / loungeSeating`.
- **[MATERIALS]** [src/luna/lunaMaterials.ts:215](../src/luna/lunaMaterials.ts#L215) — lines 215–291; `interior floors / wall / furniture / lobby materials`.
- **[MASS_MAT]** [src/luna/lunaMaterials.ts:25](../src/luna/lunaMaterials.ts#L25) — lines 25–40; `amenityStone / basementConcrete`.
