// Oyi Twin Engine — Service Route contract (Phase 10).
// Building-agnostic: answers "what serves this asset" by walking the
// EXISTING parentRef relationship graph every TwinDataProvider already
// populates (see OperationalRelationshipLines, which has drawn these same
// edges since Phase 4) — this is a semantic walk over real data, never
// inferred from mesh proximity or spatial nearness.

import type { CanonicalRef } from "./types";
import type { TwinDataProvider, OperationalAssetRecord, OperationalSystem } from "./twinData";

export interface ServiceRouteStep {
  ref: CanonicalRef;
  label: string;
  system: OperationalSystem;
  type: string;
}

export interface ServiceRoute {
  destinationRef: CanonicalRef;
  /** Ordered from the ultimate source to the destination — e.g.
   * Grid -> MDB -> Riser -> Floor Branch -> Meter. */
  steps: ServiceRouteStep[];
}

/** Walks `parentRef` upward from `destinationRef` until an asset has no
 * further parent (the route's source), then returns the chain reversed
 * so it reads source-to-destination. `maxHops` guards against a cyclical
 * or unexpectedly deep parentRef graph — real building service chains are
 * never this long, so hitting it indicates bad data, not a real route. */
export function buildServiceRoute(twinData: TwinDataProvider, destinationRef: CanonicalRef, maxHops = 12): ServiceRoute | null {
  const destination = twinData.getAsset(destinationRef);
  if (!destination) return null;

  const chain: OperationalAssetRecord[] = [destination];
  const seen = new Set<CanonicalRef>([destination.ref]);
  let current = destination;
  let hops = 0;
  while (current.parentRef && hops < maxHops) {
    const parent = twinData.getAsset(current.parentRef);
    if (!parent || seen.has(parent.ref)) break;
    chain.push(parent);
    seen.add(parent.ref);
    current = parent;
    hops += 1;
  }

  chain.reverse();
  return {
    destinationRef,
    steps: chain.map((a) => ({ ref: a.ref, label: a.label, system: a.system, type: a.type })),
  };
}
