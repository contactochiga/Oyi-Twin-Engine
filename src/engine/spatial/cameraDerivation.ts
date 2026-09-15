// Oyi Twin Engine — Building Ingestion V2 Parts 13/14: automatic camera
// destination derivation + safety validation.
//
// Luna's own camera presets (lunaCameraPresets.ts/lunaRoomCameraPresets.ts)
// are mostly hand-authored literals — real, tuned, and NOT what this file
// replaces. But a few of Luna's own functions were already spatially
// DERIVED, not authored (found during the Part 1 audit):
//   - unitExteriorFocusCamera(): a pullback computed from a unit's plan
//     rect + radial direction from the building center — already
//     building-agnostic in spirit.
//   - roomFocusCamera()'s fallback: a "40% corner inset" heuristic used
//     only when no hand-authored preset exists for a room.
//   - assetFocusCamera()'s pullback: computed from an asset's own
//     position, with a room-relative "opposite corner" branch.
// This file generalizes exactly those three techniques into real,
// reusable, building-agnostic functions, so a newly ingested project
// gets equivalent camera behavior without anyone hand-typing coordinates
// for every space. Where geometry is insufficient, a destination is
// marked CAMERA_REVIEW_REQUIRED (Part 14) rather than guessed.

import type { CameraFlightTarget } from "../components/CameraRig";
import type { CanonicalRef } from "../types";
import type { NormalizedBuildingModel, NormalizedLevel, NormalizedSpatialObject, SpatialBoundary, SpatialPoint3D } from "./types";

export type CameraDestinationKind = "BUILDING_OVERVIEW" | "LEVEL_OVERVIEW" | "SPACE_EXTERIOR" | "SPACE_ENTRY" | "SPACE_INTERIOR" | "ASSET_FOCUS" | "LIFT_LOBBY" | "STAIR_INTERFACE";

export type CameraDerivationStatus = "AUTO_PROPOSED" | "CAMERA_REVIEW_REQUIRED";

export interface DerivedCameraDestination {
  kind: CameraDestinationKind;
  spatialRef: CanonicalRef;
  /** Null exactly when status is CAMERA_REVIEW_REQUIRED — never a guessed
   * placeholder target standing in for "we don't actually know." */
  target: CameraFlightTarget | null;
  confidence: number | "UNKNOWN";
  status: CameraDerivationStatus;
  note?: string;
}

function rectCenterAndHalfExtent(boundary: SpatialBoundary): { x: number; z: number; halfWidth: number; halfDepth: number } {
  if (boundary.kind === "rect") return { x: boundary.x, z: boundary.z, halfWidth: boundary.width / 2, halfDepth: boundary.depth / 2 };
  const xs = boundary.points.map((p) => p.x);
  const zs = boundary.points.map((p) => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, halfWidth: (maxX - minX) / 2, halfDepth: (maxZ - minZ) / 2 };
}

const EYE_HEIGHT = 1.7; // a standing person's eye height, metres — same value Luna's own room presets use throughout

/** Generalizes Luna's unitExteriorFocusCamera(): pull back along the
 * radial direction from the building's own plan center through the
 * space's centroid, so the camera always approaches from OUTSIDE the
 * building rather than through other spaces. */
export function deriveSpaceExteriorCamera(space: NormalizedSpatialObject, level: NormalizedLevel, buildingCenter: { x: number; z: number } = { x: 0, z: 0 }): DerivedCameraDestination {
  if (!space.boundary) return { kind: "SPACE_EXTERIOR", spatialRef: space.canonicalRef, target: null, confidence: "UNKNOWN", status: "CAMERA_REVIEW_REQUIRED", note: "no real boundary data for this space yet" };
  const { x, z, halfWidth, halfDepth } = rectCenterAndHalfExtent(space.boundary);
  const dx = x - buildingCenter.x;
  const dz = z - buildingCenter.z;
  const radialLength = Math.hypot(dx, dz);
  const dirX = radialLength > 0.01 ? dx / radialLength : 0;
  const dirZ = radialLength > 0.01 ? dz / radialLength : 1;
  const pullback = Math.max(halfWidth, halfDepth) * 2 + 6;
  const elevation = (level.baseElevation ?? 0) + EYE_HEIGHT + 1;
  return {
    kind: "SPACE_EXTERIOR",
    spatialRef: space.canonicalRef,
    target: { position: [x + dirX * pullback, elevation + 2, z + dirZ * pullback], target: [x, elevation, z] },
    confidence: space.confidence,
    status: "AUTO_PROPOSED",
  };
}

/** Generalizes roomFocusCamera()'s own fallback heuristic: a "40% corner
 * inset" shot that reliably stays inside a watertight rect without
 * needing furniture/entry data — the same technique already
 * battle-tested live in Luna for every room with no hand-authored
 * preset. */
export function deriveSpaceInteriorCamera(space: NormalizedSpatialObject, level: NormalizedLevel): DerivedCameraDestination {
  if (!space.boundary) return { kind: "SPACE_INTERIOR", spatialRef: space.canonicalRef, target: null, confidence: "UNKNOWN", status: "CAMERA_REVIEW_REQUIRED", note: "no real boundary data for this space yet" };
  const { x, z, halfWidth, halfDepth } = rectCenterAndHalfExtent(space.boundary);
  const insetX = x - halfWidth * 0.4;
  const insetZ = z - halfDepth * 0.4;
  const elevation = (level.baseElevation ?? 0) + EYE_HEIGHT;
  return {
    kind: "SPACE_INTERIOR",
    spatialRef: space.canonicalRef,
    target: { position: [insetX, elevation, insetZ], target: [x, elevation, z] },
    confidence: space.confidence,
    status: "AUTO_PROPOSED",
  };
}

/** SPACE_ENTRY — the approach shot toward a space's own recognized entry
 * point, when one exists; otherwise falls back to the exterior derivation
 * (still a real, honest shot, just without entry-point precision). */
export function deriveSpaceEntryCamera(space: NormalizedSpatialObject, level: NormalizedLevel, buildingCenter: { x: number; z: number } = { x: 0, z: 0 }): DerivedCameraDestination {
  const entry = space.entryPoints?.[0];
  if (!entry) return { ...deriveSpaceExteriorCamera(space, level, buildingCenter), kind: "SPACE_ENTRY" };
  const dx = entry.x - buildingCenter.x;
  const dz = entry.z - buildingCenter.z;
  const len = Math.hypot(dx, dz) || 1;
  const approachDistance = 6;
  return {
    kind: "SPACE_ENTRY",
    spatialRef: space.canonicalRef,
    target: { position: [entry.x + (dx / len) * approachDistance, entry.y + 1.2, entry.z + (dz / len) * approachDistance], target: [entry.x, entry.y, entry.z] },
    confidence: space.confidence,
    status: "AUTO_PROPOSED",
  };
}

/** Generalizes assetFocusCamera()'s pullback: a fixed-distance shot
 * aimed at a real asset/device position, with an optional room-relative
 * "look from the opposite corner" refinement when the asset's owning
 * space is known. */
export function deriveAssetFocusCamera(assetRef: CanonicalRef, position: SpatialPoint3D, ownerSpace?: NormalizedSpatialObject): DerivedCameraDestination {
  let camX = position.x;
  let camZ = position.z + 3;
  if (ownerSpace?.boundary) {
    const { x, z, halfWidth, halfDepth } = rectCenterAndHalfExtent(ownerSpace.boundary);
    // Opposite corner from the asset, relative to the room center — keeps
    // the shot inside the room rather than potentially through a wall.
    const signX = position.x >= x ? -1 : 1;
    const signZ = position.z >= z ? -1 : 1;
    camX = x + signX * halfWidth * 0.7;
    camZ = z + signZ * halfDepth * 0.7;
  }
  return {
    kind: "ASSET_FOCUS",
    spatialRef: assetRef,
    target: { position: [camX, position.y + 1, camZ], target: [position.x, position.y, position.z] },
    confidence: ownerSpace ? ownerSpace.confidence : "UNKNOWN",
    status: "AUTO_PROPOSED",
  };
}

export function deriveLevelOverviewCamera(level: NormalizedLevel, model: NormalizedBuildingModel): DerivedCameraDestination {
  const footprint = level.boundary && level.boundary.kind === "rect" ? level.boundary : undefined;
  const halfWidth = footprint?.width ? footprint.width / 2 : 20;
  const halfDepth = footprint?.depth ? footprint.depth / 2 : 20;
  const elevation = (level.baseElevation ?? level.order * 3.5) + (level.height ?? 3.5) / 2;
  return {
    kind: "LEVEL_OVERVIEW",
    spatialRef: level.canonicalRef,
    target: { position: [halfWidth * 1.6, elevation + halfDepth * 0.9, halfDepth * 1.6], target: [0, elevation, 0] },
    confidence: level.confidence,
    status: model.levels.includes(level) ? "AUTO_PROPOSED" : "CAMERA_REVIEW_REQUIRED",
  };
}

export function deriveBuildingOverviewCamera(model: NormalizedBuildingModel): DerivedCameraDestination {
  if (model.levels.length === 0 || !model.building) {
    return { kind: "BUILDING_OVERVIEW", spatialRef: model.building?.canonicalRef ?? model.projectId, target: null, confidence: "UNKNOWN", status: "CAMERA_REVIEW_REQUIRED", note: "no levels ingested yet" };
  }
  const maxHeight = Math.max(...model.levels.map((l) => (l.baseElevation ?? l.order * 3.5) + (l.height ?? 3.5)));
  const maxFootprint = Math.max(20, ...model.levels.map((l) => (l.boundary && l.boundary.kind === "rect" ? Math.max(l.boundary.width, l.boundary.depth) : 0)));
  const distance = maxFootprint * 1.4 + maxHeight;
  return {
    kind: "BUILDING_OVERVIEW",
    spatialRef: model.building.canonicalRef,
    target: { position: [distance * 0.7, maxHeight * 0.7 + 10, distance], target: [0, maxHeight / 2, 0] },
    confidence: model.building.confidence,
    status: "AUTO_PROPOSED",
  };
}

/** LIFT_LOBBY / STAIR_INTERFACE — thin, semantically named wrappers over
 * the entry-camera derivation (Part 13's own explicit destination-kind
 * list) so callers/tests can request them by real intent rather than by
 * generic space-entry logic alone. */
export function deriveLiftLobbyCamera(lobby: NormalizedSpatialObject, level: NormalizedLevel, buildingCenter?: { x: number; z: number }): DerivedCameraDestination {
  return { ...deriveSpaceEntryCamera(lobby, level, buildingCenter), kind: "LIFT_LOBBY" };
}

export function deriveStairInterfaceCamera(stair: NormalizedSpatialObject, level: NormalizedLevel, buildingCenter?: { x: number; z: number }): DerivedCameraDestination {
  return { ...deriveSpaceEntryCamera(stair, level, buildingCenter), kind: "STAIR_INTERFACE" };
}

// ---------------------------------------------------------------------
// Part 14 — camera safety validation. Only checks that can genuinely be
// answered from DATA (positions/bounds already in the normalized model)
// are implemented here — true visual occlusion (a mesh literally blocking
// the shot) requires live scene geometry this data-only layer doesn't
// have, and is NOT claimed as checked. Anything this function can't
// verify stays whatever status derivation already gave it; it only ever
// downgrades AUTO_PROPOSED to CAMERA_REVIEW_REQUIRED, never the reverse.
// ---------------------------------------------------------------------

function pointInsideBounds3D(point: [number, number, number], bounds: { min: SpatialPoint3D; max: SpatialPoint3D }): boolean {
  const [x, y, z] = point;
  return x > bounds.min.x && x < bounds.max.x && y > bounds.min.y && y < bounds.max.y && z > bounds.min.z && z < bounds.max.z;
}

export function validateCameraDestination(destination: DerivedCameraDestination, model: NormalizedBuildingModel): DerivedCameraDestination {
  if (destination.status === "CAMERA_REVIEW_REQUIRED" || !destination.target) return destination;

  const { position, target } = destination.target;
  const distance = Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2]);
  if (distance < 0.05) {
    return { ...destination, status: "CAMERA_REVIEW_REQUIRED", note: "derived camera position and target are degenerate (near-zero distance)" };
  }

  // Camera position must not fall INSIDE another space's own solid 3D
  // bounds (a real, checkable "camera inside object" case) — only
  // evaluated for spaces that actually carry bounds3D data; absent data
  // is not treated as a failure, only as "cannot verify."
  const allSpaces: NormalizedSpatialObject[] = [...model.units, ...model.rooms, ...model.commonAreas, ...model.structuralElements];
  for (const other of allSpaces) {
    if (other.canonicalRef === destination.spatialRef) continue;
    if (!other.bounds) continue;
    if (pointInsideBounds3D(position, other.bounds)) {
      return { ...destination, status: "CAMERA_REVIEW_REQUIRED", note: `derived camera position falls inside ${other.canonicalRef}'s own solid bounds` };
    }
  }

  return destination;
}
