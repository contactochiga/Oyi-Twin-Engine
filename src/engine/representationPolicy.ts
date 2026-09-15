// Oyi Twin Engine — Representation Policy contract (Phase 8).
// Building-agnostic, same discipline as twinData.ts/twinIntelligence.ts:
// nothing here may name "Luna" or hardcode a Luna-specific value.
//
// Core principle: the canonical twin may hold both 3D and 2D
// representations of the same space/system. What a given viewer actually
// sees is resolved per canonical ref, from context — identity, role,
// permissions, assigned home/unit, Facility responsibility, occupancy
// state, commercial state — never from "Facility = 3D, Consumer = 3D"
// assumptions baked into a component tree. A building's own policy module
// (see src/luna/policy/ for this reference building) supplies the actual
// rules; this file only defines the shape every building's policy must
// implement.

import type { CanonicalRef } from "./types";
import type { OperationalAssetRecord, OperationalSystem } from "./twinData";

export type RepresentationMode =
  // Full spatial 3D presence with control/interaction available (the
  // viewer's own home, or Facility-managed plant/common infrastructure).
  | "FULL_3D"
  // 3D presence for spatial/navigational context, without control — e.g.
  // a resident walking through a shared lobby they don't operate.
  | "CONTEXT_3D"
  // A 2D operational surface (floor/unit plan, status card) standing in
  // for a 3D interior the viewer isn't authorized to see in full — e.g.
  // Facility looking at a private, occupied residential floor.
  | "OPERATIONAL_2D"
  // A 2D presence for context only (e.g. "this floor exists, this is its
  // shape") without exposing operational detail.
  | "CONTEXT_2D"
  // Not represented to this viewer at all — no navigation, no state
  // disclosure, no proof-of-existence beyond the fact a request was denied.
  | "HIDDEN";

/** A unit's occupancy/commercial state — the same axis serves both
 * "is someone living here" (privacy policy) and "is this for sale"
 * (future sales/public surface), since they're mutually exclusive states
 * of the same lifecycle. Phase 8 only needs the policy to *accept* this;
 * the sales/public surface itself is out of scope until a later phase. */
export type UnitLifecycleState = "available" | "reserved" | "occupied";

/** Coarse actor family — richer than Phase 6's two-value InteractionScope,
 * since Phase 8 needs to reason about Facility staff, an assigned
 * resident, and (data-model-only, for now) a future public/sales viewer. */
export type RepresentationRole = "facility" | "resident" | "public";

export interface RepresentationIdentity {
  actorId?: string;
  role: RepresentationRole;
  permissions: string[];
  /** Canonical refs of homes/units this identity is personally assigned
   * to — for a resident this is normally exactly one unit. */
  assignedHomeRefs: CanonicalRef[];
  /** True for Facility staff/operators who carry building-wide
   * operational responsibility (as opposed to e.g. a future vendor role
   * with narrower access) — kept separate from `role` so a policy can
   * express "facility role, but not this specific responsibility". */
  facilityResponsibility: boolean;
}

export interface RepresentationQuery {
  ref: CanonicalRef;
  identity: RepresentationIdentity;
  /** Only meaningful when `ref` identifies a unit/home — the building's
   * data layer supplies this, the policy never invents it. */
  unitLifecycleState?: UnitLifecycleState;
}

/** Building-specific representation rules. A building onboards by
 * implementing this against its own space/asset hierarchy — the engine
 * and every UI surface built on it only ever calls these two methods. */
export interface RepresentationPolicy {
  /** What mode should `query.ref` render as for `query.identity`? */
  resolveMode(query: RepresentationQuery): RepresentationMode;
  /** Given a set of assets that are physically within/serving a space
   * that resolved to a non-FULL_3D mode, return the subset (if any) this
   * identity is still individually authorized to see — e.g. Facility
   * remains authorized to see the electrical meter serving a private,
   * otherwise-hidden apartment, without that authorization extending to
   * the resident's own devices in the same space. */
  filterAuthorizedAssets(assets: OperationalAssetRecord[], identity: RepresentationIdentity): OperationalAssetRecord[];
}

export function isSpatiallyVisible(mode: RepresentationMode): boolean {
  return mode !== "HIDDEN";
}

export function isControllable(mode: RepresentationMode): boolean {
  return mode === "FULL_3D";
}

export function is3D(mode: RepresentationMode): boolean {
  return mode === "FULL_3D" || mode === "CONTEXT_3D";
}

export function is2D(mode: RepresentationMode): boolean {
  return mode === "OPERATIONAL_2D" || mode === "CONTEXT_2D";
}

/** Convenience the engine's own components use to decide whether an
 * asset should even be considered for a system-wide query (Systems Mode,
 * "list offline cameras", etc.) under a given identity — a thin wrapper
 * over resolveMode so call sites never need to know the mode taxonomy
 * beyond "would this be hidden". */
export function representationAllows(policy: RepresentationPolicy, ref: CanonicalRef, identity: RepresentationIdentity, unitLifecycleState?: UnitLifecycleState): boolean {
  return isSpatiallyVisible(policy.resolveMode({ ref, identity, unitLifecycleState }));
}

export type { OperationalSystem };
