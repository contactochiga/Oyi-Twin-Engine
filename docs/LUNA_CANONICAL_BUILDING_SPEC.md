LUNA — CANONICAL BUILDING SPECIFICATION

Revision 1 • 9 September 2026 • **Programme baseline and coordination brief, not construction approval.**

This locks the user-approved digital-building programme and identifies what still needs architectural resolution. It does not promote procedural geometry into architectural truth. No application code, loader, policy or runtime behavior changes accompany this specification.

**Authority and evidence**

Four statuses must travel with future data: (1) user-programme-locked target, (2) existing stable local canonical reference, (3) procedural/conceptual engineering representation, and (4) **DESIGN DECISION REQUIRED**. “Canonical” means identity in the Oyi model, not proof of an installed object or approved drawing. Backend provenance comments conflict for premium/interior records; no backend was queried to resolve them.

Primary repo evidence: [lunaProgramme.ts](/Users/ochigaidoko/Oyi-Twin-Engine/src/luna/lunaProgramme.ts), [lunaResidentialUnits.ts](/Users/ochigaidoko/Oyi-Twin-Engine/src/luna/lunaResidentialUnits.ts), [lunaInteriors.ts](/Users/ochigaidoko/Oyi-Twin-Engine/src/luna/interiors/lunaInteriors.ts), [lunaFloorPlans.ts](/Users/ochigaidoko/Oyi-Twin-Engine/src/luna/policy/lunaFloorPlans.ts), [LUNA_ARCHITECTURAL_ASSET_MIGRATION.md](/Users/ochigaidoko/Oyi-Twin-Engine/docs/LUNA_ARCHITECTURAL_ASSET_MIGRATION.md), and [architecture-foundation-report.md](/Users/ochigaidoko/Oyi-Twin-Engine/artifacts/architecture-foundation-report.md). The JSON sourceFiles index supplies the rest of the audited contract files.

**Locked programme**

Approximately 3,000 sqm site; approximately 36m × 28m tower footprint (1,008 sqm gross plate before any area deductions). B1 + Ground + L1 + L2–L12 + Penthouse + Roof: 16 levels. Exactly 43 target residences = 8 standard floors × 4 + 3 premium floors × 3 + 2 penthouses. Three passenger lifts, one service/fire lift, two protected stairs, and coordinated continuous service risers are required. The precise parcel, podium outline and rooftop structures are not fixed by the procedural model.

Standard floors L02–L09: A and B each have three bedrooms, three ensuites/WCs and one additional guest WC; C and D each have two bedrooms, two ensuites/WCs and one additional guest WC. All have balconies. This establishes 16 three-bedroom and 16 two-bedroom homes: 80 bedrooms and 112 toilets on standard floors. Premium and PH bedroom counts are unresolved; do not extrapolate a total-building toilet count. The one-ensuite-per-bedroom plus guest-WC rule applies to their eventual layouts too.

L10–L12 each have three larger premium homes; sizes/bedroom counts remain **DESIGN DECISION REQUIRED**. Penthouse has two signature homes at approximately 450–550 sqm each with private/semi-private arrival and large terraces; optional plunge pools remain **DESIGN DECISION REQUIRED**. Do not reduce the two-home target to fit today's placeholder.

| Floor ID | Target use / residences | Target base m | Target F–F m | Current base / F–F m |
|---|---|---:|---:|---|
| `LUNA-B1` | basement-service / 0 | -4 | 4 | -4 / 4 |
| `LUNA-GROUND` | ground-common / 0 | 0 | 5 | 0 / 5 |
| `LUNA-L01-AMENITIES` | amenity / 0 | 5 | 4.5 | 5 / 3.5 |
| `LUNA-L02` | standard-residential / 4 | 9.5 | 3.5 | 8.5 / 3.25 |
| `LUNA-L03` | standard-residential / 4 | 13 | 3.5 | 11.75 / 3.25 |
| `LUNA-L04` | standard-residential / 4 | 16.5 | 3.5 | 15 / 3.25 |
| `LUNA-L05` | standard-residential / 4 | 20 | 3.5 | 18.25 / 3.25 |
| `LUNA-L06` | standard-residential / 4 | 23.5 | 3.5 | 21.5 / 3.25 |
| `LUNA-L07` | standard-residential / 4 | 27 | 3.5 | 24.75 / 3.25 |
| `LUNA-L08` | standard-residential / 4 | 30.5 | 3.5 | 28 / 3.25 |
| `LUNA-L09` | standard-residential / 4 | 34 | 3.5 | 31.25 / 3.25 |
| `LUNA-L10` | premium-residential / 3 | 37.5 | 3.7 | 34.5 / 3.25 |
| `LUNA-L11` | premium-residential / 3 | 41.2 | 3.7 | 37.75 / 3.25 |
| `LUNA-L12` | premium-residential / 3 | 44.9 | 3.7 | 41 / 3.25 |
| `LUNA-PENTHOUSE` | signature-residential / 2 | 48.6 | 4.2 | 44.25 / 5 |
| `LUNA-ROOFTOP` | roof-common-technical / 0 | 52.8 | DESIGN DECISION REQUIRED | 49.25 / 3 |

Target elevations are derived from Ground datum 0 and the locked floor-to-floor heights. Roof finished-floor datum becomes 52.8m; rooftop structural height remains unresolved. These are target coordinates, not a silent update to existing camera/geometry anchors. Store current and target revisions separately until DD19 migration is approved.

**Current implementation differences**

- Rendered site is 62×52m = 3,224 sqm, a context envelope rather than a surveyed 3,000 sqm parcel. Current podium 44×34m, amenity 40×30m, PH 30×22m and roof 26×18m are procedural shapes, not approved allocations.
- Current standard/premium floor heights are 3.25m; L1 is 3.5m and PH 5m. Their derived elevations conflict with the target above.
- Generated residential catalog has 41 references (32 standard + 9 premium). Active residential plans/massing expose 39 (L10 deliberately shows A only); the legacy PH single-home outline brings that visible programme to 40, not 43. L10 B/C already have generated references: reuse those after registration/placement review, do not create duplicates.
- Standard generated labels say two bedrooms for all slots, but the modeled 6A interior contains three bedrooms and three bathrooms. It has no separately registered guest WC, and the grid does not certify ensuite door adjacency or compliant circulation.
- Premium A's current eight rooms contain two bedrooms/two baths despite its three-bedroom plan label. Premium bedroom counts have not been fixed by this brief.
- `LUNA-PENTHOUSE` is both the level and legacy private interior/policy subject. Keep its current meaning until an explicit migration assigns two distinct home identities and ownership. Proposed PH A/B IDs in JSON are candidates only and cannot be loaded or used for authorization. Their proposed prefix is currently owned by the legacy PH policy subject; reusing a legacy PH assignment could incorrectly encompass both new homes. DD03/DD18 must resolve that ownership before either home is introduced.
- Two 450 sqm internal penthouses already require 900 sqm before shared core/walls, exceeding the current 660 sqm PH plate. Even the approximate 1,008 sqm tower plate demands an area/terrace/core reconciliation. Area definition, setback and massing are DD03, not a renderer fix.

**Spatial allocation for every floor**

Each floor in the JSON has its own canonical level ref, target/current datums, home entries, existing room refs, space requirement records, four lift interfaces, two stair interfaces, riser continuity and access boundaries. New spaces carry null canonicalRef, null polygon and null area until approved; null is not zero and does not mean a space is omitted.

The repeated common/service schedule is mandatory as a function, not a claim that every function needs a separate room: passenger lobby; service/fire lobby; common corridor; floor electrical distribution; ICT distribution; water isolation/branch zone; soil/waste/vent access zone; fire service distribution; HVAC/extract/condensate service zone; cleaning/refuse/service provision. Reserve access from common/service circulation, keep shafts vertically coherent, and preserve both protected stair paths. Dimensions, compartmentation, clear heights and whether functions share cupboards require coordination.

| Floor | Existing room references retained | Additional functional allocations to resolve |
|---|---|---|
| `LUNA-B1` | No authored room catalog for this floor | Parking and vehicle circulation; Vehicle ramp / pedestrian segregation; Utility intake / transformer provision; Main electrical/LV room; Generator/fuel/exhaust service provision; Inverter/battery service provision; Domestic water storage/treatment/pump room; Fire water/pump provision; Fire alarm/control provision; Drainage/sump/inspection provision; Main rack / Oyi Edge room; Ventilation / mechanical service provision; Service entrance / loading/replacement route; Refuse holding / housekeeping; Maintenance tools/spares/service provision |
| `LUNA-GROUND` | `LUNA-GROUND-LOBBY-RECEPTION`, `LUNA-GROUND-LOBBY-LOUNGE`, `LUNA-GROUND-LOBBY-LIFTS` | Main / resident entry and reception threshold; Visitor/intercom holding; Security/control desk or room provision; Service entrance and BOH circulation; Common/accessible WC provision; Drop-off/loading interface; Facility storage / housekeeping |
| `LUNA-L01-AMENITIES` | `LUNA-L01-CLUB-POOL`, `LUNA-L01-CLUB-LOUNGE` | Changing and shower provision; Amenity/accessible WC provision; Pool filtration/treatment/service provision; Club BOH / storage / cleaning |
| `LUNA-L02` | No authored room catalog for this floor | Dwelling entries, ensuite wet stacks, balconies and the standard common/service schedule below |
| `LUNA-L03` | No authored room catalog for this floor | Dwelling entries, ensuite wet stacks, balconies and the standard common/service schedule below |
| `LUNA-L04` | No authored room catalog for this floor | Dwelling entries, ensuite wet stacks, balconies and the standard common/service schedule below |
| `LUNA-L05` | No authored room catalog for this floor | Dwelling entries, ensuite wet stacks, balconies and the standard common/service schedule below |
| `LUNA-L06` | `LUNA-L06-APT-A-UTILITY`, `LUNA-L06-APT-A-ENTRY`, `LUNA-L06-APT-A-BATH-03`, `LUNA-L06-APT-A-BED-03`, `LUNA-L06-APT-A-KITCHEN`, `LUNA-L06-APT-A-BATH-02`, `LUNA-L06-APT-A-BATH-01`, `LUNA-L06-APT-A-BED-02`, `LUNA-L06-APT-A-DINING`, `LUNA-L06-APT-A-LIVING`, `LUNA-L06-APT-A-BED-01`, `LUNA-L06-APT-A-BALCONY` | Dwelling entries, ensuite wet stacks, balconies and the standard common/service schedule below |
| `LUNA-L07` | No authored room catalog for this floor | Dwelling entries, ensuite wet stacks, balconies and the standard common/service schedule below |
| `LUNA-L08` | No authored room catalog for this floor | Dwelling entries, ensuite wet stacks, balconies and the standard common/service schedule below |
| `LUNA-L09` | No authored room catalog for this floor | Dwelling entries, ensuite wet stacks, balconies and the standard common/service schedule below |
| `LUNA-L10` | `LUNA-L10-APT-A-ENTRY`, `LUNA-L10-APT-A-KITCHEN`, `LUNA-L10-APT-A-BATH-02`, `LUNA-L10-APT-A-BED-02`, `LUNA-L10-APT-A-BATH-01`, `LUNA-L10-APT-A-BED-01`, `LUNA-L10-APT-A-LIVING`, `LUNA-L10-APT-A-BALCONY` | Dwelling entries, ensuite wet stacks, balconies and the standard common/service schedule below |
| `LUNA-L11` | No authored room catalog for this floor | Dwelling entries, ensuite wet stacks, balconies and the standard common/service schedule below |
| `LUNA-L12` | No authored room catalog for this floor | Dwelling entries, ensuite wet stacks, balconies and the standard common/service schedule below |
| `LUNA-PENTHOUSE` | `LUNA-PENTHOUSE-STUDY`, `LUNA-PENTHOUSE-ENTRY`, `LUNA-PENTHOUSE-BATH-02`, `LUNA-PENTHOUSE-BED-02`, `LUNA-PENTHOUSE-KITCHEN`, `LUNA-PENTHOUSE-BATH-01`, `LUNA-PENTHOUSE-BED-01`, `LUNA-PENTHOUSE-GREATROOM`, `LUNA-PENTHOUSE-TERRACE` | Private/semi-private lift arrival; Controlled common-side service provision |
| `LUNA-ROOFTOP` | `LUNA-ROOFTOP-SKYBAR`, `LUNA-ROOFTOP-POOLDECK` | Sky/accessible WC provision; Sky Bar BOH and service storage; Roof pool plant and service route; Technical plant screen/maintenance zone; Roof drainage/overflow access; Roof edge/facade maintenance access |

B1's current 32 plan regions combine cores and equipment markers; the labeled Electrical/Water/Fire/Network locations are not registered room walls. `LunaPlantRoom` is a plinth, with `LUNA-B1-RISER-MAINTENANCE-ZONE-01` and its access panel. Do not equate that one plinth with a safe shared room for generator, batteries, fire pumps and ICT. Allocate distinct functional rooms/zones, dry/wet separation, maintenance clearances, ventilation, delivery routes, parking/ramp and drainage after DD15.

Ground keeps Reception, Waiting Lounge and Lift Lobby and their current refs. Club retains Pool and Lounge; the required changing/WC/BOH provisions are new design work, not permission to reinstate an invented gym. Roof retains Sky Bar/Pool Deck and separates public amenity from technical access. On all residential floors, corridors reach entrances without crossing another home; unit utility interfaces must have a defined lawful service route.

For each standard dwelling resolve entry → private circulation → living/dining/kitchen, bedrooms with individually connected ensuites, guest WC reachable without a bedroom, utility and balcony. Bedroom, kitchen, wet-stack and balcony adjacencies are requirements, not certified dimensions. Preserve 6A room IDs while introducing a guest WC through approved registration. No layout is accepted solely because its polygons fit inside a rectangle.

**Stable digital contracts and jurisdiction**

External model = visual/spatial representation. Oyi canonical model = identity and semantic relationships. Runtime = telemetry/state/commands. RepresentationPolicy = authorization/visibility. Intelligence = understanding/orchestration/navigation. Edge/integrations = physical connectivity. IFC GUID and glTF node names are crosswalk identifiers, never a replacement CanonicalRef; operational truth does not enter glTF extras.

The future 2D plan and 3D geometry must bind the same registered object, with explicit level/unit/room frame and source revision. A single click selects a canonical object and updates the existing contextual card; Enter remains gated by the policy/navigation path. Plan regions do not grant entry. Do not duplicate apartments in separate lists or multiply panels.

Facility has common/service jurisdiction, but detailed private-home access does not follow from maintenance responsibility. Current policy returns Facility OPERATIONAL_2D for recognized private homes; its selected in-home service assets use the existing exception list. Assigned Consumer sees its own permitted home and authorized common context; other homes remain restricted. The equipment JSON includes actual policy snapshots for the current Facility and 6A-assigned Consumer identities, not new permissions. Unknown refs currently default open for Facility: all proposed/private identities must remain unregistered/unmounted until DD18 is resolved. Policy is unchanged.

L06's plan unit-A origin (-10.5,-9) differs from current 3D/camera origin approximately (-8.1818,-6.3636). Promote an explicit frame/anchor revision before authored replacement. Do not use changed target floor heights with old camera/riser coordinates. Structural elements are separate from operational assets: 117 local elements plus the fixed `LUNA-STRUCT-CORE-01`, with no command state. Sleeve markers (80) are not actual penetrations.

**Modeling and implementation order**

1. Freeze this programme and resolve DD01/02/03/05/06/18/19 sufficiently to produce a canonical floor/space and datum revision. Reconcile 43 identities, L10 B/C, PH split and 6A guest WC without changing policy opportunistically.
2. Coordinate core, both stairs, lift shaft/landing interfaces, riser zones and usable floor polygons together. This must precede detailed floor plans: an attractive plan that displaces a shaft is not a baseline.
3. Release coordinated 2D architectural/operational plans and stable anchors for all 16 levels, retaining current/target diff and rollback. Validate common/private/service boundaries.
4. Validate B1 allocation, clearances, replacement paths and service sources; reserve plant space before selecting realistic equipment geometry.
5. Implement Passenger Lift 02's versioned provider/state contract and simple shaft/door proxy test. Begin deterministic operational simulation here, alongside assets, rather than after every visual is finished. Keep live hardware adapters out of this first demo.
6. Coordinate main MEP distribution, approved service ports/penetrations, then the standard residential floor and L06 A Gold Standard including all ensuites/guest WC.
7. Replace approved Ground common architecture using the already-complete import foundation; then Club/common circulation, standard floors individually, premium L10–L12, PH, and Roof/Sky.
8. Converge facade/site with the approved massing and servicing; replace equipment visuals only after equipment envelopes/ports are known. Continue provider simulation and commissioning tests throughout.
9. Complete operational integration acceptance, optimize LOD/materials and finish photoreal convergence last. Visual fidelity must not precede validated layouts, state and privacy.

This moves plan/core coordination and early lift simulation ahead of decorative modeling. The Ground loader remains a proven boundary; do not reopen its implementation without a real regression.

**Decision register and acceptance gate**

| ID | Decision | Accountable discipline | Resolution required |
|---|---|---|---|
| DD01 | **DESIGN DECISION REQUIRED** — Site and statutory design basis | Architect / owner / appointed local consultants | Confirm surveyed parcel, setbacks, permitted height/area, occupancy, accessibility and applicable approval basis; 3000 sqm is approximate, not a survey. |
| DD02 | **DESIGN DECISION REQUIRED** — Floor area allocation and core fit | Architect / structural / MEP | Dimension core, protected stairs, corridor, balconies and wet zones before locking apartment polygons; do not infer clearances from procedural boxes. |
| DD03 | **DESIGN DECISION REQUIRED** — Penthouse area and identity split | Owner / architect / canonical-data steward | Retain two residences at target 450–550 sqm each; decide internal/net/gross/terrace basis and feasible footprint. Existing 660 sqm PH plate is insufficient for two 450 sqm internal homes. Resolve legacy LUNA-PENTHOUSE level/home identity without assigning it to both new homes. |
| DD04 | **DESIGN DECISION REQUIRED** — Premium apartment layouts | Owner / architect | Three homes each on L10–L12 are fixed; bedroom count, area, balcony and ensuite arrangement remain open. L10 B/C exist in generated catalog but not active plan. |
| DD05 | **DESIGN DECISION REQUIRED** — Bathrooms and standard floor circulation | Architect / plumbing | A/B three bedrooms each with ensuite + guest WC; C/D two bedrooms each with ensuite + guest WC. L06 A needs a guest WC and tested ensuite/circulation adjacency. |
| DD06 | **DESIGN DECISION REQUIRED** — Vertical transport selection and stop matrix | Lift specialist / architect / fire consultant | Capacity, speed, drive/machine strategy, shaft/pit/overhead dimensions, served floors, fire operation, PH access and dispatch interface. Four cars fixed; every car serving every floor is not confirmed. |
| DD07 | **DESIGN DECISION REQUIRED** — Structure and penetrations | Structural engineer / geotechnical / architect | Soil/foundation strategy, structural grid, slab thickness, core walls, transfer level, pool loads and approved openings. All existing structural sizes are reference geometry. |
| DD08 | **DESIGN DECISION REQUIRED** — Electrical supply and resilience | Electrical engineer / utility / operator | Demand/diversity, utility intake/transformer need, voltage arrangement, standby duty, generator count/rating, fuel/exhaust, ATS sequence, BESS strategy and metering ownership. |
| DD09 | **DESIGN DECISION REQUIRED** — Domestic water and hot water | Public-health engineer | Supply reliability, demand/storage, treatment, pressure zones, pump redundancy, hot-water generation/return, backflow and isolation arrangement. |
| DD10 | **DESIGN DECISION REQUIRED** — Drainage and stormwater | Public-health / civil engineer | Invert levels, gravity feasibility, separate soil/waste/vent/rainwater routes, pumping need, flood risk, disposal authority and inspection strategy. |
| DD11 | **DESIGN DECISION REQUIRED** — Fire and life safety | Fire consultant / approval authority | Hazards, compartmentation, escape, tank/pump duty, sprinkler/hydrant/hose-reel strategy, detection zoning, alarm cause/effect, smoke control and fail-safe interfaces. |
| DD12 | **DESIGN DECISION REQUIRED** — HVAC plant and ventilation | Mechanical engineer / owner | Cooling/dehumidification loads and operating zones; compare splits, VRF and chilled-water options. Confirm outside air, wet/parking extract, acoustics, condenser placement and maintenance. |
| DD13 | **DESIGN DECISION REQUIRED** — Security and access zoning | Facility / security designer / privacy owner | Coverage and retention, control-room location, guest/service boundaries, credential lifecycle and interfaces; no private-home CCTV implied. |
| DD14 | **DESIGN DECISION REQUIRED** — Network and Edge topology | ICT / OT designer | Connectivity diversity, rack/floor distribution, AP survey, VLAN/OT segmentation, gateway protocols, UPS autonomy and local control responsibility. |
| DD15 | **DESIGN DECISION REQUIRED** — B1 service allocation | Architect / all engineers | Parking/ramp count and geometry; distinct plant rooms; wet/dry/fire/fuel separation; ventilation; service entrance; equipment delivery/replacement path; no room walls inferred from markers. |
| DD16 | **DESIGN DECISION REQUIRED** — Amenities and pools | Owner / architect / mechanical / structural | Club Pool/Lounge and Sky Bar/Pool Deck retained as programme anchors; resolve changing/WCs, pool treatment, kitchen/BOH, service zones and any optional PH plunge pools. No gym automatically added. |
| DD17 | **DESIGN DECISION REQUIRED** — Common support and waste strategy | Facility / architect | Refuse collection, janitor cupboards, staff WCs, storage, loading, cleaning and refuse lift route; chute optional subject to decision. |
| DD18 | **DESIGN DECISION REQUIRED** — Canonical registration and privacy admission | Canonical-data steward / product / security | Register new spaces and homes with ownership/assignment before production geometry. Existing policy stays unchanged in this phase; current fallback must not authorize new private refs. |
| DD19 | **DESIGN DECISION REQUIRED** — Coordinate and anchor revision | Architect / Twin team | Promote new heights coherently across plans, imported frames, level transforms, risers, structural references, camera/route anchors; resolve L06 2D/3D offsets and geographic orientation explicitly. |
| DD20 | **DESIGN DECISION REQUIRED** — Operational acceptance and integrations | Facility / OT / lift vendors | Telemetry availability/units/freshness, allowed commands and audit/idempotency, authoritative acknowledgements, simulation profile and commissioned physical adapter; no renderer-issued safety commands. |

A floor is modeling-ready only when its residence count, registered refs, polygons/areas, two stair connections, lift arrivals, service zones, access boundaries, datums, anchor calibration and engineer review status are explicit. Each equipment item then needs an approved location, port/route/clearance specification and allowed capability set. Acceptance is multidisciplinary design review, not a passing rendering test.

Machine-readable companion: [luna-spatial-program.json](/Users/ochigaidoko/Oyi-Twin-Engine/artifacts/luna-spatial-program.json). Equipment, MEP and Lift 02 companion specifications define the remaining contracts. No approved source model, equipment procurement, app behavior, production/cloud change or engineering certification is created by these documents.
