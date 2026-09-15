// Oyi Twin Engine — Spatial Transition Engine V1 Parts 16/17/25: route
// planning on top of the navigation graph. This file only ever answers
// "which edges would this route walk, and is each one both PERMITTED and
// PHYSICALLY TRAVERSABLE" — it never decides permission itself (that's
// still RepresentationPolicy/AccessResolver's job, supplied by the host
// as a predicate) and never fabricates a transition for an edge that
// doesn't have one yet.

import type { CanonicalRef } from "../types";
import type { NavigationEdge, NavigationGraph } from "./navigationGraph";
import { shortestPath } from "./navigationGraph";

export interface RouteStep {
  fromRef: CanonicalRef;
  toRef: CanonicalRef;
  edge: NavigationEdge;
}

export type RoutePlanStatus = "OK" | "NO_PATH" | "BLOCKED_BY_POLICY" | "NOT_PHYSICALLY_TRAVERSABLE";

export interface RoutePlanResult {
  status: RoutePlanStatus;
  steps: RouteStep[];
  reason?: string;
}

function edgeBetween(graph: NavigationGraph, fromRef: CanonicalRef, toRef: CanonicalRef): NavigationEdge | undefined {
  return graph.edges.find((e) => (e.fromRef === fromRef && e.toRef === toRef) || (e.bidirectional && e.fromRef === toRef && e.toRef === fromRef));
}

/** Part 25 — `isEdgeAllowed` is REQUIRED (not optional) so a caller can
 * never forget to filter and accidentally expose a route through a
 * private/unauthorized space merely because the graph contains an edge
 * for it. A Facility host supplies a predicate checking permitted
 * common/operational routes; a Consumer host supplies one checking common
 * spaces + the actor's own assigned private space, exactly mirroring how
 * RepresentationPolicy.resolveMode already differs per identity. */
export function planRoute(graph: NavigationGraph, fromRef: CanonicalRef, toRef: CanonicalRef, isEdgeAllowed: (edge: NavigationEdge) => boolean): RoutePlanResult {
  const nodePath = shortestPath(graph, fromRef, toRef);
  if (!nodePath) return { status: "NO_PATH", steps: [], reason: `no connected path exists from ${fromRef} to ${toRef}` };

  const steps: RouteStep[] = [];
  for (let i = 0; i < nodePath.length - 1; i++) {
    const edge = edgeBetween(graph, nodePath[i], nodePath[i + 1]);
    if (!edge) return { status: "NO_PATH", steps, reason: `internal: no edge found between adjacent path nodes ${nodePath[i]} -> ${nodePath[i + 1]}` };
    if (!isEdgeAllowed(edge)) return { status: "BLOCKED_BY_POLICY", steps, reason: `edge ${nodePath[i]} -> ${nodePath[i + 1]} is not permitted for this actor` };
    steps.push({ fromRef: nodePath[i], toRef: nodePath[i + 1], edge });
  }

  // Part 17 — a multi-step route only counts as physically walkable end
  // to end once EVERY edge in it has a real SpatialTransition mapped.
  // A route that is merely KNOWN (navigable in graph terms) but not yet
  // walkable must say so honestly rather than silently teleporting across
  // the gap.
  const untraversable = steps.find((s) => !s.edge.transitionRef);
  if (untraversable) {
    return { status: "NOT_PHYSICALLY_TRAVERSABLE", steps, reason: `edge ${untraversable.fromRef} -> ${untraversable.toRef} (via ${untraversable.edge.via}) has no mapped physical SpatialTransition yet` };
  }
  return { status: "OK", steps };
}

function isWalkableEdge(edge: NavigationEdge, isEdgeAllowed: (edge: NavigationEdge) => boolean): boolean {
  // An "adjacency" edge has no boundary at all (already-inside-one-open-
  // space repositioning) — real and walkable by definition, no
  // transitionRef needed. Every other kind (door/lift/stair) is only
  // walkable once a real capability has actually been bound to it.
  return isEdgeAllowed(edge) && (edge.via === "adjacency" || Boolean(edge.transitionRef));
}

/** Breadth-first search over only the edges `keep()` accepts — the shared
 * engine behind planTraversableRoute()'s three-tier honesty check below. */
function bfsFiltered(graph: NavigationGraph, fromRef: CanonicalRef, toRef: CanonicalRef, keep: (edge: NavigationEdge) => boolean): RouteStep[] | undefined {
  const adjacency = new Map<CanonicalRef, NavigationEdge[]>();
  const addDirected = (from: CanonicalRef, to: CanonicalRef, edge: NavigationEdge) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from)!.push({ ...edge, fromRef: from, toRef: to });
  };
  for (const edge of graph.edges) {
    if (!keep(edge)) continue;
    addDirected(edge.fromRef, edge.toRef, edge);
    if (edge.bidirectional) addDirected(edge.toRef, edge.fromRef, edge);
  }
  const visited = new Set<CanonicalRef>([fromRef]);
  const queue: Array<{ ref: CanonicalRef; steps: RouteStep[] }> = [{ ref: fromRef, steps: [] }];
  while (queue.length > 0) {
    const { ref, steps } = queue.shift()!;
    for (const edge of adjacency.get(ref) ?? []) {
      if (visited.has(edge.toRef)) continue;
      const nextSteps = [...steps, { fromRef: edge.fromRef, toRef: edge.toRef, edge }];
      if (edge.toRef === toRef) return nextSteps;
      visited.add(edge.toRef);
      queue.push({ ref: edge.toRef, steps: nextSteps });
    }
  }
  return undefined;
}

/** Part 12/17 — a capability-aware search: unlike planRoute() (which
 * takes the graph's own plain shortest path and reports exactly where
 * THAT ONE path breaks), this searches for the shortest path built ONLY
 * from edges that are already both PERMITTED and PHYSICALLY WALKABLE.
 * This is what makes "route alternatives" real rather than aspirational:
 * if the graph's raw shortest path would cross an unwalkable edge (e.g. a
 * stair with no real transition yet) while a slightly longer but fully
 * walkable path exists (e.g. via a real lift), this finds the walkable
 * one — never a fabricated shortcut, never silently teleporting across
 * the unwalkable edge either.
 *
 * When no walkable path exists, the failure is reported honestly across
 * three tiers rather than one blanket status: BLOCKED_BY_POLICY only when
 * a physically-walkable path genuinely exists but THIS identity isn't
 * permitted on it; NOT_PHYSICALLY_TRAVERSABLE when connectivity exists
 * but no real transition capability is bound anywhere along it (for
 * anyone); NO_PATH when the spaces simply aren't connected at all. */
export function planTraversableRoute(graph: NavigationGraph, fromRef: CanonicalRef, toRef: CanonicalRef, isEdgeAllowed: (edge: NavigationEdge) => boolean): RoutePlanResult {
  if (fromRef === toRef) return { status: "OK", steps: [] };

  const permittedAndWalkable = bfsFiltered(graph, fromRef, toRef, (e) => isWalkableEdge(e, isEdgeAllowed));
  if (permittedAndWalkable) return { status: "OK", steps: permittedAndWalkable };

  const walkableIgnoringPolicy = bfsFiltered(graph, fromRef, toRef, (e) => isWalkableEdge(e, () => true));
  if (walkableIgnoringPolicy) {
    return { status: "BLOCKED_BY_POLICY", steps: [], reason: `a physically-walkable route from ${fromRef} to ${toRef} exists, but is not permitted for this actor` };
  }

  const anyPath = shortestPath(graph, fromRef, toRef);
  if (!anyPath) return { status: "NO_PATH", steps: [], reason: `no connected path exists from ${fromRef} to ${toRef}` };
  return { status: "NOT_PHYSICALLY_TRAVERSABLE", steps: [], reason: `a path exists in the navigation graph, but no combination of currently-bound, physically-walkable transitions reaches ${toRef} from ${fromRef}` };
}
