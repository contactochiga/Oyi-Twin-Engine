import { passengerStopAllowed } from "../runtime/lunaPassengerAccess";
// Luna — Spatial Transition Engine V1.1 Part 11: the real, concrete
// route-filtering predicate routePlanning.ts's planRoute() REQUIRES.
// Never modifies RepresentationPolicy — this only CONSULTS it (plus the
// exact same lift-control gate lunaSimulationProvider.execute() already
// enforces), so a route can never be considered valid merely because
// graph connectivity exists.

import type { CanonicalRef } from "../../engine/types";
import type { RepresentationIdentity } from "../../engine/representationPolicy";
import { isSpatiallyVisible } from "../../engine/representationPolicy";
import type { NavigationEdge } from "../../engine/spatial/navigationGraph";
import type { AccessResolution } from "../../engine/spatial/accessResolution";
import { lunaRepresentationPolicy, LUNA_PRIVATE_UNIT_REFS } from "../policy/lunaRepresentationPolicy";
import { LUNA_EXTERIOR_ENTRANCE_PLAZA } from "./lunaTransitions";

const PRIVATE_UNIT_REF_SET = new Set<string>(LUNA_PRIVATE_UNIT_REFS);

/** Part 11/25/26 — the one real predicate:
 *   - going outside / starting outside is never restricted (there is no
 *     real policy concept of "the exterior is private").
 *   - a "lift" edge is only walkable for an identity whose RepresentationPolicy
 *     mode for that lift asset resolves FULL_3D — the EXACT SAME real gate
 *     lunaSimulationProvider.execute() already enforces before a lift
 *     command runs (currently: Facility only). This is not a new rule
 *     invented for routing; it is the pre-existing product policy,
 *     honestly reflected in route planning instead of silently ignored.
 *   - every other edge is walkable if RepresentationPolicy doesn't
 *     already HIDE the destination space for this identity. */
export function lunaIsRouteEdgeAllowed(edge: NavigationEdge, identity: RepresentationIdentity): boolean {
  if (edge.fromRef === LUNA_EXTERIOR_ENTRANCE_PLAZA || edge.toRef === LUNA_EXTERIOR_ENTRANCE_PLAZA) return true;
  if (edge.via === "lift") {
    const liftRef = edge.viaRef ?? edge.fromRef;
    return lunaRepresentationPolicy.resolveMode({ ref: liftRef, identity }) === "FULL_3D" || passengerStopAllowed(identity, liftRef, edge.fromRef === liftRef ? edge.toRef : edge.fromRef);
  }
  // L06 Gold Standard (Part 20/21) — entering a PRIVATE RESIDENTIAL UNIT
  // through its real door needs the stricter FULL_3D check, not just
  // "spatially visible." Facility's own resolveUnitMode can legitimately
  // return CONTEXT_3D for a private unit it doesn't own (enough to show
  // it on the operational floor plan / see its status) — isSpatiallyVisible
  // treats that as visible, which is correct for LOCATING the unit but
  // would incorrectly let a route CROSS the threshold into someone's real
  // home. Never weakens RepresentationPolicy itself — only tightens which
  // of its already-real outcomes this specific route edge accepts.
  if (PRIVATE_UNIT_REF_SET.has(edge.toRef)) {
    return lunaRepresentationPolicy.resolveMode({ ref: edge.toRef, identity }) === "FULL_3D";
  }
  if (LUNA_PRIVATE_UNIT_REFS.some(ref => edge.toRef.startsWith(`${ref}-`))) return lunaRepresentationPolicy.resolveMode({ ref: edge.toRef, identity }) === "FULL_3D";
  const mode = lunaRepresentationPolicy.resolveMode({ ref: edge.toRef, identity });
  return isSpatiallyVisible(mode);
}

/** Part 4's WAITING_FOR_ACCESS step for a lift leg — mirrors the EXACT
 * real rejection message lunaSimulationProvider.execute() already gives
 * a non-Facility identity, so a route's own DENIED status reads
 * consistently with what would happen if the lift command were sent
 * directly. */
export function lunaResolveLiftAccess(liftRef: CanonicalRef, identity: RepresentationIdentity): AccessResolution {
  const mode = lunaRepresentationPolicy.resolveMode({ ref: liftRef, identity });
  if (mode === "FULL_3D" || passengerStopAllowed(identity, liftRef, "LUNA-GROUND")) return { outcome: "GRANTED", reason: "identity has full control access to this lift" };
  return { outcome: "DENIED", reason: "Lift simulation control requires an authorized Facility host context. Passenger action admission is not enabled." };
}
