// Apartment A Full Interior Reality V1 (Part 27) — the real, required
// transform: 3D BUILDING/FLOOR POSITION -> AUTHORITATIVE L06/APARTMENT
// LOCAL FRAME -> 2D PLAN COORDINATE. Reuses the EXACT same
// INTERIOR_ORIGIN_OFFSET/baseElevationFor lunaCameraPresets.ts's own
// roomFocusCamera() already uses to go local -> world when flying the
// camera TO a room — this is that same transform run in reverse, off the
// live camera position, never a second hand-typed coordinate system.

import { LUNA_LEVELS } from "./lunaProgramme";
import { INTERIOR_ORIGIN_OFFSET, baseElevationFor } from "./lunaCameraPresets";

export interface PlanLocalPosition {
  x: number;
  z: number;
}

// L06's own real, declared level height (lunaProgramme.ts) — not a guessed
// vertical tolerance. baseElevation is the level's floor slab; a camera
// between the slab and slab+height (with a small margin for eye height
// above the slab and headroom below the level above) is really "on L06."
const L06_HEIGHT = LUNA_LEVELS.find((l) => l.ref === "LUNA-L06")!.height;
const VERTICAL_MARGIN = 1; // generous margin for eye height / camera flight overshoot, not a precise slab pick

/** Converts a live WORLD position into Apartment A's own local plan frame
 * (the same origin lunaInteriors.ts's room.x/room.z already use) — or null
 * if the position isn't really on L06 at all (Part 28: "if the camera is
 * not physically on the represented floor, do not show a misleading dot"). */
export function worldToApartmentALocal(worldX: number, worldY: number, worldZ: number): PlanLocalPosition | null {
  const base = baseElevationFor("LUNA-L06");
  if (worldY < base - VERTICAL_MARGIN || worldY > base + L06_HEIGHT + VERTICAL_MARGIN) return null;
  const offset = INTERIOR_ORIGIN_OFFSET["LUNA-L06-APT-A"];
  return { x: worldX - offset.x, z: worldZ - offset.z };
}

/** Converts a live WORLD position into L06's own common-circulation frame
 * (the same frame lunaFloorPlans.ts's LUNA_L06_FLOOR_PLAN already uses —
 * L06's architecture hangs directly off the level's own massing group, so
 * this is a pure vertical-only check, no horizontal offset). */
export function worldToL06Local(worldX: number, worldY: number, worldZ: number): PlanLocalPosition | null {
  const base = baseElevationFor("LUNA-L06");
  if (worldY < base - VERTICAL_MARGIN || worldY > base + L06_HEIGHT + VERTICAL_MARGIN) return null;
  return { x: worldX, z: worldZ };
}

export type SpatialMapContext =
  | { kind: "apartment-a"; local: PlanLocalPosition }
  | { kind: "l06-common"; local: PlanLocalPosition }
  | { kind: "off-floor" };

/** The one function the live position dot and the persistent map both
 * consume — given a live world position AND which interior is currently
 * "active" (App.tsx's own activeInteriorRef, the same state that already
 * decides which UnitVolume shell goes opaque), decides which plan frame
 * the dot belongs in, or reports "off-floor" honestly rather than showing
 * a misleading position (Part 28). */
export function resolveSpatialMapContext(worldPos: { x: number; y: number; z: number }, activeInteriorRef: string | null): SpatialMapContext {
  if (activeInteriorRef === "LUNA-L06-APT-A") {
    const local = worldToApartmentALocal(worldPos.x, worldPos.y, worldPos.z);
    if (local) return { kind: "apartment-a", local };
    return { kind: "off-floor" };
  }
  const local = worldToL06Local(worldPos.x, worldPos.y, worldPos.z);
  if (local) return { kind: "l06-common", local };
  return { kind: "off-floor" };
}
