// Luna Architectural Reality V2 — L06 Apartment A coordinate frame
// contract (brief Part 14). This does NOT reconcile the two existing,
// legitimately different representations of Apartment A's position —
// it names and versions the chain between them so a future real
// architectural source has one explicit, documented place to bind into,
// instead of an unexplained offset baked silently into geometry.
//
// Chain: SOURCE FRAME -> BUILDING FRAME -> LEVEL FRAME -> APARTMENT FRAME.
//
// RESOLVED (True Floor Plan System V1, L06 Gold Standard, Part 2): the two
// projections below used to be deliberately never merged. That phase's
// real-core coordination work (l06FloorPlate.ts) found the un-reconciled
// MASSING FRAME silently overlapped the real Lift 01/02 shafts, so
// resolving the two frames into one was no longer optional. MASSING FRAME
// won: it carries the most already-real, camera-validated work
// (Apartment A's 12-room interior, structural coordination, MEP
// terminations, per-room camera presets). LUNA_L06_UNITS.planX/planZ
// (lunaProgramme.ts) now equal l06UnitMassingBox()'s own output exactly —
// not a second, independently chosen footprint.
//
//   MASSING FRAME  — what actually renders in 3D, AND (as of the L06 Gold
//                     Standard phase) what the 2D operational plan reads
//                     too. LunaLevel.tsx's <UnitVolume> box, computed by
//                     l06UnitMassingBox() in lunaProgramme.ts. Every
//                     room in lunaInteriors.ts's LUNA_L06_APT_A, every
//                     per-room camera preset in lunaRoomCameraPresets.ts,
//                     and every apartment-device position in
//                     lunaOperationalAssets.ts is local to THIS origin.
//
//   PLAN FRAME     — HISTORICAL record only. Before the L06 Gold Standard
//                     phase this was a separately-authored rectangle used
//                     only by FloorPlan2D (Facility's 2D view); it now
//                     equals the massing frame exactly (see
//                     L06_APT_A_PLAN_FRAME below, which reads the same
//                     live LUNA_L06_UNITS entry the massing frame does).

import { LUNA_L06, LUNA_L06_UNITS, LUNA_BUILDING_SPAN, l06UnitMassingBox, type UnitMassingBox } from "../lunaProgramme";

export const L06_APT_A_UNIT = LUNA_L06_UNITS.find((u) => u.ref === "LUNA-L06-APT-A")!;

export interface FrameRect {
  x: number;
  z: number;
  width: number;
  depth: number;
}

/** BUILDING FRAME — the world x/z frame every canonical Luna coordinate
 * (LUNA_CORES, LUNA_LEVELS footprints, LUNA_STRUCTURAL_ELEMENTS) already
 * shares. y=0 is the site datum (LUNA_BUILDING_SPAN.base is B1's own
 * below-grade floor, not 0 — see lunaProgramme.ts). Nothing here is new;
 * this just names the frame that already exists. */
export const BUILDING_FRAME = {
  name: "building" as const,
  originNote: "World x/z origin = tower footprint center. y=0 = site datum.",
  verticalSpan: LUNA_BUILDING_SPAN,
};

/** LEVEL FRAME (LUNA-L06) — x/z pass through from the building frame
 * unchanged (a level never shifts x/z). Only y is level-relative: every
 * level's own content (InteriorLayer, LevelOperationalLayer) renders
 * inside a group at local y = -level.height/2 (see InteriorLayer.tsx's
 * own docstring on why), because LevelMassing already places the level's
 * OUTER group at world y = baseElevation + height/2. */
export const L06_LEVEL_FRAME = {
  name: "level" as const,
  levelRef: LUNA_L06.ref,
  baseElevation: LUNA_L06.baseElevation,
  height: LUNA_L06.height,
  xzPassthroughFromBuildingFrame: true,
};

/** APARTMENT FRAME — MASSING. The real, actually-rendered origin/extent
 * of Apartment A's 3D placeholder volume. Room-local coordinates in
 * lunaInteriors.ts's LUNA_L06_APT_A are children of this origin. */
export const L06_APT_A_MASSING_FRAME: FrameRect & { name: "apartment-massing" } = {
  name: "apartment-massing",
  ...l06UnitMassingBox(L06_APT_A_UNIT),
};

/** APARTMENT FRAME — PLAN. The Phase 8 2D operational floor-plan
 * rectangle. Only ever consumed by FloorPlan2D — never the 3D scene. */
export const L06_APT_A_PLAN_FRAME: FrameRect & { name: "apartment-plan" } = {
  name: "apartment-plan",
  x: L06_APT_A_UNIT.planX,
  z: L06_APT_A_UNIT.planZ,
  width: L06_APT_A_UNIT.planWidth,
  depth: L06_APT_A_UNIT.planDepth,
};

/** RESOLVED (L06 Gold Standard, Part 2) — this now computes to exactly
 * zero. Kept (not deleted) as the live, checkable proof that the
 * historical divergence the brief's own Part 14 originally disclosed
 * ("L06 Apt A plan origin: approximately (-10.5, -9)" vs "Current 3D/
 * camera origin: approximately (-8.1818, -6.3636)") is actually closed,
 * not just claimed closed — if a future change ever reintroduces a
 * silent second plan rectangle, this constant stops being {0,0} and the
 * deterministic test asserting so (verifyL06GoldStandard.mjs) fails
 * loudly instead of drifting quietly. */
export const MASSING_TO_PLAN_OFFSET = {
  offsetX: L06_APT_A_PLAN_FRAME.x - L06_APT_A_MASSING_FRAME.x,
  offsetZ: L06_APT_A_PLAN_FRAME.z - L06_APT_A_MASSING_FRAME.z,
  note: "Resolved by the L06 Gold Standard phase: the 2D operational plan now reads the same LUNA_L06_UNITS entry the 3D massing box does (lunaProgramme.ts), so this offset is always {0,0} unless someone reintroduces a second, independently-typed plan rectangle. A real architectural source (see L06_APT_A_SOURCE_FRAME) remains the eventual authority for whether this REFERENCE geometry matches a true as-designed footprint.",
};

export type SourceFrameStatus = "PENDING" | "BOUND";

/** SOURCE FRAME — the frame a real architect-produced file (IFC/RVT/etc.)
 * would arrive in. No real source exists for L06 Apartment A as of this
 * phase (confirmed by repository audit — see
 * docs/LUNA_ARCHITECTURAL_REALITY_V2_L06_GOLD_STANDARD.md). This is
 * therefore a disclosed PENDING placeholder, not a fabricated frame:
 * sourceToBuildingFrame() is an identity transform today because there is
 * nothing real to transform. When a real source is registered, this
 * status becomes "BOUND" and the transform becomes real, versioned, and
 * explicit — never a silent offset baked into geometry. */
export const L06_APT_A_SOURCE_FRAME: { status: SourceFrameStatus; sourceId?: string; note: string } = {
  status: "PENDING",
  note: "Architectural Gold Standard source pending. No RVT/IFC/Archicad/SketchUp/CAD/PDF source exists in this repository for L06 Apartment A. Register one through the existing Building Ingestion V1 Create New Project flow to move this to BOUND.",
};

/** Identity today (no source bound). A real adapter for a bound source
 * would replace this with the source's own declared transform (units,
 * rotation, origin) — versioned, never inferred by comparing numbers. */
export function sourceToBuildingFrame(point: { x: number; z: number }): { x: number; z: number } {
  return { x: point.x, z: point.z };
}

export const L06_APT_A_FRAME_CONTRACT_VERSION = 1;

export const L06_APT_A_FRAME_CONTRACT = {
  version: L06_APT_A_FRAME_CONTRACT_VERSION,
  chain: ["source", "building", "level", "apartment-massing", "apartment-plan"] as const,
  source: L06_APT_A_SOURCE_FRAME,
  building: BUILDING_FRAME,
  level: L06_LEVEL_FRAME,
  apartmentMassing: L06_APT_A_MASSING_FRAME,
  apartmentPlan: L06_APT_A_PLAN_FRAME,
  massingToPlanOffset: MASSING_TO_PLAN_OFFSET,
};

export type { UnitMassingBox };
