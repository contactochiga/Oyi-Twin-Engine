// Oyi Twin Engine — canonical contract types.
// These types are deliberately building-agnostic: nothing here may name
// "Luna" or hardcode any Luna-specific value. A future building onboarded
// through the Oyi backend's digital-twin asset contract (see
// Ochiga-backend/docs/OYI_DIGITAL_TWIN_ASSET_CONTRACT.md) should be able to
// drive this same engine purely through data shaped like this.

export type TwinNodeKind =
  | "site"
  | "building"
  | "level"
  | "unit"
  | "room"
  | "door"
  | "core-shaft"
  | "device"
  | "camera"
  | "access-point"
  | "edge-node"
  | "structural-element"
  | "service-zone";

// A canonical reference is the stable digital-twin identity string that
// mirrors the Oyi backend's own canonical_ref / camera_id / access_point_ref /
// edge_node_id columns (see the asset contract doc). The engine never
// derives this from a display label — it is always supplied by the caller.
export type CanonicalRef = string;

export interface TwinNodeDescriptor {
  ref: CanonicalRef;
  kind: TwinNodeKind;
  label: string;
  /** Ref of the containing node, if any — lets the UI/debug panel walk the
   * hierarchy without the engine needing to know building-specific shape. */
  parentRef?: CanonicalRef;
}

export interface SelectionState {
  selected: TwinNodeDescriptor | null;
  select: (node: TwinNodeDescriptor | null) => void;
}

export interface LevelDescriptor extends TwinNodeDescriptor {
  kind: "level";
  /** Elevation of the level's finished floor, in metres, site datum = 0. */
  baseElevation: number;
  /** Floor-to-floor height in metres. */
  height: number;
  /** Footprint half-extents in metres (x, z) — the level is modeled as a
   * simple extruded rectangle in Phase 1; real facade geometry comes later. */
  footprint: { width: number; depth: number };
  /** Optional plan-offset from the building's core centreline, for stepped
   * massing (podium wider than tower, penthouse setback, etc). */
  planOffset?: { x: number; z: number };
  isolatable: boolean;
}
