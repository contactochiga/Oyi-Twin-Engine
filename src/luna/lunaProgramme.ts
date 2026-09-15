// Luna Residences — reference implementation data for the Oyi Twin Engine.
// Everything in this file is Luna-specific on purpose: it is the "content"
// that gets fed into the building-agnostic engine in src/engine. A future
// building would get its own equivalent file, not a fork of the engine.
//
// Canonical node refs here are chosen to match the Oyi backend's own
// digital-twin identity contract exactly (see Ochiga-backend's
// docs/OYI_DIGITAL_TWIN_ASSET_CONTRACT.md and the Luna pilot data under
// pilot/luna-residences/) so a click in this viewer resolves to the same
// string the backend already uses for homes/devices — LUNA-L06-APT-A and
// LUNA-LIFT-PASS-01 are not placeholders invented for the viewer, they are
// the actual canonical_ref values already seeded in Luna's local database.

import type { LevelDescriptor } from "../engine/types";

const TOWER_FOOTPRINT = { width: 36, depth: 28 };
const PODIUM_FOOTPRINT = { width: 44, depth: 34 };
const AMENITY_FOOTPRINT = { width: 40, depth: 30 };
const PENTHOUSE_FOOTPRINT = { width: 30, depth: 22 };
const ROOFTOP_FOOTPRINT = { width: 26, depth: 18 };

const RESIDENTIAL_FLOOR_HEIGHT = 3.25;

interface LevelSpec {
  ref: string;
  label: string;
  height: number;
  footprint: { width: number; depth: number };
  isolatable?: boolean;
}

// Order matters: bottom to top. Elevations are derived, not hand-entered,
// so the programme can't silently drift out of sync with itself.
const LEVEL_SPECS: LevelSpec[] = [
  { ref: "LUNA-B1", label: "Basement (B1)", height: 4, footprint: PODIUM_FOOTPRINT },
  { ref: "LUNA-GROUND", label: "Ground", height: 5, footprint: PODIUM_FOOTPRINT },
  { ref: "LUNA-L01-AMENITIES", label: "Level 1 — Residents' Club", height: 3.5, footprint: AMENITY_FOOTPRINT },
  { ref: "LUNA-L02", label: "Level 2", height: RESIDENTIAL_FLOOR_HEIGHT, footprint: TOWER_FOOTPRINT },
  { ref: "LUNA-L03", label: "Level 3", height: RESIDENTIAL_FLOOR_HEIGHT, footprint: TOWER_FOOTPRINT },
  { ref: "LUNA-L04", label: "Level 4", height: RESIDENTIAL_FLOOR_HEIGHT, footprint: TOWER_FOOTPRINT },
  { ref: "LUNA-L05", label: "Level 5", height: RESIDENTIAL_FLOOR_HEIGHT, footprint: TOWER_FOOTPRINT },
  { ref: "LUNA-L06", label: "Level 6", height: RESIDENTIAL_FLOOR_HEIGHT, footprint: TOWER_FOOTPRINT },
  { ref: "LUNA-L07", label: "Level 7", height: RESIDENTIAL_FLOOR_HEIGHT, footprint: TOWER_FOOTPRINT },
  { ref: "LUNA-L08", label: "Level 8", height: RESIDENTIAL_FLOOR_HEIGHT, footprint: TOWER_FOOTPRINT },
  { ref: "LUNA-L09", label: "Level 9", height: RESIDENTIAL_FLOOR_HEIGHT, footprint: TOWER_FOOTPRINT },
  { ref: "LUNA-L10", label: "Level 10", height: RESIDENTIAL_FLOOR_HEIGHT, footprint: TOWER_FOOTPRINT },
  { ref: "LUNA-L11", label: "Level 11", height: RESIDENTIAL_FLOOR_HEIGHT, footprint: TOWER_FOOTPRINT },
  { ref: "LUNA-L12", label: "Level 12", height: RESIDENTIAL_FLOOR_HEIGHT, footprint: TOWER_FOOTPRINT },
  { ref: "LUNA-PENTHOUSE", label: "Penthouse", height: 5, footprint: PENTHOUSE_FOOTPRINT },
  { ref: "LUNA-ROOFTOP", label: "Luna Sky (Rooftop)", height: 3, footprint: ROOFTOP_FOOTPRINT },
];

function buildLevels(): LevelDescriptor[] {
  let elevation = -LEVEL_SPECS[0].height; // B1 sits below grade
  return LEVEL_SPECS.map((spec) => {
    const level: LevelDescriptor = {
      ref: spec.ref,
      kind: "level",
      label: spec.label,
      parentRef: "LUNA-TOWER",
      baseElevation: elevation,
      height: spec.height,
      footprint: spec.footprint,
      isolatable: true,
    };
    elevation += spec.height;
    return level;
  });
}

export const LUNA_LEVELS: LevelDescriptor[] = buildLevels();

export const LUNA_L06 = LUNA_LEVELS.find((l) => l.ref === "LUNA-L06")!;

export interface UnitMassingBox {
  x: number;
  z: number;
  width: number;
  depth: number;
}

/** True Floor Plan System V1 (L06 Gold Standard, Part 2) — coordinate
 * frame resolution. Before this phase, L06 Apartment A had two disclosed,
 * never-reconciled representations of the same canonical unit: a real 3D
 * MASSING FRAME (a uniform gridX/gridZ * shared-divisor formula, what
 * actually rendered) and a separately-authored 2D PLAN FRAME (hand-typed
 * planX/planZ numbers used only by the Facility 2D floor plan). Neither
 * had ever been checked against the REAL fixed core (LUNA_CORES below) —
 * measured directly, the old massing formula silently overlapped Lift
 * 01/02's real shaft footprint by over a metre at Apartment A/B's inner
 * corner, and Stair 01/02's real footprint by up to 3.8m at Apartment
 * C/D's outer corner.
 *
 * L06_UNIT_BOXES is now the ONE authoritative frame — coordination-
 * checked against every real core element and the real Lift Lobby/
 * stair-link corridors this phase adds (see l06FloorPlate.ts's
 * checkL06FloorPlateCoordination(), CLEAR with zero overlaps). Both the
 * 3D massing (l06UnitMassingBox(), consumed by LunaLevel.tsx) and the 2D
 * plan (LUNA_L06_UNITS.planX/planZ/planWidth/planDepth below) now read
 * these SAME numbers — no second, independently-invented rectangle
 * survives this phase. Apartment A/B keep their EXACT original width/
 * depth (only their world position slides by L06_APT_A_B_Z_TRANSLATION)
 * so Apartment A's real, camera-validated 12-room interior, furniture,
 * and MEP terminations (all LOCAL to this box's own origin) carry over
 * with zero risk — see l06FloorPlate.ts's own header for the full
 * before/after audit trail and l06AptAFrame.ts for the frame contract
 * this resolves. */
export const L06_UNIT_BOXES: Record<string, UnitMassingBox> = {
  "LUNA-L06-APT-A": { x: -8.181818, z: -7.912636, width: 15.652174, depth: 12.173913 },
  "LUNA-L06-APT-B": { x: 8.181818, z: -7.912636, width: 15.652174, depth: 12.173913 },
  "LUNA-L06-APT-C": { x: -6.1135, z: 7.912636, width: 8.673, depth: 12.173913 },
  "LUNA-L06-APT-D": { x: 6.1135, z: 7.912636, width: 8.673, depth: 12.173913 },
};

/** Apartment A/B's translation from the original Phase 3 placeholder —
 * the ONLY change to their box (uses virtually all of the real available
 * slack to the exterior wall, original outer edge sat 1.549m inside the
 * tower footprint, so the new Lift Lobby gets real frontal clearance from
 * the passenger lifts). Exported so lunaCameraPresets.ts's
 * INTERIOR_ORIGIN_OFFSET (the one hand-typed world-position literal for
 * Apartment A) updates from the same real number, not a second hand-typed
 * guess. */
export const L06_APT_A_B_Z_TRANSLATION = -1.549;

// Level 6's four representative units — canonical refs match
// pilot/luna-residences/homes.csv exactly (LUNA-L06-APT-A..D). planX/
// planZ/planWidth/planDepth now equal L06_UNIT_BOXES exactly (Part 2's
// coordinate-frame resolution) — the 2D operational floor plan
// (lunaFloorPlans.ts) and the 3D massing are the SAME rectangle, not two
// independently-authored representations.
export const LUNA_L06_UNITS = [
  { ref: "LUNA-L06-APT-A", label: "Apartment A", ...L06_UNIT_BOXES["LUNA-L06-APT-A"], planX: L06_UNIT_BOXES["LUNA-L06-APT-A"].x, planZ: L06_UNIT_BOXES["LUNA-L06-APT-A"].z, planWidth: L06_UNIT_BOXES["LUNA-L06-APT-A"].width, planDepth: L06_UNIT_BOXES["LUNA-L06-APT-A"].depth },
  { ref: "LUNA-L06-APT-B", label: "Apartment B", ...L06_UNIT_BOXES["LUNA-L06-APT-B"], planX: L06_UNIT_BOXES["LUNA-L06-APT-B"].x, planZ: L06_UNIT_BOXES["LUNA-L06-APT-B"].z, planWidth: L06_UNIT_BOXES["LUNA-L06-APT-B"].width, planDepth: L06_UNIT_BOXES["LUNA-L06-APT-B"].depth },
  { ref: "LUNA-L06-APT-C", label: "Apartment C", ...L06_UNIT_BOXES["LUNA-L06-APT-C"], planX: L06_UNIT_BOXES["LUNA-L06-APT-C"].x, planZ: L06_UNIT_BOXES["LUNA-L06-APT-C"].z, planWidth: L06_UNIT_BOXES["LUNA-L06-APT-C"].width, planDepth: L06_UNIT_BOXES["LUNA-L06-APT-C"].depth },
  { ref: "LUNA-L06-APT-D", label: "Apartment D", ...L06_UNIT_BOXES["LUNA-L06-APT-D"], planX: L06_UNIT_BOXES["LUNA-L06-APT-D"].x, planZ: L06_UNIT_BOXES["LUNA-L06-APT-D"].z, planWidth: L06_UNIT_BOXES["LUNA-L06-APT-D"].width, planDepth: L06_UNIT_BOXES["LUNA-L06-APT-D"].depth },
];

/** The real, actually-rendered 3D box for one of L06's four units — see
 * L06_UNIT_BOXES's own header for the Part 2 coordinate-frame resolution
 * this represents. */
export function l06UnitMassingBox(unit: { ref: string }): UnitMassingBox {
  const box = L06_UNIT_BOXES[unit.ref];
  if (!box) throw new Error(`l06UnitMassingBox: no coordinated box for ${unit.ref}`);
  return { x: box.x, z: box.z, width: box.width, depth: box.depth };
}

// The core/corridor band the four units above used to be quartered
// around. Superseded by the real, coordination-checked L06_LOBBY/
// stair-link rectangles (l06FloorPlate.ts) — kept only as a legacy
// reference for code that hasn't migrated yet.
export const LUNA_L06_CORE_BAND = { planWidth: 6, planDepth: 8 };

// Level 10's one modeled premium residence — Phase 3 prioritizes a single
// representative premium unit rather than subdividing L10 into 4 the way
// L06 is, matching the brief's "one premium residence" scope.
export const LUNA_L10_APT_A_UNIT = {
  ref: "LUNA-L10-APT-A",
  label: "Apartment A (Premium)",
  parentRef: "LUNA-L10",
  x: -8,
  z: 0,
  width: 16,
  depth: 13,
};

const buildingBase = LUNA_LEVELS[0].baseElevation;
const buildingTop = LUNA_LEVELS[LUNA_LEVELS.length - 1].baseElevation + LUNA_LEVELS[LUNA_LEVELS.length - 1].height;

export const LUNA_BUILDING_SPAN = { base: buildingBase, top: buildingTop };

// Core shafts — canonical refs match the elevator/lift devices already
// seeded in Luna's backend (pilot/luna-residences/phase3c_infrastructure.sql).
export const LUNA_CORES = [
  { ref: "LUNA-LIFT-PASS-01", label: "Passenger Elevator 01", x: -3, z: 0, width: 3, depth: 3 },
  { ref: "LUNA-LIFT-PASS-02", label: "Passenger Elevator 02", x: 0, z: 0, width: 3, depth: 3 },
  { ref: "LUNA-LIFT-PASS-03", label: "Passenger Elevator 03", x: 3, z: 0, width: 3, depth: 3 },
  { ref: "LUNA-LIFT-SERVICE-01", label: "Service / Fire Elevator", x: 6.5, z: 0, width: 3.2, depth: 3.4 },
  { ref: "LUNA-STAIR-01", label: "Protected Stair 01", x: -14, z: 9, width: 3.5, depth: 5.5 },
  { ref: "LUNA-STAIR-02", label: "Protected Stair 02", x: 14, z: 9, width: 3.5, depth: 5.5 },
  { ref: "LUNA-RISER-01", label: "Service Riser (Representative)", x: -8, z: 0, width: 1.6, depth: 1.6 },
].map((core) => ({ ...core, baseElevation: buildingBase, topElevation: buildingTop }));

export const LUNA_SITE = { width: 62, depth: 52 };

export const LUNA_BUILDING_ROOT = { ref: "LUNA-TOWER", label: "Luna Residences Tower" };
