// Luna Residences — Structural catalogue (Phase 13).
//
// This is a CONCEPTUAL, COORDINATED REFERENCE structural representation —
// explicitly not certified structural design, not a reinforcement
// schedule, not construction-issue documentation. Column/slab/foundation
// positions here are representative and illustrative, chosen to read as
// credible and to coordinate visibly with the architecture and MEP already
// modeled, never claimed as engineered load paths.
//
// Scope is deliberately representative, not exhaustive (matching Phase
// 10's own MEP backbone precedent): a handful of perimeter columns per
// level rather than a full structural grid, one slab per level, a few
// foundation zones in B1, one continuous core wall, one transfer element
// at the podium/tower transition, a few stair-structure and rooftop-
// support records. A future phase can densify without changing this shape.

import type { StructuralElementRecord } from "../../engine/structuralCatalog";
import { LUNA_LEVELS, LUNA_BUILDING_SPAN } from "../lunaProgramme";

import { isCoordinatedPodiumLevel } from "../architecture/podiumCoordination";

const SLAB_THICKNESS = 0.35;
const COLUMN_SIZE = 0.5;

function levelByRef(ref: string) {
  const level = LUNA_LEVELS.find((l) => l.ref === ref);
  if (!level) throw new Error(`lunaStructuralElements: unknown level ${ref}`);
  return level;
}

/** A slab is the finished-floor structural plate for its OWN level — it
 * belongs to and explodes/isolates with that level, unlike the continuous
 * core wall or risers, which are the fixed "spine" floors separate from
 * (see StructuralCoreWall / RiserShaft, both mounted once at the building
 * root). Positioned at the level's own local floor line, the same
 * convention InteriorLayer already uses (position=[0,-height/2,0]). */
function slabFor(levelRef: string): StructuralElementRecord {
  const level = levelByRef(levelRef);
  return {
    ref: `LUNA-STRUCT-${shortName(levelRef)}-SLAB-01`,
    label: `${level.label} — Structural Slab`,
    elementType: "slab",
    ownerLevelRef: levelRef,
    position: { x: 0, y: -level.height / 2 + (isCoordinatedPodiumLevel(levelRef) ? -1 : 1) * SLAB_THICKNESS / 2, z: 0 },
    size: { x: level.footprint.width * 0.98, y: SLAB_THICKNESS, z: level.footprint.depth * 0.98 },
  };
}

/** Six representative perimeter columns for a tower-tier level — corners
 * plus north/south mid-span — inset from the exterior wall line and clear
 * of the building's central lift/riser/stair cluster (LUNA_CORES), which
 * Phase 12 found the hard way is not safe to assume clear-by-default. */
function perimeterColumnsFor(levelRef: string, insetX = 1.5, insetZ = 1.5): StructuralElementRecord[] {
  const level = levelByRef(levelRef);
  const hw = level.footprint.width / 2 - insetX;
  const hd = level.footprint.depth / 2 - insetZ;
  const spots: Array<[number, number, string]> = [
    [-hw, -hd, "01"],
    [-hw, hd, "02"],
    [hw, -hd, "03"],
    [hw, hd, "04"],
    [0, -hd, "05"],
    [0, hd, "06"],
  ];
  return spots.map(([x, z, n]) => ({
    ref: `LUNA-STRUCT-${shortName(levelRef)}-COL-${n}`,
    label: `${level.label} — Column ${n}`,
    elementType: "column",
    ownerLevelRef: levelRef,
    position: { x, y: 0, z },
    size: { x: COLUMN_SIZE, y: level.height, z: COLUMN_SIZE },
  }));
}

function shortName(levelRef: string): string {
  return levelRef.replace("LUNA-", "");
}

const TOWER_TIER_LEVELS = ["LUNA-L02", "LUNA-L03", "LUNA-L04", "LUNA-L05", "LUNA-L06", "LUNA-L07", "LUNA-L08", "LUNA-L09", "LUNA-L10", "LUNA-L11", "LUNA-L12"];

// --- Slabs: one per level ---
const SLABS: StructuralElementRecord[] = LUNA_LEVELS.map((l) => slabFor(l.ref));

// --- Columns: representative perimeter set per level, sized to that
// level's own (different) footprint. B1/Ground/Amenity footprints are
// wider than the tower above, so their inset is larger to keep columns
// clear of the podium's own facade/canopy/lobby-glass geometry. ---
const COLUMNS: StructuralElementRecord[] = [
  ...perimeterColumnsFor("LUNA-B1", 3, 3),
  ...perimeterColumnsFor("LUNA-GROUND", 3, 3),
  ...perimeterColumnsFor("LUNA-L01-AMENITIES", 2.5, 2.5),
  ...TOWER_TIER_LEVELS.flatMap((ref) => perimeterColumnsFor(ref, 1.5, 1.5)),
  ...perimeterColumnsFor("LUNA-PENTHOUSE", 2, 2),
];

// --- Foundation: representative pile-cap zones + basement retaining wall,
// sitting below B1's own floor slab rather than replacing it. Three zones
// (not a continuous mat) so each is independently addressable, matching
// the brief's own example ref shape (LUNA-STRUCT-B1-FOUNDATION-ZONE-A). ---
const B1 = levelByRef("LUNA-B1");
const FOUNDATION_Y = -B1.height / 2 - 0.4;
const FOUNDATION: StructuralElementRecord[] = [
  { ref: "LUNA-STRUCT-B1-FOUNDATION-ZONE-A", label: "Basement — Foundation Zone A", elementType: "foundation", ownerLevelRef: "LUNA-B1", position: { x: -B1.footprint.width / 4, y: FOUNDATION_Y, z: 0 }, size: { x: B1.footprint.width / 2 - 1, y: 0.8, z: B1.footprint.depth - 2 } },
  { ref: "LUNA-STRUCT-B1-FOUNDATION-ZONE-B", label: "Basement — Foundation Zone B", elementType: "foundation", ownerLevelRef: "LUNA-B1", position: { x: B1.footprint.width / 4, y: FOUNDATION_Y, z: 0 }, size: { x: B1.footprint.width / 2 - 1, y: 0.8, z: B1.footprint.depth - 2 } },
  {
    ref: "LUNA-STRUCT-B1-RETAINING-N",
    label: "Basement — Retaining Wall (North)",
    elementType: "retaining-wall",
    ownerLevelRef: "LUNA-B1",
    position: { x: 0, y: 0, z: -B1.footprint.depth / 2 + 0.2 },
    size: { x: B1.footprint.width, y: B1.height, z: 0.4 },
  },
  {
    ref: "LUNA-STRUCT-B1-RETAINING-S",
    label: "Basement — Retaining Wall (South)",
    elementType: "retaining-wall",
    ownerLevelRef: "LUNA-B1",
    position: { x: 0, y: 0, z: B1.footprint.depth / 2 - 0.2 },
    size: { x: B1.footprint.width, y: B1.height, z: 0.4 },
  },
];

// --- Transfer element: the podium (44x34) is wider than the tower above
// (36x28) — a real building resolves that step-in with a transfer
// structure at the level where the footprint narrows. Modeled as one
// representative transfer beam/slab band at the top of L01-AMENITIES
// (the last podium-width level before the tower steps in at L02). ---
const L01 = levelByRef("LUNA-L01-AMENITIES");
const TRANSFER: StructuralElementRecord[] = [
  {
    ref: "LUNA-STRUCT-L01-TRANSFER-01",
    label: "Level 1 — Podium/Tower Transfer Structure",
    elementType: "transfer-beam",
    ownerLevelRef: "LUNA-L01-AMENITIES",
    position: { x: 0, y: L01.height / 2 - 0.3, z: 0 },
    size: { x: 37, y: 0.6, z: 29 },
  },
];

// --- Stair structure: representative flight+landing volumes, distinct
// from LUNA_CORES' "protected stair" shaft VOID (the fire-rated enclosure)
// — this is the actual concrete stair structure inside that enclosure, at
// a few representative levels rather than every single floor transition. ---
const STAIR_LEVELS = ["LUNA-GROUND", "LUNA-L06"];
const STAIRS: StructuralElementRecord[] = STAIR_LEVELS.flatMap((levelRef) => {
  const level = levelByRef(levelRef);
  return [-14, 14].map((x, i) => ({
    ref: `LUNA-STRUCT-${shortName(levelRef)}-STAIR-${i === 0 ? "01" : "02"}`,
    label: `${level.label} — Stair Structure ${i === 0 ? "01" : "02"}`,
    elementType: "stair-structure" as const,
    ownerLevelRef: levelRef,
    position: { x, y: 0, z: 9 },
    size: { x: 3, y: level.height * 0.9, z: 5 },
  }));
});

// --- Rooftop structural support: plinths carrying the pergola/plant
// equipment above the roof deck's own slab. ---
const ROOFTOP = levelByRef("LUNA-ROOFTOP");
const ROOF_SUPPORT: StructuralElementRecord[] = [
  { ref: "LUNA-STRUCT-ROOFTOP-SUPPORT-01", label: "Luna Sky — Structural Support Zone A", elementType: "roof-structure", ownerLevelRef: "LUNA-ROOFTOP", position: { x: -ROOFTOP.footprint.width / 2 + 2, y: -ROOFTOP.height / 2 + 0.3, z: -ROOFTOP.footprint.depth / 2 + 2 }, size: { x: 2, y: 0.6, z: 2 } },
  { ref: "LUNA-STRUCT-ROOFTOP-SUPPORT-02", label: "Luna Sky — Structural Support Zone B", elementType: "roof-structure", ownerLevelRef: "LUNA-ROOFTOP", position: { x: ROOFTOP.footprint.width / 2 - 2, y: -ROOFTOP.height / 2 + 0.3, z: ROOFTOP.footprint.depth / 2 - 2 }, size: { x: 2, y: 0.6, z: 2 } },
];

export const LUNA_STRUCTURAL_ELEMENTS: StructuralElementRecord[] = [...SLABS, ...COLUMNS, ...FOUNDATION, ...TRANSFER, ...STAIRS, ...ROOF_SUPPORT];

/** The continuous full-height structural core wall — a hollow ring
 * wrapping the lift + electrical/water/drainage/fire/network riser
 * cluster (LUNA_CORES, x roughly -8.8 to 8.15) at a plausible wall
 * thickness, deliberately hollow in the middle rather than a solid block:
 * the elevator cabins and riser runs already occupy that interior space
 * (see LunaElevatorCore/LunaRiserShafts) and a solid core wall there would
 * bury them, not coordinate with them. One addressable element
 * (LUNA-STRUCT-CORE-01) made of four merged wall segments — fixed
 * regardless of any single level's explode state, the same "spine"
 * treatment risers already get, since a real core wall is exactly that:
 * the one part of the structure that does NOT separate floor by floor. */
export const LUNA_STRUCTURAL_CORE_WALL = {
  ref: "LUNA-STRUCT-CORE-01",
  label: "Structural Core Wall",
  centerX: -0.3,
  centerZ: 0,
  halfWidth: 9.1,
  halfDepth: 2.3,
  thickness: 0.4,
  baseElevation: LUNA_BUILDING_SPAN.base,
  topElevation: LUNA_BUILDING_SPAN.top,
};
