// Oyi Twin Engine — Spatial Transition Engine V1 Part 5: the clearance
// contract. "Do not hardcode 'wait 1 second'" — every value here is
// derived from a real, physically-meaningful boundary measurement (a
// sliding leaf's actual travel fraction, a hinged door's actual swing
// angle), never a fixed timer standing in for "probably open enough by
// now."

export interface TraversalProfile {
  /** Minimum clear passage width, in metres, a traversal needs before it
   * may cross. A single person/camera walking through comfortably needs
   * real clearance, not a doorway that's merely "started opening." */
  requiredClearWidthMeters: number;
}

/** A generic single-file walking-through clearance — the same width every
 * transition uses unless a specific SpatialTransition.clearanceRule
 * overrides it (a lift car or a double-leaf entrance may legitimately
 * need a different value). */
export const STANDARD_TRAVERSAL_PROFILE: TraversalProfile = { requiredClearWidthMeters: 0.9 };

export type BoundaryKind = "SLIDING" | "HINGED" | "NONE";

/** The boundary's own, real, physically-derived openness — never a
 * caller-asserted boolean. `openFraction` is 0..1 (closed..fully open,
 * matching SlidingGlassDoor's own `progress` and HingedDoor's own
 * `angle/openAngleRadians` semantics exactly, so a derived BoundaryState
 * and the actually-rendered leaf never disagree). `apertureWidthMeters`
 * is the resulting clear passage width computed from that fraction and
 * the boundary's own real geometry — this is the number
 * isBoundaryClearForTraversal actually checks against. */
export interface BoundaryState {
  kind: BoundaryKind;
  openFraction: number;
  apertureWidthMeters: number;
}

/** OPEN_PASSAGE transitions (Part 15) have no boundary object at all —
 * always clear, by definition. */
export const OPEN_BOUNDARY_STATE: BoundaryState = { kind: "NONE", openFraction: 1, apertureWidthMeters: Number.POSITIVE_INFINITY };

/** A sliding door's clear aperture grows linearly with leaf travel —
 * openingWidthMeters is the door's own full clear-opening width (e.g.
 * GROUND_ENTRANCE_OPENING_WIDTH), openFraction is the SAME 0..1 progress
 * value SlidingGlassDoor's own `progress` ref already animates with, so
 * this function reports the boundary's REAL current state, not an
 * independent guess running on its own clock. */
export function slidingBoundaryState(openFraction: number, openingWidthMeters: number): BoundaryState {
  const clamped = Math.max(0, Math.min(1, openFraction));
  return { kind: "SLIDING", openFraction: clamped, apertureWidthMeters: clamped * openingWidthMeters };
}

/** A hinged door's clear passage through its own frame opening grows with
 * the sine of its swing angle (0 at closed, the full frame width once the
 * leaf has swung clear of the opening) — a real, if approximate, physical
 * relationship, not an arbitrary curve. `angleRadians`/`maxAngleRadians`
 * are the SAME values HingedDoor's own `angle`/`openAngleRadians` use. */
export function hingedBoundaryState(angleRadians: number, maxAngleRadians: number, frameWidthMeters: number): BoundaryState {
  const clampedAngle = Math.max(0, Math.min(maxAngleRadians, angleRadians));
  const openFraction = maxAngleRadians > 0 ? clampedAngle / maxAngleRadians : 0;
  const apertureWidthMeters = frameWidthMeters * Math.sin(clampedAngle);
  return { kind: "HINGED", openFraction, apertureWidthMeters };
}

/** Part 5's own named function, verbatim. The ONLY question this answers:
 * given the boundary's real current physical state, is there enough
 * clear aperture for this traversal to cross right now. Never a timer. */
export function isBoundaryClearForTraversal(boundaryState: BoundaryState, traversalProfile: TraversalProfile): boolean {
  if (boundaryState.kind === "NONE") return true;
  return boundaryState.apertureWidthMeters >= traversalProfile.requiredClearWidthMeters;
}
