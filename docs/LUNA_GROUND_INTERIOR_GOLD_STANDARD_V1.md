# Luna Ground Interior Gold Standard V1 — Phase 3A

Status: **PARTIAL — functional furnished reference implementation; photorealistic acceptance not achieved.** Classification: **LUNA_REFERENCE_DESIGN**. This is Ground only. The approved five images are finish/character intent; the existing coordinated shell remains spatial authority.

## Inherited baseline

Read before changing source:

- [Phase 2 specification](LUNA_GROUND_L01_ARCHITECTURAL_REALITY_V1.md)
- [Phase 2 measurements](../artifacts/luna-ground-l01-architectural-reality-v1.json)
- [Phase 2 report](../artifacts/luna-ground-l01-architectural-reality-v1-report.md)

The starting working tree was already extensively modified. A SHA-256 snapshot of 978 tracked/untracked nonignored files was saved at `/tmp/luna-ground-interior-before.json`. Nothing was reset, reverted, stashed or committed. The Phase 2 documents are preserved as historical/geometry authority.

Ground remains 44 × 34 m, 1,496 m², datum 0, 5 m floor-to-floor. Arrival/Reception ceiling underside remains 4.20 m, Lounge 3.60 m, Gallery 2.95 m. The centre entrance column remains at X0/Z14; the real entrance route still detours through X1.2. Existing seven core apertures, slab layers, canonical rooms, lift shafts/doors/thresholds and navigation graph remain unchanged.

The Waiting Lounge is X−15/Z−2, 10 × 10 m; Reception is X0/Z6, 14 × 6 m. The lift space is an open threshold apron, not the large enclosed gallery shown in the images. Those differences are retained, not concealed by moving geometry.

## Placement and architectural treatment

`groundInterior/groundInteriorLayout.ts` is a **decorative placement schedule**, not a new canonical asset or room catalogue. Its bounds feed both visual construction and the existing conservative Explore admission function.

- Concierge: one 4.4 m long desk, 1.05 m deep, 1.02 m high, centre X4.65/Z6.35. Its long axis is Z, facing the central arrival from the east side of Reception. Two small inactive workstation silhouettes; no invented live screens/device IDs.
- Feature: 0.12 m thick freestanding finish panel along X6.94/Z7.2, 3.4 m long, 4.15 m high. Stone centre, timber margins, bronze grooves and discreet warm edge light. It is reversible decorative joinery, not a replacement canonical wall. Its occupied footprint is collision-constrained.
- Identity: one `LUNA / RESIDENCES` moment on that panel. Local alpha-mapped lettering planes are used; these are not sculpted metal letter meshes.
- Lounge: two seating compositions, two sofas, three barrel chairs, two low tables, two rugs and two indoor trees. The centre route at X−15 remains clear. A third planter frames the arrival edge at X5.8/Z14.8.
- Existing column faces receive millimetre-scale stone/bronze finish veneers; no structural column is removed or moved.
- Wall treatment uses the existing west shell. No lounge window, new support room, or fake reception wall opening was introduced.
- Gallery: stone surrounds remain outside the existing 1.4 m approach apertures; bronze trims, header finishes, wall lights, numbers 01–03 and existing recessed portal depth. The actual Ground landing door leaves receive a bronze material only. The service/fire lift remains separately identified by its inherited signage and canonical identity.
- Glazing, entrance assembly, glazing dimensions and exterior remain unchanged. Exterior context is visible through the existing glazing; its optical limitations remain.

The shallow gallery, legitimate entrance column and remote lounge position mean the approved reference camera compositions cannot be reproduced literally without changing the building. Evidence includes both a matched axial view and a supplemental view from the actual entrance detour.

## Materials, geometry and assets

Four new source modules under `src/luna/architecture/groundInterior/` contain the placement, geometry, material and rendering logic.

The local palette includes warm floor stone, light feature stone, dark stone, timber, bronze, warm metal, plaster, cream/olive textiles, rug, foliage and soft contact shadow. Five deterministic 512 × 512 finish maps are shared for the session. Existing locally packaged CC0 oak and paving micro-surface maps are reused through `bindExteriorMaps`; no new remote dependency, GLB model or downloaded asset was introduced. Texture failure retains local scalar/procedural material fallback.

Floor joints represent a 1.2 m module. The new common-area finish is a polygon-scale film above the preserved floor, partitioned around the same seven core apertures; existing room floor geometry/selection stays in place with matching world UVs. There is no new raised slab, changed floor datum or blocked aperture.

Furniture uses reusable rounded cushion/frame geometry, curved extruded chair backs, lathed planters, cylindrical table construction, small legs and trim. Static parts are merged by material rather than one React component per leaf/cushion/rod. Indoor foliage reuses the existing bounded leaf geometry. This is authored procedural reference furniture, **not a purchased photoreal furniture asset collection**. Upholstery seams/drape, botanical realism and final stone scans remain below reference quality.

## Lighting and ceiling

The sculpture is 16 suspended vertical elements plus five light rods. Lowest point is 3.12 m; suspension tops are 4.18 m, below the unchanged 4.20 m ceiling. No low chandelier returns.

Visible emitters use emissive materials. Three bounded, unshadowed warm point lights illuminate arrival, reception and lounge only when the existing Ground interior context is active. Rods do not each create real lights. Gallery wall lights and desk/feature strips are decorative illumination; they do not claim an installed or controllable lighting circuit.

Thin ceiling slots are a **visual ventilation impression only**. Existing MEP assets, sensors, sprinkler/fire representations and service constraints are unchanged. No duct routing, air quantities, fire coverage or engineering coordination is fabricated. No ceiling is lowered and no L01 ceiling is altered.

This is direct real-time lighting, without an authored interior lightmap/global-illumination solution. Ambient flatness and physically convincing reflected/bounced light remain acceptance gaps.

## Operational truth and picking

All new decorative meshes opt out of raycasting. They do not become canonical assets and cannot intercept door/device selection.

Three new visual call stations explicitly bind to the **existing** passenger lift IDs. Their readouts derive from the existing runtime `currentFloor` and `direction`, redrawing only when the displayed state changes. Pointer hover/selection uses the existing canonical handlers. A click opens the existing Elevators control board with the correct lift selected; calls, travel and door operations remain in that board with existing capability/policy gates. There is no parallel lift or direct command bypass.

No governed gallery gate/reader is defined by the inherited model. Accordingly the residents' transition uses material/lighting/wayfinding only: **no new access reader, lock, enforced gate or permission boundary is claimed**. Existing access runtime and RepresentationPolicy remain unchanged. Mail/management/parcel rooms are omitted because their proposed programme is not source-backed.

## Navigation and performance

Every existing Ground common-route segment is sampled against furnishing bounds with a 0.45 m half-width. Entrance detour and all four lift approaches remain clear. The existing `podiumStepAllowed` function additionally tests decorative furnishing bounds for Ground only, using its existing swept sampling/body radius. L01 and all other levels retain their prior admission logic. No separate navigation engine, coordinate frame or current-space state was added.

The browser proof observes real entry via Oyi/TOUR, manual forward movement, real canonical lift selection, and manual stopping before a sofa. Broader Ground/L01 and route tests exercise room changes and lift travel. Decorative furniture is not added to the canonical floor-plan registry.

Materials and geometry are memoized; no geometry is rebuilt per frame. Only the three small lift readouts inspect runtime on frames, and CanvasTexture uploads happen on a changed label. Phase 3A adds no shadow-casting lights. Geometry/material and performance counts are in the [structured deliverable](../artifacts/luna-ground-interior-gold-standard-v1.json).

## Verification and review

Use the existing local server at `http://127.0.0.1:5173/`. In TOUR ask “Take me to the lobby”, then “Take me to reception”, “Take me to the waiting lounge” and “Take me to the lifts”. Explore remains the existing bottom-right controller; furniture blocks walking while the common routes stay open. Click a new lift call station to inspect/control its existing canonical lift through the shared board.

Commands:

```sh
npx tsc -b --pretty false
npm run lint
npm run build
node scripts/verifyGroundInterior.mjs
node scripts/verifyGroundInteriorBrowser.mjs
node scripts/verifyGroundL01.mjs
node scripts/verifyGroundL01Openings.mjs
node scripts/verifyGroundL01Browser.mjs
node scripts/verifyGroundL01OpeningsBrowser.mjs
```

Final matched headless desktop sampling fell from 60.11fps before furnishing to 41.06fps in the screenshot run, with 36.83–38.60fps matched warm repeats. Performance remains PARTIAL; the narrower-FOV diagnostic at approximately 60fps is retained separately and is not used as the matched comparison.

The unchanged Ground/L01 70ms displacement test failed twice. A simultaneous frame-clock diagnostic identified multiple valid interpolation frames inside one timer sample and passed the full journey/section checks. The original failure remains disclosed; no existing test or camera runtime was modified.

See [phase report](../artifacts/luna-ground-interior-gold-standard-v1-report.md) for final regression outcomes, matched screenshots, acceptance grades and measured performance.

## Boundaries retained

No L01 finishes/pool, atrium, mezzanine, overlook, L06, Apartment A, exterior redesign, navigation graph change or operational provider change. Stair egress remains PARTIAL and the future atrium/overlook remains DEFERRED. No production/cloud changes, physical commands, migrations, deployment or commit.
