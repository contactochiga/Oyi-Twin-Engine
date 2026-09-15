// Luna Architectural Reality V2 — structural coordination check (brief
// Part 12). Real geometry cross-reference only: compares L06 Apartment
// A's actual rendered massing box against the real, already-existing
// LUNA_STRUCTURAL_ELEMENTS columns on LUNA-L06 — never invents or moves
// either one. If a real overlap is ever found, the result says
// COORDINATION_REVIEW_REQUIRED; nothing here silently relocates a wall
// or a column to make the conflict disappear.

import { LUNA_STRUCTURAL_ELEMENTS } from "../structure/lunaStructuralElements";
import { L06_APT_A_MASSING_FRAME } from "./l06AptAFrame";

export type StructuralCoordinationStatus = "CLEAR" | "COORDINATION_REVIEW_REQUIRED";

export interface StructuralCoordinationFinding {
  status: StructuralCoordinationStatus;
  checkedElementRefs: string[];
  conflicts: Array<{ elementRef: string; overlapX: number; overlapZ: number }>;
  /** Smallest real gap found between the apartment box edge and any
   * checked element's edge, in metres — negative would mean overlap
   * (none here). Disclosed so "clear" isn't just a boolean with no
   * evidence behind it. */
  minClearanceMetres: number;
}

function rectsOverlap(a: { x: number; z: number; halfWidth: number; halfDepth: number }, b: { x: number; z: number; halfWidth: number; halfDepth: number }): { overlapX: number; overlapZ: number } | null {
  const overlapX = a.halfWidth + b.halfWidth - Math.abs(a.x - b.x);
  const overlapZ = a.halfDepth + b.halfDepth - Math.abs(a.z - b.z);
  if (overlapX > 0 && overlapZ > 0) return { overlapX, overlapZ };
  return null;
}

/** Checks every real LUNA-L06 column (the only structural-element type
 * with a meaningful footprint that could plausibly clash with an
 * apartment volume at this level — slabs/foundations/transfer/stairs
 * either belong to a different level or span the whole floor by design)
 * against Apartment A's real massing box. Pure function, real data only —
 * called by both the deterministic test and the Gold Standard registry
 * so there is exactly one answer, not two independently-computed ones. */
export function checkL06AptAStructuralCoordination(): StructuralCoordinationFinding {
  const columns = LUNA_STRUCTURAL_ELEMENTS.filter((e) => e.ownerLevelRef === "LUNA-L06" && e.elementType === "column");
  const apt = {
    x: L06_APT_A_MASSING_FRAME.x,
    z: L06_APT_A_MASSING_FRAME.z,
    halfWidth: L06_APT_A_MASSING_FRAME.width / 2,
    halfDepth: L06_APT_A_MASSING_FRAME.depth / 2,
  };

  const conflicts: StructuralCoordinationFinding["conflicts"] = [];
  let minClearance = Infinity;

  for (const col of columns) {
    const colRect = { x: col.position.x, z: col.position.z, halfWidth: col.size.x / 2, halfDepth: col.size.z / 2 };
    const overlap = rectsOverlap(apt, colRect);
    if (overlap) {
      conflicts.push({ elementRef: col.ref, overlapX: overlap.overlapX, overlapZ: overlap.overlapZ });
      minClearance = Math.min(minClearance, -Math.min(overlap.overlapX, overlap.overlapZ));
    } else {
      // Real separation distance on whichever axis is tighter.
      const gapX = Math.abs(apt.x - colRect.x) - (apt.halfWidth + colRect.halfWidth);
      const gapZ = Math.abs(apt.z - colRect.z) - (apt.halfDepth + colRect.halfDepth);
      // Two disjoint rects are separated if EITHER axis gap is positive;
      // the real clearance is the larger (least negative/most positive)
      // of the two, since that's the axis actually keeping them apart.
      const clearance = Math.max(gapX, gapZ);
      minClearance = Math.min(minClearance, clearance);
    }
  }

  return {
    status: conflicts.length > 0 ? "COORDINATION_REVIEW_REQUIRED" : "CLEAR",
    checkedElementRefs: columns.map((c) => c.ref),
    conflicts,
    minClearanceMetres: Number.isFinite(minClearance) ? Math.round(minClearance * 1000) / 1000 : Infinity,
  };
}
