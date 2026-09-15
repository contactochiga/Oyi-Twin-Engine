// Fire & Life Safety System V1 — building-level live fire state.
//
// One derived read, the same philosophy as resolveBuildingPower()
// (lunaPowerResolver.ts): computed fresh from canonical assets' live
// runtime rows every time it's called, never stored/duplicated state.
// The Fire Control Board's summary, the 3D X-ray's alarm-zone emphasis,
// and Oyi's fire-status answers all call this exact function.
//
// SAFETY BOUNDARY (non-negotiable, see docs/LUNA_FIRE_LIFE_SAFETY_
// REFERENCE_SPEC.md §6): this resolver OBSERVES simulated/reference
// runtime state. It is not a certified fire panel, does not implement
// life-safety interlocks, and its "fireState" is a reference summary for
// investigation/spatial-understanding purposes only.
//
// Building fire state is deliberately limited to NORMAL/ALARM/TROUBLE —
// no PRE_ALARM/SUPERVISORY/PARTIALLY_ISOLATED/RESETTING terminology is
// invented, since nothing in the current canonical catalog legitimately
// models a distinct investigation/supervisory/partial-isolation stage.

import { lunaSimulationProvider, lunaRuntimeInternals } from "./lunaSimulationProvider";
import type { FireEvent } from "./lunaSimulationProvider";
import { lunaTwinDataProvider } from "../operational/lunaTwinDataProvider";
import { useEffect, useState } from "react";

export type FireBuildingState = "normal" | "alarm" | "trouble";

export interface FireOperationalState {
  fireState: FireBuildingState;
  alarmActive: boolean;
  troubleActive: boolean;
  originatingZoneRef: string | null;
  originatingZoneLabel: string | null;
  affectedLevelRef: string | null;
  activeAlarmDeviceCount: number;
  pump: { running: boolean; fault: boolean; pressureBar: number };
  fireWaterAvailable: boolean;
  riserPressurized: boolean;
  controllerCommunicationOk: boolean;
  firstEvent: FireEvent | null;
  lastEvent: FireEvent | null;
  quality: "simulated";
}

const PANEL_REF = "LUNA-B1-FIRE-PANEL-01";
const PUMP_REF = "LUNA-B1-FIRE-PUMP-01";
const TANK_REF = "LUNA-B1-FIRE-TANK-01";
const GROUND_DET_REF = "LUNA-GROUND-FIRE-DET-01";
const SMOKE_DET_REF = "LUNA-L06-APT-A-ENTRY-SMOKE-01";
const RISER_REF = "LUNA-RISER-FIRE-01";

export const FIRE_STATE_SOURCE_REFS = [PANEL_REF, PUMP_REF, TANK_REF, GROUND_DET_REF, SMOKE_DET_REF, RISER_REF];

export function resolveFireState(): FireOperationalState | null {
  const panel = lunaSimulationProvider.getState(PANEL_REF);
  const pump = lunaSimulationProvider.getState(PUMP_REF);
  const tank = lunaSimulationProvider.getState(TANK_REF);
  const groundDet = lunaSimulationProvider.getState(GROUND_DET_REF);
  const smokeDet = lunaSimulationProvider.getState(SMOKE_DET_REF);
  const riser = lunaSimulationProvider.getState(RISER_REF);
  if (!panel || !pump || !tank || !groundDet || !smokeDet || !riser) return null;

  const panelState = panel.state as { alarm_active?: boolean; trouble?: boolean; zones_ok?: boolean; active_zone_ref?: string | null };
  const alarmActive = Boolean(panelState.alarm_active);
  const troubleActive = Boolean(panelState.trouble);
  const fireState: FireBuildingState = alarmActive ? "alarm" : troubleActive ? "trouble" : "normal";

  const activeAlarmDeviceCount = (Boolean((groundDet.state as { alarm?: boolean }).alarm) ? 1 : 0) + (Boolean((smokeDet.state as { smoke?: boolean }).smoke) ? 1 : 0);

  const originatingZoneRef = panelState.active_zone_ref ?? null;
  const originatingAsset = originatingZoneRef ? lunaTwinDataProvider.getAsset(originatingZoneRef) : undefined;

  const pumpState = pump.state as { running?: boolean; fault?: boolean; pressure_bar?: number };
  const riserState = riser.state as { pressurized?: boolean };

  const events = lunaRuntimeInternals.getFireEvents();

  return {
    fireState,
    alarmActive,
    troubleActive,
    originatingZoneRef,
    originatingZoneLabel: originatingAsset?.label ?? null,
    affectedLevelRef: originatingAsset?.ownerLevelRef ?? null,
    activeAlarmDeviceCount,
    pump: { running: Boolean(pumpState.running), fault: Boolean(pumpState.fault), pressureBar: typeof pumpState.pressure_bar === "number" ? pumpState.pressure_bar : 0 },
    // Fire-water AVAILABILITY (is there a registered source at all) is
    // kept distinct from riser PRESSURIZATION (is it live right now) —
    // the tank's own existence is the reference baseline for
    // availability; no tank-level telemetry is modeled (DD11).
    fireWaterAvailable: true,
    riserPressurized: Boolean(riserState.pressurized),
    controllerCommunicationOk: panelState.zones_ok !== false,
    firstEvent: events.length ? events[events.length - 1] : null,
    lastEvent: events.length ? events[0] : null,
    quality: "simulated",
  };
}

/** Live building fire state for React consumers (Fire Control Board
 * summary, 3D alarm-zone emphasis) — re-renders on every runtime store
 * change, the same broad subscription shape useBuildingPowerState()
 * already uses, since this is a genuinely cross-asset derived value. */
export function useFireState(): FireOperationalState | null {
  const [state, setState] = useState(() => resolveFireState());
  useEffect(() => {
    setState(resolveFireState());
    return lunaSimulationProvider.subscribe(() => setState(resolveFireState()));
  }, []);
  return state;
}

export function useFireEvents(): FireEvent[] {
  const [events, setEvents] = useState(() => lunaRuntimeInternals.getFireEvents());
  useEffect(() => {
    setEvents(lunaRuntimeInternals.getFireEvents());
    return lunaSimulationProvider.subscribe(() => setEvents(lunaRuntimeInternals.getFireEvents()));
  }, []);
  return events;
}
