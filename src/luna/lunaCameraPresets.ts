import type { CameraFlightTarget } from "../engine/components/CameraRig";
import type { InteriorSpec, RoomLayoutSpec } from "./interiors/lunaInteriors";
import { LUNA_L06_APT_A } from "./interiors/lunaInteriors";
import { LUNA_LEVELS, L06_UNIT_BOXES } from "./lunaProgramme";
import type { OperationalAssetRecord } from "../engine/twinData";
import { LUNA_ROOM_CAMERA_PRESETS } from "./lunaRoomCameraPresets";

// Named hero-experience camera positions. Coordinates are hand-placed
// against Luna's actual programme (see lunaProgramme.ts): total height
// runs from B1 at -4m to the top of the Rooftop crown at ~55m, tower
// footprint 36x28, entrance/driveway sits along +z.
export const LUNA_CAMERA_PRESETS: Record<
  "exteriorHero" | "groundArrival" | "entranceApproach" | "lunaSky" | "overview" | "waterfront" | "explodedOverview" | "siteOverview" | "victoriaIslandContext" | "neighborhoodApproach" | "lunaApproach",
  CameraFlightTarget
> = {
  exteriorHero: { position: [72, 58, 88], target: [0, 26, 0] },
  // Phase 14 — moved off dead-center: the old symmetrical (0, 7, 58) ->
  // (0, 4, 17) position aimed the camera in a straight line through the
  // parked cars flanking the drop-off (GroundFacade's carBody boxes are
  // single-sided, so a ray grazing through one renders its unlit backface
  // as solid black) — confirmed the hard way in the Phase 14 visual audit
  // screenshot. A three-quarter angle reads as a more considered arrival
  // shot anyway, matching the reference's own angled composition.
  groundArrival: { position: [24, 9, 50], target: [0, 4, 10] },
  // Architectural Reality V1 — a closer, off-axis approach to the real
  // Grand Entrance assembly (GroundEntrance.tsx, centered at world
  // x=0/z=16, matching the real LUNA-GROUND-ACCESS-MAIN-01 asset
  // position) — near enough to read the actual sliding-door glazing and
  // canopy, offset in x for the same reason groundArrival's own comment
  // documents (a dead-center approach clips through single-sided facade
  // detail such as the parked cars/canopy posts).
  entranceApproach: { position: [9, 3.2, 30], target: [0, 2.2, 16] },
  lunaSky: { position: [38, 62, 42], target: [0, 52, 0] },
  overview: { position: [95, 80, 110], target: [0, 24, 0] },
  // Looking back at the tower from across the water edge (site's -x side,
  // see LunaEnvironment's waterEdgeX) — the "waterfront Lagos atmosphere"
  // establishing shot, framed low and wide like the reference elevation.
  waterfront: { position: [-95, 22, 34], target: [4, 24, -4] },
  // A distant, level, symmetrical shot sized for the exploded stack —
  // exteriorHero's steep angle foreshortens separated floors together;
  // this sits further back and lower so every gap reads individually.
  explodedOverview: { position: [110, 55, 6], target: [0, 45, 0] },

  // Phase 15B — simple navigation anchors onto the new geospatial context
  // (LunaSiteContext.tsx). Not the full Phase 16 cinematic sequence, just
  // named waypoints a "pull back and see the real context" flow can use.
  // Local +Z = true north (Ahmadu Bello Way's real bearing from the site
  // anchor — see lunaSite.ts's heading note); Ring 2's real neighbourhood
  // and Ring 3's skyline both sit predominantly north, so these all look
  // back across Luna toward +Z rather than south into the (real-data-
  // confirmed empty, per lunaRing2Data.ts) water side.
  siteOverview: { position: [130, 70, 40], target: [0, 20, 20] },
  victoriaIslandContext: { position: [-320, 260, -260], target: [80, 40, 260] },
  neighborhoodApproach: { position: [20, 35, 130], target: [0, 25, 20] },
  lunaApproach: { position: [55, 45, 95], target: [0, 30, 10] },
};

const EYE_HEIGHT = 1.7;

export function baseElevationFor(ownerLevelRef: string): number {
  return LUNA_LEVELS.find((l) => l.ref === ownerLevelRef)?.baseElevation ?? 0;
}

// Interiors nested inside an apartment unit (not directly inside their
// level's own group) need that unit's local offset added on top of the
// level's world position — same offset math LunaLevel.tsx uses to place
// the UnitVolume itself. Interiors that hang directly off a level's own
// massing (Lobby, Club, Penthouse, Luna Sky) have no extra offset.
// L06 Gold Standard — this used to hand-type the box's world position
// independently of l06UnitMassingBox()'s own formula (a second, separately
// typed-out copy of the same numbers that would silently drift if the box
// ever moved). Now reads L06_UNIT_BOXES directly, the same authoritative
// frame lunaProgramme.ts's l06UnitMassingBox() uses.
export const INTERIOR_ORIGIN_OFFSET: Record<string, { x: number; z: number }> = {
  "LUNA-L06-APT-A": { x: L06_UNIT_BOXES["LUNA-L06-APT-A"].x, z: L06_UNIT_BOXES["LUNA-L06-APT-A"].z },
  "LUNA-L10-APT-A": { x: -8, z: 0 },
};

/** A closer, room-focused shot — used both for the room-list "focus" action
 * and for the requested Apartment A -> Living Room transition. Sits near
 * one inside corner of the room's own footprint looking toward the
 * opposite corner, so it can never land inside a neighboring room or poke
 * through the (only ~3.25m clear) ceiling above.
 *
 * Critically, this stays INSIDE the room's own bounds rather than pulling
 * back outside them: the massing is a watertight solid box with no
 * modeled door/window openings, so a camera positioned outside it is just
 * looking at the opaque exterior face (backface culling only hides a
 * box's walls once the camera is already inside it, not before) —
 * confirmed the hard way during Phase 3 verification, where an
 * outside-looking-in establishing shot showed the exterior shell instead
 * of the rooms behind it. */
export function roomFocusCamera(spec: InteriorSpec, room: RoomLayoutSpec): CameraFlightTarget {
  const offset = INTERIOR_ORIGIN_OFFSET[spec.interiorRef] ?? { x: 0, z: 0 };
  const base = baseElevationFor(spec.ownerLevelRef);

  // Phase 12 — an explicitly authored shot (checked against this room's
  // actual furniture placement) beats the generic corner-inset heuristic
  // below, which Phase 11 found can hug the building's own facade for any
  // room near the unit's outer edge.
  const authored = LUNA_ROOM_CAMERA_PRESETS[room.ref];
  if (authored) {
    return {
      position: [offset.x + authored.position[0], base + authored.position[1], offset.z + authored.position[2]],
      target: [offset.x + authored.target[0], base + authored.target[1], offset.z + authored.target[2]],
      fov: authored.preferredFov,
      minDistance: authored.minimumDistance,
    };
  }

  const y = base + EYE_HEIGHT;
  const insetX = room.width * 0.4;
  const insetZ = room.depth * 0.4;
  return {
    position: [offset.x + room.x - insetX, y, offset.z + room.z - insetZ],
    target: [offset.x + room.x + insetX * 0.7, y - 0.4, offset.z + room.z + insetZ * 0.7],
  };
}

/** A wide establishing shot of an entered interior. Rather than a
 * bounding-box heuristic over every room (which a protruding balcony/
 * terrace skews badly — confirmed the hard way, see below), this anchors
 * on the single largest room by floor area and reuses the same proven
 * per-room framing as roomFocusCamera. A living room / great room / main
 * lounge is both the largest room in every interior authored so far and
 * the most sensible "first thing you see" anchor anyway. */
export function enterInteriorCamera(spec: InteriorSpec): CameraFlightTarget {
  const anchor = spec.rooms.reduce((largest, r) => (r.width * r.depth > largest.width * largest.depth ? r : largest), spec.rooms[0]);
  return roomFocusCamera(spec, anchor);
}

function roomContaining(rooms: RoomLayoutSpec[], x: number, z: number): RoomLayoutSpec {
  return (
    rooms.find((r) => x >= r.x - r.width / 2 && x <= r.x + r.width / 2 && z >= r.z - r.depth / 2 && z <= r.z + r.depth / 2) ?? rooms[0]
  );
}

/** Flies from wherever the camera currently is straight to a close, framed
 * view of one operational asset — "select the pump in B1" should feel like
 * the same kind of movement as entering an apartment, not a jump cut.
 *
 * Apartment devices reuse roomFocusCamera's exact proven-safe corner
 * framing (find the containing room, sit at an inside corner sized to a
 * fraction of that room, look toward the far side) rather than pulling
 * back a flat distance from the device itself — a flat pullback punches
 * straight through a wall for any device deliberately placed near one
 * (most of them: wall lights, wall-mounted AC units), confirmed the hard
 * way during Phase 4 verification.
 *
 * B1/Ground/Rooftop assets sit in open plant/technical zones with no
 * authored room walls, so a flat diagonal pullback is safe there as long
 * as the massing box itself renders from the inside — see the DoubleSide
 * note on the massing-tier materials in lunaMaterials.ts, the other half
 * of that same fix. */
export function assetFocusCamera(asset: OperationalAssetRecord): CameraFlightTarget {
  const baseElevation = baseElevationFor(asset.ownerLevelRef);

  if (asset.system === "apartment-devices" && asset.unitRef) {
    const offset = INTERIOR_ORIGIN_OFFSET[asset.unitRef] ?? { x: 0, z: 0 };
    const room = roomContaining(LUNA_L06_APT_A.rooms, asset.position.x, asset.position.z);
    // A standing eye height, not the device's own — InteriorRoom has no
    // ceiling mesh (only floor + corner wall stubs), so a camera raised to
    // match a ceiling-mounted light/sensor ends up with nothing above it
    // to bound the shot. Standing lower keeps the floor and nearby
    // furniture in frame regardless of how high the device itself sits.
    const y = baseElevation + 1.5;
    const insetX = room.width * 0.4;
    const insetZ = room.depth * 0.4;
    // Camera sits at the room corner OPPOSITE the device, not a fixed
    // corner — most apartment devices are deliberately wall/ceiling
    // mounted near a room edge (lights, AC units, curtains), so a fixed
    // corner frequently lands the camera almost on top of the device
    // instead of framing it from across the room. Confirmed the hard way
    // during Phase 4 verification (Living Room AC, positioned near the
    // same corner roomFocusCamera's fixed inset always used).
    const dx = asset.position.x - room.x;
    const dz = asset.position.z - room.z;
    const camX = room.x + (dx >= 0 ? -insetX : insetX);
    const camZ = room.z + (dz >= 0 ? -insetZ : insetZ);
    return {
      position: [offset.x + camX, y, offset.z + camZ],
      target: [offset.x + asset.position.x, baseElevation + asset.position.y, offset.z + asset.position.z],
    };
  }

  const worldX = asset.position.x;
  const worldZ = asset.position.z;
  const worldY = baseElevation + asset.position.y;
  const pullback = 3.2;
  return {
    position: [worldX - pullback, worldY + EYE_HEIGHT, worldZ - pullback],
    target: [worldX, worldY + 0.3, worldZ],
  };
}

/** A close exterior view of a given level, used for the "Level 06" waypoint
 * in the requested Exterior -> ... -> Apartment A chain (a good look at the
 * floor from outside before stepping into a specific apartment). */
export function levelCloseCamera(levelRef: string): CameraFlightTarget {
  const level = LUNA_LEVELS.find((l) => l.ref === levelRef);
  const y = (level?.baseElevation ?? 0) + (level?.height ?? 3.25) / 2;
  return { position: [18, y + 10, 46], target: [0, y, 0] };
}

/** Phase 16A — frames a residential unit from OUTSIDE the facade (a 3/4
 * rotate + highlight, like clicking its floor-plan rectangle in the
 * Facility level card), deliberately distinct from `roomFocusCamera`'s
 * first-person interior entry. Facility's representation policy never
 * grants a full 3D interior of a private unit (resolveUnitMode always
 * returns OPERATIONAL_2D for facility identity — see
 * lunaRepresentationPolicy.ts), so the Facility apartment-card selection
 * flow needs an exterior vantage, not an "enter" camera. Generic over any
 * unit's own plan position/size — works identically whether the unit is a
 * real authored one (L06/L10) or a Phase 16A generated placeholder
 * (lunaResidentialUnits.ts), since both ultimately place their UnitVolume
 * box at the same x/z the floor plan already uses. */
export function unitExteriorFocusCamera(levelRef: string, unit: { x: number; z: number; width: number; depth: number }): CameraFlightTarget {
  const level = LUNA_LEVELS.find((l) => l.ref === levelRef);
  const y = (level?.baseElevation ?? 0) + (level?.height ?? 3.25) / 2;
  const radial = Math.hypot(unit.x, unit.z);
  const dirX = radial < 0.5 ? 0 : unit.x / radial;
  const dirZ = radial < 0.5 ? 1 : unit.z / radial;
  const pullback = Math.max(unit.width, unit.depth) * 2.4 + 22;
  return {
    position: [unit.x + dirX * pullback, y + 15, unit.z + dirZ * pullback],
    target: [unit.x, y, unit.z],
    fov: 40,
    minDistance: 10,
  };
}
