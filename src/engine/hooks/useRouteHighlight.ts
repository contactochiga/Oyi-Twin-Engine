import { createContext, useContext } from "react";
import type { CanonicalRef } from "../types";

export interface RouteHighlightState {
  /** Ordered source-to-destination refs of the currently revealed service
   * route, or an empty array when nothing is highlighted. */
  highlightedRefs: CanonicalRef[];
  setHighlightedRefs: (refs: CanonicalRef[]) => void;
}

// Default is a real, harmless no-op state rather than null+throw: hosts
// that predate Phase 10's route intelligence (Facility OS, Consumer OS)
// mount RouteHighlightLines as part of LunaBuilding without ever wrapping
// a Provider, and a throwing hook there would crash their entire twin
// render, not just silently skip the route-highlight feature. Matches the
// same graceful-default discipline as useLightingMode.
const noop = () => {};
const DEFAULT_ROUTE_HIGHLIGHT_STATE: RouteHighlightState = { highlightedRefs: [], setHighlightedRefs: noop };

export const RouteHighlightContext = createContext<RouteHighlightState>(DEFAULT_ROUTE_HIGHLIGHT_STATE);

export function useRouteHighlight(): RouteHighlightState {
  return useContext(RouteHighlightContext);
}
