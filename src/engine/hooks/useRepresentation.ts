// Oyi Twin Engine — Representation context (Phase 8).
// Every render surface that decides whether to show a marker, an
// interior, or a level in 3D must resolve that decision through the same
// policy Oyi's scope gate uses (see representationPolicy.ts) — this
// context is how the current viewer's identity + the building's policy
// reach components deep in the render tree (e.g. UnitOperationalLayer)
// without threading props through every intermediate layer. A privacy
// rule enforced only at the Oyi-query level and not at the render level
// would still leak private state the moment a viewer's camera enters a
// space it shouldn't see into — this context is what closes that gap.

import { createContext, useContext } from "react";
import type { RepresentationIdentity, RepresentationPolicy } from "../representationPolicy";

export interface RepresentationState {
  identity: RepresentationIdentity;
  policy: RepresentationPolicy;
}

export const RepresentationContext = createContext<RepresentationState | null>(null);

export function useRepresentation(): RepresentationState {
  const ctx = useContext(RepresentationContext);
  if (!ctx) throw new Error("useRepresentation must be used within a RepresentationContext.Provider");
  return ctx;
}
