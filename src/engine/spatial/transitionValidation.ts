// Oyi Twin Engine — Spatial Transition Engine V1 Part 7: pre-traversal
// path validation. A transition must prove itself safe to run before any
// door opens or any camera moves — returning a typed failure (BLOCKED /
// TRANSITION_REVIEW_REQUIRED) with debug context is always preferred over
// faking a traversal that turns out to clip through architecture.

import type { NormalizedBuildingModel } from "./types";
import { findSpatialObject } from "./types";
import type { SpatialTransition } from "./transitions";

export type TransitionValidationStatus = "OK" | "BLOCKED" | "TRANSITION_REVIEW_REQUIRED";

export interface TransitionValidationResult {
  status: TransitionValidationStatus;
  reason?: string;
}

/** Only checks that can genuinely be answered from data already on the
 * transition/model are implemented — true visual occlusion (a mesh
 * literally blocking the path) requires live scene geometry this
 * data-only layer doesn't have, matching the exact same disclosed
 * boundary cameraDerivation.ts's own validateCameraDestination() already
 * draws for camera safety (Building Ingestion V2 Part 14). */
export function validateTransition(transition: SpatialTransition, model: NormalizedBuildingModel): TransitionValidationResult {
  const from = findSpatialObject(model, transition.fromSpaceRef);
  const to = findSpatialObject(model, transition.toSpaceRef);
  if (!from || !to) {
    return { status: "TRANSITION_REVIEW_REQUIRED", reason: `endpoint not found in model: ${!from ? transition.fromSpaceRef : transition.toSpaceRef}` };
  }

  if (transition.crossingPath.length < 2) {
    return { status: "BLOCKED", reason: "crossingPath has fewer than 2 points — no real path to walk" };
  }

  const approach = transition.crossingPath[0];
  const exit = transition.crossingPath[transition.crossingPath.length - 1];
  const dApproach = Math.hypot(approach.x - transition.approachPoint.x, approach.z - transition.approachPoint.z);
  const dExit = Math.hypot(exit.x - transition.exitPoint.x, exit.z - transition.exitPoint.z);
  if (dApproach > 0.5 || dExit > 0.5) {
    return { status: "BLOCKED", reason: "crossingPath endpoints do not match the transition's own approachPoint/exitPoint" };
  }

  // A door/automatic-door transition must actually be bound to a real
  // door object whose own fromSpaceRef/toSpaceRef agree with the
  // transition's — never a door borrowed from an unrelated pair of
  // spaces (Part 8's own explicit "door belongs to correct spaces" check).
  if ((transition.type === "DOOR" || transition.type === "AUTOMATIC_DOOR") && transition.boundaryRef) {
    const door = model.doors.find((d) => d.canonicalRef === transition.boundaryRef);
    if (!door) {
      return { status: "TRANSITION_REVIEW_REQUIRED", reason: `boundaryRef ${transition.boundaryRef} does not resolve to a known door in this model` };
    }
    const spacesMatch =
      (door.fromSpaceRef === transition.fromSpaceRef && door.toSpaceRef === transition.toSpaceRef) ||
      (door.fromSpaceRef === transition.toSpaceRef && door.toSpaceRef === transition.fromSpaceRef);
    if (!spacesMatch) {
      return { status: "BLOCKED", reason: `door ${door.canonicalRef} connects ${door.fromSpaceRef}<->${door.toSpaceRef}, not ${transition.fromSpaceRef}<->${transition.toSpaceRef}` };
    }
    if (door.animationReadiness === "MANUAL_REVIEW_REQUIRED") {
      return { status: "TRANSITION_REVIEW_REQUIRED", reason: `door ${door.canonicalRef} is plan-only (condition C) — 3D traversal needs review before this transition may run` };
    }
  }

  if (transition.clearanceRule.requiredClearWidthMeters <= 0) {
    return { status: "BLOCKED", reason: "clearanceRule.requiredClearWidthMeters must be a positive real value" };
  }

  return { status: "OK" };
}
