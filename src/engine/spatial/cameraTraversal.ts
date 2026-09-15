// Oyi Twin Engine — Spatial Transition Engine V1 Part 6: camera
// traversal. Extends the EXISTING camera architecture (CameraRig.tsx's
// CameraFlightTarget/CameraFlight) rather than replacing it — a
// traversal is just an ORDERED SEQUENCE of the exact same
// CameraFlightTarget shape CameraRig already knows how to fly to one at a
// time. This file only builds that sequence and steps through it; it
// never touches three.js directly and never becomes a second camera
// engine.

import type { CameraFlightTarget } from "../components/CameraRig";
import type { SpatialTransition } from "./transitions";
import type { SpatialPoint3D } from "./types";

function lookDirection(from: SpatialPoint3D, to: SpatialPoint3D): SpatialPoint3D {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.001) return { x: from.x, y: to.y, z: from.z + 1 };
  return { x: from.x + dx / len, y: to.y, z: from.z + dz / len };
}

/** One CameraFlightTarget per point in transition.crossingPath, each one
 * looking toward the NEXT point in the path (the last waypoint keeps
 * looking in the direction it was already travelling, i.e. continuing
 * forward into the destination space rather than snapping to look back).
 * This is deliberately a straight point-to-point sequence, not a smoothed
 * spline — Part 6's own instruction is "physically traverse," not "build
 * a full game engine." */
export function buildTraversalWaypoints(transition: SpatialTransition): CameraFlightTarget[] {
  const path = transition.crossingPath;
  if (path.length < 2) {
    throw new Error(`SpatialTransition ${transition.transitionId} has a crossingPath with fewer than 2 points — cannot build a traversal`);
  }
  return path.map((point, index) => {
    const lookAt = index < path.length - 1 ? lookDirection(point, path[index + 1]) : lookDirection(path[index - 1], point);
    return {
      position: [point.x, point.y, point.z],
      target: [lookAt.x, lookAt.y, lookAt.z],
    };
  });
}

export function isLastWaypoint(index: number, waypoints: CameraFlightTarget[]): boolean {
  return index >= waypoints.length - 1;
}
