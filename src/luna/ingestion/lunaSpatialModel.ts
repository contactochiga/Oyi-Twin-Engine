import { GROUND_ARRIVAL, L01_STAIR_DOORS } from "../architecture/podiumCoordination";
import { normalizedApartmentRooms, normalizedApartmentDoors } from "../architecture/apartmentSpatial";
// Luna — Building Ingestion V2 Parts 25/26: Luna as the reference
// fixture proving the generic engine's derivation functions reproduce
// Luna's own real, already-live behavior.
//
// Nothing here is a second, parallel data source — every value is read
// directly from Luna's existing real canonical data (lunaProgramme.ts,
// lunaInteriors.ts) and repackaged into NormalizedBuildingModel shape.
// If Luna's own real data ever changes, this repackaging changes with
// it automatically; nothing is hand-duplicated. This file feeds the
// generic engine/spatial/* derivation functions so they can be tested
// against Luna's own real, hand-authored, already-live output
// (LUNA_LEVEL_RAIL_ITEMS, LUNA_L06_FLOOR_PLAN) as the ground truth.

import { LUNA_LEVELS, LUNA_L06_UNITS, LUNA_CORES, LUNA_BUILDING_ROOT, LUNA_SITE } from "../lunaProgramme";
import { LUNA_L01_CLUB, LUNA_GROUND_LOBBY } from "../interiors/lunaInteriors";
import { GROUND_ENTRANCE_REF } from "../architecture/GroundEntrance";
import { GROUND_STAIR_REFS, stairCore } from "../architecture/groundLobbyLayout";
import { LUNA_EXTERIOR_ENTRANCE_PLAZA } from "../transitions/lunaTransitions";
import { LIFT_STOPS } from "../lift/lunaLift";
import { L06_LOBBY, L06_STAIR_LINK_WEST, L06_STAIR_LINK_EAST, L06_APARTMENT_DOORS } from "../architecture/l06FloorPlate";
import type { NormalizedBuilding, NormalizedBuildingModel, NormalizedCommonArea, NormalizedDoor, NormalizedLevel, NormalizedLift, NormalizedRiser, NormalizedSite, NormalizedStair, NormalizedUnit } from "../../engine/spatial/types";
import { emptyNormalizedBuildingModel } from "../../engine/spatial/types";

// The real, already-live short-label table (lunaLevelRail.ts) — reused
// here, not re-invented, for the handful of real Luna level names the
// generic deriveShortLabel() heuristic can't cleanly parse on its own
// ("Basement (B1)", "Level 1 — Residents' Club", "Luna Sky (Rooftop)").
// Levels whose real label the heuristic DOES parse correctly (Ground,
// Level 2-12, Penthouse) are left unset here on purpose, so the
// equivalence test also proves the automatic heuristic path, not just
// the explicit-override path.
const EXPLICIT_SHORT_LABEL: Record<string, string> = {
  "LUNA-B1": "B1",
  "LUNA-L01-AMENITIES": "L01",
  "LUNA-ROOFTOP": "ROOF",
};

function buildLevels(): NormalizedLevel[] {
  return LUNA_LEVELS.map((level, index) => ({
    canonicalRef: level.ref,
    sourceRefs: [level.ref],
    source2DRefs: [],
    source3DRefs: [level.ref],
    spaceType: "level",
    name: level.label,
    order: index,
    baseElevation: level.baseElevation,
    height: level.height,
    shortLabel: EXPLICIT_SHORT_LABEL[level.ref],
    boundary: { kind: "rect", x: 0, z: 0, width: level.footprint.width, depth: level.footprint.depth },
    confidence: 1,
    reviewStatus: "CONFIRMED",
    provenance: { derivedFrom: "computed", sourceIds: [level.ref], note: "repackaged from Luna's own real LUNA_LEVELS entry" },
  }));
}

function buildL06Units(): NormalizedUnit[] {
  return LUNA_L06_UNITS.map((unit) => ({
    canonicalRef: unit.ref,
    sourceRefs: [unit.ref],
    source2DRefs: [unit.ref],
    source3DRefs: [unit.ref],
    parentRef: "LUNA-L06",
    levelRef: "LUNA-L06",
    spaceType: "unit",
    unitCategory: "residential",
    name: unit.label,
    boundary: { kind: "rect", x: unit.planX, z: unit.planZ, width: unit.planWidth, depth: unit.planDepth },
    confidence: 1,
    reviewStatus: "CONFIRMED",
    provenance: { derivedFrom: "plan", sourceIds: [unit.ref], note: "repackaged from Luna's own real LUNA_L06_UNITS plan rect" },
  }));
}

function buildL01CommonAreas(): NormalizedCommonArea[] {
  return LUNA_L01_CLUB.rooms.map((room) => ({
    canonicalRef: room.ref,
    sourceRefs: [room.ref],
    source2DRefs: [room.ref],
    source3DRefs: [room.ref],
    parentRef: LUNA_L01_CLUB.interiorRef,
    levelRef: LUNA_L01_CLUB.ownerLevelRef,
    spaceType: "amenity",
    name: room.label,
    boundary: { kind: "rect", x: room.x, z: room.z, width: room.width, depth: room.depth },
    confidence: 1,
    reviewStatus: "CONFIRMED",
    provenance: { derivedFrom: "both", sourceIds: [room.ref], note: "repackaged from Luna's own real LUNA_L01_CLUB room rect" },
  }));
}

// LUNA_CORES' 7 real full-height elements (3 passenger lifts, 1 service
// lift, 2 stairs, 1 representative riser) genuinely serve every level of
// the building (baseElevation===buildingBase, topElevation===buildingTop
// on every entry) — servedLevelRefs reflects that real design fact
// rather than picking one arbitrary owning level.
//
// RESOLVED (L06 Gold Standard, Part 2): every core element used to share
// ONE crude placeholder rectangle here, because LUNA_CORES' own x/z sat in
// a massing coordinate frame the old 2D plan frame had never been
// reconciled with — using a real per-core rect would have looked
// nonsensical against the old plan. Now that the massing frame IS the one
// authoritative frame (lunaProgramme.ts), each core element gets its own
// real boundary — exactly LUNA_CORES' own x/z/width/depth, no shared
// placeholder band. Kept exported (now computed per-core, not a shared
// constant) only for any external code that imported the old name.
export function l06CoreBoundary(core: { x: number; z: number; width: number; depth: number }) {
  return { kind: "rect" as const, x: core.x, z: core.z, width: core.width, depth: core.depth };
}
const ALL_LEVEL_REFS = LUNA_LEVELS.map((l) => l.ref);
// Spatial Transition Engine V1.1 — a real, pre-existing data gap this fix
// closes: LUNA_CORES itself doesn't distinguish which levels a lift
// ACTUALLY stops at from which levels the shaft merely runs past. The
// real lift simulation (liftSimulation.ts's LIFT_STOPS) already excludes
// the Penthouse/Rooftop; a lift's own NormalizedLift.servedLevelRefs must
// match that real constraint, not just "every level," or a route
// orchestrator would plan a real journey to a floor no lift can actually
// reach. Stairs/risers are a different physical structure (commonly
// reaching the roof for fire egress) and keep ALL_LEVEL_REFS.
const LIFT_SERVED_LEVEL_REFS = LIFT_STOPS.map((s) => s.ref);

function buildCores(): { lifts: NormalizedLift[]; stairs: NormalizedStair[]; risers: NormalizedRiser[] } {
  const lifts: NormalizedLift[] = [];
  const stairs: NormalizedStair[] = [];
  const risers: NormalizedRiser[] = [];
  for (const core of LUNA_CORES) {
    const base = {
      canonicalRef: core.ref,
      sourceRefs: [core.ref],
      source2DRefs: [core.ref],
      source3DRefs: [core.ref],
      name: core.label,
      boundary: l06CoreBoundary(core),
      confidence: 1 as const,
      reviewStatus: "CONFIRMED" as const,
      provenance: { derivedFrom: "computed" as const, sourceIds: [core.ref], note: "repackaged from Luna's own real LUNA_CORES entry — boundary is the core's own real x/z/width/depth, the same authoritative frame the massing and the L06 Gold Standard floor plate both use" },
    };
    if (core.ref.startsWith("LUNA-LIFT")) lifts.push({ ...base, spaceType: "lift", servedLevelRefs: LIFT_SERVED_LEVEL_REFS });
    else if (core.ref.startsWith("LUNA-STAIR")) stairs.push({ ...base, spaceType: "stair", servedLevelRefs: ALL_LEVEL_REFS });
    else if (core.ref.startsWith("LUNA-RISER")) risers.push({ ...base, spaceType: "riser", servedLevelRefs: ALL_LEVEL_REFS });
  }
  return { lifts, stairs, risers };
}

/** Spatial Transition Engine V1 Part 3/24 — Luna's real doors, repackaged
 * (never re-authored) from the SAME real refs/positions the live
 * architecture already uses (GROUND_ENTRANCE_REF, GROUND_STAIR_REFS). The
 * Main Entrance is condition (A) — ANIMATABLE, a real movable leaf with
 * known kinematics (SlidingGlassDoor's own real progress). The two stair
 * doors are condition (B) — STATIC_BOUNDARY: the real hinged-door
 * geometry exists (GrandLobbyArchitecture.tsx), but it is hardcoded
 * `open={false}` with no runtime binding, so its animation state is
 * genuinely undetermined, not fabricated as controllable. */
function buildDoors(): NormalizedDoor[] {
  const mainEntrance: NormalizedDoor = {
    canonicalRef: GROUND_ENTRANCE_REF,
    sourceRefs: [GROUND_ENTRANCE_REF],
    source2DRefs: [],
    source3DRefs: [GROUND_ENTRANCE_REF],
    levelRef: "LUNA-GROUND",
    spaceType: "door",
    name: "Main Entrance",
    doorKind: "automatic_sliding",
    fromSpaceRef: LUNA_EXTERIOR_ENTRANCE_PLAZA,
    toSpaceRef: LUNA_GROUND_LOBBY.interiorRef,
    animationReadiness: "ANIMATABLE",
    confidence: 1,
    reviewStatus: "CONFIRMED",
    provenance: { derivedFrom: "computed", sourceIds: [GROUND_ENTRANCE_REF], note: "repackaged from Luna's own real GroundEntrance.tsx constants" },
  };
  const stairDoors: NormalizedDoor[] = GROUND_STAIR_REFS.map((ref) => {
    const core = stairCore(ref);
    return {
      canonicalRef: `${ref}-DOOR-01`,
      sourceRefs: [`${ref}-DOOR-01`],
      source2DRefs: [],
      source3DRefs: [`${ref}-DOOR-01`],
      levelRef: "LUNA-GROUND",
      spaceType: "door",
      name: `${ref} Door`,
      doorKind: "hinged",
      fromSpaceRef: LUNA_GROUND_LOBBY.interiorRef,
      toSpaceRef: core.ref,
      animationReadiness: "STATIC_BOUNDARY",
      confidence: 1,
      reviewStatus: "CONFIRMED",
      provenance: { derivedFrom: "computed", sourceIds: [`${ref}-DOOR-01`], note: "repackaged from GrandLobbyArchitecture.tsx's real, currently non-actuated stair door geometry" },
    };
  });
  const l01Doors: NormalizedDoor[] = L01_STAIR_DOORS.map(d=>({
    canonicalRef:d.ref,sourceRefs:[d.ref],source2DRefs:[d.ref],source3DRefs:[d.ref],
    levelRef:LUNA_L01_CLUB.ownerLevelRef,spaceType:"door",name:d.label,doorKind:"hinged",
    fromSpaceRef:LUNA_L01_CLUB.interiorRef,toSpaceRef:d.stairRef,animationReadiness:"STATIC_BOUNDARY",
    boundary:{kind:"rect",x:d.x,z:d.z,width:d.width,depth:.06},
    confidence:1,reviewStatus:"CONFIRMED",provenance:{derivedFrom:"authored",sourceIds:[d.stairRef],note:"LUNA_REFERENCE_DESIGN: static access face matching Ground reference dimensions; not certified fire egress or a live actuator."},
  }));
  return [mainEntrance, ...stairDoors, ...l01Doors];
}

/** Part 3/24 — the whole Grand Lobby interior as its own normalized
 * object, matching how the live App.tsx already treats it (enterInterior
 * sets activeInteriorRef to LUNA_GROUND_LOBBY.interiorRef, not to any one
 * of its rooms). Bounding rect COMPUTED from the real reception/lounge/
 * lift-lobby room rects below, never hand-typed. */
function buildGroundLobby(): NormalizedCommonArea {
  const rooms = LUNA_GROUND_LOBBY.rooms;
  const minX = Math.min(...rooms.map((r) => r.x - r.width / 2));
  const maxX = Math.max(...rooms.map((r) => r.x + r.width / 2));
  const minZ = Math.min(...rooms.map((r) => r.z - r.depth / 2));
  const maxZ = Math.max(GROUND_ARRIVAL.z + GROUND_ARRIVAL.depth / 2, ...rooms.map((r) => r.z + r.depth / 2));
  return {
    canonicalRef: LUNA_GROUND_LOBBY.interiorRef,
    sourceRefs: [LUNA_GROUND_LOBBY.interiorRef],
    source2DRefs: [],
    source3DRefs: [LUNA_GROUND_LOBBY.interiorRef],
    levelRef: "LUNA-GROUND",
    spaceType: "common_area",
    name: LUNA_GROUND_LOBBY.label,
    boundary: { kind: "rect", x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, width: maxX - minX, depth: maxZ - minZ },
    confidence: 1,
    reviewStatus: "CONFIRMED",
    provenance: { derivedFrom: "computed", sourceIds: [LUNA_GROUND_LOBBY.interiorRef], note: "bounding rect computed from existing room zones and the coordinated entrance approach; not net usable area" },
  };
}

/** L06 Gold Standard (Parts 7/9/10/32) — the real Passenger Lift Lobby
 * and the two stair-link corridors as their own normalized common areas,
 * `levelRef: "LUNA-L06"` so buildNavigationGraph()'s existing "common
 * areas get a free adjacency edge to their own level" rule (Part 32: "do
 * not preserve graph edges through walls simply because they existed
 * before architecture") gives the lift a real arrival space to land in —
 * see l06FloorPlate.ts for the coordination-checked rectangles this
 * repackages, never re-authored here. */
function buildL06CommonAreas(): NormalizedCommonArea[] {
  return [L06_LOBBY, L06_STAIR_LINK_WEST, L06_STAIR_LINK_EAST].map((zone) => ({
    canonicalRef: zone.ref,
    sourceRefs: [zone.ref],
    source2DRefs: [zone.ref],
    source3DRefs: [zone.ref],
    levelRef: "LUNA-L06",
    spaceType: "common_area",
    name: zone.label,
    boundary: { kind: "rect", x: zone.x, z: zone.z, width: zone.width, depth: zone.depth },
    confidence: 1,
    reviewStatus: "CONFIRMED",
    provenance: { derivedFrom: "computed", sourceIds: [zone.ref], note: "repackaged from l06FloorPlate.ts's real, coordination-checked circulation rectangle" },
  }));
}

/** L06 Gold Standard (Part 14/33) — the four real apartment entrance
 * doors, connecting the Lift Lobby to each unit. Apartment A's door is
 * the ONLY access-controlled one (its real, pre-existing governed lock,
 * LUNA-L06-APT-A-ENTRY-LOCK-01, already exists in
 * lunaSimulationProvider.ts's ACCESS_GOVERNED_REFS) — real hinged-door
 * geometry exists for all four (L06CommonArchitecture.tsx), but none has
 * a live open/close runtime binding yet (disclosed, not fabricated — see
 * that file's own comment), so every one of them is STATIC_BOUNDARY, the
 * same honest category the Ground stair doors already use. B/C/D are
 * additionally real architectural door assemblies with no access control
 * at all (Part 14: "do not fabricate locks for B/C/D"). */
function buildL06ApartmentDoors(): NormalizedDoor[] {
  return L06_APARTMENT_DOORS.map((door) => ({
    canonicalRef: door.ref,
    sourceRefs: [door.ref],
    source2DRefs: [door.ref],
    source3DRefs: [door.ref],
    levelRef: "LUNA-L06",
    spaceType: "door",
    name: door.label,
    doorKind: "hinged",
    fromSpaceRef: L06_LOBBY.ref,
    toSpaceRef: door.unitRef,
    animationReadiness: "STATIC_BOUNDARY",
    confidence: 1,
    reviewStatus: "CONFIRMED",
    provenance: { derivedFrom: "computed", sourceIds: [door.ref], note: "repackaged from l06FloorPlate.ts's real, coordination-checked entrance door position" },
  }));
}

function buildSite(): NormalizedSite {
  return {
    canonicalRef: LUNA_EXTERIOR_ENTRANCE_PLAZA,
    sourceRefs: [LUNA_EXTERIOR_ENTRANCE_PLAZA],
    source2DRefs: [],
    source3DRefs: [LUNA_EXTERIOR_ENTRANCE_PLAZA],
    spaceType: "site",
    name: "Exterior Entrance Plaza",
    boundary: { kind: "rect", x: 0, z: 0, width: LUNA_SITE.width, depth: LUNA_SITE.depth },
    confidence: 1,
    reviewStatus: "CONFIRMED",
    provenance: { derivedFrom: "computed", sourceIds: [LUNA_EXTERIOR_ENTRANCE_PLAZA], note: "the real exterior ground plane every existing exterior camera preset already looks at, repackaged from LUNA_SITE" },
  };
}

function buildBuilding(): NormalizedBuilding {
  return {
    canonicalRef: LUNA_BUILDING_ROOT.ref,
    sourceRefs: [LUNA_BUILDING_ROOT.ref],
    source2DRefs: [],
    source3DRefs: [LUNA_BUILDING_ROOT.ref],
    spaceType: "building",
    name: LUNA_BUILDING_ROOT.label,
    confidence: 1,
    reviewStatus: "CONFIRMED",
    provenance: { derivedFrom: "computed", sourceIds: [LUNA_BUILDING_ROOT.ref], note: "repackaged from Luna's own real LUNA_BUILDING_ROOT" },
  };
}

/** The reference-fixture model itself — Luna's own real levels, L06's 4
 * real units, L01's 2 real amenity rooms, and the 7 real full-height
 * cores, all repackaged (never re-authored) into normalized shape. This
 * is deliberately a SUBSET of Luna's full data (not every residential
 * level's generated units, not L06 Apartment A's 12-room interior) —
 * exactly the two fixtures Part 25/26 name, kept small on purpose so the
 * equivalence proof stays easy to audit by hand against the real source
 * constants above. */
export function buildLunaReferenceModel(): NormalizedBuildingModel {
  const model = emptyNormalizedBuildingModel("LUNA");
  model.building = buildBuilding();
  model.site = buildSite();
  model.levels = buildLevels();
  model.units = buildL06Units();
  model.rooms = normalizedApartmentRooms();
  model.rooms.push(...LUNA_GROUND_LOBBY.rooms.map(room => ({
    canonicalRef: room.ref, sourceRefs: [room.ref], source2DRefs: [room.ref], source3DRefs: [room.ref],
    parentRef: LUNA_GROUND_LOBBY.interiorRef, levelRef: LUNA_GROUND_LOBBY.ownerLevelRef,
    spaceType: "room" as const, name: room.label,
    boundary: { kind: "rect" as const, x: room.x, z: room.z, width: room.width, depth: room.depth },
    connectedSpaceRefs: [LUNA_GROUND_LOBBY.interiorRef], confidence: 1, reviewStatus: "CONFIRMED" as const,
    provenance: { derivedFrom: "computed" as const, sourceIds: [room.ref], note: "Existing Ground open zones; Phase 2 coordinated passages." },
  })));
  model.commonAreas = [...buildL01CommonAreas(), {
    canonicalRef: LUNA_L01_CLUB.interiorRef, sourceRefs: [LUNA_L01_CLUB.interiorRef], source2DRefs: [], source3DRefs: [LUNA_L01_CLUB.interiorRef],
    levelRef: LUNA_L01_CLUB.ownerLevelRef, spaceType: "common_area", name: LUNA_L01_CLUB.label,
    // Aggregate context, not a claim that the core inside this bounding box is walkable.
    boundary: (() => {
      const rooms=LUNA_L01_CLUB.rooms;
      const minX=Math.min(...rooms.map(r=>r.x-r.width/2)), maxX=Math.max(...rooms.map(r=>r.x+r.width/2));
      const minZ=Math.min(...rooms.map(r=>r.z-r.depth/2)), maxZ=5.5; // arrival centre 5.2 plus 0.3m body margin
      return { kind: "rect" as const, x:(minX+maxX)/2,z:(minZ+maxZ)/2,width:maxX-minX,depth:maxZ-minZ };
    })(),
    confidence: 1, reviewStatus: "CONFIRMED", provenance: { derivedFrom: "computed", sourceIds: LUNA_L01_CLUB.rooms.map(r=>r.ref), note: "Existing amenity group plus common arrival; collision and passages govern actual walkability." },
  }, buildGroundLobby(), ...buildL06CommonAreas()];
  const cores = buildCores();
  model.lifts = cores.lifts;
  model.stairs = cores.stairs;
  model.risers = cores.risers;
  model.doors = [...buildDoors(), ...buildL06ApartmentDoors(), ...normalizedApartmentDoors()];
  return model;
}
