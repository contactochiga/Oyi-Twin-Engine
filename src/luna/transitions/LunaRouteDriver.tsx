import { lunaSimulationProvider } from "../runtime/lunaSimulationProvider";
// Luna — Spatial Transition Engine V1.1 Part 2: the ONE route driver.
// Replaces the V1 entrance-only LunaEntranceTransitionDriver — Part 2's
// own explicit instruction is "do not build separate controllers for
// each journey," so a single-step "just walk through the Main Entrance"
// journey and a multi-step "exterior to Level 6 via the lift" journey
// both run through this exact same component, sequencing the SAME
// generic engine/spatial/{transitionEngine,liftHandoff,route}.ts pure
// state machines. This file is still Luna-specific WIRING only — every
// decision (is the boundary clear, has the lift really arrived, is
// access granted) is made by those generic pure functions; this
// component only supplies real inputs (camera arrival events, runtime
// polling) and forwards results to whichever real geometry/camera call
// App.tsx already owns (SlidingGlassDoor's progress, showLiftView, the
// existing followTarget lift-tracking mechanism).

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { CameraFlightTarget } from "../../engine/components/CameraRig";
import type { SlidingDoorState } from "../../engine/components/SlidingGlassDoor";
import type { RepresentationIdentity } from "../../engine/representationPolicy";
import type { CanonicalRef } from "../../engine/types";
import type { SpatialTransition } from "../../engine/spatial/transitions";
import { beginTransition, beginApproach, arriveAtApproachPoint, resolveAccessStep, resumeAfterUserInput, checkClearance, advanceCrossing, type TransitionRuntimeContext } from "../../engine/spatial/transitionEngine";
import { podiumTraversalWaypoints } from "../architecture/podiumPassages";
import { resolveTransitionAccess } from "../../engine/spatial/accessResolution";
import { isBoundaryClearForTraversal, slidingBoundaryState, hingedBoundaryState, OPEN_BOUNDARY_STATE, STANDARD_TRAVERSAL_PROFILE, type BoundaryState } from "../../engine/spatial/clearance";
import {
  beginLiftHandoff,
  resolveLiftAccessStep,
  checkLiftArrivalAtOrigin,
  beginTravel,
  checkLiftArrivalAtDestination,
  beginExitCar,
  completeExitCar,
  type LiftHandoffContext,
  type LiftRuntimeSnapshot,
} from "../../engine/spatial/liftHandoff";
import { beginRoute as beginRoutePure, advanceRouteStep, failRoute, cancelRoute as cancelRoutePure, currentRouteStep, isRouteTerminal, type SpatialRoute } from "../../engine/spatial/route";
import { lunaAccessTransitionResolver } from "../runtime/lunaAccessTransitionResolver";
import { lunaResolveLiftAccess } from "./lunaRoutePolicy";
import { LUNA_TRANSITION_BINDINGS } from "./lunaRouteTransitions";
import { GROUND_ENTRANCE_REF, GROUND_ENTRANCE_OPENING_WIDTH } from "../architecture/GroundEntrance";
import { HINGED_DOOR_DEFAULT_OPEN_ANGLE_RADIANS } from "../../engine/components/HingedDoor";

const CLOSE_DWELL_MS = 500;
const CLOSE_ANIMATION_MS = 1400;

// Apartment A Full Interior Reality V1 (Part 8) — the one other real,
// live-animated boundary besides the Main Entrance. This is the DOOR's own
// ref (lunaL06Transitions.ts's boundaryRef — the physical leaf this file
// actually animates/waits on clearance for), deliberately NOT the entry
// lock's ref (that's a separate device, the transition's actuatorBinding,
// which only the ACCESS check — accessResolution.ts's
// actuatorBinding-preferring resolveTransitionAccess() — needs to know
// about). Frame width comes straight from l06FloorPlate.ts's
// L06_APARTMENT_DOORS entry (not duplicated as a raw literal without
// provenance).
const APT_A_ENTRY_DOOR_REF = "LUNA-L06-APT-A-ENTRANCE-DOOR";
const APT_A_DOOR_FRAME_WIDTH_METERS = 1.0;

function sameWaypoint(a: CameraFlightTarget, b: CameraFlightTarget): boolean {
  return Math.abs(a.position[0] - b.position[0]) < 0.01 && Math.abs(a.position[2] - b.position[2]) < 0.01;
}

// Apartment A Full Interior Reality V1 (Part 5) — this used to hardcode
// only the Main Entrance's two directions, which silently meant NO other
// real door (including the 4 real L06 apartment entrance doors the L06
// Gold Standard phase built) could ever be physically crossed by a TOUR
// route: requestRoute() already plans a real TRANSITION step through them
// (it reads the very same LUNA_TRANSITION_BINDINGS.doorTransitions list),
// but this driver had no way to look the geometry back up, and would have
// failed the whole route with "no real transition mapped." Looking the
// same list up generically — instead of hardcoding one door — is what
// makes the golden journey's real Apartment A entrance crossing possible
// at all, exactly the "USE THE BUILDING, no teleport fallback" requirement.
function resolveDoorTransition(fromRef: CanonicalRef, toRef: CanonicalRef): SpatialTransition | undefined {
  return [...LUNA_TRANSITION_BINDINGS.doorTransitions, ...LUNA_TRANSITION_BINDINGS.passageTransitions].find((t) => t.fromSpaceRef === fromRef && t.toSpaceRef === toRef);
}

function boundaryStateFor(transition: SpatialTransition, doorProgress: number, apartmentADoorProgress: number): BoundaryState {
  if (transition.boundaryRef === GROUND_ENTRANCE_REF) return slidingBoundaryState(doorProgress, GROUND_ENTRANCE_OPENING_WIDTH);
  if (transition.boundaryRef === APT_A_ENTRY_DOOR_REF) return hingedBoundaryState(apartmentADoorProgress * HINGED_DOOR_DEFAULT_OPEN_ANGLE_RADIANS, HINGED_DOOR_DEFAULT_OPEN_ANGLE_RADIANS, APT_A_DOOR_FRAME_WIDTH_METERS);
  return OPEN_BOUNDARY_STATE; // any other/STATIC_BOUNDARY door: no runtime leaf animation, so nothing to wait on
}

export interface LunaRouteDriverHandle {
  beginRoute: (route: SpatialRoute) => void;
  cancelRoute: () => void;
  handleCameraArrive: (target: CameraFlightTarget) => void;
  setEntranceDoorProgress: (progress: number) => void;
  setApartmentADoorProgress: (progress: number) => void;
  /** Apartment A Full Interior Reality V1 (Part 6) — resumes a transition
   * that is PAUSED_FOR_USER_INPUT with a credential the host's own
   * simulated access-code UI just collected. Routed back through the SAME
   * AccessResolver every other access check already uses (never a
   * hardcoded check inside the visual panel itself). A no-op if no
   * transition is actually waiting on one. */
  submitCredential: (code: string) => void;
}

export interface LunaRouteDriverProps {
  identity: RepresentationIdentity;
  onFlightTargetChange: (target: CameraFlightTarget) => void;
  onEntranceDoorStateChange: (state: SlidingDoorState) => void;
  /** Apartment A Full Interior Reality V1 (Part 8) — the apartment's own
   * hinged entrance leaf is a simple open/closed boolean (see HingedDoor),
   * kept separate from the Main Entrance's SlidingDoorState so a route
   * crossing one boundary never also toggles the other door's visual. */
  onApartmentADoorStateChange: (open: boolean) => void;
  /** Apartment A Full Interior Reality V1 (Part 6) — fires with a boundary
   * ref whenever a transition is genuinely PAUSED_FOR_USER_INPUT (a real
   * engine phase, not a UI-invented state) waiting on a credential, and
   * with null the moment it stops waiting for any reason (submitted,
   * denied, cancelled) — the host's simulated access-code panel mounts and
   * unmounts strictly off this signal. */
  onAccessPromptChange?: (boundaryRef: CanonicalRef | null) => void;
  onRouteChange: (route: SpatialRoute | null) => void;
  onNarration?: (text: string) => void;
  onCurrentSpaceChange: (ref: CanonicalRef) => void;
  getLevelElevation: (levelRef: CanonicalRef) => number;
  onFlyToLiftLanding: (liftRef: CanonicalRef, elevation: number) => void;
  onEnterLiftCar: (liftRef: CanonicalRef) => void;
  onExitLiftCar: (liftRef: CanonicalRef, destinationLevelRef: CanonicalRef) => void;
  getLiftSnapshot: (liftRef: CanonicalRef) => LiftRuntimeSnapshot | undefined;
  requestLiftCommand: (liftRef: CanonicalRef, kind: "call" | "destination", floorRef: CanonicalRef) => void;
}

export const LunaRouteDriver = forwardRef<LunaRouteDriverHandle, LunaRouteDriverProps>(function LunaRouteDriver(
  {
    identity,
    onFlightTargetChange,
    onEntranceDoorStateChange,
    onApartmentADoorStateChange,
    onAccessPromptChange,
    onRouteChange,
    onNarration,
    onCurrentSpaceChange,
    getLevelElevation,
    onFlyToLiftLanding,
    onEnterLiftCar,
    onExitLiftCar,
    getLiftSnapshot,
    requestLiftCommand,
  },
  ref
) {
  const [route, setRoute] = useState<SpatialRoute | null>(null);
  const [transitionCtx, setTransitionCtx] = useState<TransitionRuntimeContext | null>(null);
  const [liftCtx, setLiftCtx] = useState<LiftHandoffContext | null>(null);
  const waypointsRef = useRef<CameraFlightTarget[]>([]);
  const doorProgressRef = useRef(0);
  const apartmentADoorProgressRef = useRef(0);
  const moveWaypointRef = useRef<CameraFlightTarget | null>(null);
  const liftCommandsSentRef = useRef<{ call: boolean; destination: boolean }>({ call: false, destination: false });

  useEffect(() => onRouteChange(route), [route, onRouteChange]);

  useImperativeHandle(
    ref,
    () => ({
      beginRoute: (newRoute: SpatialRoute) => {
        if (route && !isRouteTerminal(route.status)) return; // never start a second route on top of one already in flight
        setTransitionCtx(null);
        setLiftCtx(null);
        setRoute(beginRoutePure(newRoute));
      },
      cancelRoute: () => {
        setRoute((r) => (r ? cancelRoutePure(r) : r));
        setTransitionCtx(null);
        setLiftCtx(null);
      },
      handleCameraArrive: (target: CameraFlightTarget) => {
        setTransitionCtx((prev) => {
          if (!prev) return prev;
          const expected = waypointsRef.current[prev.waypointIndex];
          if (!expected || !sameWaypoint(expected, target)) return prev;
          if (prev.phase === "APPROACHING") return arriveAtApproachPoint(prev);
          if (prev.phase === "CROSSING") return advanceCrossing(prev);
          return prev;
        });
        if (moveWaypointRef.current && sameWaypoint(moveWaypointRef.current, target)) {
          moveWaypointRef.current = null;
          setRoute((r) => (r ? advanceRouteStep(r) : r));
        }
      },
      setEntranceDoorProgress: (progress: number) => {
        doorProgressRef.current = progress;
      },
      setApartmentADoorProgress: (progress: number) => {
        apartmentADoorProgressRef.current = progress;
      },
      submitCredential: (code: string) => {
        const pending = transitionCtx;
        if (!pending || pending.phase !== "PAUSED_FOR_USER_INPUT") return;
        const access = resolveTransitionAccess(pending.transition, lunaAccessTransitionResolver, identity, code);
        if (access.outcome !== "GRANTED") {
          onNarration?.(access.reason);
          // A denied attempt never crosses or unlocks. Keep the real prompt
          // active so the resident can retry without restarting the journey.
          return;
        }
        const actuator = pending.transition.actuatorBinding;
        if (!actuator) return;
        void lunaSimulationProvider.execute({ assetRef: actuator, command: "unlock", actor: identity }).then(result => {
          if (!result.ok) { onNarration?.(result.message); return; }
          setTransitionCtx(prev => prev === pending ? resumeAfterUserInput(prev, access) : prev);
        });
      },
    }),
    [route, identity, transitionCtx, onNarration]
  );

  // Start whichever real step is now current, exactly once per step
  // (guarded by both ctxs being null — cleared only once the PREVIOUS
  // step's own real completion fired).
  useEffect(() => {
    if (!route || route.status !== "EXECUTING") return;
    if (transitionCtx || liftCtx) return;
    const step = currentRouteStep(route);
    if (!step) return;

    if (step.kind === "TRANSITION" || step.kind === "OPEN_PASSAGE") {
      const transition = resolveDoorTransition(step.fromRef, step.toRef);
      if (!transition) {
        setRoute((r) => (r ? failRoute(r, "FAULT", `no real transition mapped for ${step.fromRef} -> ${step.toRef}`) : r));
        return;
      }
      const waypoints = podiumTraversalWaypoints(transition);
      waypointsRef.current = waypoints;
      onFlightTargetChange(waypoints[0]);
      setTransitionCtx(beginApproach(beginTransition(transition, waypoints.length)));
    } else if (step.kind === "LIFT") {
      if (!step.viaRef) {
        setRoute((r) => (r ? failRoute(r, "FAULT", "lift step missing a real lift ref") : r));
        return;
      }
      liftCommandsSentRef.current = { call: false, destination: false };
      setLiftCtx(beginLiftHandoff(step.viaRef, step.fromRef, step.toRef));
      onFlyToLiftLanding(step.viaRef, getLevelElevation(step.fromRef));
    } else if (step.kind === "MOVE") {
      // A MOVE step has no real boundary — free repositioning within an
      // already-adjacency-connected space (Part 32/34: e.g. the level
      // node LUNA-L06 -> its own real Lift Lobby common area). The
      // traveler's current space genuinely changes even though there is
      // no transition/lift machinery to wait on, so this must still tell
      // the host — a route that silently completes without ever
      // reporting arrival at its own real destination is exactly the
      // "procedural arrival floating inside geometry" this phase exists
      // to fix, not a harmless no-op.
      onCurrentSpaceChange(step.toRef);
      setRoute((r) => (r ? advanceRouteStep(r) : r));
    } else {
      setRoute((r) => (r ? advanceRouteStep(r) : r));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.currentStepIndex, route?.status, transitionCtx, liftCtx]);

  // ---- TRANSITION step effects (door crossing) ----
  useEffect(() => {
    if (!transitionCtx || transitionCtx.phase !== "WAITING_FOR_ACCESS") return;
    const access = resolveTransitionAccess(transitionCtx.transition, lunaAccessTransitionResolver, identity);
    setTransitionCtx((prev) => (prev && prev.phase === "WAITING_FOR_ACCESS" ? resolveAccessStep(prev, access) : prev));
    if (access.outcome === "DENIED") setRoute((r) => (r ? failRoute(r, "DENIED", access.reason) : r));
    if (access.outcome === "UNAVAILABLE") setRoute((r) => (r ? failRoute(r, "BLOCKED", access.reason) : r));
  }, [transitionCtx?.phase, identity]);

  // Apartment A Full Interior Reality V1 (Part 5/8) — dispatched by WHICH
  // boundary this transition actually targets, not unconditionally to the
  // Main Entrance: before this fix, ANY crossing (including Apartment A's
  // own entrance, now reachable since resolveDoorTransition() was
  // generalized above) would have also toggled the Ground Main Entrance's
  // sliding-glass visual, since this effect used to fire regardless of
  // which door was actually in flight.
  useEffect(() => {
    if (!transitionCtx) return;
    const isApartmentA = transitionCtx.transition.boundaryRef === APT_A_ENTRY_DOOR_REF;
    const isMainEntrance = transitionCtx.transition.boundaryRef === GROUND_ENTRANCE_REF;
    if (transitionCtx.phase === "ACTUATING" || transitionCtx.phase === "WAITING_FOR_CLEARANCE") {
      if (isMainEntrance) onEntranceDoorStateChange("OPENING");
      if (isApartmentA) onApartmentADoorStateChange(true);
    } else if (transitionCtx.phase === "CROSSING") {
      if (isMainEntrance) onEntranceDoorStateChange("OPEN");
      if (isApartmentA) onApartmentADoorStateChange(true);
    }
  }, [transitionCtx?.phase, transitionCtx?.transition.boundaryRef, onEntranceDoorStateChange, onApartmentADoorStateChange]);

  useEffect(() => {
    if (!transitionCtx) return;
    const wp = waypointsRef.current[transitionCtx.waypointIndex];
    if (wp) onFlightTargetChange(wp);
  }, [transitionCtx?.waypointIndex, transitionCtx?.phase, onFlightTargetChange]);

  useEffect(() => {
    if (!onAccessPromptChange) return;
    onAccessPromptChange(transitionCtx?.phase === "PAUSED_FOR_USER_INPUT" ? (transitionCtx.transition.boundaryRef ?? null) : null);
  }, [transitionCtx?.phase, transitionCtx?.transition.boundaryRef, onAccessPromptChange]);

  useEffect(() => {
    if (!transitionCtx || transitionCtx.phase !== "ARRIVED") return;
    const isApartmentA = transitionCtx.transition.boundaryRef === APT_A_ENTRY_DOOR_REF;
    const isMainEntrance = transitionCtx.transition.boundaryRef === GROUND_ENTRANCE_REF;
    onCurrentSpaceChange(transitionCtx.transition.toSpaceRef);
    setRoute((r) => (r ? advanceRouteStep(r) : r));
    const closeTimer = setTimeout(() => {
      if (isMainEntrance) onEntranceDoorStateChange("CLOSING");
    }, CLOSE_DWELL_MS);
    const clearTimer = setTimeout(() => {
      if (isMainEntrance) onEntranceDoorStateChange("CLOSED");
      if (isApartmentA) onApartmentADoorStateChange(false);
      setTransitionCtx(null);
    }, CLOSE_DWELL_MS + CLOSE_ANIMATION_MS);
    return () => {
      clearTimeout(closeTimer);
      clearTimeout(clearTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitionCtx?.phase]);

  useEffect(() => {
    if (!transitionCtx) return;
    if (transitionCtx.phase === "DENIED" || transitionCtx.phase === "BLOCKED" || transitionCtx.phase === "FAULT") {
      if (transitionCtx.transition.boundaryRef === GROUND_ENTRANCE_REF) onEntranceDoorStateChange("CLOSED");
      if (transitionCtx.transition.boundaryRef === APT_A_ENTRY_DOOR_REF) onApartmentADoorStateChange(false);
      setTransitionCtx(null);
    }
  }, [transitionCtx?.phase, transitionCtx?.transition.boundaryRef, onEntranceDoorStateChange, onApartmentADoorStateChange]);

  useFrame(() => {
    if (!transitionCtx || (transitionCtx.phase !== "ACTUATING" && transitionCtx.phase !== "WAITING_FOR_CLEARANCE")) return;
    const boundary = boundaryStateFor(transitionCtx.transition, doorProgressRef.current, apartmentADoorProgressRef.current);
    const unlocked = transitionCtx.transition.boundaryRef !== APT_A_ENTRY_DOOR_REF || lunaSimulationProvider.getState(transitionCtx.transition.actuatorBinding!)?.state.locked === false;
    const clear = unlocked && isBoundaryClearForTraversal(boundary, STANDARD_TRAVERSAL_PROFILE);
    setTransitionCtx((prev) => (prev && (prev.phase === "ACTUATING" || prev.phase === "WAITING_FOR_CLEARANCE") ? checkClearance(prev, clear) : prev));
  });

  // ---- LIFT step effects (Part 4) ----
  useEffect(() => {
    if (!liftCtx || liftCtx.phase !== "WAITING_FOR_ACCESS") return;
    const access = lunaResolveLiftAccess(liftCtx.liftRef, identity);
    setLiftCtx((prev) => (prev && prev.phase === "WAITING_FOR_ACCESS" ? resolveLiftAccessStep(prev, access) : prev));
    if (access.outcome === "DENIED") setRoute((r) => (r ? failRoute(r, "DENIED", access.reason) : r));
  }, [liftCtx?.phase, identity]);

  useEffect(() => {
    if (!liftCtx || liftCtx.phase !== "CALLING" || liftCommandsSentRef.current.call) return;
    liftCommandsSentRef.current.call = true;
    requestLiftCommand(liftCtx.liftRef, "call", liftCtx.fromLevelRef);
  }, [liftCtx?.phase, liftCtx?.liftRef, liftCtx?.fromLevelRef, requestLiftCommand]);

  useEffect(() => {
    if (!liftCtx || liftCtx.phase !== "BOARDING") return;
    onEnterLiftCar(liftCtx.liftRef);
    setLiftCtx((prev) => (prev && prev.phase === "BOARDING" ? beginTravel(prev) : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liftCtx?.phase]);

  useEffect(() => {
    if (!liftCtx || liftCtx.phase !== "TRAVELLING" || liftCommandsSentRef.current.destination) return;
    liftCommandsSentRef.current.destination = true;
    requestLiftCommand(liftCtx.liftRef, "destination", liftCtx.toLevelRef);
  }, [liftCtx?.phase, liftCtx?.liftRef, liftCtx?.toLevelRef, requestLiftCommand]);

  useEffect(() => {
    if (!liftCtx || liftCtx.phase !== "ARRIVING") return;
    setLiftCtx((prev) => (prev && prev.phase === "ARRIVING" ? beginExitCar(prev) : prev));
  }, [liftCtx?.phase]);

  useEffect(() => {
    if (!liftCtx || liftCtx.phase !== "EXITING") return;
    onExitLiftCar(liftCtx.liftRef, liftCtx.toLevelRef);
    setLiftCtx((prev) => (prev && prev.phase === "EXITING" ? completeExitCar(prev) : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liftCtx?.phase]);

  useEffect(() => {
    if (!liftCtx || liftCtx.phase !== "ARRIVED") return;
    onCurrentSpaceChange(liftCtx.toLevelRef);
    setRoute((r) => (r ? advanceRouteStep(r) : r));
    setLiftCtx(null);
  }, [liftCtx?.phase, liftCtx?.toLevelRef, onCurrentSpaceChange]);

  useEffect(() => {
    if (!liftCtx) return;
    if (liftCtx.phase === "DENIED" || liftCtx.phase === "UNAVAILABLE" || liftCtx.phase === "FAULT") {
      const status = liftCtx.phase === "DENIED" ? "DENIED" : liftCtx.phase === "FAULT" ? "FAULT" : "BLOCKED";
      setRoute((r) => (r ? failRoute(r, status, liftCtx.failureReason ?? liftCtx.phase) : r));
      setLiftCtx(null);
    }
  }, [liftCtx]);

  useFrame(() => {
    if (!liftCtx) return;
    if (liftCtx.phase === "CALLING") {
      const snap = getLiftSnapshot(liftCtx.liftRef);
      if (snap) setLiftCtx((prev) => (prev && prev.phase === "CALLING" ? checkLiftArrivalAtOrigin(prev, snap) : prev));
    } else if (liftCtx.phase === "TRAVELLING") {
      const snap = getLiftSnapshot(liftCtx.liftRef);
      if (snap) setLiftCtx((prev) => (prev && prev.phase === "TRAVELLING" ? checkLiftArrivalAtDestination(prev, snap) : prev));
    }
  });

  // ---- Part 14: lightweight narration ----
  useEffect(() => {
    if (!onNarration || !route) return;
    const step = currentRouteStep(route);
    if (route.status === "ARRIVED") { onNarration("Arrived."); return; }
    if (route.status === "DENIED") { onNarration(`Access denied. ${route.failureReason ?? ""}`.trim()); return; }
    if (route.status === "BLOCKED") { onNarration(`Route unavailable. ${route.failureReason ?? ""}`.trim()); return; }
    if (route.status === "FAULT") { onNarration(`Something went wrong. ${route.failureReason ?? ""}`.trim()); return; }
    if (route.status === "CANCELLED") { onNarration("Route cancelled."); return; }
    if (!step) return;
    if (step.kind === "TRANSITION" || step.kind === "OPEN_PASSAGE") {
      if (transitionCtx?.phase === "APPROACHING") onNarration(step.kind === "OPEN_PASSAGE" ? "Following common circulation." : "Approaching the entrance.");
      else if (transitionCtx?.phase === "ACTUATING" || transitionCtx?.phase === "WAITING_FOR_CLEARANCE") onNarration(step.kind === "OPEN_PASSAGE" ? "Walking." : "Opening the door.");
      else if (transitionCtx?.phase === "CROSSING") onNarration(step.kind === "OPEN_PASSAGE" ? "Walking." : "Entering.");
    } else if (step.kind === "LIFT") {
      if (liftCtx?.phase === "CALLING") onNarration("Waiting for the lift.");
      else if (liftCtx?.phase === "BOARDING" || liftCtx?.phase === "TRAVELLING") onNarration("Travelling.");
      else if (liftCtx?.phase === "ARRIVING" || liftCtx?.phase === "EXITING") onNarration("Arrived — stepping out.");
    }
  }, [route, transitionCtx?.phase, liftCtx?.phase, onNarration]);

  return null;
});
