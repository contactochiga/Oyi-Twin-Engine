// Oyi Twin Engine — Spatial Transition Engine V1 Part 8: access
// resolution. Mirrors the EXACT same "engine defines the contract,
// building implements it" split representationPolicy.ts already
// established — this is a NEW, separate axis, not a rename of
// RepresentationPolicy and not a second authorization engine competing
// with it:
//   RepresentationPolicy.resolveMode -> MAY THIS USER SEE/ENTER THIS SPACE
//   AccessResolver.resolveAccess     -> IS THIS PHYSICAL BOUNDARY
//                                        AUTHORIZED TO OPEN FOR THIS ACTOR
// A transition may need either, both, or neither (see
// TransitionAccessRequirement in transitions.ts) — this file never reads
// or implies RepresentationPolicy's answer, and vice versa.

import type { CanonicalRef } from "../types";
import type { RepresentationIdentity } from "../representationPolicy";
import type { AccessOutcome, SpatialTransition } from "./transitions";

export interface AccessResolution {
  outcome: AccessOutcome;
  reason: string;
}

/** A building supplies exactly one real implementation of this (e.g.
 * Luna's lunaAccessTransitionResolver.ts, which wraps the EXISTING
 * lunaSimulationProvider.resolveAccessAuthorization — never a second,
 * competing authorization engine). boundaryRef is undefined for
 * OPEN_PASSAGE/no-actuator transitions; a resolver must handle that case
 * (Part 8: "NOT_REQUIRED" is a legitimate, common answer).
 *
 * Apartment A Full Interior Reality V1 (Part 6) — `presentedCredential` is
 * how a host reports a credential the ACTOR just supplied (e.g. a simulated
 * keypad code) back through the SAME resolver, never a second/competing
 * check: called once with no credential (the first WAITING_FOR_ACCESS
 * pass), a resolver may answer REQUIRES_CREDENTIAL; called again after the
 * host collects one, the SAME resolver validates it and answers
 * GRANTED/DENIED. A resolver that never needs a credential step (e.g. a
 * badge reader that's already implicitly "presented" just by walking up)
 * simply ignores the parameter and always answers GRANTED/DENIED/NOT_REQUIRED. */
export interface AccessResolver {
  resolveAccess(boundaryRef: CanonicalRef | undefined, identity: RepresentationIdentity, presentedCredential?: string): AccessResolution;
}

/** The one call a transition step needs: short-circuits to NOT_REQUIRED
 * for transitions that declared no access requirement at all, without
 * even invoking the resolver — an OPEN_PASSAGE or a public common
 * threshold should never have to ask a resolver a question it has
 * already been told doesn't apply.
 *
 * Resolves against `actuatorBinding` when the transition has one, falling
 * back to `boundaryRef` otherwise — a real access-control system governs
 * permissions on the DEVICE that actuates a boundary (the lock/reader),
 * not the architectural door frame itself, and `boundaryRef` legitimately
 * names the door (used for clearance/geometry/2D-3D crosswalk purposes)
 * while `actuatorBinding` names the governed device, which are commonly
 * two different canonical refs for the same physical crossing (see
 * Luna's own Apartment A entrance transition: boundaryRef is the door,
 * actuatorBinding is its entry lock). */
export function resolveTransitionAccess(transition: SpatialTransition, resolver: AccessResolver | undefined, identity: RepresentationIdentity, presentedCredential?: string): AccessResolution {
  if (transition.accessRequirement === "NONE") {
    return { outcome: "NOT_REQUIRED", reason: "this transition's boundary has no access requirement" };
  }
  if (!resolver) {
    return { outcome: "UNAVAILABLE", reason: "this transition requires access resolution but no AccessResolver was supplied" };
  }
  return resolver.resolveAccess(transition.actuatorBinding ?? transition.boundaryRef, identity, presentedCredential);
}
