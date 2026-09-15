// Luna relationship-query resolution (Phase 13 §9/§13) — the Luna-specific
// glue between the engine's generic relationshipsFrom/relationshipsTo
// (engine/engineeringRelationships.ts) and LUNA_ENGINEERING_RELATIONSHIPS'
// actual edge data, kept out of the building-agnostic engine layer the
// same way lunaServiceRoutes.ts keeps route resolution out of it.

import type { RelationshipLookupResult } from "../../engine/twinIntelligence";
import type { EngineeringRelationshipType } from "../../engine/engineeringRelationships";
import { relationshipsFrom, relationshipsTo } from "../../engine/engineeringRelationships";
import { LUNA_ENGINEERING_RELATIONSHIPS } from "../operational/lunaEngineeringRelationships";

/** Tries relationshipsFrom first (the common "X is isolated_by Y" shape),
 * then relationshipsTo (the reverse "what does Y serve" shape) — see
 * TwinIntelligenceController.handleShowRelationship's own docstring for
 * why trying both directions here means the parser doesn't need to get
 * direction exactly right. Returns the first match found, or null if
 * neither direction has an edge of that type touching `ref`. */
export function lunaResolveRelationship(ref: string, type: EngineeringRelationshipType): RelationshipLookupResult | null {
  const fromEdges = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, ref, type);
  if (fromEdges[0]) return { edge: fromEdges[0], direction: "from" };

  const toEdges = relationshipsTo(LUNA_ENGINEERING_RELATIONSHIPS, ref, type);
  if (toEdges[0]) return { edge: toEdges[0], direction: "to" };

  return null;
}
