import { apartmentTransitions } from "../architecture/apartmentSpatial";
// Luna — Spatial Transition Engine V1.1: the real TransitionBindings
// config, built from the SAME real refs every other phase already uses
// (GROUND_ENTRANCE_REF, LIFT_DEFINITIONS, GROUND_STAIR_REFS) — this file
// is the only place that knows WHICH of Luna's real doors/lifts/stairs
// have a real, working handoff behind them; the generic
// engine/spatial/transitionBinding.ts function does the actual binding.

import { LIFT_DEFINITIONS } from "../lift/lunaLift";
import { GROUND_STAIR_REFS } from "../architecture/groundLobbyLayout";
import type { TransitionBindings } from "../../engine/spatial/transitionBinding";
import { LUNA_MAIN_ENTRANCE_TRANSITION, LUNA_MAIN_ENTRANCE_TRANSITION_REVERSE } from "./lunaTransitions";
import { LUNA_L06_APARTMENT_ENTRANCE_TRANSITIONS } from "./lunaL06Transitions";

/** All 4 real lifts share one generic handoff (Part 8: "a lift
 * definition/registry should drive the same path... do not create four
 * separate transition implementations"). The Service/Fire Lift is
 * included on equal footing — being routable is not the same claim as
 * being certified life-safety equipment, which this file never asserts. */
export const LUNA_LIFT_CAPABLE_REFS = new Set(LIFT_DEFINITIONS.map((d) => d.ref));

/** Part 10 — stairs are named/bound honestly but NOT live-UI-wired in
 * this phase: Luna's real stair doors are STATIC_BOUNDARY (no runtime
 * leaf animation — see lunaSpatialModel.ts), and no live 3D affordance
 * exists to trigger a multi-level stair journey. Left empty on purpose;
 * see docs for the disclosed reasoning. Kept as its own named export
 * (not just "the empty set inline") so a future phase turning this on is
 * a one-line change, not a new file. */
export const LUNA_STAIR_CAPABLE_REFS = new Set<string>();

/** Part 9 — no live open-plan common-area-to-common-area boundary exists
 * in Luna's current spatial model (the audit confirmed Reception/Lounge/
 * Lift-Lobby collapse into ONE graph node, not three) — so there is
 * nothing real to bind an OPEN_PASSAGE transition to yet. Left empty and
 * disclosed rather than fabricating a boundary that doesn't exist; the
 * non-Luna fixture (Part 22) is where OPEN_PASSAGE is actually proven. */
export const LUNA_PASSAGE_TRANSITIONS: never[] = [];

export const LUNA_STAIR_DOOR_REFS = GROUND_STAIR_REFS.map((ref) => `${ref}-DOOR-01`);

// L06 Gold Standard (Parts 14/33) — the four real apartment entrance
// doors, both directions, added to the same doorTransitions list the
// Main Entrance already lives in — the generic route engine treats them
// identically, no special-casing per door.
export const LUNA_TRANSITION_BINDINGS: TransitionBindings = {
  doorTransitions: [LUNA_MAIN_ENTRANCE_TRANSITION, LUNA_MAIN_ENTRANCE_TRANSITION_REVERSE, ...LUNA_L06_APARTMENT_ENTRANCE_TRANSITIONS, ...apartmentTransitions],
  passageTransitions: [],
  liftCapableRefs: LUNA_LIFT_CAPABLE_REFS,
  stairCapableRefs: LUNA_STAIR_CAPABLE_REFS,
};
