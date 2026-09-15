// Oyi Twin Engine — Spatial Transition Engine V1: the core state
// machine, expressed as pure step functions exactly like twoStageInteraction.ts's
// own resolveTapAction()/handleSpatialTap() split — the DECISION logic
// lives here, stateless and host-agnostic; a host (a React hook, a test)
// owns the actual timers/camera/door side effects and calls these
// functions to advance.
//
// Grammar (brief's own words): SELECT DESTINATION -> RESOLVE ENTRY ->
// APPROACH -> RESOLVE ACCESS -> ACTUATE BOUNDARY -> WAIT FOR CLEARANCE ->
// CROSS THRESHOLD -> ARRIVE -> CONTINUE NAVIGATION. Never force
// completion (Part 33) — every step function only moves phase forward
// when its own real precondition is met; a caller cannot skip a phase by
// calling the wrong function (each one no-ops if called out of order).

import type { AccessResolution } from "./accessResolution";
import type { SpatialTransition, TransitionStateName } from "./transitions";

export interface TransitionRuntimeContext {
  transition: SpatialTransition;
  phase: TransitionStateName;
  /** Index into buildTraversalWaypoints(transition)'s own output this
   * context is currently at (once APPROACHING/CROSSING) or heading
   * toward. */
  waypointIndex: number;
  waypointCount: number;
  accessResult?: AccessResolution;
  failureReason?: string;
}

export function beginTransition(transition: SpatialTransition, waypointCount: number): TransitionRuntimeContext {
  return { transition, phase: "LOCATING_ENTRY", waypointIndex: 0, waypointCount };
}

/** LOCATING_ENTRY -> APPROACHING: the host has resolved the real
 * transition to take (found the door/lift/passage that connects the
 * current space to the destination) and begins flying the camera toward
 * crossingPath[0], the approach point. */
export function beginApproach(ctx: TransitionRuntimeContext): TransitionRuntimeContext {
  if (ctx.phase !== "LOCATING_ENTRY") return ctx;
  return { ...ctx, phase: "APPROACHING", waypointIndex: 0 };
}

/** APPROACHING -> WAITING_FOR_ACCESS: the camera has actually settled at
 * the approach point (host calls this from CameraRig's onArrive for
 * waypoint 0 — never on a fixed timer). */
export function arriveAtApproachPoint(ctx: TransitionRuntimeContext): TransitionRuntimeContext {
  if (ctx.phase !== "APPROACHING") return ctx;
  return { ...ctx, phase: "WAITING_FOR_ACCESS" };
}

/** WAITING_FOR_ACCESS -> ACTUATING / CROSSING / DENIED /
 * PAUSED_FOR_USER_INPUT / BLOCKED, driven entirely by the real
 * AccessResolution the host already obtained via
 * accessResolution.ts's resolveTransitionAccess(). OPEN_PASSAGE
 * transitions skip actuation entirely (there is no boundary to actuate)
 * and go straight to CROSSING. */
export function resolveAccessStep(ctx: TransitionRuntimeContext, access: AccessResolution): TransitionRuntimeContext {
  if (ctx.phase !== "WAITING_FOR_ACCESS") return ctx;
  if (access.outcome === "DENIED") return { ...ctx, phase: "DENIED", accessResult: access, failureReason: access.reason };
  if (access.outcome === "REQUIRES_CREDENTIAL") return { ...ctx, phase: "PAUSED_FOR_USER_INPUT", accessResult: access };
  if (access.outcome === "UNAVAILABLE") return { ...ctx, phase: "BLOCKED", accessResult: access, failureReason: access.reason };
  // GRANTED or NOT_REQUIRED from here on.
  if (ctx.transition.type === "OPEN_PASSAGE") {
    return { ...ctx, phase: "CROSSING", accessResult: access, waypointIndex: Math.min(1, ctx.waypointCount - 1) };
  }
  return { ...ctx, phase: "ACTUATING", accessResult: access };
}

/** A PAUSED_FOR_USER_INPUT transition resumes once the host reports the
 * credential/approval it was waiting on was actually supplied — never
 * fabricated, only ever driven by a real subsequent AccessResolution. */
export function resumeAfterUserInput(ctx: TransitionRuntimeContext, access: AccessResolution): TransitionRuntimeContext {
  if (ctx.phase !== "PAUSED_FOR_USER_INPUT") return ctx;
  return resolveAccessStep({ ...ctx, phase: "WAITING_FOR_ACCESS" }, access);
}

/** ACTUATING / WAITING_FOR_CLEARANCE -> CROSSING, driven by
 * clearance.ts's isBoundaryClearForTraversal() reading the boundary's
 * REAL current physical state each tick — never a timer. Stays in
 * WAITING_FOR_CLEARANCE for as many ticks as the real boundary takes to
 * actually clear. */
export function checkClearance(ctx: TransitionRuntimeContext, isClear: boolean): TransitionRuntimeContext {
  if (ctx.phase !== "ACTUATING" && ctx.phase !== "WAITING_FOR_CLEARANCE") return ctx;
  if (!isClear) return { ...ctx, phase: "WAITING_FOR_CLEARANCE" };
  return { ...ctx, phase: "CROSSING", waypointIndex: Math.min(Math.max(ctx.waypointIndex, 1), ctx.waypointCount - 1) };
}

/** CROSSING advances one waypoint at a time (host calls this from
 * CameraRig's onArrive for each intermediate waypoint) until the last
 * waypoint is reached, at which point the transition is ARRIVED. */
export function advanceCrossing(ctx: TransitionRuntimeContext): TransitionRuntimeContext {
  if (ctx.phase !== "CROSSING") return ctx;
  const nextIndex = ctx.waypointIndex + 1;
  if (nextIndex >= ctx.waypointCount) return { ...ctx, phase: "ARRIVED", waypointIndex: ctx.waypointCount - 1 };
  return { ...ctx, waypointIndex: nextIndex };
}

/** Part 32/33 — cancellation and fault handling never force completion;
 * a cancelled/faulted transition simply stops where it is and reports
 * why, leaving the host free to re-close any door it opened. Terminal
 * phases (ARRIVED/BLOCKED/DENIED/FAULT) cannot be cancelled — there is
 * nothing left in flight to stop. */
export function cancelTransition(ctx: TransitionRuntimeContext, reason = "cancelled"): TransitionRuntimeContext {
  if (isTerminalPhase(ctx.phase)) return ctx;
  return { ...ctx, phase: "IDLE", failureReason: reason };
}

export function faultTransition(ctx: TransitionRuntimeContext, reason: string): TransitionRuntimeContext {
  if (isTerminalPhase(ctx.phase)) return ctx;
  return { ...ctx, phase: "FAULT", failureReason: reason };
}

export function isTerminalPhase(phase: TransitionStateName): boolean {
  return phase === "ARRIVED" || phase === "BLOCKED" || phase === "DENIED" || phase === "FAULT" || phase === "IDLE";
}
