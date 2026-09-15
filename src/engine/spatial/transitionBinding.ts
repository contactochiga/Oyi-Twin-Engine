// Oyi Twin Engine — Spatial Transition Engine V1.1: binds real
// transition/handoff capability onto navigationGraph.ts's own
// NavigationEdge.transitionRef field (added, but deliberately never
// auto-populated, by V1). buildNavigationGraph() itself stays untouched —
// this is a pure post-processing step a building's own route-request
// wiring calls once, with data ONLY it can know (which doors have a real
// SpatialTransition, which lifts/stairs have a real handoff capability).
//
// A door gets a real, specific SpatialTransition object (one boundary,
// one fixed crossing path). A lift does NOT — any of its served levels
// can be an origin or destination, so "capability" for a lift edge is a
// boolean (does a real requestLiftTransition() handoff exist for this
// lift ref), encoded as a stable marker string rather than binding one
// fixed transition per edge. Stairs work the same way, using their own
// marker prefix.

import type { CanonicalRef } from "../types";
import type { NavigationEdge, NavigationGraph } from "./navigationGraph";
import type { SpatialTransition } from "./transitions";

export const LIFT_TRANSITION_PREFIX = "LIFT:";
export const STAIR_TRANSITION_PREFIX = "STAIR:";
export const PASSAGE_TRANSITION_PREFIX = "PASSAGE:";

export interface TransitionBindings {
  /** Real door-backed SpatialTransition objects — matched onto a "door"
   * edge by transition.boundaryRef === edge.viaRef. */
  doorTransitions: SpatialTransition[];
  /** Real, non-fabricated OPEN_PASSAGE transitions — matched onto an
   * "adjacency" edge the SAME way (transition.boundaryRef is undefined
   * for a passage, so matching is by transition.fromSpaceRef/toSpaceRef
   * pair instead). */
  passageTransitions: SpatialTransition[];
  /** Lift refs a real requestLiftTransition() handoff exists for — NOT a
   * fixed transition (a lift can travel between any two of its served
   * levels), just a capability flag. */
  liftCapableRefs: Set<CanonicalRef>;
  /** Stair refs a real (even if simple/preset-path) stair transition
   * exists for. */
  stairCapableRefs: Set<CanonicalRef>;
}

function bindOneEdge(edge: NavigationEdge, bindings: TransitionBindings): NavigationEdge {
  if (edge.via === "door" && edge.viaRef) {
    const t = bindings.doorTransitions.find((d) => d.boundaryRef === edge.viaRef);
    return t ? { ...edge, transitionRef: t.transitionId } : edge;
  }
  if (edge.via === "lift" && edge.viaRef && bindings.liftCapableRefs.has(edge.viaRef)) {
    return { ...edge, transitionRef: `${LIFT_TRANSITION_PREFIX}${edge.viaRef}` };
  }
  if (edge.via === "stair" && edge.viaRef && bindings.stairCapableRefs.has(edge.viaRef)) {
    return { ...edge, transitionRef: `${STAIR_TRANSITION_PREFIX}${edge.viaRef}` };
  }
  if (edge.via === "adjacency") {
    const t = bindings.passageTransitions.find((p) => (p.fromSpaceRef === edge.fromRef && p.toSpaceRef === edge.toRef) || (p.fromSpaceRef === edge.toRef && p.toSpaceRef === edge.fromRef));
    return t ? { ...edge, transitionRef: `${PASSAGE_TRANSITION_PREFIX}${t.transitionId}` } : edge;
  }
  return edge;
}

/** Returns a NEW graph (never mutates the input) with transitionRef
 * attached wherever a real capability exists — every edge with no real
 * capability yet is left exactly as buildNavigationGraph() produced it,
 * so planRoute() continues to honestly report NOT_PHYSICALLY_TRAVERSABLE
 * for anything not bound here. */
export function bindTransitionCapabilities(graph: NavigationGraph, bindings: TransitionBindings): NavigationGraph {
  return { ...graph, edges: graph.edges.map((e) => bindOneEdge(e, bindings)) };
}
