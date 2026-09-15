// Oyi Twin Engine — Spatial Transition Engine V1.1 Part 21: the one
// generic entry point a building's own route wiring calls to go from
// "I want to go from A to B" to a real, walkable SpatialRoute. Consumes
// ONLY the generic Building Ingestion V2 model + this phase's own
// building-agnostic contracts — no Luna-specific planner exists or is
// needed; a future ingested building supplies its own NormalizedBuilding
// Model + TransitionBindings + policy predicate and gets the identical
// behavior.

import type { CanonicalRef } from "../types";
import type { NormalizedBuildingModel } from "./types";
import { buildNavigationGraph, type NavigationEdge } from "./navigationGraph";
import { bindTransitionCapabilities, type TransitionBindings } from "./transitionBinding";
import { planTraversableRoute, type RoutePlanStatus } from "./routePlanning";
import { buildSpatialRoute, type SpatialRoute } from "./route";

export interface RouteRequestResult {
  status: RoutePlanStatus;
  route?: SpatialRoute;
  reason?: string;
}

export function requestRoute(
  model: NormalizedBuildingModel,
  bindings: TransitionBindings,
  isEdgeAllowed: (edge: NavigationEdge) => boolean,
  startRef: CanonicalRef,
  destinationRef: CanonicalRef,
  routeId: string
): RouteRequestResult {
  const graph = bindTransitionCapabilities(buildNavigationGraph(model), bindings);
  const plan = planTraversableRoute(graph, startRef, destinationRef, isEdgeAllowed);
  if (plan.status !== "OK") return { status: plan.status, reason: plan.reason };
  return { status: "OK", route: buildSpatialRoute(routeId, plan, startRef, destinationRef) };
}
