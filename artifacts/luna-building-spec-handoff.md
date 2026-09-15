Luna canonical architecture and operational systems — handoff

Completed the six requested specification artifacts, documentation only:

- [Canonical building specification](/Users/ochigaidoko/Oyi-Twin-Engine/docs/LUNA_CANONICAL_BUILDING_SPEC.md)
- [Master equipment schedule](/Users/ochigaidoko/Oyi-Twin-Engine/docs/LUNA_MASTER_EQUIPMENT_SCHEDULE.md)
- [MEP coordination specification](/Users/ochigaidoko/Oyi-Twin-Engine/docs/LUNA_MEP_COORDINATION_SPEC.md)
- [Dynamic Passenger Lift 02 specification](/Users/ochigaidoko/Oyi-Twin-Engine/docs/LUNA_DYNAMIC_ELEVATOR_SPEC.md)
- [Equipment JSON](/Users/ochigaidoko/Oyi-Twin-Engine/artifacts/luna-equipment-schedule.json)
- [Spatial programme JSON](/Users/ochigaidoko/Oyi-Twin-Engine/artifacts/luna-spatial-program.json)

Locked target programme: 16 levels; 43 residences (32 standard, 9 premium, 2 PH); A/B standard homes with three bedrooms and four toilets, C/D with two bedrooms and three toilets; balconies; three passenger lifts, one service/fire lift and two protected stairs. Target heights follow the user brief and derive a Roof floor datum of 52.8m. These are programme decisions, not an implemented datum migration or construction approval.

Verified existing source: 76 operational asset records; 41 generated standard/premium unit refs, while active residential plans expose 39 plus one legacy PH home; six modeled interiors/36 rooms; four lift assets; seven core records; five representative service risers and five L06 branches; seven typed engineering relationships; 117 level structural records plus one fixed core; 80 sleeve markers. Equipment JSON preserves all 76 asset refs, current parent relationships, placeholder positions, supported runtime commands and policy snapshots. Existing quantities are local records, not installed or sufficient engineered quantities.

Added specification coverage: 51 equipment requirement families, four lift component assemblies and six conceptual system route requirements. Required rooms/service zones are enumerated per floor; apartment room obligations cover all 43 target homes. Unresolved geometry, room areas, new IDs and equipment quantities remain null or explicitly marked DESIGN DECISION REQUIRED. Requirements and component keys are not new canonical assets.

Priority decisions:

1. Confirm surveyed site, core/stairs/shafts and usable area allocation.
2. Reconcile two 450–550 sqm PH homes with the existing 660 sqm placeholder and decide internal/gross/terrace area basis. Resolve the shared legacy PH identity/prefix and assignment before registering either new home.
3. Resolve standard-floor ensuite/circulation layouts and the missing 6A guest WC. Confirm premium bedroom counts and bring existing L10 B/C refs into an approved placement plan without duplicating them.
4. Coordinate B1 parking/ramp, separated plant zones and equipment replacement paths; current markers/plinth are not rooms.
5. Confirm lift stop/access matrix and dynamic provider contract; current target-first floor state, timed arrival and visual lerp do not satisfy the proposed physical sequence.
6. Select engineering design bases for structure, power/resilience, water/hot water, drainage/stormwater, fire cause/effect, HVAC/ventilation, security/access and ICT/Edge. No chiller/VRF/manufacturer/capacity is locked.

Next implementation step: a reviewed canonical floor/space/core and datum revision, with 43-home identity reconciliation and the 6A bathroom rule. Then prove Lift 02 using the existing provider boundary with approved stop/anchor and action-authorization contracts. Do not begin final photoreal geometry, hardware control or loader changes yet.

Validation: [specification checks](/Users/ochigaidoko/Oyi-Twin-Engine/artifacts/luna-spec-validation.json) passed, including counts, references, no duplicate equipment, continuous elevations, new-ID admission guard and 136 unchanged source/script hashes. Existing representation regression passed. Build/browser reruns were unnecessary because no application code changed.

The loader, RepresentationPolicy, runtime, cameras, Oyi, floor plans, Engineering Layers and Facility/Consumer implementation were not edited. No application/schema/catalog behavior changes, production/cloud changes, migrations, physical commands, procurement or engineering certification were made. Work stops at this specification phase.
