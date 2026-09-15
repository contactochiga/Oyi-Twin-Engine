// Luna — True Floor Plan System V1: L06 Gold Standard Floor (brief Parts
// 2/5/6/7/9/10/11/13). The single authoritative source for every new L06
// circulation/apartment rectangle this phase adds — real coordination
// against the FIXED core (LUNA_CORES: lifts/service lift/riser/stairs,
// lunaProgramme.ts), computed and checked here, never re-typed by hand in
// three different files.
//
// COORDINATE FRAME RESOLUTION (Part 2): before this phase, L06 Apartment
// A had two disclosed, never-reconciled representations — the real 3D
// MASSING FRAME (l06UnitMassingBox(), what actually renders) and a
// separate, independently-authored 2D PLAN FRAME (LUNA_L06_UNITS'
// planX/planZ, see l06AptAFrame.ts's own history). This phase resolves
// that: the MASSING FRAME is now authoritative for all four L06 units —
// it carries the most real, already-validated work (Apartment A's 12-room
// interior, its structural coordination check, its MEP terminations, its
// per-room camera presets — see l06AptAFrame.ts's own audit, all keyed to
// this frame). The 2D operational floor plan (lunaFloorPlans.ts) now
// reads these SAME numbers directly — no second, independently-invented
// plan rectangle survives this phase.
//
// WHY THE UNITS MOVE (disclosed, not silent): the original Phase 3
// placeholder quartered all four units symmetrically around the building
// center with no coordination against the real core. Measured directly,
// Apartment A/B's inner corners overlapped Lift 01/02's real shaft
// footprint by over a metre, and Apartment C/D's outer corners overlapped
// Stair 01/02's real footprint by up to 3.8m — confirmed by the
// overlap-check below on the ORIGINAL numbers before this phase's fix
// (see docs/LUNA_TRUE_FLOOR_PLAN_SYSTEM_V1_L06.md §2 for the full
// before/after audit trail). This file's job is to produce a real,
// non-overlapping plate within the SAME fixed tower footprint and the
// SAME fixed core positions — never moving the core (that would move
// every level, including Ground's already-built real stair architecture)
// and never resizing/reshuffling Apartment A's own real, camera-validated
// 12-room interior (Part 13: "canonical identity may survive while
// representation is improved").
//
// THE ACTUAL FIX: Apartment A and B translate by -1.5m in Z (their own
// width, depth, and every local room/furniture/camera-preset coordinate
// are UNCHANGED — a pure world-position slide, not a resize, so the real
// interior work carries over with zero risk). Apartment C and D translate
// by +1.5m in Z AND lose width on their outer (stair-facing) side, since
// they have no real interior yet (Part 11: "B/C/D may remain shell-level
// internally") — the only two units this phase is free to reshape. This
// opens exactly enough room for one real Lift Lobby (wrapping all three
// passenger lifts, the service lift, and the riser) plus two stair-link
// corridors, with zero rectangle overlaps anywhere — verified below, not
// assumed.

import { LUNA_CORES, L06_UNIT_BOXES as PROGRAMME_L06_UNIT_BOXES, L06_APT_A_B_Z_TRANSLATION } from "../lunaProgramme";

export { L06_APT_A_B_Z_TRANSLATION };

export interface PlateRect {
  ref: string;
  label: string;
  x: number;
  z: number;
  width: number;
  depth: number;
}

// ---------------------------------------------------------------------
// New circulation (Parts 6/7/9/10)
// ---------------------------------------------------------------------

/** The real L06 passenger lift lobby (Part 7) — wraps Lift 01/02/03, the
 * service lift, and the riser in one open arrival volume (matching the
 * Grand Lobby's own precedent of one open circulation volume rather than
 * boxed rooms with doors between every zone — see
 * GrandLobbyArchitecture.tsx's disclosed design decision). The service
 * lift's own portion (x >= 4.9) is distinguished by signage/wayfinding
 * only (Part 8: "do not route normal resident arrival through it by
 * default") — the real geometry does not have enough depth here (3.554m,
 * see the translation math above) to also wall off a fully separate
 * service landing without re-opening the same core-overlap problem this
 * file exists to fix. Disclosed, not hidden. */
export const L06_LOBBY: PlateRect = { ref: "LUNA-L06-LOBBY", label: "Passenger Lift Lobby", x: 0, z: 0, width: 20.9, depth: 3.4 };

/** Corridor spurs connecting the lobby to each protected stair (Part 9).
 * Both of Luna's real stairs sit on the same (north, z+) side of the
 * building (a real, fixed, building-wide constraint — LUNA_CORES — not
 * something this phase invents or can move without relocating Ground's
 * own already-built stair architecture). Disclosed in the docs as a real
 * asymmetry: Apartments A/B reach both stairs via the lobby, not via a
 * direct spur on their own side. */
export const L06_STAIR_LINK_WEST: PlateRect = { ref: "LUNA-L06-STAIR-LINK-01", label: "Stair 01 Access Corridor", x: -11.35, z: 5.025, width: 1.8, depth: 13.45 };
export const L06_STAIR_LINK_EAST: PlateRect = { ref: "LUNA-L06-STAIR-LINK-02", label: "Stair 02 Access Corridor", x: 11.35, z: 5.025, width: 1.8, depth: 13.45 };

export const L06_CIRCULATION_ZONES: PlateRect[] = [L06_LOBBY, L06_STAIR_LINK_WEST, L06_STAIR_LINK_EAST];

// ---------------------------------------------------------------------
// Apartment envelopes — the ONE authoritative frame (Part 2)
// ---------------------------------------------------------------------

/** Re-exported from lunaProgramme.ts (the single authoritative source —
 * see that file's own header) as a PlateRect (with ref/label) for this
 * file's coordination checks, rather than a second hand-typed copy of
 * the same four numbers. */
export const L06_UNIT_BOXES: Record<string, PlateRect> = Object.fromEntries(
  Object.entries(PROGRAMME_L06_UNIT_BOXES).map(([ref, box]) => [ref, { ref, label: ref.replace("LUNA-L06-APT-", "Apartment "), ...box }])
);

// ---------------------------------------------------------------------
// Apartment entrance doors (Part 14) — real canonical objects, positioned
// on the lobby/stair-link-facing wall of each unit's own box.
// ---------------------------------------------------------------------

export interface L06DoorSpec {
  ref: string;
  label: string;
  unitRef: string;
  x: number;
  z: number;
  /** Which side of the DOOR faces the corridor/lobby (for hinge/swing
   * orientation) — doors on a north-south wall face along Z. */
  facing: "north" | "south";
  hinge: "left" | "right";
  width: number;
  /** Part 14: "do not fabricate locks for B/C/D" — only Apartment A has a
   * real, pre-existing governed lock (LUNA-L06-APT-A-ENTRY-LOCK-01, see
   * lunaSimulationProvider.ts's ACCESS_GOVERNED_REFS). B/C/D are real
   * architectural door assemblies with no access control — privacy comes
   * entirely from RepresentationPolicy (Part 20/21), never a fabricated
   * boundary lock. */
  accessControlled: boolean;
}

export const L06_APARTMENT_DOORS: L06DoorSpec[] = [
  { ref: "LUNA-L06-APT-A-ENTRANCE-DOOR", label: "Apartment A Entrance", unitRef: "LUNA-L06-APT-A", x: -2.5, z: -1.825679, facing: "north", hinge: "left", width: 1.0, accessControlled: true },
  { ref: "LUNA-L06-APT-B-ENTRANCE-DOOR", label: "Apartment B Entrance", unitRef: "LUNA-L06-APT-B", x: 2.5, z: -1.825679, facing: "north", hinge: "right", width: 1.0, accessControlled: false },
  { ref: "LUNA-L06-APT-C-ENTRANCE-DOOR", label: "Apartment C Entrance", unitRef: "LUNA-L06-APT-C", x: -4.0, z: 1.825679, facing: "south", hinge: "left", width: 1.0, accessControlled: false },
  { ref: "LUNA-L06-APT-D-ENTRANCE-DOOR", label: "Apartment D Entrance", unitRef: "LUNA-L06-APT-D", x: 4.0, z: 1.825679, facing: "south", hinge: "right", width: 1.0, accessControlled: false },
];

// ---------------------------------------------------------------------
// Programmatic overlap check (Part 5: "if the plate can't credibly
// support the programme, disclose the conflict" — verified here, not
// hand-calculated) — the same rect-overlap primitive
// l06AptAStructuralCoordination.ts already established, generalized to
// every real object on the floor plate rather than just columns.
// ---------------------------------------------------------------------

export interface PlateOverlap {
  aRef: string;
  bRef: string;
  overlapX: number;
  overlapZ: number;
}

// A real, non-zero tolerance (1mm) — real boundaries in this floor plate
// are deliberately flush (e.g. the Lift Lobby's south wall exactly meets
// Apartment A's north wall) and pure floating-point arithmetic on
// repeating decimals (28/4.4, etc.) can report a flush boundary as a
// sub-millimetre "overlap" or "gap" that isn't architecturally real.
const TOLERANCE_METRES = 1e-3;

function overlapOf(a: PlateRect, b: PlateRect): PlateOverlap | null {
  const overlapX = a.width / 2 + b.width / 2 - Math.abs(a.x - b.x);
  const overlapZ = a.depth / 2 + b.depth / 2 - Math.abs(a.z - b.z);
  if (overlapX > TOLERANCE_METRES && overlapZ > TOLERANCE_METRES) return { aRef: a.ref, bRef: b.ref, overlapX, overlapZ };
  return null;
}

const L06_CORE_RECTS: PlateRect[] = LUNA_CORES.map((c) => ({ ref: c.ref, label: c.label, x: c.x, z: c.z, width: c.width, depth: c.depth }));

/** The Lift Lobby is DESIGNED to contain the three passenger lifts, the
 * service lift, and the riser (Part 7: "wraps the real lift bank... this
 * is the arrival space") — that containment is intentional and real, not
 * a conflict the way an apartment overlapping a lift shaft would be. This
 * is the only allowlisted pair-class; everything else (apartments,
 * stair-links, stairs) must be genuinely non-overlapping. */
const INTENTIONAL_CONTAINMENT = new Set(["LUNA-LIFT-PASS-01", "LUNA-LIFT-PASS-02", "LUNA-LIFT-PASS-03", "LUNA-LIFT-SERVICE-01", "LUNA-RISER-01"]);

/** Every real object this phase places or coordinates on L06 — checked
 * pairwise. Building-wide structural columns are checked separately (see
 * l06AptAStructuralCoordination.ts, unchanged) since they're a different
 * concern (structure vs. space planning). */
export function checkL06FloorPlateCoordination(): { status: "CLEAR" | "COORDINATION_REVIEW_REQUIRED"; checkedPairs: number; overlaps: PlateOverlap[] } {
  const rects: PlateRect[] = [...L06_CORE_RECTS, ...L06_CIRCULATION_ZONES, ...Object.values(L06_UNIT_BOXES)];
  const overlaps: PlateOverlap[] = [];
  let pairs = 0;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      pairs++;
      const overlap = overlapOf(rects[i], rects[j]);
      if (!overlap) continue;
      const isContainment = overlap.aRef === L06_LOBBY.ref && INTENTIONAL_CONTAINMENT.has(overlap.bRef);
      const isContainmentReverse = overlap.bRef === L06_LOBBY.ref && INTENTIONAL_CONTAINMENT.has(overlap.aRef);
      if (isContainment || isContainmentReverse) continue;
      overlaps.push(overlap);
    }
  }
  return { status: overlaps.length > 0 ? "COORDINATION_REVIEW_REQUIRED" : "CLEAR", checkedPairs: pairs, overlaps };
}

/** Tower footprint envelope check (Part 5: "do not casually change tower
 * exterior footprint" — verify every new rect stays WITHIN the existing
 * envelope rather than assuming it). */
export function checkL06WithinEnvelope(footprint: { width: number; depth: number }): { status: "CLEAR" | "EXCEEDS_ENVELOPE"; violations: string[] } {
  const halfW = footprint.width / 2;
  const halfD = footprint.depth / 2;
  const violations: string[] = [];
  for (const r of [...L06_CIRCULATION_ZONES, ...Object.values(L06_UNIT_BOXES)]) {
    const maxX = Math.abs(r.x) + r.width / 2;
    const maxZ = Math.abs(r.z) + r.depth / 2;
    if (maxX > halfW + TOLERANCE_METRES || maxZ > halfD + TOLERANCE_METRES) violations.push(`${r.ref}: extends to x=±${maxX.toFixed(3)}, z=±${maxZ.toFixed(3)} (envelope x=±${halfW}, z=±${halfD})`);
  }
  return { status: violations.length > 0 ? "EXCEEDS_ENVELOPE" : "CLEAR", violations };
}
