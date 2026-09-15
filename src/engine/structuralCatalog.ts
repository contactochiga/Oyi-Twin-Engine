// Oyi Twin Engine — Structural catalogue contract (Phase 13).
// Deliberately NOT part of twinData.ts's OperationalAssetRecord table:
// structural elements carry no runtime state, no commands, no simulation —
// they are pure spatial/semantic reference geometry (§3 of the brief: "keep
// purely visual structural geometry separate from backend operational
// assets unless it has an operational reason to exist"). This is a plain,
// building-agnostic catalogue shape a building's own data module populates,
// mirroring the same discipline twinData.ts already established: the
// engine only ever consumes this shape, never a Luna-specific one.
//
// This is a CONCEPTUAL, COORDINATED REFERENCE representation of structure —
// explicitly not certified structural design, not a reinforcement schedule,
// not construction-issue documentation. See each building module's own
// data file for that disclosure repeated in context.

import type { CanonicalRef } from "./types";

export type StructuralElementType =
  | "foundation"
  | "retaining-wall"
  | "core-wall"
  | "column"
  | "slab"
  | "transfer-beam"
  | "beam"
  | "stair-structure"
  | "roof-structure";

export interface StructuralElementRecord {
  ref: CanonicalRef;
  label: string;
  elementType: StructuralElementType;
  /** The level this element should spatially attach to for placement,
   * fade-with-level, and isolate/explode participation — same convention
   * OperationalAssetRecord.ownerLevelRef already uses. A continuous
   * element that spans multiple levels (the core wall) omits this in favor
   * of being mounted once at the building root instead (see
   * StructuralCoreWall), the same way CoreShaft/RiserShaft already work. */
  ownerLevelRef?: CanonicalRef;
  /** Canonical ref of this element's structural parent, where meaningful
   * (e.g. a column's parent is the foundation/transfer element it bears
   * on) — distinct from spatial containment, same convention as
   * OperationalAssetRecord.parentRef. */
  parentRef?: CanonicalRef;
  /** Local box center position (metres), relative to ownerLevelRef's own
   * massing-group origin — the same floor-aligned local space
   * InteriorLayer/LevelFacade already render into. */
  position: { x: number; y: number; z: number };
  /** Box dimensions (metres). */
  size: { x: number; y: number; z: number };
}
