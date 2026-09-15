// Oyi Twin Engine — Building Ingestion V2 Part 15/16/17/18: the spatial
// navigation graph. Generated from CONFIRMED spatial relationships only
// (real doors, real lift/stair level service, real declared adjacency) —
// never inferred shortcuts. Per Part 15's own explicit distinction:
//   NAVIGATION says WHERE CAN A PATH GO.
//   RepresentationPolicy says MAY THIS USER GO THERE.
// This file only ever answers the first question; nothing here reads or
// implies authorization.

import type { CanonicalRef } from "../types";
import type { NormalizedBuildingModel } from "./types";

export type NavigationEdgeVia = "door" | "lift" | "stair" | "adjacency" | "explicit_mapping";

export interface NavigationEdge {
  fromRef: CanonicalRef;
  toRef: CanonicalRef;
  via: NavigationEdgeVia;
  /** The door/lift/stair ref that PROVIDES this edge, when applicable —
   * "adjacency" edges (open-plan common areas) have none. */
  viaRef?: CanonicalRef;
  bidirectional: boolean;
  /** Spatial Transition Engine V1 Part 16 — the real SpatialTransition
   * that can PHYSICALLY walk this edge, when one has been built for it.
   * Optional and additive: an edge with no transitionRef still correctly
   * describes connectivity (RepresentationPolicy/route-planning questions
   * still work), it just cannot be physically traversed yet — a route
   * planner must treat that as "known but not walkable," never silently
   * teleport across it. Kept as an opaque ref (not the SpatialTransition
   * itself) so navigationGraph.ts stays free of any dependency on
   * transitions.ts. */
  transitionRef?: string;
}

export interface NavigationGraph {
  nodes: CanonicalRef[];
  edges: NavigationEdge[];
}

function dedupeEdges(edges: NavigationEdge[]): NavigationEdge[] {
  const seen = new Set<string>();
  const out: NavigationEdge[] = [];
  for (const e of edges) {
    const key = [e.fromRef, e.toRef, e.via, e.viaRef ?? ""].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/** Builds the navigation graph purely from real, already-confirmed
 * relationships in the model:
 *   - a NormalizedDoor's fromSpaceRef/toSpaceRef -> a "door" edge
 *   - a NormalizedLift's servedLevelRefs -> a "lift" edge per level
 *     (star topology through the lift node itself, matching how a real
 *     lift actually works — you go TO the lift, not directly between
 *     floors)
 *   - a NormalizedStair's servedLevelRefs -> a "stair" edge per level
 *   - a common area/amenity/corridor/service space's OWN levelRef -> an
 *     "adjacency" edge to that level (open-plan circulation is walkable
 *     without a recorded door; a private unit or room is NOT auto-
 *     connected to its level this way — it needs a real door)
 *   - any space's own declared connectedSpaceRefs -> "adjacency" edges
 * `explicitEdges` lets a reviewer/adapter supply additional confirmed
 * relationships the automatic rules above can't derive (Part 15:
 * "approved explicit mapping"). */
export function buildNavigationGraph(model: NormalizedBuildingModel, explicitEdges: NavigationEdge[] = []): NavigationGraph {
  const edges: NavigationEdge[] = [];

  for (const door of model.doors) {
    if (!door.fromSpaceRef || !door.toSpaceRef) continue;
    edges.push({ fromRef: door.fromSpaceRef, toRef: door.toSpaceRef, via: "door", viaRef: door.canonicalRef, bidirectional: true });
  }

  for (const lift of model.lifts) {
    for (const levelRef of lift.servedLevelRefs) {
      edges.push({ fromRef: lift.canonicalRef, toRef: levelRef, via: "lift", viaRef: lift.canonicalRef, bidirectional: true });
    }
  }

  for (const stair of model.stairs) {
    for (const levelRef of stair.servedLevelRefs) {
      edges.push({ fromRef: stair.canonicalRef, toRef: levelRef, via: "stair", viaRef: stair.canonicalRef, bidirectional: true });
    }
  }

  for (const commonArea of model.commonAreas) {
    if (commonArea.levelRef) edges.push({ fromRef: commonArea.levelRef, toRef: commonArea.canonicalRef, via: "adjacency", bidirectional: true });
  }

  const allSpaces = [...model.units, ...model.rooms, ...model.commonAreas, ...model.lifts, ...model.stairs, ...model.risers];
  for (const space of allSpaces) {
    for (const connectedRef of space.connectedSpaceRefs ?? []) {
      edges.push({ fromRef: space.canonicalRef, toRef: connectedRef, via: "adjacency", bidirectional: true });
    }
  }

  for (const edge of explicitEdges) edges.push({ ...edge, via: "explicit_mapping" });

  const dedupedEdges = dedupeEdges(edges);
  const nodeSet = new Set<CanonicalRef>();
  for (const e of dedupedEdges) { nodeSet.add(e.fromRef); nodeSet.add(e.toRef); }
  for (const level of model.levels) nodeSet.add(level.canonicalRef);

  return { nodes: [...nodeSet], edges: dedupedEdges };
}

/** Breadth-first shortest path — "where can a path go," nothing about
 * whether any particular user is allowed to walk it (RepresentationPolicy
 * decides that separately, after this returns). */
export function shortestPath(graph: NavigationGraph, fromRef: CanonicalRef, toRef: CanonicalRef): CanonicalRef[] | undefined {
  if (fromRef === toRef) return [fromRef];
  const adjacency = new Map<CanonicalRef, CanonicalRef[]>();
  for (const e of graph.edges) {
    if (!adjacency.has(e.fromRef)) adjacency.set(e.fromRef, []);
    adjacency.get(e.fromRef)!.push(e.toRef);
    if (e.bidirectional) {
      if (!adjacency.has(e.toRef)) adjacency.set(e.toRef, []);
      adjacency.get(e.toRef)!.push(e.fromRef);
    }
  }
  const visited = new Set<CanonicalRef>([fromRef]);
  const queue: CanonicalRef[][] = [[fromRef]];
  while (queue.length > 0) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    for (const next of adjacency.get(last) ?? []) {
      if (visited.has(next)) continue;
      const nextPath = [...path, next];
      if (next === toRef) return nextPath;
      visited.add(next);
      queue.push(nextPath);
    }
  }
  return undefined;
}

export function connectedSpaces(graph: NavigationGraph, ref: CanonicalRef): CanonicalRef[] {
  const out = new Set<CanonicalRef>();
  for (const e of graph.edges) {
    if (e.fromRef === ref) out.add(e.toRef);
    if (e.bidirectional && e.toRef === ref) out.add(e.fromRef);
  }
  return [...out];
}
