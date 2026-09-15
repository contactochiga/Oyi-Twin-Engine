// Luna Architectural Reality V1 — Grand Lobby layout (brief Part 12's own
// explicit mandate: "the existing dynamic lift cars must remain aligned
// with their architectural openings... do not create beautiful fake lift
// doors disconnected from the existing lift shafts/cars").
//
// Audit finding (confirmed before any geometry was written): the
// pre-existing LUNA_GROUND_LOBBY "Lift Lobby" room (lunaInteriors.ts,
// Phase 3) is centered at x=9 — but the REAL lift shafts DynamicLift.tsx
// already renders real, runtime-driven landing doors for are at
// x=-3/0/3 (passenger 01/02/03) and x=6.5 (service), per LUNA_CORES
// (lunaProgramme.ts). The old room rect does not actually contain the
// passenger lifts at all. This file corrects ONLY the lift-lobby
// footprint to genuinely wrap the real lift bank — canonical ref
// (LUNA-GROUND-LOBBY-LIFTS) and every other room (Reception, Lounge)
// keep their existing Phase 3 position unchanged (Part 18: reuse existing
// spatial identity).
//
// Combined real lift x-extent: passenger lifts [-4.5, 4.5] ∪ service
// [4.9, 8.1] = [-4.5, 8.1]. Center 1.8, width 13 (0.6m clearance each
// side of the combined extent) — computed from the real LUNA_CORES
// positions below, not a second hand-typed guess.

import { LUNA_CORES } from "../lunaProgramme";

const PASSENGER_LIFT_REFS = ["LUNA-LIFT-PASS-01", "LUNA-LIFT-PASS-02", "LUNA-LIFT-PASS-03"];
const SERVICE_LIFT_REF = "LUNA-LIFT-SERVICE-01";

function coreExtentX(refs: string[]): { min: number; max: number } {
  const cores = LUNA_CORES.filter((c) => refs.includes(c.ref));
  const min = Math.min(...cores.map((c) => c.x - c.width / 2));
  const max = Math.max(...cores.map((c) => c.x + c.width / 2));
  return { min, max };
}

const passengerExtent = coreExtentX(PASSENGER_LIFT_REFS);
const serviceExtent = coreExtentX([SERVICE_LIFT_REF]);
const combinedMin = Math.min(passengerExtent.min, serviceExtent.min);
const combinedMax = Math.max(passengerExtent.max, serviceExtent.max);

export const GROUND_LIFT_LOBBY_MARGIN = 0.6;

/** The real, computed (never hand-typed) corrected footprint — the single
 * source of truth for both the 3D lift-lobby architecture and the 2D
 * floor plan's own lift-lobby region. */
export const GROUND_LIFT_LOBBY_LAYOUT = {
  x: (combinedMin + combinedMax) / 2,
  z: -2, // unchanged from Phase 3 — already correctly spans the real landing-door z position (~1.43-1.5)
  width: combinedMax - combinedMin + GROUND_LIFT_LOBBY_MARGIN * 2,
  depth: 10, // unchanged from Phase 3
};

export const GROUND_STAIR_REFS = ["LUNA-STAIR-01", "LUNA-STAIR-02"];

export function stairCore(ref: string) {
  const core = LUNA_CORES.find((c) => c.ref === ref);
  if (!core) throw new Error(`groundLobbyLayout: unknown stair ref ${ref}`);
  return core;
}
