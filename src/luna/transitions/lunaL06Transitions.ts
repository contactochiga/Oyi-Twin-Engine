import { LUNA_L06 } from "../lunaProgramme";
// Luna — True Floor Plan System V1 (L06 Gold Standard) Parts 14/33: the
// real apartment entrance door SpatialTransitions, built from the SAME
// real refs/positions l06FloorPlate.ts already defines — this is the one
// file that knows Luna's own L06 entrance geometry in transition terms,
// exactly mirroring lunaTransitions.ts's own Main Entrance pattern.
//
// Apartment A's door is the only ACCESS_CONTROLLED one — it resolves
// through the SAME real, pre-existing governed lock
// (LUNA-L06-APT-A-ENTRY-LOCK-01) lunaSimulationProvider.ts already
// authorizes for a resident with a matching assignedHomeRefs entry, via
// the SAME lunaAccessTransitionResolver every other governed boundary
// already uses (see App.tsx's TwinIntelligenceController wiring). B/C/D
// are POLICY_ONLY (Part 14: "do not fabricate locks for B/C/D") —
// RepresentationPolicy alone decides whether the space is even a valid
// destination (a non-resident can't select a HIDDEN unit as a route
// target in the first place; see lunaRoutePolicy.ts's own tightened
// private-unit check).

import type { SpatialTransition } from "../../engine/spatial/transitions";
import type { SpatialPoint3D } from "../../engine/spatial/types";
import { L06_LOBBY, L06_APARTMENT_DOORS, type L06DoorSpec } from "../architecture/l06FloorPlate";

const EYE_HEIGHT = 1.7; // matches lunaTransitions.ts's own EYE_HEIGHT convention exactly
const APPROACH_DISTANCE = 2.2; // real, if tight, lobby depth (Part 2's coordinate-frame resolution) — a smaller approach stand-off than the Grand Lobby's, disclosed as real geometry, not a design choice
const ARRIVAL_DISTANCE = 1.8; // just inside the unit's own entry, short of its first real interior partition

function lobbySidePoint(door: L06DoorSpec, distance: number): SpatialPoint3D {
  const towardLobby = door.facing === "north" ? distance : -distance;
  return { x: door.x, y: LUNA_L06.baseElevation + EYE_HEIGHT, z: door.z + towardLobby };
}

function unitSidePoint(door: L06DoorSpec, distance: number): SpatialPoint3D {
  const intoUnit = door.facing === "north" ? -distance : distance;
  return { x: door.x, y: LUNA_L06.baseElevation + EYE_HEIGHT, z: door.z + intoUnit };
}

function threshold(door: L06DoorSpec): SpatialPoint3D {
  return { x: door.x, y: LUNA_L06.baseElevation + EYE_HEIGHT, z: door.z };
}

function buildEntrancePair(door: L06DoorSpec): { in: SpatialTransition; out: SpatialTransition } {
  const outside = lobbySidePoint(door, APPROACH_DISTANCE);
  const inside = unitSidePoint(door, ARRIVAL_DISTANCE);
  const at = threshold(door);
  const enter: SpatialTransition = {
    transitionId: `LUNA-TRANSITION-${door.ref}-IN`,
    type: "DOOR",
    fromSpaceRef: L06_LOBBY.ref,
    toSpaceRef: door.unitRef,
    boundaryRef: door.ref,
    approachPoint: outside,
    entryPoint: at,
    exitPoint: inside,
    crossingPath: [outside, at, inside],
    accessRequirement: door.accessControlled ? "ACCESS_CONTROLLED" : "POLICY_ONLY",
    actuatorBinding: door.accessControlled ? "LUNA-L06-APT-A-ENTRY-LOCK-01" : undefined,
    clearanceRule: { requiredClearWidthMeters: 0.8, note: "generic single-file walking clearance (STANDARD_TRAVERSAL_PROFILE)" },
    status: "CONFIRMED",
  };
  const exit: SpatialTransition = {
    ...enter,
    transitionId: `LUNA-TRANSITION-${door.ref}-OUT`,
    fromSpaceRef: door.unitRef,
    toSpaceRef: L06_LOBBY.ref,
    approachPoint: inside,
    entryPoint: at,
    exitPoint: outside,
    crossingPath: [inside, at, outside],
  };
  return { in: enter, out: exit };
}

const PAIRS = L06_APARTMENT_DOORS.map(buildEntrancePair);

export const LUNA_L06_APARTMENT_ENTRANCE_TRANSITIONS: SpatialTransition[] = PAIRS.flatMap((p) => [p.in, p.out]);

export function l06ApartmentEntranceTransition(unitRef: string, direction: "in" | "out"): SpatialTransition | undefined {
  const pair = PAIRS.find((p) => p.in.toSpaceRef === unitRef || p.out.fromSpaceRef === unitRef);
  if (!pair) return undefined;
  return direction === "in" ? pair.in : pair.out;
}
