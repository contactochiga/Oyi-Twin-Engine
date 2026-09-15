// Access & Security System V1 — building-level live access state, the
// same philosophy as resolveFireState()/resolveHvacState(): computed
// fresh from canonical assets' live runtime rows every time it's called,
// never stored/duplicated state. The Access Control Board, Oyi's access
// answers and the event log all call these exact functions — the
// renderer never decides authorization or physical state on its own.
//
// resolveAccessAuthorization()/isAccessGovernedRef()/AccessEvent live in
// lunaSimulationProvider.ts itself (the one real choke point every
// command already passes through — see its own "Access & Security System
// V1" section for the full schedule-boundary rationale), re-exported here
// so every other consumer imports from this one resolver module, matching
// resolveFireState()/resolveHvacState()'s own file shape.

import { useEffect, useState } from "react";
import { lunaSimulationProvider, lunaRuntimeInternals } from "./lunaSimulationProvider";
import type { AccessEvent } from "./lunaSimulationProvider";

export type { AccessEvent, AccessIdentityRole, AccessAuthorizationResult } from "./lunaSimulationProvider";
export const isAccessGovernedRef = lunaRuntimeInternals.isAccessGovernedRef;
export const resolveAccessAuthorization = lunaRuntimeInternals.resolveAccessAuthorization;

export interface AccessPointState {
  ref: string;
  label: string;
  /** True only for the one governed, really-controllable reference lock —
   * every other registered access point reports `instrumented: false` and
   * `locked: null` rather than a fabricated value (see schedule boundary
   * in lunaSimulationProvider.ts). */
  instrumented: boolean;
  locked: boolean | null;
}

export interface AccessOperationalState {
  points: AccessPointState[];
  lastEvent: AccessEvent | null;
  quality: "simulated";
}

const ACCESS_POINT_REFS: Array<{ ref: string; label: string }> = [
  { ref: "LUNA-GROUND-ACCESS-MAIN-01", label: "Main Resident Entrance" },
  { ref: "LUNA-B1-ACCESS-SERVICE-01", label: "Service Entrance" },
  { ref: "LUNA-GROUND-ACCESS-LIFT-LOBBY-01", label: "Lift Lobby Access (Ground)" },
  { ref: "LUNA-L06-APT-A-ENTRY-LOCK-01", label: "Apartment 6A — Entrance Smart Lock" },
];

export const ACCESS_STATE_SOURCE_REFS = ACCESS_POINT_REFS.map((p) => p.ref);

export function resolveAccessState(): AccessOperationalState | null {
  const points: AccessPointState[] = [];
  for (const { ref, label } of ACCESS_POINT_REFS) {
    const runtime = lunaSimulationProvider.getState(ref);
    if (!runtime) return null;
    const governed = isAccessGovernedRef(ref);
    const locked = governed ? Boolean((runtime.state as { locked?: boolean }).locked) : null;
    points.push({ ref, label, instrumented: governed, locked });
  }
  const events = lunaRuntimeInternals.getAccessEvents();
  return { points, lastEvent: events.length ? events[0] : null, quality: "simulated" };
}

/** Live access state for React consumers (Access Control Board summary,
 * contextual cards) — re-renders on every runtime store change, the same
 * broad subscription shape useFireState()/useHvacState() already use. */
export function useAccessState(): AccessOperationalState | null {
  const [state, setState] = useState(() => resolveAccessState());
  useEffect(() => {
    setState(resolveAccessState());
    return lunaSimulationProvider.subscribe(() => setState(resolveAccessState()));
  }, []);
  return state;
}

export function useAccessEvents(): AccessEvent[] {
  const [events, setEvents] = useState(() => lunaRuntimeInternals.getAccessEvents());
  useEffect(() => {
    setEvents(lunaRuntimeInternals.getAccessEvents());
    return lunaSimulationProvider.subscribe(() => setEvents(lunaRuntimeInternals.getAccessEvents()));
  }, []);
  return events;
}
