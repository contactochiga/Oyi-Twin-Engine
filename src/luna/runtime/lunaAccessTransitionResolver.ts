// Luna — Spatial Transition Engine V1 Part 8: the real AccessResolver
// implementation. Wraps the EXISTING resolveAccessAuthorization()/
// isAccessGovernedRef() from lunaSimulationProvider.ts — never a second,
// competing authorization engine. The Main Entrance
// (LUNA-GROUND-ACCESS-MAIN-01) is deliberately not in
// ACCESS_GOVERNED_REFS (Access & Security V1's own disclosed scope
// boundary — only Apartment 6A's entry lock is really governed), so this
// resolver correctly and honestly reports NOT_REQUIRED for it rather than
// asking a question the real access system was never wired to answer.

import type { AccessResolution, AccessResolver } from "../../engine/spatial/accessResolution";
import type { RepresentationIdentity } from "../../engine/representationPolicy";
import type { CanonicalRef } from "../../engine/types";
import { isAccessGovernedRef, resolveAccessAuthorization } from "./lunaSimulationProvider";

export const lunaAccessTransitionResolver: AccessResolver = {
  // Apartment A Full Interior Reality V1 (Part 6) — the one real physical
  // entry sequence opts into the simulated-credential step (requireCredential
  // = true); this is the exact reason accessResolution.ts's AccessResolver
  // interface grew a `presentedCredential` parameter this phase — a real
  // "APARTMENT A / ACCESS REQUIRED" panel supplies it after the resident
  // types a code, routed back through this SAME resolver, never a second
  // authorization path.
  resolveAccess(boundaryRef: CanonicalRef | undefined, identity: RepresentationIdentity, presentedCredential?: string): AccessResolution {
    if (!boundaryRef) return { outcome: "NOT_REQUIRED", reason: "this transition has no boundary object to authorize" };
    if (!isAccessGovernedRef(boundaryRef)) {
      return { outcome: "NOT_REQUIRED", reason: `${boundaryRef} is not governed by Access & Security V1 in this reference build — no credential is required` };
    }
    const result = resolveAccessAuthorization(identity, boundaryRef, presentedCredential, true);
    if (result.requiresCredential) return { outcome: "REQUIRES_CREDENTIAL", reason: result.reason };
    return { outcome: result.granted ? "GRANTED" : "DENIED", reason: result.reason };
  },
};
