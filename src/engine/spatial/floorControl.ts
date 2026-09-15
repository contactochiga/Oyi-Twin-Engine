// Oyi Twin Engine — Building Ingestion V2 Parts 6/9: the generic floor
// control card. FloorPlan2D.tsx (Phase 8) was already a pure renderer of
// whatever FloorPlanSpec it's handed; every real project (Luna included)
// had to hand-assemble that spec itself (see lunaFloorPlans.ts's three
// separate, per-level-category code paths). This file is the one
// generic assembler every project — 2 units or 12, apartments or hotel
// rooms or retail — can share, working from NormalizedBuildingModel data
// alone. The architect's plan remains the source; this function only
// repackages already-real boundary data into FloorPlan2D's rendering
// shape, it never invents a room that isn't already in the model.

import type { CanonicalRef } from "../types";
import type { FloorPlanCoreSpec, FloorPlanSpec, FloorPlanUnitSpec } from "../components/FloorPlan2D";
import type { NormalizedBuildingModel, NormalizedLevel, NormalizedSpatialObject, SpatialBoundary } from "./types";
import { spacesOnLevel } from "./types";

interface RectExtent {
  x: number;
  z: number;
  width: number;
  depth: number;
}

/** A SpatialBoundary may be a real rect or a polygon; FloorPlan2D only
 * ever draws rects, so a polygon is reduced to its own bounding rect —
 * disclosed here as a real simplification, not silently dropped detail. */
function boundaryToRect(boundary: SpatialBoundary): RectExtent {
  if (boundary.kind === "rect") return { x: boundary.x, z: boundary.z, width: boundary.width, depth: boundary.depth };
  const xs = boundary.points.map((p) => p.x);
  const zs = boundary.points.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, width: maxX - minX, depth: maxZ - minZ };
}

/** The smallest rect, CENTERED AT (0,0), that still fully contains every
 * given rect — matches FloorPlan2D's own hard-coded assumption that the
 * outline and core are always centered at plan-origin
 * (`toSvg(-width/2,-depth/2)`), even when the real union of space rects
 * isn't itself symmetric about zero. */
function symmetricEnclosingExtent(rects: RectExtent[]): { width: number; depth: number } {
  if (rects.length === 0) return { width: 0, depth: 0 };
  let maxAbsX = 0;
  let maxAbsZ = 0;
  for (const r of rects) {
    maxAbsX = Math.max(maxAbsX, Math.abs(r.x) + r.width / 2);
    maxAbsZ = Math.max(maxAbsZ, Math.abs(r.z) + r.depth / 2);
  }
  return { width: maxAbsX * 2, depth: maxAbsZ * 2 };
}

/** The union bounding rect of a set of rects (not forced symmetric) —
 * used for the structural core, which FloorPlanCoreSpec expects as its
 * own real x/z/width/depth, not necessarily centered at origin. */
function unionExtent(rects: RectExtent[]): RectExtent {
  if (rects.length === 0) return { x: 0, z: 0, width: 0, depth: 0 };
  const minX = Math.min(...rects.map((r) => r.x - r.width / 2));
  const maxX = Math.max(...rects.map((r) => r.x + r.width / 2));
  const minZ = Math.min(...rects.map((r) => r.z - r.depth / 2));
  const maxZ = Math.max(...rects.map((r) => r.z + r.depth / 2));
  return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, width: maxX - minX, depth: maxZ - minZ };
}

function spaceTypeToUnitKind(spaceType: NormalizedSpatialObject["spaceType"]): FloorPlanUnitSpec["kind"] {
  if (spaceType === "unit" || spaceType === "home") return "unit";
  // Lift lobbies, corridors, amenities, service spaces, rooms all render
  // as the generic "room" kind — the same convention Luna's own
  // lunaFloorPlans.ts already uses for Lift Lobby/Stairs, so a mixed
  // Luna + generic floor plan reads consistently.
  return "room";
}

/** A lift/stair/riser "belongs" to a level either directly (levelRef, the
 * common case for a riser scoped to one level) or by serving it as one of
 * several levels a real vertical-transport element connects (Part 17/18:
 * lifts/stairs genuinely serve MULTIPLE levels — a single levelRef field
 * would silently exclude a full-height core from every level's floor
 * plan except one). */
function coreServesLevel(core: { levelRef?: CanonicalRef; servedLevelRefs?: CanonicalRef[] }, levelRef: CanonicalRef): boolean {
  return core.levelRef === levelRef || (core.servedLevelRefs?.includes(levelRef) ?? false);
}

/** Derives a real FloorPlanSpec purely from normalized data — no
 * hand-authored per-project spec file required. Spaces with no boundary
 * yet (genuinely un-geolocated, review-required objects) are honestly
 * omitted rather than placed at a fabricated position; callers that need
 * to know about them should inspect the model directly, not this
 * rendering-only output. */
export function deriveFloorPlanSpec(model: NormalizedBuildingModel, levelRef: CanonicalRef): FloorPlanSpec | undefined {
  const level = model.levels.find((l) => l.canonicalRef === levelRef);
  if (!level) return undefined;

  const spaces = spacesOnLevel(model, levelRef).filter((s) => s.boundary);
  const spaceRects = spaces.map((s) => ({ space: s, rect: boundaryToRect(s.boundary!) }));

  const coreObjects = [...model.lifts, ...model.risers, ...model.stairs].filter((o) => coreServesLevel(o, levelRef) && o.boundary);
  const coreRects = coreObjects.map((o) => boundaryToRect(o.boundary!));
  const core: FloorPlanCoreSpec = coreRects.length > 0 ? { ...unionExtent(coreRects), label: coreObjects.length === 1 ? coreObjects[0].name : "Core" } : { x: 0, z: 0, width: 0, depth: 0 };

  const outline = symmetricEnclosingExtent([...spaceRects.map((sr) => sr.rect), ...coreRects]);

  const units: FloorPlanUnitSpec[] = spaceRects.map(({ space, rect }) => ({
    ref: space.canonicalRef,
    label: space.name,
    kind: spaceTypeToUnitKind(space.spaceType),
    x: rect.x,
    z: rect.z,
    width: rect.width,
    depth: rect.depth,
  }));

  return { levelRef, label: level.name, outline, core, units };
}

/** Convenience — every level in the model that has at least one space
 * with real boundary data, i.e. every level a real floor control card
 * can actually be derived for today. */
export function levelsWithFloorControl(model: NormalizedBuildingModel): NormalizedLevel[] {
  return model.levels.filter((level) => spacesOnLevel(model, level.canonicalRef).some((s) => s.boundary));
}
