// Oyi Twin Engine — Building Ingestion V2 Part 5: the normalized spatial
// model. Building-agnostic, same discipline as every other engine
// contract in this codebase: nothing here may name "Luna."
//
// This deliberately EXTENDS Building Ingestion V1's own contracts rather
// than inventing a second canonical system — spaceType reuses
// CanonicalTargetKind (ingestion/types.ts), reviewStatus reuses
// ReviewStatus, confidence reuses the same `number | "UNKNOWN"` shape
// normalize.ts already established. A NormalizedSpatialObject is what a
// MappingProposal becomes once enough real geometric/relational evidence
// exists to describe where the object actually is and what it connects
// to — the missing middle layer between "a proposed canonical ref" (V1)
// and "a fully rendered, camera-navigable, policy-governed Twin object"
// (this phase's remaining parts).

import type { CanonicalRef } from "../types";
import type { CanonicalTargetKind, ReviewStatus } from "../ingestion/types";

// ---------------------------------------------------------------------
// Small supporting shapes — plan-space (x, z) and model-space (x, y, z)
// deliberately kept distinct, since a 2D plan and a 3D model may not
// share a coordinate frame until a real transform is established (see
// representations.ts's ModelRepresentation.transform).
// ---------------------------------------------------------------------

export interface SpatialPoint2D {
  x: number;
  z: number;
}

export interface SpatialPoint3D {
  x: number;
  y: number;
  z: number;
}

/** A plan-space region. `rect` is the common case (most real rooms/units
 * are reasonably rectangular for control-map purposes); `polygon` is
 * available for irregular spaces once real vertex data exists — never
 * fabricated when only a rect is known. */
export type SpatialBoundary =
  | { kind: "rect"; x: number; z: number; width: number; depth: number }
  | { kind: "polygon"; points: SpatialPoint2D[] };

export interface SpatialBounds3D {
  min: SpatialPoint3D;
  max: SpatialPoint3D;
}

/** Where this object's data actually came from — required on every
 * normalized object so nothing pretends to be more authoritative than it
 * is. "computed" = derived from other already-real data (e.g. a room
 * rect computed from real corner points); "authored" = a human placed
 * this value directly (matches Luna's own hand-authored camera presets);
 * "plan"/"model"/"both" = read from the named representation(s). */
export interface SpatialProvenance {
  derivedFrom: "plan" | "model" | "both" | "computed" | "authored";
  sourceIds: string[];
  note?: string;
}

// ---------------------------------------------------------------------
// The base normalized spatial object. Every kind below extends this.
// ---------------------------------------------------------------------

export interface NormalizedSpatialObject {
  canonicalRef: CanonicalRef;
  /** Every source object id (any role) that contributed to this record. */
  sourceRefs: string[];
  /** The subset of sourceRefs that came from a plan-feeding source
   * (ARCHITECTURAL_2D/BIM — see sourceRoles.ts). Empty when no 2D source
   * has been ingested for this object yet. */
  source2DRefs: string[];
  /** The subset of sourceRefs that came from a model-feeding source
   * (ARCHITECTURAL_3D/BIM). Empty when no 3D source has been ingested. */
  source3DRefs: string[];
  parentRef?: CanonicalRef;
  levelRef?: CanonicalRef;
  spaceType: CanonicalTargetKind;
  name: string;
  boundary?: SpatialBoundary;
  centroid?: SpatialPoint2D;
  bounds?: SpatialBounds3D;
  entryPoints?: SpatialPoint3D[];
  connectedSpaceRefs?: CanonicalRef[];
  /** Convenience pointers into the crosswalk (representations.ts) —
   * optional; the crosswalk itself remains the authoritative index. */
  representationRefs?: { planRef?: string; modelRef?: string };
  confidence: number | "UNKNOWN";
  reviewStatus: ReviewStatus;
  provenance: SpatialProvenance;
}

export interface NormalizedBuilding extends NormalizedSpatialObject {
  spaceType: "building";
}

export interface NormalizedSite extends NormalizedSpatialObject {
  spaceType: "site";
}

export interface NormalizedLevel extends NormalizedSpatialObject {
  spaceType: "level";
  /** Ascending vertical stacking order (0 = lowest) — the one field
   * deriveLevelRailItems() actually needs; independent of baseElevation
   * so a building can declare level order even before real elevations
   * are known. */
  order: number;
  baseElevation?: number;
  height?: number;
  /** A short rail label ("G", "L06", "PH") — proposed by
   * levelRail.ts's own deriveShortLabel() when absent, never required
   * up front. */
  shortLabel?: string;
}

/** A residential/office/hotel/retail unit — the generalization of
 * Luna's "home"/apartment concept (Part 9: "2 units, 6 units, 12 units,
 * office suites, hotel rooms, retail units... should use the same
 * architecture"). */
export interface NormalizedUnit extends NormalizedSpatialObject {
  spaceType: "unit" | "home";
  unitCategory?: "residential" | "office" | "hotel" | "retail" | "other";
}

export interface NormalizedRoom extends NormalizedSpatialObject {
  spaceType: "room";
  roomCategory?: string;
}

/** Lift lobbies, lounges, reception, service corridors, amenity floors —
 * anything shared, not privately assigned. */
export interface NormalizedCommonArea extends NormalizedSpatialObject {
  spaceType: "common_area" | "amenity" | "corridor" | "service_space";
}

export type DoorKind = "hinged" | "sliding" | "automatic_sliding" | "unknown";

/** Spatial Transition Engine V1 Part 3 — how honestly this door's
 * traversal can actually be animated, never assumed from geometry alone.
 * See transitions.ts's DoorAnimationReadiness doc comment for what each
 * value means; kept as a plain string union here too (rather than an
 * import) so types.ts has no dependency on transitions.ts. */
export type DoorAnimationReadiness = "ANIMATABLE" | "STATIC_BOUNDARY" | "MANUAL_REVIEW_REQUIRED";

/** Part 16 — a confirmed door connects two spatial nodes. An
 * architectural door is NOT a smart lock by default; operationalAssetRef
 * is only ever set once a real, mapped access-control asset exists. */
export interface NormalizedDoor extends NormalizedSpatialObject {
  spaceType: "door";
  fromSpaceRef?: CanonicalRef;
  toSpaceRef?: CanonicalRef;
  doorKind: DoorKind;
  operationalAssetRef?: CanonicalRef;
  /** Spatial Transition Engine V1 Part 3 — additive traversal fields, all
   * optional so every existing NormalizedDoor literal (Luna's reference
   * fixture, the mini test fixture) keeps compiling unchanged. Only ever
   * set once real geometry/kinematics actually back the value — a door
   * with none of these is still a fully valid NormalizedDoor, just not
   * yet traversable by the Spatial Transition Engine. */
  hingeSide?: "left" | "right";
  slideAxis?: "x" | "z";
  approachPoint?: SpatialPoint3D;
  entryPoint3D?: SpatialPoint3D;
  exitPoint?: SpatialPoint3D;
  /** Opaque pointer into the source/rendered geometry this door's
   * traversal animation reads from (e.g. a component ref name) — never a
   * fabricated identifier when no real geometry exists. */
  geometryRef?: string;
  /** The real access-policy/credential record this boundary is governed
   * by, when one exists (Part 9's smart-lock future-proofing) — distinct
   * from operationalAssetRef, which is the actuator itself. */
  accessPolicyRef?: CanonicalRef;
  animationReadiness?: DoorAnimationReadiness;
}

export interface NormalizedWindow extends NormalizedSpatialObject {
  spaceType: "window";
}

/** Part 17 — a lift connects levels. Actual movement/control depends on
 * whether operationalAssetRef resolves through a real TwinRuntimeProvider
 * — a static imported building must not receive a fake controllable
 * elevator just because a lift shaft was recognized spatially. */
export interface NormalizedLift extends NormalizedSpatialObject {
  spaceType: "lift";
  servedLevelRefs: CanonicalRef[];
  landingRefs?: CanonicalRef[];
  operationalAssetRef?: CanonicalRef;
}

/** Part 18 — stairs connect levels for navigation/wayfinding without any
 * actuator capability, real or implied. */
export interface NormalizedStair extends NormalizedSpatialObject {
  spaceType: "stair";
  servedLevelRefs: CanonicalRef[];
}

export interface NormalizedRiser extends NormalizedSpatialObject {
  spaceType: "riser";
  servedLevelRefs?: CanonicalRef[];
}

export interface NormalizedStructuralElement extends NormalizedSpatialObject {
  spaceType: "structural_element";
  elementKind?: string;
}

/** Part 20 — the SPATIAL TWIN / CONNECTED OPERATIONAL TWIN boundary made
 * explicit as data, not implied by naming convention. A spatial object
 * with no OperationalAssetBinding is spatial-only, and that is a fully
 * valid, acceptable end state — Part 20's own explicit instruction. */
export type OperationalBindingKind = "access_control" | "hvac_terminal" | "vertical_transport" | "lighting" | "other";

export interface OperationalAssetBinding {
  bindingId: string;
  /** The canonical architecture this binds (a door/room/lift/...). */
  spatialRef: CanonicalRef;
  /** The real operational asset ref this architecture is connected to —
   * only ever set when a genuine TwinDataProvider/TwinRuntimeProvider
   * relationship exists, never fabricated to make a space feel "smart." */
  operationalAssetRef: CanonicalRef;
  bindingKind: OperationalBindingKind;
  /** True only when a real runtime provider actually backs this binding
   * (i.e. commands/state genuinely flow) — false means the architectural
   * relationship is known but nothing is actually connected yet. */
  connected: boolean;
  note?: string;
}

/** The full normalized model for one project — the generic container
 * every derivation function in this phase (LevelRail, floor control,
 * camera destinations, navigation graph, crosswalk) consumes. Building a
 * NormalizedBuildingModel is the ingestion pipeline's job; consuming one
 * generically is every function in src/engine/spatial/'s job. */
export interface NormalizedBuildingModel {
  projectId: string;
  building?: NormalizedBuilding;
  site?: NormalizedSite;
  levels: NormalizedLevel[];
  units: NormalizedUnit[];
  rooms: NormalizedRoom[];
  commonAreas: NormalizedCommonArea[];
  doors: NormalizedDoor[];
  windows: NormalizedWindow[];
  lifts: NormalizedLift[];
  stairs: NormalizedStair[];
  risers: NormalizedRiser[];
  structuralElements: NormalizedStructuralElement[];
  operationalBindings: OperationalAssetBinding[];
}

export function emptyNormalizedBuildingModel(projectId: string): NormalizedBuildingModel {
  return {
    projectId,
    levels: [],
    units: [],
    rooms: [],
    commonAreas: [],
    doors: [],
    windows: [],
    lifts: [],
    stairs: [],
    risers: [],
    structuralElements: [],
    operationalBindings: [],
  };
}

/** Every non-level, non-structural, non-door/window spatial object a
 * level's floor control card might need to show — the union
 * floorControl.ts iterates over. Kept as a helper rather than exported
 * union-typing gymnastics at every call site. */
export function spacesOnLevel(model: NormalizedBuildingModel, levelRef: CanonicalRef): NormalizedSpatialObject[] {
  return [
    ...model.units.filter((u) => u.levelRef === levelRef),
    ...model.rooms.filter((r) => r.levelRef === levelRef),
    ...model.commonAreas.filter((c) => c.levelRef === levelRef),
  ];
}

export function allSpatialObjects(model: NormalizedBuildingModel): NormalizedSpatialObject[] {
  const all: NormalizedSpatialObject[] = [...model.levels, ...model.units, ...model.rooms, ...model.commonAreas, ...model.doors, ...model.windows, ...model.lifts, ...model.stairs, ...model.risers, ...model.structuralElements];
  if (model.building) all.push(model.building);
  if (model.site) all.push(model.site);
  return all;
}

export function findSpatialObject(model: NormalizedBuildingModel, ref: CanonicalRef): NormalizedSpatialObject | undefined {
  return allSpatialObjects(model).find((o) => o.canonicalRef === ref);
}
