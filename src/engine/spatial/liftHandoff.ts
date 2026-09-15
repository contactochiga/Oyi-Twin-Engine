// Oyi Twin Engine — Spatial Transition Engine V1.1 Part 4: the generic
// lift-handoff contract. This orchestrates AROUND a building's own real
// lift provider — it never simulates vertical motion itself, never
// invents a second LiftState, and calls the SAME "callLift"/"setPosition"
// CommandName values (twinRuntime.ts) any lift asset already understands.
// A LiftHandoffContext's own phases are deliberately distinct from
// transitionEngine.ts's TransitionStateName (a lift leg is a compound
// hop — call, wait for the REAL car, board, travel under the REAL
// provider's own authority, wait for REAL arrival, exit — not a single
// door crossing), so nothing here risks confusing or overloading the
// door-transition vocabulary V1 already shipped and tested.

import type { CanonicalRef } from "../types";
import type { RepresentationIdentity } from "../representationPolicy";
import type { CommandName, TwinRuntimeProvider } from "../twinRuntime";
import type { AccessResolution } from "./accessResolution";

export type LiftHandoffPhase =
  | "IDLE"
  | "WAITING_FOR_ACCESS"
  | "CALLING"
  | "BOARDING"
  | "TRAVELLING"
  | "ARRIVING"
  | "EXITING"
  | "ARRIVED"
  | "DENIED"
  | "UNAVAILABLE"
  | "FAULT"
  | "CANCELLED";

/** The minimal, generic shape any building's own lift runtime state must
 * expose for this handoff to work — Luna's real LiftState already has
 * every one of these fields with these exact names (structural typing,
 * no adapter needed); a future building's own lift asset only needs to
 * expose the same shape. */
export interface LiftRuntimeSnapshot {
  currentFloor: string | null;
  doorState: "OPEN" | "OPENING" | "CLOSED" | "CLOSING";
  faultState: string | null;
  serviceState: string;
}

export interface LiftHandoffContext {
  liftRef: CanonicalRef;
  fromLevelRef: CanonicalRef;
  toLevelRef: CanonicalRef;
  phase: LiftHandoffPhase;
  failureReason?: string;
}

export function beginLiftHandoff(liftRef: CanonicalRef, fromLevelRef: CanonicalRef, toLevelRef: CanonicalRef): LiftHandoffContext {
  return { liftRef, fromLevelRef, toLevelRef, phase: "WAITING_FOR_ACCESS" };
}

/** WAITING_FOR_ACCESS -> CALLING/DENIED/UNAVAILABLE, driven by the SAME
 * accessResolution.ts contract door transitions use — a building may gate
 * lift use through RepresentationPolicy (Luna's real, current gate: lift
 * control requires a FULL_3D-resolving identity) via an AccessResolver
 * wired the same way lunaAccessTransitionResolver.ts already is. */
export function resolveLiftAccessStep(ctx: LiftHandoffContext, access: AccessResolution): LiftHandoffContext {
  if (ctx.phase !== "WAITING_FOR_ACCESS") return ctx;
  if (access.outcome === "DENIED") return { ...ctx, phase: "DENIED", failureReason: access.reason };
  if (access.outcome === "UNAVAILABLE" || access.outcome === "REQUIRES_CREDENTIAL") return { ...ctx, phase: "UNAVAILABLE", failureReason: access.reason };
  return { ...ctx, phase: "CALLING" };
}

/** CALLING -> BOARDING once the REAL car is at the origin floor with REAL
 * open doors — polled from the provider's own real state each tick,
 * never a timer. FAULT/UNAVAILABLE surface the provider's own real
 * fault/service state honestly rather than waiting forever. */
export function checkLiftArrivalAtOrigin(ctx: LiftHandoffContext, snapshot: LiftRuntimeSnapshot): LiftHandoffContext {
  if (ctx.phase !== "CALLING") return ctx;
  if (snapshot.faultState) return { ...ctx, phase: "FAULT", failureReason: snapshot.faultState };
  if (snapshot.serviceState !== "normal") return { ...ctx, phase: "UNAVAILABLE", failureReason: `lift service state: ${snapshot.serviceState}` };
  if (snapshot.currentFloor === ctx.fromLevelRef && snapshot.doorState === "OPEN") return { ...ctx, phase: "BOARDING" };
  return ctx;
}

/** BOARDING -> TRAVELLING: the host has finished the real (short) camera
 * crossing into the car; from here the REAL lift provider owns vertical
 * motion entirely — this context does nothing but watch for real
 * arrival. */
export function beginTravel(ctx: LiftHandoffContext): LiftHandoffContext {
  if (ctx.phase !== "BOARDING") return ctx;
  return { ...ctx, phase: "TRAVELLING" };
}

/** TRAVELLING -> ARRIVING once the REAL car reports the destination floor
 * with REAL open doors. */
export function checkLiftArrivalAtDestination(ctx: LiftHandoffContext, snapshot: LiftRuntimeSnapshot): LiftHandoffContext {
  if (ctx.phase !== "TRAVELLING") return ctx;
  if (snapshot.faultState) return { ...ctx, phase: "FAULT", failureReason: snapshot.faultState };
  if (snapshot.currentFloor === ctx.toLevelRef && snapshot.doorState === "OPEN") return { ...ctx, phase: "ARRIVING" };
  return ctx;
}

export function beginExitCar(ctx: LiftHandoffContext): LiftHandoffContext {
  if (ctx.phase !== "ARRIVING") return ctx;
  return { ...ctx, phase: "EXITING" };
}

export function completeExitCar(ctx: LiftHandoffContext): LiftHandoffContext {
  if (ctx.phase !== "EXITING") return ctx;
  return { ...ctx, phase: "ARRIVED" };
}

export function cancelLiftHandoff(ctx: LiftHandoffContext, reason = "cancelled"): LiftHandoffContext {
  if (isTerminalLiftPhase(ctx.phase)) return ctx;
  return { ...ctx, phase: "CANCELLED", failureReason: reason };
}

export function isTerminalLiftPhase(phase: LiftHandoffPhase): boolean {
  return phase === "ARRIVED" || phase === "DENIED" || phase === "UNAVAILABLE" || phase === "FAULT" || phase === "CANCELLED";
}

/** Part 4 steps 3/8 — the ONLY two calls this file ever makes into the
 * real runtime, both reusing "callLift"/"setPosition", CommandName
 * values that already exist and already work (twinRuntime.ts) — never a
 * second, parallel lift-command surface. */
// Apartment A Full Interior Reality V1 (Part 3/9 fix) — every call this
// file makes is, by construction, a passenger riding through a real
// SpatialRoute (this is the ONLY caller of these two functions — direct
// Facility lift CONTROL goes through a completely separate UI/command
// path, e.g. ElevatorControlBoard). `purpose: "passenger"` is an opaque,
// generic args field the engine layer neither reads nor interprets —
// Luna's own TwinRuntimeProvider implementation (lunaSimulationProvider.ts)
// is what actually honors it (via passengerStopAllowed()), the same
// building-specific-interpretation-of-generic-args pattern every other
// command already uses. Without this, a resident's own route-driven lift
// ride silently failed at the runtime layer even though route PLANNING
// correctly allowed it — passengerStopAllowed() was reachable from the
// planner but never actually wired to the real command execution.
export function requestLiftToLanding(runtime: TwinRuntimeProvider, liftRef: CanonicalRef, floorRef: CanonicalRef, actor: RepresentationIdentity): void {
  const command: CommandName = "callLift";
  void runtime.execute({ assetRef: liftRef, command, args: { floor: floorRef, purpose: "passenger" }, actor });
}

export function requestLiftDestination(runtime: TwinRuntimeProvider, liftRef: CanonicalRef, floorRef: CanonicalRef, actor: RepresentationIdentity): void {
  const command: CommandName = "setPosition";
  void runtime.execute({ assetRef: liftRef, command, args: { floor: floorRef, purpose: "passenger" }, actor });
}
