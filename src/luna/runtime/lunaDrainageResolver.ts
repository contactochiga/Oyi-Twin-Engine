// Drainage V1 — building-level (reference-chain) drainage state.
//
// One derived read, the same philosophy as resolveHvacState()/
// resolveNetworkState(): computed fresh from canonical assets' live
// runtime rows every call, never stored/duplicated state. The Drainage
// Control Board's summary, the 3D representation and Oyi's drainage
// answers all call this exact function.
//
// DD10 BOUNDARY (non-negotiable, see docs/LUNA_MEP_COORDINATION_SPEC.md
// and docs/LUNA_DRAINAGE_REFERENCE_SPEC.md): drainage/stormwater final
// design is unresolved. This resolver describes ONLY the one registered
// reference chain per medium — Apartment 6A's real wastewater fixtures,
// the single-stack vent termination, and the new stormwater reference
// chain — never a whole-building drainage engineering claim.
//
// Direction note: unlike water/electrical/fire/network, drainage's real
// physical flow direction is fixture -> discharge, the OPPOSITE of
// buildServiceRoute()'s own "source (graph root) -> destination (query
// target)" reading (see docs/LUNA_MEP_COORDINATION_SPEC.md's explicit
// warning: "LUNA-B1-DRAINAGE-MAIN-01 is a discharge reference, not a water
// source"). This resolver's chain arrays are ordered in the REAL physical
// flow direction (fixture first, discharge/termination last) — callers
// must not assume this matches buildServiceRoute()'s own step order.

import { lunaSimulationProvider } from "./lunaSimulationProvider";
import { useEffect, useState } from "react";

export type DrainageNodeState = "NORMAL" | "RESTRICTED" | "BLOCKED" | "LEAK" | "ACCESS_REQUIRED" | "DESIGN_REFERENCE";

export interface DrainageChainNode {
  ref: string;
  label: string;
  state: DrainageNodeState;
}

export interface DrainageOperationalState {
  /** Fixture-level leaves of the wastewater chain, real registered drain
   * points (kitchen + three bathrooms). */
  wastewaterFixtures: DrainageChainNode[];
  /** The shared downstream backbone, in real physical flow order: wet-area
   * stack connection -> floor branch -> riser -> B1 discharge reference. */
  wastewaterBackbone: DrainageChainNode[];
  /** Single-stack vent — the SAME soil/waste riser continuing through the
   * roof (see lunaMepBackbone.ts's DRAINAGE_VENT comment), not a
   * fabricated second riser. */
  ventChain: DrainageChainNode[];
  /** Genuinely separate stormwater reference chain — never merged with
   * wastewater/vent. */
  stormwaterChain: DrainageChainNode[];
  /** DD10 — final discharge/treatment/pump strategy beyond the B1
   * reference point is not designed. Hardcoded true, mirroring
   * resolveNetworkState()'s edgeCoreConnected:false code-level honesty
   * pattern, never inferred resolved. */
  finalDischargeDesignRequired: true;
  quality: "simulated";
}

const KITCHEN_DRAIN_REF = "LUNA-L06-APT-A-KITCHEN-DRAIN-01";
const BATH_01_DRAIN_REF = "LUNA-L06-APT-A-BATH-01-DRAIN-01";
const BATH_02_DRAIN_REF = "LUNA-L06-APT-A-BATH-02-DRAIN-01";
const BATH_03_DRAIN_REF = "LUNA-L06-APT-A-BATH-03-DRAIN-01";
const STACK_CONNECTION_REF = "LUNA-L06-APT-A-DRAIN-01";
const L06_BRANCH_REF = "LUNA-L06-DRAINAGE-BRANCH-01";
const RISER_REF = "LUNA-RISER-DRAINAGE-01";
const B1_MAIN_REF = "LUNA-B1-DRAINAGE-MAIN-01";
const VENT_TERMINATION_REF = "LUNA-ROOF-VENT-TERMINATION-01";
const ROOF_STORM_DRAIN_REF = "LUNA-ROOFTOP-STORM-DRAIN-01";
const STORM_DOWNPIPE_REF = "LUNA-STORM-DOWNPIPE-01";
const SITE_STORM_DISCHARGE_REF = "LUNA-SITE-STORM-DISCHARGE-01";

export const DRAINAGE_STATE_SOURCE_REFS = [
  KITCHEN_DRAIN_REF,
  BATH_01_DRAIN_REF,
  BATH_02_DRAIN_REF,
  BATH_03_DRAIN_REF,
  STACK_CONNECTION_REF,
  L06_BRANCH_REF,
  RISER_REF,
  B1_MAIN_REF,
  VENT_TERMINATION_REF,
  ROOF_STORM_DRAIN_REF,
  STORM_DOWNPIPE_REF,
  SITE_STORM_DISCHARGE_REF,
];

function node(ref: string, label: string, state: DrainageNodeState): DrainageChainNode {
  return { ref, label, state };
}

function stackConnectionState(): DrainageNodeState {
  const condition = (lunaSimulationProvider.getState(STACK_CONNECTION_REF)?.state as { condition?: string })?.condition;
  if (condition === "blocked") return "BLOCKED";
  if (condition === "restricted") return "RESTRICTED";
  return "NORMAL";
}

export function resolveDrainageState(): DrainageOperationalState | null {
  const stack = lunaSimulationProvider.getState(STACK_CONNECTION_REF);
  const branch = lunaSimulationProvider.getState(L06_BRANCH_REF);
  const riser = lunaSimulationProvider.getState(RISER_REF);
  const main = lunaSimulationProvider.getState(B1_MAIN_REF);
  const vent = lunaSimulationProvider.getState(VENT_TERMINATION_REF);
  const roofDrain = lunaSimulationProvider.getState(ROOF_STORM_DRAIN_REF);
  const downpipe = lunaSimulationProvider.getState(STORM_DOWNPIPE_REF);
  const siteDischarge = lunaSimulationProvider.getState(SITE_STORM_DISCHARGE_REF);
  if (!stack || !branch || !riser || !main || !vent || !roofDrain || !downpipe || !siteDischarge) return null;

  const stackState = stackConnectionState();

  return {
    wastewaterFixtures: [
      node(KITCHEN_DRAIN_REF, "Kitchen Drain", "NORMAL"),
      node(BATH_01_DRAIN_REF, "Primary Bathroom Drain", "NORMAL"),
      node(BATH_02_DRAIN_REF, "Bathroom 2 Drain", "NORMAL"),
      node(BATH_03_DRAIN_REF, "Bathroom 3 Drain", "NORMAL"),
    ],
    wastewaterBackbone: [
      node(STACK_CONNECTION_REF, "Wet-Area Stack Connection", stackState),
      node(L06_BRANCH_REF, "Level 6 Drainage Connection Point", "NORMAL"),
      node(RISER_REF, "Drainage Stack (Riser)", "NORMAL"),
      node(B1_MAIN_REF, "Main Drainage / Municipal Discharge (Reference)", "NORMAL"),
    ],
    ventChain: [
      node(RISER_REF, "Drainage Stack (shared single-stack vent)", "NORMAL"),
      node(VENT_TERMINATION_REF, "Vent Stack Roof Termination", "DESIGN_REFERENCE"),
    ],
    stormwaterChain: [
      node(ROOF_STORM_DRAIN_REF, "Roof Drain / Stormwater Collection", "DESIGN_REFERENCE"),
      node(STORM_DOWNPIPE_REF, "Stormwater Downpipe", "DESIGN_REFERENCE"),
      node(SITE_STORM_DISCHARGE_REF, "Site Stormwater Collection / Discharge Reference", "DESIGN_REFERENCE"),
    ],
    finalDischargeDesignRequired: true,
    quality: "simulated",
  };
}

/** Live drainage state for React consumers (Control Board summary,
 * contextual cards) — re-renders on every runtime store change, the same
 * broad subscription shape every other useXState() hook already uses. */
export function useDrainageState(): DrainageOperationalState | null {
  const [state, setState] = useState(() => resolveDrainageState());
  useEffect(() => {
    setState(resolveDrainageState());
    return lunaSimulationProvider.subscribe(() => setState(resolveDrainageState()));
  }, []);
  return state;
}
