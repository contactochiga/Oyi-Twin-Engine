// Oyi Twin Engine — Spatial Transition Engine V1.1 Part 2: the generic
// route orchestrator. A SpatialRoute chains multiple already-real
// SpatialTransition/lift-handoff/plain-repositioning steps into one
// journey ("take me to Level 6") — it never duplicates routePlanning.ts's
// own shortest-path/policy-filter logic (buildSpatialRoute below
// consumes its RoutePlanResult directly), and it never re-implements a
// door/lift/stair transition itself — it only sequences the REAL ones
// that already exist, advancing a step only when that step's own real
// completion signal fires (never a timer).

import type { CanonicalRef } from "../types";
import type { NavigationEdge, NavigationEdgeVia } from "./navigationGraph";
import type { RoutePlanResult } from "./routePlanning";

export type RouteStepKind = "MOVE" | "TRANSITION" | "LIFT" | "STAIR" | "OPEN_PASSAGE" | "WAIT_FOR_USER" | "ARRIVE";

// Apartment A Full Interior Reality V1 (Part 31-32) — the ONE session-
// level navigation-mode preference every entry point (map, room list,
// Oyi) reads before dispatching a destination: TOUR always uses this
// file's own route orchestration (real doors/lifts/clearance, never
// skipped); TELEPORT is a legitimate, policy-checked direct arrival, not
// a failure/fallback state. Building-agnostic — no destination kind
// (room/unit/level) or Luna-specific ref appears here.
export type NavigationMode = "TELEPORT" | "TOUR";

export type RouteStatus = "IDLE" | "PLANNING" | "READY" | "EXECUTING" | "WAITING" | "PAUSED_FOR_USER" | "ARRIVED" | "BLOCKED" | "DENIED" | "FAULT" | "CANCELLED";

export interface SpatialRouteStep {
  kind: RouteStepKind;
  fromRef: CanonicalRef;
  toRef: CanonicalRef;
  /** The real door/lift/stair/passage ref this step walks, when the kind
   * implies a boundary (TRANSITION/LIFT/STAIR/OPEN_PASSAGE). Undefined
   * for MOVE (no boundary — free repositioning within an already
   * adjacency-connected, already-authorized space) and ARRIVE. */
  viaRef?: CanonicalRef;
  via: NavigationEdgeVia;
}

export interface SpatialRoute {
  routeId: string;
  startSpaceRef: CanonicalRef;
  destinationSpaceRef: CanonicalRef;
  steps: SpatialRouteStep[];
  currentStepIndex: number;
  status: RouteStatus;
  failureReason?: string;
}

/** Classifies a single planned edge into the route-step vocabulary. An
 * "adjacency" edge with a transitionRef prefixed "PASSAGE:" means a real
 * OPEN_PASSAGE transition was bound to it (Part 9); an "adjacency" edge
 * with no transitionRef is a genuine no-boundary reposition (already
 * inside one open/authorized space) and stays a plain MOVE — never
 * upgraded into a fabricated crossing. */
function classifyEdge(edge: NavigationEdge): RouteStepKind {
  if (edge.via === "lift") return "LIFT";
  if (edge.via === "stair") return "STAIR";
  if (edge.via === "door") return "TRANSITION";
  if (edge.via === "adjacency" && edge.transitionRef?.startsWith("PASSAGE:")) return "OPEN_PASSAGE";
  return "MOVE";
}

/** Part 2 — builds a SpatialRoute from routePlanning.ts's own real,
 * already-policy-filtered RoutePlanResult. Never called with a
 * non-"OK" result — the caller (Luna's route-request wiring) is
 * responsible for surfacing BLOCKED_BY_POLICY/NOT_PHYSICALLY_TRAVERSABLE/
 * NO_PATH as their own real, honest route statuses before ever reaching
 * here (see routeRequest.ts). */
/** A lift/stair is represented in the navigation graph as a star topology
 * (every served level connects to the SAME lift/stair node) — so a real
 * route through one always produces TWO consecutive raw edges sharing the
 * same viaRef: landing -> node, then node -> destination. Coalesced into
 * ONE logical LIFT/STAIR step spanning landing -> destination directly;
 * the lift-handoff/stair driver internally still does "board at the
 * landing, travel, exit at the destination" — this just matches the
 * step model to how a rider actually experiences it, rather than
 * exposing the graph's own internal node as a spurious intermediate
 * "arrival." */
function coalesceHops(steps: SpatialRouteStep[]): SpatialRouteStep[] {
  const out: SpatialRouteStep[] = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const next = steps[i + 1];
    if (
      next &&
      (step.via === "lift" || step.via === "stair") &&
      step.via === next.via &&
      step.viaRef &&
      step.viaRef === next.viaRef &&
      step.toRef === step.viaRef &&
      next.fromRef === next.viaRef
    ) {
      out.push({ kind: step.kind, fromRef: step.fromRef, toRef: next.toRef, viaRef: step.viaRef, via: step.via });
      i++; // consume both
      continue;
    }
    out.push(step);
  }
  return out;
}

export function buildSpatialRoute(routeId: string, plan: RoutePlanResult, startRef: CanonicalRef, destinationRef: CanonicalRef): SpatialRoute {
  const rawSteps: SpatialRouteStep[] = plan.steps.map((s) => ({
    kind: classifyEdge(s.edge),
    fromRef: s.fromRef,
    toRef: s.toRef,
    viaRef: s.edge.viaRef,
    via: s.edge.via,
  }));
  return { routeId, startSpaceRef: startRef, destinationSpaceRef: destinationRef, steps: coalesceHops(rawSteps), currentStepIndex: 0, status: "READY" };
}

export function beginRoute(route: SpatialRoute): SpatialRoute {
  if (route.status !== "READY") return route;
  if (route.steps.length === 0) return { ...route, status: "ARRIVED" };
  return { ...route, status: "EXECUTING", currentStepIndex: 0 };
}

/** The current step's own driver (transition engine / lift handoff /
 * plain camera flight) reports completion by calling this — never a
 * fixed delay. Advances to the next step, or ARRIVED once every step is
 * done. */
export function advanceRouteStep(route: SpatialRoute): SpatialRoute {
  if (route.status !== "EXECUTING" && route.status !== "WAITING") return route;
  const nextIndex = route.currentStepIndex + 1;
  if (nextIndex >= route.steps.length) return { ...route, status: "ARRIVED", currentStepIndex: route.steps.length };
  return { ...route, status: "EXECUTING", currentStepIndex: nextIndex };
}

/** A step is waiting on something real (a lift car, a door clearing) —
 * distinct from EXECUTING so a host/UI can render "waiting" honestly. */
export function markRouteWaiting(route: SpatialRoute): SpatialRoute {
  if (route.status !== "EXECUTING") return route;
  return { ...route, status: "WAITING" };
}

/** Part 18 — a step legitimately needs real user input (a credential
 * choice, an approval) — never fabricated, only ever resumed by a real
 * subsequent event. */
export function pauseRouteForUser(route: SpatialRoute): SpatialRoute {
  if (route.status !== "EXECUTING" && route.status !== "WAITING") return route;
  return { ...route, status: "PAUSED_FOR_USER" };
}

export function resumeRoute(route: SpatialRoute): SpatialRoute {
  if (route.status !== "PAUSED_FOR_USER") return route;
  return { ...route, status: "EXECUTING" };
}

export function failRoute(route: SpatialRoute, status: "BLOCKED" | "DENIED" | "FAULT", reason: string): SpatialRoute {
  if (isRouteTerminal(route.status)) return route;
  return { ...route, status, failureReason: reason };
}

/** Part 15 — cancellation never forces completion and never corrupts the
 * state of whatever the current step was actually driving (a lift/door
 * runtime keeps its own legitimate lifecycle going; this only stops the
 * ROUTE from continuing). */
export function cancelRoute(route: SpatialRoute, reason = "cancelled by user"): SpatialRoute {
  if (isRouteTerminal(route.status)) return route;
  return { ...route, status: "CANCELLED", failureReason: reason };
}

export function isRouteTerminal(status: RouteStatus): boolean {
  return status === "ARRIVED" || status === "BLOCKED" || status === "DENIED" || status === "FAULT" || status === "CANCELLED";
}

export function currentRouteStep(route: SpatialRoute): SpatialRouteStep | undefined {
  return route.steps[route.currentStepIndex];
}
