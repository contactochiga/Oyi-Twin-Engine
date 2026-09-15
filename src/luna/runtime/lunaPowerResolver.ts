// Electrical System V1.1 — building-level live power truth.
//
// A single DERIVED read (never manually-maintained UI state) answering
// "what is Luna running on right now" from canonical topology + live
// runtime state — the same discipline recomputePowerNetwork() already
// follows for the downstream cascade, just read back out as one coherent
// object instead of five separate per-asset fields. Every consumer (the
// Electrical Control Board's summary, the 3D X-ray's active-path
// emphasis, and Oyi's building-power answers) calls this SAME function
// and therefore always agrees, by construction — there is no second copy
// of "what source are we on" anywhere.
//
// Solar/BESS-as-a-source are deliberately absent: no such canonical asset
// exists yet, and Part 1 explicitly forbids inventing one merely because
// it would be nice to show. INV-01 ("Inverter / Battery Backup,
// Representative") IS surfaced below for information, but its current
// canonical role — a simple independent on/off toggle, parented to MDB-01,
// never wired into recomputePowerNetwork()'s cascade — does not make it a
// building supply source. Treating it as one would be fabricating a role
// it doesn't have; it stays observational only until a future phase
// legitimately models it that way.

import { useEffect, useState } from "react";
import { lunaSimulationProvider, lunaRuntimeInternals } from "./lunaSimulationProvider";
import type { ElectricalEvent } from "./lunaSimulationProvider";

export type BuildingSupplySource = "utility" | "generator" | "inverter" | "mixed" | "none";

export interface BuildingElectricalState {
  activeSource: BuildingSupplySource;
  utilityAvailable: boolean;
  generator: { phase: string; running: boolean; fault: boolean; fuelPct: number | null };
  /** Informational only — see module docstring. Null if the asset is
   * somehow missing from the catalog (should not happen in Luna). */
  inverter: { on: boolean; batteryPct: number | null } | null;
  ats: { source: "grid" | "generator"; autoMode: boolean; fault: boolean; transitioning: boolean };
  mainBusEnergized: boolean;
  voltageV: number;
  frequencyHz: number;
  currentA: number;
  loadPct: number;
  transition: "stable" | "transferring";
  activeFaults: string[];
  lastTransition: ElectricalEvent | null;
  /** Matches the existing RuntimeAssetState.source convention ("simulated"
   * vs a future live-provider "measured") — this whole object is derived
   * from simulated telemetry, never certified engineering. */
  quality: "simulated";
}

const GRID_REF = "LUNA-B1-ELECTRICAL-GRID-01";
const MDB_REF = "LUNA-B1-ELECTRICAL-MDB-01";
const GEN_REF = "LUNA-B1-ELECTRICAL-GEN-01";
const ATS_REF = "LUNA-B1-ELECTRICAL-ATS-01";
const INV_REF = "LUNA-B1-ELECTRICAL-INV-01";

// Refs this resolver reads — exported so the hook (useBuildingPowerState)
// knows exactly which asset-state changes should trigger a recompute,
// without needing to re-derive that list itself.
export const BUILDING_POWER_SOURCE_REFS = [GRID_REF, MDB_REF, GEN_REF, ATS_REF, INV_REF];

const TRANSITION_EVENT_LABELS = new Set(["Utility supply lost", "Utility supply restored", "ATS transferred to Generator", "ATS transferred to Utility"]);

export function resolveBuildingPower(): BuildingElectricalState | null {
  const grid = lunaSimulationProvider.getState(GRID_REF);
  const mdb = lunaSimulationProvider.getState(MDB_REF);
  const gen = lunaSimulationProvider.getState(GEN_REF);
  const ats = lunaSimulationProvider.getState(ATS_REF);
  const inv = lunaSimulationProvider.getState(INV_REF);
  if (!grid || !mdb || !gen || !ats) return null;

  const utilityAvailable = (grid.state as { utility_available?: boolean }).utility_available !== false;
  const genState = gen.state as { phase?: string; fault?: boolean; fuel_level_pct?: number };
  const genFault = Boolean(genState.fault);
  const genPhase = typeof genState.phase === "string" ? genState.phase : "stopped";
  const atsState = ats.state as { source?: string; auto_mode?: boolean; fault?: boolean; transitioning?: boolean };
  const atsSource: "grid" | "generator" = atsState.source === "generator" ? "generator" : "grid";
  const atsTransitioning = Boolean(atsState.transitioning);
  const mdbState = mdb.state as { energized?: boolean; voltage_v?: number; frequency_hz?: number; current_a?: number; load_pct?: number };
  const mainBusEnergized = mdbState.energized !== false;

  let activeSource: BuildingSupplySource = "none";
  if (mainBusEnergized) activeSource = atsSource === "generator" ? "generator" : "utility";
  else if (atsTransitioning) activeSource = "mixed"; // momentary break-before-make changeover, no live source yet

  const activeFaults: string[] = [];
  if (genFault) activeFaults.push("Generator fault");
  if (atsState.fault) activeFaults.push("ATS fault");

  const events = lunaRuntimeInternals.getElectricalEvents();
  const lastTransition = events.find((e) => TRANSITION_EVENT_LABELS.has(e.label)) ?? null;

  const invState = inv?.state as { on?: boolean; battery_pct?: number } | undefined;

  return {
    activeSource,
    utilityAvailable,
    generator: { phase: genPhase, running: genPhase === "running" && !genFault, fault: genFault, fuelPct: typeof genState.fuel_level_pct === "number" ? genState.fuel_level_pct : null },
    inverter: invState ? { on: Boolean(invState.on), batteryPct: typeof invState.battery_pct === "number" ? invState.battery_pct : null } : null,
    ats: { source: atsSource, autoMode: Boolean(atsState.auto_mode), fault: Boolean(atsState.fault), transitioning: atsTransitioning },
    mainBusEnergized,
    voltageV: typeof mdbState.voltage_v === "number" ? mdbState.voltage_v : 0,
    frequencyHz: typeof mdbState.frequency_hz === "number" ? mdbState.frequency_hz : 0,
    currentA: typeof mdbState.current_a === "number" ? mdbState.current_a : 0,
    loadPct: typeof mdbState.load_pct === "number" ? mdbState.load_pct : 0,
    transition: atsTransitioning ? "transferring" : "stable",
    activeFaults,
    lastTransition,
    quality: "simulated",
  };
}

/** Live building-power truth for React consumers (the Electrical Control
 * Board's summary widget, the 3D X-ray's active-path emphasis). Re-renders
 * on every runtime store change — the same broad subscription shape
 * useRuntimeStates() already uses — since this is a genuinely cross-asset
 * derived value, not one ref's own state. */
export function useBuildingPowerState(): BuildingElectricalState | null {
  const [state, setState] = useState(() => resolveBuildingPower());
  useEffect(() => {
    setState(resolveBuildingPower());
    return lunaSimulationProvider.subscribe(() => setState(resolveBuildingPower()));
  }, []);
  return state;
}

/** Live electrical operational history for the same consumers — reuses
 * the identical provider.subscribe() pub-sub the event log itself
 * notify()s through (see lunaSimulationProvider.ts), never a second
 * subscription mechanism. */
export function useElectricalEvents(): ElectricalEvent[] {
  const [events, setEvents] = useState(() => lunaRuntimeInternals.getElectricalEvents());
  useEffect(() => {
    setEvents(lunaRuntimeInternals.getElectricalEvents());
    return lunaSimulationProvider.subscribe(() => setEvents(lunaRuntimeInternals.getElectricalEvents()));
  }, []);
  return events;
}
