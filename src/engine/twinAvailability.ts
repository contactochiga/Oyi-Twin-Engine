// Oyi Twin Engine — Twin Availability contract (Phase 9).
// Building-agnostic, same discipline as the rest of engine/: nothing here
// may name "Luna" or hardcode a Luna-specific value. Facility OS and
// Consumer OS each need to answer "does this estate/building/home have a
// twin, and which canonical ref does it open at?" without either host
// baking in "if Luna -> show twin" conditionals — this is the shared
// shape both hosts' own (host-specific) registries return, so a future
// building only ever needs a new registry entry, never new UI branching.

import type { CanonicalRef } from "./types";

export interface TwinAvailability {
  available: boolean;
  /** Canonical ref of the building the twin should open at (Facility). */
  buildingRef?: CanonicalRef;
  /** Canonical ref of the specific home/unit the twin should open at
   * (Consumer) — set when this availability describes a single resident's
   * assigned home rather than a whole building. */
  homeRef?: CanonicalRef;
  /** Human-readable name for chrome/labels — never used for identity. */
  label?: string;
}

export const TWIN_UNAVAILABLE: TwinAvailability = { available: false };

/** A host's twin registry is just a lookup from ITS OWN identity key
 * (estate id, estate name, home id — whatever the host already has) to a
 * TwinAvailability. Hosts own their own registry instance/keying; only
 * the shape is shared here. */
export type TwinRegistry<K extends string = string> = Record<K, TwinAvailability>;

export function resolveTwinAvailability<K extends string>(registry: TwinRegistry<K>, key: K | null | undefined): TwinAvailability {
  if (!key) return TWIN_UNAVAILABLE;
  return registry[key] ?? TWIN_UNAVAILABLE;
}
