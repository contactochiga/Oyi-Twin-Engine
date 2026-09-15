// Oyi Twin Engine — Spatial Transition Engine V1, Parts 2/3/9: the
// generic, building-agnostic transition + door contracts.
//
// Central rule this whole file exists to serve: NO ENTERABLE SPACE SHOULD
// BE ENTERED BY TELEPORT WHEN A MAPPED PHYSICAL TRANSITION EXISTS.
// A SpatialTransition describes an actual architectural boundary
// crossing — approach, actuation, clearance, crossing, arrival — never a
// scene-switch. Nothing here names Luna; a building-specific transition
// (e.g. Luna's Grand Entrance) is built by a Luna-side module that
// constructs a SpatialTransition value using this shape, exactly the same
// "engine defines the contract, building supplies the data" split every
// other src/engine/spatial/ file already uses.

import type { CanonicalRef } from "../types";
import type { ReviewStatus } from "../ingestion/types";
import type { SpatialPoint3D } from "./types";
export type { DoorAnimationReadiness } from "./types";

// ---------------------------------------------------------------------
// Part 2 — transition types. ESCALATOR_FUTURE/TURNSTILE_FUTURE are named
// in the vocabulary so a future ingestion can classify what it found
// honestly, but no behavior for them exists yet — see docs for the
// disclosed limitation. Building only what's needed now, not speculative
// systems beyond that.
// ---------------------------------------------------------------------

export type TransitionType = "DOOR" | "AUTOMATIC_DOOR" | "OPEN_PASSAGE" | "LIFT" | "STAIR" | "GATE" | "ESCALATOR_FUTURE" | "TURNSTILE_FUTURE";

/** Part "central rule" states — the same vocabulary the brief itself
 * specifies verbatim. A transition's runtime phase is always exactly one
 * of these; transitionEngine.ts's pure step functions are the only code
 * allowed to move a transition from one to the next. */
export type TransitionStateName =
  | "IDLE"
  | "LOCATING_ENTRY"
  | "APPROACHING"
  | "WAITING_FOR_ACCESS"
  | "ACTUATING"
  | "WAITING_FOR_CLEARANCE"
  | "CROSSING"
  | "ARRIVED"
  | "BLOCKED"
  | "DENIED"
  | "FAULT"
  | "PAUSED_FOR_USER_INPUT";

/** Part 8 — kept distinct from RepresentationPolicy on purpose.
 * RepresentationPolicy answers "may this user SEE/ENTER this space at
 * all." AccessOutcome answers "is THIS PHYSICAL BOUNDARY authorized to
 * open for this actor right now" — a narrower, boundary-scoped question a
 * transition may or may not even need to ask (see accessRequirement
 * below). */
export type AccessOutcome = "GRANTED" | "DENIED" | "NOT_REQUIRED" | "REQUIRES_CREDENTIAL" | "UNAVAILABLE";

/** Whether a transition's boundary requires any access check at all.
 * "NONE" = a fully open, unrestricted passage (no boundary object, or a
 * public common threshold nobody credentials through). "POLICY_ONLY" =
 * RepresentationPolicy alone governs whether this user may proceed; no
 * separate boundary-level authorization exists. "ACCESS_CONTROLLED" =
 * the boundary itself is a real governed lock/credential point and must
 * be resolved through the access system before actuation. Luna's own
 * Main Entrance is "NONE" today (Access & Security V1 deliberately does
 * not instrument it — see lunaAccessTransitionResolver.ts) — this is a
 * disclosed, real, pre-existing scope boundary, not something this phase
 * silently upgrades. */
export type TransitionAccessRequirement = "NONE" | "POLICY_ONLY" | "ACCESS_CONTROLLED";

/** Part 5 — how much clearance this specific boundary requires before a
 * traversal may cross it, expressed in the same units clearance.ts's
 * BoundaryState reports (metres of clear aperture). Kept on the
 * transition (not hardcoded in the clearance function) since different
 * boundary types legitimately need different physical clearance — a
 * single door and a pair of lift doors are not the same width. */
export interface ClearanceRule {
  requiredClearWidthMeters: number;
  note?: string;
}

/** Part 2's full generic contract. Every field here must be resolvable
 * from real data (existing spatial objects, existing operational assets,
 * existing camera/geometry constants) — never a placeholder invented to
 * make the shape compile. */
export interface SpatialTransition {
  transitionId: string;
  type: TransitionType;
  fromSpaceRef: CanonicalRef;
  toSpaceRef: CanonicalRef;
  /** The door/gate/lift-car canonical ref this transition actuates, when
   * one exists. OPEN_PASSAGE transitions correctly have none. */
  boundaryRef?: CanonicalRef;
  approachPoint: SpatialPoint3D;
  entryPoint: SpatialPoint3D;
  exitPoint: SpatialPoint3D;
  /** Ordered waypoints a traversal actually walks, approach -> ... ->
   * exit inclusive (>=2 points; cameraTraversal.ts consumes this
   * directly). Kept separate from approach/entry/exit above so a
   * transition can describe a path with real intermediate bends (e.g. a
   * lift lobby dogleg) without losing the three named landmark points a
   * host commonly needs individually (UI copy, validation, reverse
   * derivation). */
  crossingPath: SpatialPoint3D[];
  accessRequirement: TransitionAccessRequirement;
  /** The real operational asset ref that actuates this boundary (opens
   * the door / calls the lift), when one exists and is genuinely wired to
   * a TwinRuntimeProvider — never set for a purely static/decorative
   * boundary (Part 3: "architectural door is not a smart door"). */
  actuatorBinding?: CanonicalRef;
  clearanceRule: ClearanceRule;
  status: ReviewStatus;
}

/** Part 3 — normalized door model, additive fields layered onto the
 * existing NormalizedDoor (types.ts) rather than a competing type. See
 * types.ts's own NormalizedDoor for the fields this extends. */
export type DoorHingeSide = "left" | "right";
export type DoorSlideAxis = "x" | "z";

export interface DoorPose {
  /** For a hinged door: leaf rotation in radians (0 = closed). For a
   * sliding door: each leaf's travel fraction 0..1 (0 = closed, matches
   * SlidingGlassDoor's own `progress` semantics exactly, so a derived
   * pose and the live rendered pose never disagree). */
  value: number;
}

// Part 22/23's DoorAnimationReadiness ("how honestly an imported door's
// traversal can actually be animated") lives on types.ts's own
// NormalizedDoor now — re-exported above so callers of this file don't
// need a second import path.

// ---------------------------------------------------------------------
// Part 19 — lightweight transition diagnostics (debug/test use, not a
// permanent user-facing UI).
// ---------------------------------------------------------------------

export interface TransitionDiagnostics {
  transitionId: string;
  phase: TransitionStateName;
  waypointIndex: number;
  waypointCount: number;
  accessOutcome?: AccessOutcome;
  boundaryOpenFraction?: number;
  failureReason?: string;
}
