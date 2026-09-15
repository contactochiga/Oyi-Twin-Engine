// Oyi Twin Engine — Engineering relationship model (Phase 13 §9).
// parentRef (twinData.ts) already gives every asset ONE relationship — its
// place in a strict containment/distribution chain, which is exactly what
// serviceRoute.ts's buildServiceRoute walks. That's still correct and
// unchanged. But real questions like "which valve isolates this?" or
// "what does this pump serve?" aren't parent/child at all — a valve
// typically sits beside the branch it isolates, not above or below it in
// the parentRef chain. This is the minimum generic abstraction needed for
// those: a small, explicit, directed edge list a building's own data
// module populates, alongside (never instead of) parentRef.

import type { CanonicalRef } from "./types";

export type EngineeringRelationshipType =
  | "supplied_by"
  | "drains_to"
  | "powered_by"
  | "protected_by"
  | "connected_to"
  | "monitored_by"
  | "isolated_by"
  | "routed_through";

export interface EngineeringRelationship {
  from: CanonicalRef;
  type: EngineeringRelationshipType;
  to: CanonicalRef;
  /** Short human phrase for explanation text — "isolates", "drains to",
   * etc. Falls back to a generic phrasing derived from `type` if omitted. */
  label?: string;
}

const DEFAULT_LABEL: Record<EngineeringRelationshipType, string> = {
  supplied_by: "supplied by",
  drains_to: "drains to",
  powered_by: "powered by",
  protected_by: "protected by",
  connected_to: "connected to",
  monitored_by: "monitored by",
  isolated_by: "isolated by",
  routed_through: "routed through",
};

export function relationshipLabel(type: EngineeringRelationshipType): string {
  return DEFAULT_LABEL[type];
}

// The reverse-direction phrase — "what does Booster Pump 02 serve?" reads
// as "Booster Pump 02 supplies the Water Riser", not "Booster Pump 02
// supplied by the Water Riser" (which is what DEFAULT_LABEL would produce
// applied backwards). Phase 13 §13's intelligence layer needs this so a
// relationship discovered via relationshipsTo() still reads as a natural
// sentence in the direction the question was actually asked.
const REVERSE_LABEL: Record<EngineeringRelationshipType, string> = {
  supplied_by: "supplies",
  drains_to: "receives drainage from",
  powered_by: "powers",
  protected_by: "protects",
  connected_to: "connected to",
  monitored_by: "monitors",
  isolated_by: "isolates",
  routed_through: "is a route for",
};

export function reverseRelationshipLabel(type: EngineeringRelationshipType): string {
  return REVERSE_LABEL[type];
}

/** A building's relationship edges are just a flat array — small enough
 * (tens, not thousands, of edges for a representative reference twin) that
 * a linear scan per query is simpler and just as fast as building an index
 * up front. Kept as plain functions over a plain array, not a class/
 * context, matching serviceRoute.ts's own style. */
export function relationshipsFrom(
  edges: EngineeringRelationship[],
  ref: CanonicalRef,
  type?: EngineeringRelationshipType
): EngineeringRelationship[] {
  return edges.filter((e) => e.from === ref && (!type || e.type === type));
}

/** The reverse direction — "what does THIS serve/feed/protect" rather than
 * "what serves/feeds/protects this". Both directions matter: Oyi needs
 * "what powers the Living Room AC" (forward from the AC) and "what does
 * Booster Pump 02 serve" (reverse from the pump) — see §13's acceptance
 * examples, one of each shape. */
export function relationshipsTo(
  edges: EngineeringRelationship[],
  ref: CanonicalRef,
  type?: EngineeringRelationshipType
): EngineeringRelationship[] {
  return edges.filter((e) => e.to === ref && (!type || e.type === type));
}
