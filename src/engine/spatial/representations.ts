// Oyi Twin Engine — Building Ingestion V2 Parts 6/7/8: plan/model
// representations and the crosswalk between them.
//
// CRITICAL CORRECTION this phase's own brief insists on: Oyi does not
// redraw an architect's 2D plan from scratch, and an imported 3D mesh is
// not canonical truth. Canonical identity (CanonicalRef) sits BETWEEN the
// two:
//
//   ARCHITECT 2D  ->  CANONICAL  <-  ARCHITECT 3D
//
// A PlanRepresentation says "this region of this 2D source IS this
// canonical object." A ModelRepresentation says "these nodes of this 3D
// source ARE this canonical object." Neither one ever points at the
// other directly — every 2D<->3D relationship is mediated by the shared
// canonicalRef, which is exactly what SpatialRepresentationCrosswalk
// indexes.

import type { CanonicalRef } from "../types";
import type { SpatialBoundary, SpatialBounds3D } from "./types";

/** For vector/BIM-derived plans, a region may come directly from real
 * source geometry ("vector"). For raster/PDF sources, no automatic
 * recognition exists in this codebase — a region can only come from a
 * human-reviewed overlay ("reviewed_overlay"). Never claim "vector" for a
 * region nobody actually extracted from vector data. */
export type PlanRegionOrigin = "vector" | "reviewed_overlay";

export interface PlanRepresentation {
  canonicalRef: CanonicalRef;
  sourceRef: string;
  levelRef: CanonicalRef;
  boundary: SpatialBoundary;
  label?: string;
  origin: PlanRegionOrigin;
}

export interface ModelTransform {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export interface ModelRepresentation {
  canonicalRef: CanonicalRef;
  sourceRef: string;
  /** The external model's own node/mesh identifiers bound to this
   * canonical object (e.g. a GLB node name) — the imported mesh is a
   * REPRESENTATION of the canonical object, never the canonical identity
   * itself (Part 7). */
  nodeRefs: string[];
  bounds?: SpatialBounds3D;
  transform?: ModelTransform;
}

export interface SpatialRepresentationCrosswalk {
  planRepresentations: PlanRepresentation[];
  modelRepresentations: ModelRepresentation[];
}

export function buildCrosswalk(planRepresentations: PlanRepresentation[], modelRepresentations: ModelRepresentation[]): SpatialRepresentationCrosswalk {
  return { planRepresentations, modelRepresentations };
}

export function emptyCrosswalk(): SpatialRepresentationCrosswalk {
  return { planRepresentations: [], modelRepresentations: [] };
}

// ---------------------------------------------------------------------
// Queries — every one routes through canonicalRef, never plan-to-model
// or model-to-plan directly (Part 8's own explicit instruction).
// ---------------------------------------------------------------------

/** canonical -> plan region(s). A canonical object usually has exactly
 * one plan region per level it appears on; returns all of them. */
export function planRepresentationsFor(crosswalk: SpatialRepresentationCrosswalk, ref: CanonicalRef): PlanRepresentation[] {
  return crosswalk.planRepresentations.filter((p) => p.canonicalRef === ref);
}

/** canonical -> model representation(s). */
export function modelRepresentationsFor(crosswalk: SpatialRepresentationCrosswalk, ref: CanonicalRef): ModelRepresentation[] {
  return crosswalk.modelRepresentations.filter((m) => m.canonicalRef === ref);
}

/** 2D -> canonical -> 3D (Part 8). Given the source ref of a clicked 2D
 * region, resolve its canonical identity, then every 3D representation
 * of that SAME canonical object — never a direct 2D-source-to-3D-node
 * lookup. */
export function resolvePlanToModel(crosswalk: SpatialRepresentationCrosswalk, planSourceRef: string): { canonicalRef: CanonicalRef; model: ModelRepresentation[] } | undefined {
  const plan = crosswalk.planRepresentations.find((p) => p.sourceRef === planSourceRef);
  if (!plan) return undefined;
  return { canonicalRef: plan.canonicalRef, model: modelRepresentationsFor(crosswalk, plan.canonicalRef) };
}

/** 3D -> canonical -> 2D (Part 11). Given the node ref of a clicked 3D
 * mesh, resolve its canonical identity, then every 2D representation of
 * that SAME canonical object. */
export function resolveModelToPlan(crosswalk: SpatialRepresentationCrosswalk, modelNodeRef: string): { canonicalRef: CanonicalRef; plan: PlanRepresentation[] } | undefined {
  const model = crosswalk.modelRepresentations.find((m) => m.nodeRefs.includes(modelNodeRef));
  if (!model) return undefined;
  return { canonicalRef: model.canonicalRef, plan: planRepresentationsFor(crosswalk, model.canonicalRef) };
}

/** Every canonical ref that has BOTH a plan and a model representation —
 * the objects for which "one object, two representations" is actually
 * proven, not just aspired to. Useful for review/test assertions. */
export function fullyCrosswalkedRefs(crosswalk: SpatialRepresentationCrosswalk): CanonicalRef[] {
  const planRefs = new Set(crosswalk.planRepresentations.map((p) => p.canonicalRef));
  const modelRefs = new Set(crosswalk.modelRepresentations.map((m) => m.canonicalRef));
  return [...planRefs].filter((ref) => modelRefs.has(ref));
}
