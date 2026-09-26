# Luna Level 01 Interior V1

Working amenity interior in the coordinated Level 01 shell. The approved images supply material, furniture and lighting intent; they do not supply replacement geometry. See the [acceptance report](../artifacts/luna-l01-interior-v1-report.md) and [structured record](../artifacts/luna-l01-interior-v1.json) for measured validation and status.

## Inherited authority

Read against the Ground/L01 architectural reality document, JSON and report; Ground Interior Gold Standard document, JSON and report; and the Ground optimization report/JSON. Existing uncommitted work was retained. The starting source hashes are recorded in [inherited-source.json](../artifacts/l01-interior-v1/inherited-source.json).

| Retained item | Source truth |
|---|---|
| Level | `LUNA-L01-AMENITIES`, 40 × 30 m / 1,200 m² |
| Datum / floor-to-floor | +5.00 m / 3.50 m |
| Room ceiling underside | +7.80 m, 2.80 m above floor |
| Lounge | `LUNA-L01-CLUB-LOUNGE`, centre (14.5, −4), 9 × 16 m |
| Pool reserved zone | `LUNA-L01-CLUB-POOL`, centre (−14.5, −4), 9 × 16 m |
| Entrances | Existing 1.4 m north openings, Z=4 |
| Common passage | Existing Z=5.2 route; arrival points X=±14.5, Z=2.8 |
| Structure | Existing slabs, transfer, columns and seven approved core apertures unchanged |
| Vertical systems | Three passenger lifts, service/fire lift, two protected stair footprints and riser unchanged |

Authority: `src/luna/lunaProgramme.ts`, `src/luna/interiors/lunaInteriors.ts`, `src/luna/architecture/podiumCoordination.ts`, `podiumPassages.ts`, `podiumSlabOpenings.ts` and structural records. None of those files changes in this phase.

## Shared construction and Ground freeze

`groundInterior/interiorConstruction.ts` extracts the existing optimized builder primitives and furniture construction. Ground calls exactly the same operations in the same order. The test compares every resulting Ground vertex/index buffer hash and all instance transforms to the pre-L01 snapshot. The original furniture schedule, material factories, Ground lighting rig and collision bounds remain unchanged.

L01 reuses the same material factories and cached stone, timber, textile and paving maps; rounded seating, curved chairs, pedestal tables, lathed planters and full-density instanced foliage; static batch renderer; atlas lettering; and policy-aware canonical lift context control. There is no second interior resource system and no remote asset dependency. L01 scales only its own crown geometry vertically to fit the lower room ceiling. Its three planters share that one crown buffer.

The lettering component accepts an optional sign schedule. Ground's default schedule, atlas resolution, font, dimensions and positions remain unchanged. The existing lift control component is exported for reuse without altering Ground hit targets or state handling. L01 landing-door material uses the Ground bronze family; lift geometry/runtime/provider/access code is unchanged.

## L01 presentation

`l01InteriorLayout.ts` contains decorative placement and conservative obstacle bounds. `l01InteriorGeometry.ts` builds indexed batches. `L01InteriorFinishes.tsx` owns materials, signage, water presentation, runtime context stations and three bounded unshadowed lights. `InteriorLayer.tsx` mounts it under the existing L01 floor transform. Existing room IDs and floor picking remain authoritative.

- Arrival: existing stone portal reveals, bronze/stone/wood trim around the actual three passenger portals, current floor/direction readouts, thin gallery finish canopy and understated wayfinding. One side planter; no centre console across the corridor.
- Lounge: two sofas, two curved chairs, two pedestal tables, two rugs, one planter, restrained wall relief and shallow display joinery. It is residential seating, without a food-service or commercial programme.
- Pool room: one surface study, two supported loungers and one planter. Existing room boundaries and slab remain intact.
- Ceiling: original 2.80 m underside retained. Millimetre-scale surface lighting/joint strips and small emitters; no deep coffer, new duct or claimed general service plenum.
- No new glazing: the current room/shell has opaque boundaries. The reference's panoramic windows and outdoor view cannot truthfully be reproduced here without a separately approved architectural change.

## Pool truth boundary

**POOL VISUAL DESIGN INTENT — NON-ENGINEERED / NON-OPERATIONAL.**

The surface is 3.8 × 9 m, centred at X=−15.3, Z=−5, local Y=0.055 m above the retained L01 slab. Its 0.14 m edge is a removable 0.07 m-high presentation mock-up. These are decorative study dimensions, not approved basin engineering. Nothing is excavated; no basin depth, waterproofing, structural loading, hydraulic plant, water quality or temperature is represented.

A single standard material uses subtle shader-normal movement; there is no fluid simulation, reflection pass, caustics or operational state. Signs identify the study at the room entrance and inside. The existing canonical room is retained, but no pool asset or fake telemetry is registered. Existing Oyi semantics/runtime files are untouched.

The pool study and furniture enter the same L01 branch of `podiumStepAllowed`; the camera stops before the edge. The underlying canonical slab remains continuous. A tested side route at X=−12.85 remains passable beside the study. This does not establish a compliant engineered pool deck or safe swimming facility.

## Navigation and interaction

Existing TOUR, TELEPORT, LOCATE, access, lift stops and canonical routing are unchanged. Furniture leaves the existing path with a 0.9 m clear furnishing envelope. Real Explore keyboard input proves lift arrival → Lounge → common corridor → Pool, with unchanged eye height and the existing Spatial Card/current-space updates. A real pointer hit opens the canonical Lift 02 context; commands remain in the existing provider/policy pathway.

The added geometry is decorative and does not intercept canonical ray picking. Room floor selection remains on the original room mesh. Protected core/stair/riser boundaries remain clear. Physical stair flights, landings, headroom and continuous certified egress remain unresolved; this phase neither fabricates nor certifies them.

## Resource and visibility strategy

L01 uses 13 finish batches, indexed shared construction and one three-instance foliage crown. Static local matrices stay fixed; parent world transforms still update. No React state is set per camera frame. The only new continuous presentation work is proximity visibility and one water time uniform; readouts reuse the bounded 10 Hz runtime reader.

Decoration is visible at L01 human height inside its envelope or during explicit L01 isolation, subject to existing representation/system gates. New lights operate only near/in L01. The canonical shell remains independently visible. This keeps interior detail out of normal Ground/exterior views; no interpolated multi-distance LOD is claimed. Explicit level isolation can reveal detail at distance. Three unshadowed point lights maximum; only three merged material batches cast shadows.

## Deferred and excluded

Pool engineering, pool operations, functional stair design, atrium, mezzanine/overlook, new openings, final photorealistic assets, L06, Apartment A and exterior work remain outside this implementation. Ground's accepted architectural/operational baseline remains frozen. No commit, deployment, migration or production/cloud change is part of this work.
