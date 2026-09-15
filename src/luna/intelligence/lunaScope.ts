// Luna Facility/Consumer scope policy — Oyi's command/query execution
// gate. Phase 8 re-founds this on the same representation policy that
// governs what the 3D/2D UI shows (lunaRepresentationPolicy), so there is
// one source of truth for "can this identity see/act on this ref" rather
// than two rules that can drift apart: anything the representation policy
// would HIDE from an identity, Oyi also refuses to navigate to, disclose,
// or act on.

import type { ScopePolicy, InteractionScope } from "../../engine/twinIntelligence";
import type { TwinDataProvider } from "../../engine/twinData";
import type { RepresentationIdentity } from "../../engine/representationPolicy";
import { lunaRepresentationPolicy } from "../policy/lunaRepresentationPolicy";

const DEFAULT_ASSIGNED_HOME: string = "LUNA-L06-APT-A";

/** Builds a full representation identity from the simple two-value scope
 * toggle the standalone/Facility demo UIs still expose — the toggle picks
 * an actor family, `assignedHomeRef` (real session data in a real host)
 * picks which unit a resident identity is scoped to. */
export function identityForScope(scope: InteractionScope, assignedHomeRef: string = DEFAULT_ASSIGNED_HOME): RepresentationIdentity {
  if (scope === "facility") {
    return { role: "facility", permissions: [], assignedHomeRefs: [], facilityResponsibility: true };
  }
  return { role: "resident", permissions: [], assignedHomeRefs: [assignedHomeRef], facilityResponsibility: false };
}

export function buildScopePolicy(identity: RepresentationIdentity): ScopePolicy {
  return {
    actor: identity,
    canControl: (ref) => lunaRepresentationPolicy.resolveMode({ ref, identity }) === "FULL_3D",
    scope: identity.role === "facility" ? "facility" : "consumer",
    isAllowed(ref: string): boolean {
      return lunaRepresentationPolicy.resolveMode({ ref, identity }) !== "HIDDEN";
    },
    denialMessage(ref: string, twinData: TwinDataProvider): string {
      const asset = twinData.getAsset(ref);
      const label = asset?.label ?? "That";
      return identity.role === "facility"
        ? `${label} is inside a resident's private home and isn't shown to Facility beyond authorized service infrastructure.`
        : `${label} is part of Facility systems, which aren't available from your home. Ask Facility if you need it.`;
    },
  };
}
