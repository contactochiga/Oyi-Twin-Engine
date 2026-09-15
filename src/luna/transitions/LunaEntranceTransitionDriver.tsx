// Luna — Spatial Transition Engine V1 Part 4/11: the real host driving
// the Grand Entrance through the generic engine/spatial/transitionEngine.ts
// state machine. This is Luna-specific WIRING only — every decision
// (when access is resolved, when the boundary is clear, when a waypoint
// is reached) is made by the generic pure functions in
// engine/spatial/{transitionEngine,clearance,accessResolution,cameraTraversal}.ts;
// this component only supplies real inputs (the door's actual rendered
// leaf progress, CameraRig's actual arrival events) and forwards the
// resulting door-state/camera-target to its parent.
//
// Mounted inside <Canvas> (useFrame requires that) as an invisible sibling
// of CameraRig; App.tsx bridges CameraRig's onArrive back into this
// component via the exposed handleCameraArrive() imperative method,
// since CameraRig and this driver are siblings, not parent/child.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { CameraFlightTarget } from "../../engine/components/CameraRig";
import type { SlidingDoorState } from "../../engine/components/SlidingGlassDoor";
import type { RepresentationIdentity } from "../../engine/representationPolicy";
import type { TransitionDiagnostics, SpatialTransition } from "../../engine/spatial/transitions";
import { beginTransition, beginApproach, arriveAtApproachPoint, resolveAccessStep, checkClearance, advanceCrossing, isTerminalPhase, type TransitionRuntimeContext } from "../../engine/spatial/transitionEngine";
import { buildTraversalWaypoints } from "../../engine/spatial/cameraTraversal";
import { resolveTransitionAccess } from "../../engine/spatial/accessResolution";
import { slidingBoundaryState, isBoundaryClearForTraversal, STANDARD_TRAVERSAL_PROFILE } from "../../engine/spatial/clearance";
import { lunaAccessTransitionResolver } from "../runtime/lunaAccessTransitionResolver";
import { LUNA_MAIN_ENTRANCE_TRANSITION, LUNA_MAIN_ENTRANCE_TRANSITION_REVERSE } from "./lunaTransitions";
import { GROUND_ENTRANCE_OPENING_WIDTH } from "../architecture/GroundEntrance";

/** Brief step 9 — "door closes after clearance": a cosmetic dwell before
 * closing, distinct from (and never a substitute for) the real
 * clearance-gated CROSSING check above. This only ever runs AFTER a real
 * traversal has already completed. */
const CLOSE_DWELL_MS = 500;
const CLOSE_ANIMATION_MS = 1400;

export interface LunaEntranceTransitionHandle {
  beginEnter: () => void;
  beginExit: () => void;
  handleCameraArrive: (target: CameraFlightTarget) => void;
  /** Wired straight to SlidingGlassDoor's own real onProgressChange —
   * the driver's clearance check reads the door's ACTUAL rendered leaf
   * position through this, never a parallel/duplicated estimate. */
  setDoorProgress: (progress: number) => void;
}

export interface LunaEntranceTransitionDriverProps {
  identity: RepresentationIdentity;
  onDoorStateChange: (state: SlidingDoorState) => void;
  onFlightTargetChange: (target: CameraFlightTarget) => void;
  onArrivedInterior: () => void;
  onArrivedExterior: () => void;
  onDiagnostics?: (diagnostics: TransitionDiagnostics | null) => void;
}

function sameWaypoint(a: CameraFlightTarget, b: CameraFlightTarget): boolean {
  return Math.abs(a.position[0] - b.position[0]) < 0.01 && Math.abs(a.position[2] - b.position[2]) < 0.01;
}

export const LunaEntranceTransitionDriver = forwardRef<LunaEntranceTransitionHandle, LunaEntranceTransitionDriverProps>(function LunaEntranceTransitionDriver(
  { identity, onDoorStateChange, onFlightTargetChange, onArrivedInterior, onArrivedExterior, onDiagnostics },
  ref
) {
  const [ctx, setCtx] = useState<TransitionRuntimeContext | null>(null);
  const doorProgressRef = useRef(0);
  const waypointsRef = useRef<CameraFlightTarget[]>([]);
  // useImperativeHandle below has a stable ([]) deps array so App.tsx's
  // ref identity never churns — that means the closures it returns must
  // never read `ctx` directly (they'd be stuck seeing the FIRST render's
  // value forever). This ref mirrors the latest ctx for them to read
  // instead.
  const ctxRef = useRef<TransitionRuntimeContext | null>(null);
  useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx]);

  const start = (transition: SpatialTransition) => {
    if (ctxRef.current && !isTerminalPhase(ctxRef.current.phase)) return; // a transition is already in flight — never start a second one on top of it
    const waypoints = buildTraversalWaypoints(transition);
    waypointsRef.current = waypoints;
    onFlightTargetChange(waypoints[0]);
    setCtx(beginApproach(beginTransition(transition, waypoints.length)));
  };

  useImperativeHandle(
    ref,
    () => ({
      beginEnter: () => start(LUNA_MAIN_ENTRANCE_TRANSITION),
      beginExit: () => start(LUNA_MAIN_ENTRANCE_TRANSITION_REVERSE),
      handleCameraArrive: (target: CameraFlightTarget) => {
        setCtx((prev) => {
          if (!prev) return prev;
          const expected = waypointsRef.current[prev.waypointIndex];
          if (!expected || !sameWaypoint(expected, target)) return prev; // not this transition's own waypoint (e.g. an unrelated flight elsewhere in the app) — ignore
          if (prev.phase === "APPROACHING") return arriveAtApproachPoint(prev);
          if (prev.phase === "CROSSING") return advanceCrossing(prev);
          return prev;
        });
      },
      setDoorProgress: (progress: number) => {
        doorProgressRef.current = progress;
      },
    }),
    []
  );

  // WAITING_FOR_ACCESS -> resolve through the REAL access system, then
  // advance. For the Main Entrance this always short-circuits to
  // NOT_REQUIRED (accessRequirement "NONE") without even calling the
  // resolver — a real, disclosed, pre-existing boundary, not a stub.
  useEffect(() => {
    if (!ctx || ctx.phase !== "WAITING_FOR_ACCESS") return;
    const access = resolveTransitionAccess(ctx.transition, lunaAccessTransitionResolver, identity);
    setCtx((prev) => (prev && prev.phase === "WAITING_FOR_ACCESS" ? resolveAccessStep(prev, access) : prev));
  }, [ctx?.phase, identity]);

  // Door state derived purely from transition phase — the geometry still
  // never decides this itself (SlidingGlassDoor's own long-standing
  // principle), it now just has a real state machine behind it instead
  // of a fixed timer.
  useEffect(() => {
    if (!ctx) return;
    if (ctx.phase === "ACTUATING" || ctx.phase === "WAITING_FOR_CLEARANCE") onDoorStateChange("OPENING");
    else if (ctx.phase === "CROSSING") onDoorStateChange("OPEN");
    else if (ctx.phase === "DENIED" || ctx.phase === "BLOCKED" || ctx.phase === "FAULT") onDoorStateChange("CLOSED");
  }, [ctx?.phase, onDoorStateChange]);

  // Camera target for the CURRENT waypoint, whenever it changes.
  useEffect(() => {
    if (!ctx) return;
    const wp = waypointsRef.current[ctx.waypointIndex];
    if (wp) onFlightTargetChange(wp);
  }, [ctx?.waypointIndex, ctx?.phase, onFlightTargetChange]);

  // ARRIVED -> tell the host (App.tsx) the traveler is now really on the
  // other side, then close the door after a brief, disclosed cosmetic
  // dwell (never gating the crossing itself, which already happened).
  useEffect(() => {
    if (!ctx || ctx.phase !== "ARRIVED") return;
    const enteringInterior = ctx.transition.transitionId === LUNA_MAIN_ENTRANCE_TRANSITION.transitionId;
    if (enteringInterior) onArrivedInterior();
    else onArrivedExterior();
    const closeTimer = setTimeout(() => onDoorStateChange("CLOSING"), CLOSE_DWELL_MS);
    const clearTimer = setTimeout(() => {
      onDoorStateChange("CLOSED");
      setCtx(null);
    }, CLOSE_DWELL_MS + CLOSE_ANIMATION_MS);
    return () => {
      clearTimeout(closeTimer);
      clearTimeout(clearTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.phase]);

  useEffect(() => {
    if (!onDiagnostics) return;
    if (!ctx) {
      onDiagnostics(null);
      return;
    }
    onDiagnostics({
      transitionId: ctx.transition.transitionId,
      phase: ctx.phase,
      waypointIndex: ctx.waypointIndex,
      waypointCount: ctx.waypointCount,
      accessOutcome: ctx.accessResult?.outcome,
      boundaryOpenFraction: doorProgressRef.current,
      failureReason: ctx.failureReason,
    });
  }, [ctx, onDiagnostics]);

  // The ONLY per-frame polling this driver does: read the door's own
  // REAL rendered leaf progress (fed in via onProgressChange below,
  // written to doorProgressRef by the parent) and ask clearance.ts's own
  // isBoundaryClearForTraversal() whether it's open enough yet — never a
  // fixed timer standing in for "probably done by now."
  useFrame(() => {
    if (!ctx || (ctx.phase !== "ACTUATING" && ctx.phase !== "WAITING_FOR_CLEARANCE")) return;
    const boundary = slidingBoundaryState(doorProgressRef.current, GROUND_ENTRANCE_OPENING_WIDTH);
    const clear = isBoundaryClearForTraversal(boundary, STANDARD_TRAVERSAL_PROFILE);
    setCtx((prev) => (prev && (prev.phase === "ACTUATING" || prev.phase === "WAITING_FOR_CLEARANCE") ? checkClearance(prev, clear) : prev));
  });

  return null;
});
