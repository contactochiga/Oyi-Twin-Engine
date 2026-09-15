// HVAC System V1 — building-level (reference-chain) live HVAC state.
//
// One derived read, the same philosophy as resolveBuildingPower()/
// resolveFireState(): computed fresh from canonical assets' live runtime
// rows every time it's called, never stored/duplicated state. The HVAC
// Control Board's summary, the 3D representation and Oyi's HVAC answers
// all call this exact function.
//
// DD12 BOUNDARY (non-negotiable, see docs/LUNA_HVAC_REFERENCE_SPEC.md
// §2): HVAC strategy is unresolved. This resolver describes ONLY the one
// registered reference chain — Apartment 6A's two indoor split units and
// their shared outdoor condenser — never a whole-building HVAC claim.
// The separate, disconnected Rooftop common-area plant is intentionally
// NOT folded into this resolver's aggregate state (see spec for why).
//
// Building/zone state is deliberately limited to off/running/fault — no
// "standby" state is invented, since nothing in the current canonical
// catalog legitimately models a distinct standby stage for these units.

import { lunaSimulationProvider, lunaRuntimeInternals } from "./lunaSimulationProvider";
import { useEffect, useState } from "react";

export type HvacUnitState = "off" | "running" | "fault";
export type HvacBuildingState = "off" | "running" | "fault";

export interface HvacZoneState {
  ref: string;
  label: string;
  zoneRef: string;
  state: HvacUnitState;
  on: boolean;
  fault: boolean;
  mode: string;
  targetTempC: number;
  roomTempC: number | null;
}

export interface HvacOperationalState {
  hvacState: HvacBuildingState;
  zones: HvacZoneState[];
  outdoorRef: string;
  outdoorDemand: boolean;
  quality: "simulated";
}

const LIVING_AC_REF = "LUNA-L06-APT-A-LIVING-AC-01";
const BED_AC_REF = "LUNA-L06-APT-A-BED-01-AC-01";
const OUTDOOR_REF = "LUNA-L06-APT-A-AC-OUTDOOR-01";

export const HVAC_STATE_SOURCE_REFS = [LIVING_AC_REF, BED_AC_REF, OUTDOOR_REF];

function zoneStateFrom(s: { on?: boolean; fault?: boolean }): HvacUnitState {
  if (s.fault) return "fault";
  if (s.on) return "running";
  return "off";
}

function zoneFrom(ref: string, label: string, zoneRef: string, s: Record<string, unknown>): HvacZoneState {
  const state = s as { on?: boolean; fault?: boolean; mode?: string; target_temp_c?: number; room_temp_c?: number };
  return {
    ref,
    label,
    zoneRef,
    state: zoneStateFrom(state),
    on: Boolean(state.on),
    fault: Boolean(state.fault),
    mode: typeof state.mode === "string" ? state.mode : "cool",
    targetTempC: typeof state.target_temp_c === "number" ? state.target_temp_c : 24,
    roomTempC: typeof state.room_temp_c === "number" ? state.room_temp_c : null,
  };
}

export function resolveHvacState(): HvacOperationalState | null {
  const living = lunaSimulationProvider.getState(LIVING_AC_REF);
  const bed = lunaSimulationProvider.getState(BED_AC_REF);
  const outdoor = lunaSimulationProvider.getState(OUTDOOR_REF);
  if (!living || !bed || !outdoor) return null;

  const zones = [
    zoneFrom(LIVING_AC_REF, "Living Room AC", "LUNA-L06-APT-A-LIVING", living.state),
    zoneFrom(BED_AC_REF, "Primary Bedroom AC", "LUNA-L06-APT-A-BED-01", bed.state),
  ];
  const anyFault = zones.some((z) => z.state === "fault");
  const anyRunning = zones.some((z) => z.state === "running");
  const hvacState: HvacBuildingState = anyFault ? "fault" : anyRunning ? "running" : "off";

  return {
    hvacState,
    zones,
    outdoorRef: OUTDOOR_REF,
    outdoorDemand: Boolean((outdoor.state as { demand?: boolean }).demand),
    quality: "simulated",
  };
}

/** Live HVAC state for React consumers (Control Board summary, contextual
 * cards) — re-renders on every runtime store change, the same broad
 * subscription shape useBuildingPowerState()/useFireState() already use,
 * since this is a genuinely cross-asset derived value. */
export function useHvacState(): HvacOperationalState | null {
  const [state, setState] = useState(() => resolveHvacState());
  useEffect(() => {
    setState(resolveHvacState());
    return lunaSimulationProvider.subscribe(() => setState(resolveHvacState()));
  }, []);
  return state;
}

// Exposed for scripts/tests that need to force a recompute outside the
// ambient tick without importing the provider internals directly.
export function recomputeHvac(): void {
  lunaRuntimeInternals.recomputeHvacNetwork();
}
