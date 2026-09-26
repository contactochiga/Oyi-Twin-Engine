// Ground/L01 Phase 2 — same lift-bank X extent, now a front approach apron
// excluding the shaft footprints. Reception remains the open waiting area.
// Existing lift IDs/positions/doors are authoritative; no decorative fake portals.

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
const frontOfShafts = Math.max(...LUNA_CORES.filter(c => [...PASSENGER_LIFT_REFS, SERVICE_LIFT_REF].includes(c.ref)).map(c => c.z + c.depth / 2));
const receptionEdge = 3; // unchanged Reception z=6, depth=6

/** The real, computed (never hand-typed) corrected footprint — the single
 * source of truth for both the 3D lift-lobby architecture and the 2D
 * floor plan's own lift-lobby region. */
export const GROUND_LIFT_LOBBY_LAYOUT = {
  x: (combinedMin + combinedMax) / 2,
  z: (frontOfShafts + receptionEdge) / 2, // waiting continues into the open Reception zone.
  width: combinedMax - combinedMin + GROUND_LIFT_LOBBY_MARGIN * 2,
  depth: receptionEdge - frontOfShafts, // Excludes all shafts, including the deeper service/fire shaft.
};

export const GROUND_STAIR_REFS = ["LUNA-STAIR-01", "LUNA-STAIR-02"];

export function stairCore(ref: string) {
  const core = LUNA_CORES.find((c) => c.ref === ref);
  if (!core) throw new Error(`groundLobbyLayout: unknown stair ref ${ref}`);
  return core;
}
