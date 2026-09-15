Luna architectural geometry audit and migration plan

Audit date: 8 September 2026. Scope: the existing local Oyi-Twin-Engine source and a fresh, isolated local-browser scene inspection. This document proposes a geometry migration, not a replacement Twin Engine. No application source, policy, runtime, floor-plan, camera, or UI implementation was changed during this audit. No production model was supplied, so architectural fidelity against an approved drawing/BIM model cannot yet be verified.

**Decision**

Keep the current semantic and behavioral scene hierarchy. Replace procedural visual geometry beneath it, one bounded package at a time. The editable architectural/BIM source becomes the authority for physical shape; optimized GLB/glTF becomes a delivery representation. Canonical IDs, policy decisions, runtime state, selection descriptors, floor-plan behavior, and navigation remain owned by the existing Twin contracts.

Do not import one opaque whole-building GLB and attempt to reconstruct identity from mesh names afterward. Do not recreate runtime state in glTF extras, infer access rights from BIM classifications, or let exporter-generated IDs become Twin IDs.

**Current pipeline and measured inventory**

App → one React Three Fiber Canvas → LunaBuilding → LunaLevel / LevelMassing → facade, structural elements, interior/unit groups, operational assets. Root-level siblings contain site context, full-height cores/risers, moving elevator cabins, and relationship/route graphics. App supplies the existing selection, scene mode, interior focus, representation, data, runtime, lighting, and Oyi controller contexts.

The local catalog contains 16 levels, six modeled interiors containing 36 rooms, 76 operational asset records, 117 level structural elements, and seven architectural core records. These are separate catalogs and representations; they are not a count of unique physical BIM elements. Some refs intentionally appear in more than one representation, such as elevator core/cabin objects.

The six interiors are Ground Lobby (3 rooms), Residents’ Club (2), Apartment 6A (12), premium Apartment 10A (8), Penthouse (9), and Luna Sky (2). All 16 levels have contextual plans. See [inventory](/Users/ochigaidoko/Oyi-Twin-Engine/artifacts/geometry-audit-inventory.json).

A fresh initial Architecture/Facility view at 1440×900, DPR 1, with the existing high-quality lighting/shadows reported:

| Measurement | Observed |
|---|---:|
| Scene mesh objects | 730 |
| Distinct referenced geometries / materials | 730 / 570 |
| Triangles summed across mesh geometry before culling | 62,278 |
| Meshes whose own visible flag was true | 403 |
| Renderer geometry / texture counters | 416 / 7 |
| Sample renderer frame calls / triangles | 642 / 49,638 |
| Shader programs | 8 |

These are a single headless Chrome scene/counter snapshot, not a hardware FPS, memory-byte, or sustained performance benchmark. A mesh’s own visible flag does not prove its ancestors are visible or it is in the frustum. Renderer counters and graph inventory have different scopes. See [raw snapshot](/Users/ochigaidoko/Oyi-Twin-Engine/artifacts/geometry-audit-render-snapshot.json). The current scene is already expensive in object/material/draw count relative to its triangle count; polygon reduction alone will not be sufficient.

**What is procedural, reusable, or replaceable**

| Area and source | Actual implementation | Migration treatment |
|---|---|---|
| [LunaBuilding](/Users/ochigaidoko/Oyi-Twin-Engine/src/luna/LunaBuilding.tsx:23), [LunaLevel](/Users/ochigaidoko/Oyi-Twin-Engine/src/luna/LunaLevel.tsx:32) | Composes levels, units, interiors, systems, and fixed global infrastructure | Retain composition and ownership. Add bounded imported visual slots; do not duplicate the hierarchy. |
| [LevelMassing](/Users/ochigaidoko/Oyi-Twin-Engine/src/engine/components/LevelMassing.tsx:26) | BoxGeometry per level; owns level selection, hover, animated explode transform, opacity and material clipping | Replace the visible box with authored envelope geometry. Preserve its transform/controller behavior and a semantic selection proxy. A children-only GLB added today would leave the solid box blocking the imported architecture. |
| [LevelFacade](/Users/ochigaidoko/Oyi-Twin-Engine/src/luna/LevelFacade.tsx:17) | Procedural merged boxes for fins, mullions, balcony slabs, glazing, canopy, parked cars, amenity screens, PH terraces/pool, rooftop pergola/cabanas/core cladding, B1 louvers; hashed bright/dim window batches | Replace physical geometry from the approved source. Retain per-level fading, clipping, nonselectable decoration behavior, and lighting hooks. Hashed window glow is presentation art, not occupancy telemetry. |
| [UnitVolume](/Users/ochigaidoko/Oyi-Twin-Engine/src/engine/components/UnitVolume.tsx:34) | Addressable translucent/opaque box, local unit origin, click descriptor, inherited floor fade | Keep identity, origin, and selection contract. Replace visible shell; retain or replace its proxy deliberately. Never leave overlapping procedural and imported shells. |
| [InteriorLayer](/Users/ochigaidoko/Oyi-Twin-Engine/src/luna/InteriorLayer.tsx:27), [InteriorRoom](/Users/ochigaidoko/Oyi-Twin-Engine/src/engine/components/InteriorRoom.tsx:47), furniture.ts | Rectangular floor/ceiling boxes; merged continuous walls with one door opening; room-local merged box furniture; service voids/access panels | Replace walls, openings, floors, ceilings, fixtures and furniture with authored assets. Preserve room refs, room focus, separately revealable ceilings, camera anchors and service access references. Current room selection is attached to the floor mesh. |
| lunaStructuralElements.ts / LunaStructuralLayer.tsx | Conceptual columns, slabs, beams, foundations/stair supports, plus a fixed hollow core; primitive boxes and merged wall strips | Replace physical structural geometry using coordinated structural source. Retain structural catalog identities and Structure-mode binding; do not turn them into operational devices merely to render them. |
| LunaPlantRoom.tsx | Raised plant plinth plus modeled riser-maintenance service zone/access panel | Replace source geometry when available. B1 has equipment positions, not a complete authored room/parking layout. Do not promote the diagram into an as-built plan. |
| OperationalAssetLayer.tsx / OperationalAssetMarker.tsx | Boxes, cones, discs sized heuristically by type/ref; runtime tint, hover, selection, optional point light | Keep data/provider/subscriptions and interaction anchor. Replace marker bodies selectively with reusable equipment visuals. Keep status overlays separate from physical surface materials. |
| MepComponents.tsx / lunaMepBackbone.ts / relationship renderers | Cylinders, boxes and toruses for representative runs/sleeves; straight graph-derived relationships/routes | Keep semantic connections and route/highlight behavior. Authored MEP paths may replace physical runs later; a graph edge is not evidence of a surveyed pipe route. Sleeve toruses are markers, not actual slab holes. |
| CoreShaft / RiserShaft / StructuralCoreWall | Fixed full-height primitive shafts/core at building root | Keep fixed-root ownership during floor migration. Replace later as coordinated shared infrastructure, not once per floor. |
| ElevatorCabinLayer / CurtainAssetMarker | Runtime-driven cabin position and curtain scale/position | Reuse runtime drivers; replace visual bodies. Author moving parts with compatible pivots/axes and preserve stable anchor parents. Do not run a glTF animation independently of runtime state. |
| LunaEnvironment / SiteBase / LunaSiteContext | Procedural landscaping/roads/site props; merged OSM-derived neighborhood boxes/roads; art-directed skyline and water; distance-opacity fade | Keep geographic context and attribution separate from Luna architecture. Nearby buildings are not addressable Luna assets. Replace close site props only when needed; defer distant context detail. |
| lunaMaterials / Lighting / LunaSignage | Material factories, mostly flat PBR parameters; procedural environment lightformers; canvas-generated sign texture | Retain lighting modes and mutable material-state behavior. Introduce authored PBR surface textures and calibrated material variants; replace signage artwork only with approved assets. |
| FloorPlan2D / lunaFloorPlans / cards | SVG rectangles from canonical/model records; B1 assets/core markers; PH privacy-safe outline; shared card hierarchy | Reuse behavior and refs. Keep current data during visual swaps. Any plan geometry correction is a separately reviewed representation revision. |

No GLB/glTF loader, model-streaming path, authored LOD switching, or actual instancing implementation was found in the active source scan. Geometry is generated through Three.js primitives/merged buffers. The runtime asset folders inspected contain no architectural GLB package. Existing render-quality helpers configure shadows/DPR; they do not provide geometry LOD or streaming. Existing source uses material factories and memoization, but no explicit model-cache lifetime manager was found.

**Stable contracts and migration hazards**

1. **Identity and contextual selection.** Preserve `CanonicalRef`, `TwinNodeDescriptor {ref, kind, label, parentRef}`, and every existing selection callback. Labels, object UUIDs, glTF node indices and BIM element names are not keys. One canonical object may bind to many mesh parts; an elevator may have separate core/cabin roles under the same ref. Match by canonical ref plus representation role/part, not an assumption of one mesh per ref. PH is especially sensitive: `LUNA-PENTHOUSE` serves as both level and private-interior identity in existing lookup/policy paths. Preserve those call paths rather than “fixing” the ID during import.

2. **Coordinate frames.** All existing dimensions are metres. LevelMassing’s frame is centered vertically at `baseElevation + height/2`; child interior/asset groups translate by `-height/2` to reach finished floor. An export with floor-local Y=0 therefore attaches beneath that floor-alignment transform, not directly at the centered massing origin. Unit-local positions receive the unit transform exactly once. `footprint.width/depth` are used as full dimensions in rendering, despite a misleading half-extents comment in LevelDescriptor. Preserve the implementation’s interpretation.

   Existing world transform for floor-local geometry is:
   `T(planOffset.x, baseElevation + height/2 + explodeOffset, planOffset.z) × T(0, -height/2, 0) × unitTransform(if any) × authoredLocalTransform`.
   `explodeOffset = stackIndex × explodeGap`; the current App gap is 3.5m. Do not bake that offset into exported vertices.

3. **L06 currently has two spatial representations.** Apartment A’s plan center is (-10.5,-9), while its 3D shell/interior origin is approximately (-8.1818,-6.3636), derived from `36/4.4` and `28/4.4`. Plan extent and placeholder shell extent also differ. Camera offsets repeat the 3D origin in [lunaCameraPresets](/Users/ochigaidoko/Oyi-Twin-Engine/src/luna/lunaCameraPresets.ts:61); relationship and highlighted-route renderers repeat it separately. Do not choose one coordinate set silently and shift the others. First preserve both through an explicit binding transform. If the architectural source disproves either representation, revise the plan/anchor/route calibration together with before/after evidence. SelectionFrameProbe bounds and exterior focus also depend on plan geometry and require review.

4. **Geographic heading and section labels are not identical conventions.** Site configuration aligns local +Z with north at heading 0. The existing section helper labels its -Z cut “north.” Do not rotate a production model or rename section behavior based on an exporter’s north label. Calibrate against the existing entrance, core and level datums; record geographic orientation separately from preserved view-control semantics. Large survey/geographic coordinates remain in source metadata, not vertex buffers near the camera.

5. **Fixed versus exploded infrastructure.** Per-floor envelope/slabs/columns move with LevelMassing. Full-height cores, risers and structural core stay at root; cabins move by runtime. Route endpoint code already treats risers as an explode exception. Imported continuous elements must have explicit ownership; otherwise they will duplicate, stretch, or move twice. Existing route endpoints use target explode offsets, while level transforms ease toward targets, so transient alignment also deserves regression coverage.

6. **Policy must be applied to content, not just entry buttons.** The unchanged [RepresentationPolicy](/Users/ochigaidoko/Oyi-Twin-Engine/src/luna/policy/lunaRepresentationPolicy.ts) gives Facility known private units/rooms OPERATIONAL_2D, its service assets an explicit exception, and residents their own-home access. The App navigation guard keeps private-home queries in summary mode. However, LunaLevel mounts known interior geometry directly; InteriorLayer/InteriorRoom do not themselves consult policy. UnitOperationalLayer filters unit devices, while LevelOperationalLayer and generic marker/relationship rendering are not equivalent global authorization filters. The passing policy tests verify policy decisions and selected UI flows, not absence of all restricted triangles in the scene or downloaded payload.

   Production private interiors must be separately packaged and admitted by the existing policy result before loading/mounting, with forbidden picking/shadows/reflections also excluded. A hidden material or “Enter” button is insufficient. A published GLB cannot protect embedded private geometry by hiding its node. Future delivery authorization must enforce the same decisions; no delivery system is changed in this audit.

7. **Unknown IDs are a blocking import error.** The current policy deliberately returns Facility FULL_3D for an unrecognized ref. The inventory probe confirmed that for both a fabricated import name and conceptual `LUNA-L02-APT-A`, which is outside the enumerated known private-unit list. Do not alter this policy in a geometry migration and do not pass new exporter IDs into it. Reject unbound content before representation resolution. Detailed private production interiors for currently conceptual units must wait for approved canonical ownership/policy registration in a separate, explicitly authorized data integration. Never alias them to Apartment 6A to get a desired policy answer.

8. **Fading and materials are currently mesh-oriented.** The fade hooks cast `mesh.material` to one material and mutate opacity/transparent. They do not handle arbitrary GLTF material arrays or whole imported subtrees automatically. Several parts have independent state: level fade, room focus, ceiling reveal, system visibility, selected highlight, night emission. Preserve these semantics with a small imported-visual binding layer that traverses admitted mesh parts and enumerates material arrays. Share geometry/textures where safe; clone mutable materials per independently controlled domain. One shared mutable material across floors will recreate cross-floor fading bugs.

9. **Clipping and picking are separate.** Actual cutaway uses GPU material clipping in LevelMassing and facade meshes, not CSG/capped sections; other meshes do not universally inherit clipping. GPU-discarded triangles may still be intersected by CPU raycasting. Preserve current cut semantics per visual role, and test that cut or hidden imports cannot steal clicks. Decorative facade meshes currently disable raycasting so canonical proxies remain reachable.

10. **Local records are not a surveyed architectural authority.** Generated residential records and structural layouts explicitly disclose conceptual/reference data. Interior comments also distinguish canonical-style refs from seeded examples. Backend provenance comments are not wholly consistent across files, particularly premium units; no backend was contacted to adjudicate this. Preserve all local IDs but carry provenance and verification status in the source mapping. Luna’s site itself is a disclosed conceptual development, not a verified cadastral parcel.

**Proposed source and delivery structure — not implemented**

Keep the editable native architecture/BIM model, coordinated structural/MEP sources, source revisions and IFC exports outside the optimized runtime package. Retain IFC GlobalId/native element identifiers in a versioned crosswalk to existing canonical refs. Resolve complete IFC placement chains before local-coordinate conversion; buildingSMART documents relative placements through `PlacementRelTo`. [IFC placement reference](https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/IfcLocalPlacement.htm).

A proposed release layout:

```text
luna/<geometry-revision>/
  manifest.json
  bindings.json                 # Twin refs ↔ approved source elements/parts
  anchors.json                  # existing anchor keys + calibrated local poses
  validation.json               # bounds, identity, material, privacy, budget checks
  shared/core/                  # fixed structural/shaft geometry
  shared/materials/             # texture/appearance assets where packaging allows
  levels/LUNA-GROUND/
    architecture-lod2.glb
    architecture-lod1.glb
    common-interior-lod0.glb
    structure-lod1.glb
  levels/LUNA-L06/
    architecture-lod2.glb        # safe exterior/common geometry only
    architecture-lod1.glb
    units/LUNA-L06-APT-A/
      interior-lod0.glb          # separately admitted private representation
  levels/<remaining-existing-level-ref>/...
  equipment/<visual-template-id>/...
```

Privacy-sensitive files must not simply be placed in the current public folder for eventual production hosting. The tree describes logical assets, not an authorization mechanism. Reference private file metadata only through a delivery path that is authorized for the current identity. Each load failure falls back to that identity’s permitted procedural/2D representation, never an unrestricted whole-building fallback.

Runtime names: use `<canonicalRef>__<role>__<part>__LOD<n>`, e.g. `LUNA-GROUND-LOBBY-RECEPTION__floor__001__LOD0`. Use simple ASCII exporter names, keep canonical spelling/case intact, and make part IDs stable within a source revision. Do not give decorative mullions new operational IDs. Use `MAT__stone_travertine__v01`-style appearance names independent of system/status. Names aid inspection; validated bindings are authoritative.

Proposed binding record:

```json
{
  "bindingId": "ground-reception-floor-001",
  "canonicalRef": "LUNA-GROUND-LOBBY-RECEPTION",
  "kind": "room",
  "parentRef": "LUNA-GROUND-LOBBY",
  "ownerLevelRef": "LUNA-GROUND",
  "interiorRef": "LUNA-GROUND-LOBBY",
  "visualRole": "floor",
  "coordinateFrame": "interior-floor-local",
  "explodeOwner": "LUNA-GROUND",
  "sourceElementIds": ["<approved-source-id>"],
  "nodeName": "LUNA-GROUND-LOBBY-RECEPTION__floor__001__LOD0",
  "pickOwnerRef": "LUNA-GROUND-LOBBY-RECEPTION"
}
```

This is proposed metadata, not a new TwinNodeDescriptor or permission model. The release manifest also records source/version checksums, unit/axis transform, per-package bounds, LOD alternatives, required decoder extensions, texture dependencies, and binding/anchor revision hashes. Existing system enums are used only for actual system content: architecture remains `activeSystem = null`, and “all” remains the UI aggregate. Spatial parent, service graph parent and explode owner are distinct concepts; do not overwrite an asset’s current parentRef with BIM containment.

One canonical object can span many IFC elements and many GLTF parts. A shared BIM wall may need parts split at floor/privacy boundaries while retaining its source identity in the crosswalk. Merge only within the same floor, privacy admission, selection ownership, system behavior and material-state domain. An explicit instance-ID-to-canonical map is needed if selectable repeated objects become instanced; anonymous batching is not acceptable.

**Import, material and optimization pipeline**

1. Obtain an approved native source, floor schedule, room/unit schedule, architectural finishes, authoring units/axes, source provenance, and any structural/MEP coordination files. Confirm level datum and ownership against the current 16-level inventory before export. A missing authoritative space does not become real because it has a convincing mesh.
2. Export/tessellate offline. Remove drafting annotations, tiny fabrication detail irrelevant to inspection, unused objects, invalid normals and accidental duplicates. Split at the semantic boundaries above. Resolve source transforms once; preserve anchors and pivots across every LOD. Do not auto-center packages or arbitrarily normalize their scale.
3. Deliver glTF 2.0-compatible geometry in metres and a documented right-handed Y-up frame. Record any CAD Z-up conversion. Custom `extras` may carry binding hints, but must be cross-checked against the manifest and cannot grant authority. [glTF specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).
4. Add a small loader/visual adapter at LunaLevel’s existing seam. It loads a validated package, resolves semantic parts to existing wrappers, applies policy admission/material state, and swaps the visual child only. LevelMassing, UnitVolume and InteriorRoom currently couple visual construction to behavior, so an optional visual override/proxy seam is required; they are not already drop-in GLB containers. Avoid replacing the component/context hierarchy.
5. Keep base architectural PBR and operational styling distinct. Author base color, normal, roughness/metallic and optional AO/emission maps. Color/emissive textures use sRGB; data maps remain non-color data, consistent with Three.js color management. Preserve authored texture transforms, normal scale and UV sets. Do not bake existing status colors, resident state or the current sunny key light into base color. [Three.js color management](https://threejs.org/manual/en/color-management.html).
6. Keep the current ACES/exposure, day/golden-hour/evening light setup and procedural environment initially so geometry comparisons are meaningful. Calibrate a small approved material reference scene locally before changing lighting. Replace double-sided solid-box workarounds with correct wall thickness/normals; do not make every imported material double-sided. Transparent facade/glass should be bounded and separate from opaque batches. Full physical transmission is optional and must earn its GPU cost.
7. Preserve ceiling, wall, floor, furniture, glazing and operational overlay material roles separately. Cache immutable source textures/geometries, while mutable material variants belong to the relevant behavior domain. Releasing one floor must not dispose shared resources still used elsewhere. Dispose loader-owned geometry, materials, textures and decoder resources only when their ownership ends; unloading visuals must not reset runtime state.
8. Prefer shared appearance atlases and repeated fixture geometry, but never merge across authorization or interaction boundaries. Keep procedural equipment markers and high-contrast route overlays usable while replacing physical equipment bodies. Cabin/curtain/light visuals read existing runtime subscriptions and command capability checks; imported animation tracks cannot issue device commands or become a parallel simulation.
9. Test mesh compression choices against actual decode cost and source quality, rather than enabling every extension. The existing Three.js GLTFLoader supports integrating Draco, Meshopt and KTX2 loaders; use a supported pinned combination and locally served decoders. KTX2 support detection must use the active renderer. Compression reduces transfer size; it does not by itself reduce draw calls or mesh complexity. [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html).

Use application-controlled visual LOD, retaining the same semantic parents, bounds/proxies, refs and anchors across variants. LOD is not a permission level. An exterior LOD must never include simplified private interiors.

| Representation | Loading/optimization rule |
|---|---|
| LOD2, whole-building overview | Simplified per-level silhouettes, principal balcony setbacks/openings and material blocks; no room furniture or small fittings. Keep floor boundaries for explode/isolate. |
| LOD1, near or selected floor | Authored facade, railings and significant openings; fewer material batches; keep pick proxies and required shared-service context. |
| LOD0, entered authorized interior | Room-scale finishes/fixtures and appropriate equipment detail; load the entered interior and only justified neighboring content, after authorization. |
| Shared fixed core/site | Independent coarse/detail policy; do not stream a full-height core once for every visible floor. Retain existing low-detail context rings. |
| Markers/anchors/selection | Stable lightweight semantic layer independent of visual LOD. Keep selected content pinned during transition, then swap atomically. |

Use screen coverage with hysteresis for LOD changes and prefetch only authorized destinations. Keep the previous valid visual until the next package validates and is ready. An interrupted request must not attach stale geometry after the user changes level/identity. A missing detail asset should leave the existing plan/card usable.

Initial planning budgets, **not measured guarantees**: try a whole-building coarse shell under 100k triangles, a detailed common floor under 50k, and an entered interior under 150k. Start with 1K–2K material sets; justify 4K only for close inspection. Use the current same-shot draw-call count as a ceiling for the first pilot and aim substantially lower through batching; do not accept a tenfold object-count increase merely because the GLB downloads quickly. Profile final allocations and frame time on an agreed desktop and mobile device before setting release limits. Include shadows, transparency, texture residency, decode time, CPU picking and transition peaks. The existing `embedded` profile is a suitable compatibility baseline, not proof that a high-detail asset will run acceptably there.

**Safest replacement order**

| Stage | Bounded replacement | Gate before proceeding |
|---|---|---|
| 0 | Freeze current source/semantic inventory and screenshots; approve source crosswalk, transforms, material domains and policy admission | All existing refs and tests retained; unknown refs rejected; asset rollback selectable locally. No geometry replacement yet. |
| 1 | Ground architectural envelope + its three common Lobby rooms | Best first pilot: clear common-space policy, existing Reception/Lounge/Lift Lobby anchors, no private-home package. Verify exterior/entry/room selection, windows, ceiling reveal, floor alignment, Engineering + View combinations. Keep shared core/MEP procedural. |
| 2 | L1 Residents’ Club | Verify Pool/Lounge, amenity footprint and room/core clearances. Do not invent unregistered gym or additional spaces. |
| 3 | L06 exterior/unit shells first, then Apartment 6A detail as a separately admitted package | Resolve the plan/3D transform discrepancy explicitly. Facility remains summary-only; assigned Consumer retains the 12 rooms, room anchors, meters/service exceptions and device behavior. No new private detail until admission tests pass. |
| 4 | L02 → L03 → L04 → L05 → L07 → L08 → L09, one releaseable floor at a time | Reuse visual facade templates only where source agrees. Keep each floor’s own refs, transforms/material state and occupancy records. Conceptual units must not receive unregistered production private interiors. |
| 5 | L10 premium residence, then L11 → L12 | L10 currently has one modeled canonical premium unit; do not copy the three-unit L11/L12 layout onto it. Verify premium camera origins and existing room anchors before expanding detail. |
| 6 | PH envelope, then separately admitted Penthouse interior | Respect the dual level/private-unit identity and Facility outline plan. Verify setbacks, terraces and private detail cannot become visible through overview/cutaway/explode. |
| 7 | Roof / Luna Sky | Preserve Sky Bar and Pool Deck anchors, crown/terrace geometry and rooftop service placement. Keep plant and shared risers independently bound. |
| 8 | B1 architectural/service geometry | Highest coordination risk: equipment, parking/service bounds, foundations, riser gallery, routes and below-grade camera/occlusion. Preserve equipment markers/legend; replace only approved modeled spaces. Do not infer new rooms from asset clusters. |
| 9 | Shared full-height core/risers and selective source-authored structure/MEP bodies | Replace only after every floor interface has passed. Verify fixed-versus-exploded ownership, route endpoints, structural IDs and moving cabins. This is a later geometry package, not an engine or operational-state redesign. |

Within each stage, replace envelope first, then permitted interior detail, then optional fixture bodies. Replace exactly one visual representation for a given role at a time. A floor may legitimately mix imported architecture with procedural systems. Keep procedural fallback behind a per-floor/per-role manifest selection; do not remount App providers or reset the active selection during rollback. Stop each stage on acceptance failure instead of continuing to neighboring floors.

**Acceptance contract for every package**

- Canonical binding validation: no unknown/missing refs, unintended duplicates, renamed IDs or ownership cycles; explicitly allow legitimate multi-part/multi-role bindings. Every LOD resolves to the same descriptor and policy subject.
- Coordinates: floor datum, core center, entrance and representative room/asset anchors match the approved calibration. Use a proposed 10mm import-transform tolerance for landmarks that are meant to be unchanged; architectural design differences require review, not forced scaling to pass.
- Policy matrix: Facility, assigned Consumer and unrelated Consumer; known home, room, service exception, hidden device and common space. Test scene membership, payload admission, raycast targets, shadow/reflection contributions and direct imported URL handling in the eventual delivery environment. Do not rely solely on button visibility or `representationAllows`, which means non-HIDDEN and is not equivalent to permission for detailed 3D interiors.
- Behavior: all 16 rail entries and plans; single-click region selection; contextual Enter eligibility; B1 legends; occupancy/status continuity; same one-card hierarchy; Oyi summary-only private queries and authorized navigation.
- Engineering/View matrix: Architecture, All Systems and each system × Normal/Cutaway/Explode; floor isolation; room focus and ceiling reveal; section-side parity; imported and procedural neighbors together. Test material sharing does not fade/highlight unrelated floors. Test CPU picking against clipped/hidden parts.
- Cameras and runtime: preserve all existing named presets/room anchors and their clearances. Exercise the existing simulation test setup for light, curtain and elevator visual bindings without physical commands. Asset state/ref/subscription survives load, unload, fallback and LOD swap.
- Performance/lifetime: matched-shot counters, sustained real-device frame time, frame spikes while decoding, repeated floor/LOD load/unload without retained-resource growth, and canceled/failed-load recovery. Compare day and evening, transparent glass and shadows enabled.
- Visual review: aligned plans/overlays, wall openings, normals, texture scale, material consistency, no z-fighting/doubled massing, no orphaned core geometry, and usable section surfaces. A capped engineering section would be a separate capability; the current clipping behavior does not promise caps.

The existing `test:representation` and `test:presentation` scripts are valuable baseline gates. They must remain and gain import-specific checks; their current passing result is not certification of the proposed asset loader, payload security, architectural accuracy, or real-device LOD performance.

**Deliverables and scope**

Produced this audit/plan plus two local JSON evidence artifacts. The source/runtime were not edited, no model was imported, and no production/cloud/Supabase/physical-device changes were made. Public Khronos, Three.js and buildingSMART documentation was consulted only to verify format/loader conventions. No project geometry or private data was uploaded.

The next implementation unit should be the Ground pilot’s validated visual binding seam and approved asset package, after source data is available. This audit does not authorize or start that implementation.
