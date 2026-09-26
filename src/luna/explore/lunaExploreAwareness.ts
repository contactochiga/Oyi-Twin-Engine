import { LUNA_GROUND_LOBBY, LUNA_L01_CLUB } from "../interiors/lunaInteriors";
import type { CanonicalRef, TwinNodeDescriptor } from "../../engine/types";
import type { ExploreBounds } from "../../engine/components/ExploreCameraDriver";
import type { NormalizedSpatialObject } from "../../engine/spatial/types";
import { allSpatialObjects } from "../../engine/spatial/types";
import { buildLunaReferenceModel } from "../ingestion/lunaSpatialModel";
import { LUNA_LEVELS } from "../lunaProgramme";
import { lunaTwinDataProvider } from "../operational/lunaTwinDataProvider";
import { findSpace } from "../interiors/lunaSpaceLookup";
import { LUNA_EXTERIOR_ENTRANCE_PLAZA } from "../transitions/lunaTransitions";

let cachedModel: ReturnType<typeof buildLunaReferenceModel> | undefined;
const referenceModel = () => cachedModel ??= buildLunaReferenceModel();

function contains2D(obj: NormalizedSpatialObject, x: number, z: number): boolean {
  const boundary = obj.boundary;
  if (!boundary) return false;
  if (boundary.kind === "rect") {
    return x >= boundary.x - boundary.width / 2 && x <= boundary.x + boundary.width / 2 && z >= boundary.z - boundary.depth / 2 && z <= boundary.z + boundary.depth / 2;
  }
  let inside = false;
  for (let i = 0, j = boundary.points.length - 1; i < boundary.points.length; j = i++) {
    const pi = boundary.points[i];
    const pj = boundary.points[j];
    if ((pi.z > z) !== (pj.z > z) && x < ((pj.x - pi.x) * (z - pi.z)) / (pj.z - pi.z) + pi.x) inside = !inside;
  }
  return inside;
}

function levelForY(y: number) {
  return LUNA_LEVELS.find((level) => y >= level.baseElevation - 0.25 && y <= level.baseElevation + level.height + 0.25);
}

export function resolveLunaExploreSpace(position: { x: number; y: number; z: number }, activeInteriorRef: CanonicalRef | null): CanonicalRef {
  const model = referenceModel();
  const level = levelForY(position.y);
  const objects = allSpatialObjects(model).filter((obj) => obj.boundary && obj.levelRef === level?.ref && contains2D(obj, position.x, position.z));
  const interiorObjects = activeInteriorRef ? objects.filter((obj) => obj.parentRef === activeInteriorRef || obj.canonicalRef === activeInteriorRef) : [];
  const podiumSpec = level?.ref === "LUNA-GROUND" ? LUNA_GROUND_LOBBY : level?.ref === "LUNA-L01-AMENITIES" ? LUNA_L01_CLUB : null;
  const podiumRoom = podiumSpec?.rooms.find(r => Math.abs(position.x-r.x) <= r.width/2 && Math.abs(position.z-r.z) <= r.depth/2);
  if (podiumRoom) return podiumRoom.ref;
  if (level?.ref === "LUNA-GROUND" && position.z > 16) return LUNA_EXTERIOR_ENTRANCE_PLAZA;
  const room = interiorObjects.find((obj) => obj.spaceType === "room");
  if (room) return room.canonicalRef;
  const common = objects.find((obj) => obj.spaceType === "common_area" || obj.spaceType === "corridor" || obj.spaceType === "amenity" || obj.spaceType === "service_space");
  if (common) return common.canonicalRef;
  const unit = objects.find((obj) => obj.spaceType === "unit" || obj.spaceType === "home");
  if (unit) return unit.canonicalRef;
  return level?.ref ?? LUNA_EXTERIOR_ENTRANCE_PLAZA;
}

export function lunaExploreBounds(activeInteriorRef: CanonicalRef | null, isolatedLevelRef: CanonicalRef | null): ExploreBounds | null {
  const model = referenceModel();
  if (activeInteriorRef && activeInteriorRef !== LUNA_GROUND_LOBBY.interiorRef && activeInteriorRef !== LUNA_L01_CLUB.interiorRef) {
    const rooms = model.rooms.filter((room) => room.parentRef === activeInteriorRef && room.boundary?.kind === "rect");
    if (rooms.length) {
      const extents = rooms.map((room) => {
        const rect = room.boundary as { kind: "rect"; x: number; z: number; width: number; depth: number };
        return { minX: rect.x - rect.width / 2, maxX: rect.x + rect.width / 2, minZ: rect.z - rect.depth / 2, maxZ: rect.z + rect.depth / 2 };
      });
      return {
        minX: Math.min(...extents.map((e) => e.minX)) + 0.25,
        maxX: Math.max(...extents.map((e) => e.maxX)) - 0.25,
        minZ: Math.min(...extents.map((e) => e.minZ)) + 0.25,
        maxZ: Math.max(...extents.map((e) => e.maxZ)) - 0.25,
      };
    }
  }
  const level = LUNA_LEVELS.find((l) => l.ref === isolatedLevelRef);
  if (!level) return null;
  return {
    minX: -level.footprint.width / 2 + 0.6,
    maxX: level.footprint.width / 2 - 0.6,
    minZ: -level.footprint.depth / 2 + 0.6,
    maxZ: level.ref === "LUNA-GROUND" ? 27 : level.footprint.depth / 2 - 0.6,
  };
}

export function descriptorForExploreTarget(ref: CanonicalRef): TwinNodeDescriptor | null {
  const asset = lunaTwinDataProvider.getAsset(ref);
  if (asset) return { ref: asset.ref, kind: asset.kind, label: asset.label, parentRef: asset.parentRef };
  const found = findSpace(ref);
  if (found?.kind === "level") return { ref: found.level.ref, kind: "level", label: found.level.label };
  if (found?.kind === "interior") return { ref: found.spec.interiorRef, kind: "unit", label: found.spec.label };
  if (found?.kind === "unit") return { ref: found.ref, kind: "unit", label: found.label };
  if (found?.kind === "room") return { ref: found.room.ref, kind: "room", label: found.room.label, parentRef: found.spec.interiorRef };
  if (found?.kind === "door") return { ref: found.ref, kind: "door", label: found.label };
  const model = referenceModel();
  const obj = allSpatialObjects(model).find((entry) => entry.canonicalRef === ref);
  if (!obj) return null;
  const kind = obj.spaceType === "lift" ? "device" : obj.spaceType === "stair" || obj.spaceType === "riser" ? "core-shaft" : obj.spaceType === "structural_element" ? "structural-element" : "room";
  return { ref, kind, label: obj.name, parentRef: obj.parentRef };
}
