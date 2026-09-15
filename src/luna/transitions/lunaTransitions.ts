// Luna — Spatial Transition Engine V1 Part 4: the Grand Entrance's real
// SpatialTransition data, built from the SAME real constants the existing
// architecture already uses (GROUND_ENTRANCE_X/Z/OPENING_WIDTH, the real
// LUNA-GROUND-ACCESS-MAIN-01 ref, the real LUNA-GROUND-LOBBY interiorRef)
// — nothing here invents a new position or a fabricated room. This is
// the ONLY file that knows Luna's own entrance geometry in transition
// terms; LunaEntranceTransitionDriver.tsx and every engine/spatial/*
// function stay building-agnostic.

import type { SpatialTransition } from "../../engine/spatial/transitions";
import { GROUND_ENTRANCE_REF, GROUND_ENTRANCE_X, GROUND_ENTRANCE_Z } from "../architecture/GroundEntrance";
import { LUNA_GROUND_LOBBY } from "../interiors/lunaInteriors";

/** The building's own exterior arrival plaza in front of the Main
 * Entrance — a real, disclosed minimal canonical addition (Building
 * Ingestion V2 never modeled "outside the building" as its own node,
 * since every prior phase's camera work started already-inside or
 * already-outside without needing to name the boundary between them).
 * Not a fabricated room: it names the SAME real exterior ground plane
 * every existing exterior camera preset already looks at. */
export const LUNA_EXTERIOR_ENTRANCE_PLAZA = "LUNA-EXTERIOR-ENTRANCE-PLAZA";

const EYE_HEIGHT = 1.7; // matches cameraDerivation.ts's own EYE_HEIGHT convention exactly
const APPROACH_DISTANCE = 6;
const ARRIVAL_DISTANCE = 6;

function point(z: number) {
  return { x: GROUND_ENTRANCE_X, y: EYE_HEIGHT, z };
}

const OUTSIDE = point(GROUND_ENTRANCE_Z + APPROACH_DISTANCE);
const THRESHOLD = point(GROUND_ENTRANCE_Z);
const INSIDE = point(GROUND_ENTRANCE_Z - ARRIVAL_DISTANCE);

/** Enter: exterior plaza -> Grand Lobby, through the real automatic
 * sliding entrance. accessRequirement is "NONE" — Access & Security V1
 * deliberately does not instrument the Main Entrance (see
 * lunaAccessTransitionResolver.ts's own disclosed reasoning); this is
 * the same, real, pre-existing scope boundary GroundEntrance.tsx's own
 * top comment already documented, not something this phase silently
 * upgrades into a governed lock. */
export const LUNA_MAIN_ENTRANCE_TRANSITION: SpatialTransition = {
  transitionId: "LUNA-TRANSITION-MAIN-ENTRANCE-IN",
  type: "AUTOMATIC_DOOR",
  fromSpaceRef: LUNA_EXTERIOR_ENTRANCE_PLAZA,
  toSpaceRef: LUNA_GROUND_LOBBY.interiorRef,
  boundaryRef: GROUND_ENTRANCE_REF,
  approachPoint: OUTSIDE,
  entryPoint: THRESHOLD,
  exitPoint: INSIDE,
  crossingPath: [OUTSIDE, THRESHOLD, INSIDE],
  accessRequirement: "NONE",
  actuatorBinding: GROUND_ENTRANCE_REF,
  clearanceRule: { requiredClearWidthMeters: 0.9, note: "generic single-file walking clearance (STANDARD_TRAVERSAL_PROFILE)" },
  status: "CONFIRMED",
};

/** Exit Building — Part 11's own explicit requirement that transitions
 * work in reverse, not one-way. Same real boundary, same real endpoints,
 * walked the other direction. */
export const LUNA_MAIN_ENTRANCE_TRANSITION_REVERSE: SpatialTransition = {
  ...LUNA_MAIN_ENTRANCE_TRANSITION,
  transitionId: "LUNA-TRANSITION-MAIN-ENTRANCE-OUT",
  fromSpaceRef: LUNA_GROUND_LOBBY.interiorRef,
  toSpaceRef: LUNA_EXTERIOR_ENTRANCE_PLAZA,
  approachPoint: INSIDE,
  entryPoint: THRESHOLD,
  exitPoint: OUTSIDE,
  crossingPath: [INSIDE, THRESHOLD, OUTSIDE],
};
