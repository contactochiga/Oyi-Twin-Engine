// Luna Simulation Provider — scenario presets (Phase 5).
//
// A scenario is a small, deterministic batch of state changes applied
// through the exact same setAssetState() choke point every command uses
// (see lunaRuntimeInternals in lunaSimulationProvider.ts) — never a
// separate "fake" code path. Every scenario is fully resettable via
// "Normal Operations", which simply rebuilds the store from the seed
// table (lunaRuntimeSeed.ts).

import type { OperationalStatus } from "../../engine/twinRuntime";
import { lunaRuntimeInternals } from "./lunaSimulationProvider";

function patch(ref: string, statePatch: Record<string, unknown>, statusOverride?: OperationalStatus) {
  const current = lunaRuntimeInternals.getState(ref);
  if (!current) return;
  lunaRuntimeInternals.setAssetState(ref, { ...current.state, ...statePatch }, statusOverride);
}

export interface Scenario {
  key: string;
  label: string;
  description: string;
  apply: () => void;
}

export const LUNA_SCENARIOS: Scenario[] = [
  {
    key: "normal",
    label: "Normal Operations",
    description: "Resets every asset to its accepted Phase 4/5 baseline.",
    apply: () => lunaRuntimeInternals.resetAll(),
  },
  {
    key: "grid-failure",
    label: "Grid Failure",
    description: "Incoming utility supply is lost — the ATS auto-transfers to the standby generator once it reaches RUNNING, and downstream distribution re-energizes from the generator.",
    apply: () => {
      // Electrical System V1 — this now drives the real deterministic
      // propagation (recomputePowerNetwork() in lunaSimulationProvider.ts)
      // instead of hand-setting downstream state: flipping utility_available
      // is the one real trigger; ATS auto-transfer, generator STARTING->
      // RUNNING sequencing, and MDB/riser/branch/6A energization all follow
      // from that exactly as a real utility loss would, matching the
      // water scenarios' own pattern of a single real trigger + recompute.
      patch("LUNA-B1-ELECTRICAL-GRID-01", { utility_available: false }, "critical");
      lunaRuntimeInternals.recomputePowerNetwork();
    },
  },
  {
    key: "water-pressure-fault",
    label: "Water Pressure Fault",
    description: "Booster Pump 01 loses pressure and faults; the main tank level reads low.",
    apply: () => {
      patch("LUNA-B1-WATER-BP-01", { pressure_bar: 0, fault: true });
      patch("LUNA-B1-WATER-TANK-01", { level_pct: 24 });
      lunaRuntimeInternals.recomputeWaterNetwork();
    },
  },
  {
    key: "pump-failure",
    label: "Pump Failure",
    description: "The duty booster pump (01) fails; the standby pump (02) automatically takes over.",
    apply: () => {
      patch("LUNA-B1-WATER-BP-01", { running: false, pressure_bar: 0, fault: true });
      patch("LUNA-B1-WATER-BP-02", { running: true, pressure_bar: 3.1, fault: false });
      lunaRuntimeInternals.recomputeWaterNetwork();
    },
  },
  {
    key: "camera-offline",
    label: "Camera Offline",
    description: "The ground entrance camera drops offline (state only — no fake stream).",
    apply: () => {
      patch("LUNA-GROUND-SEC-CAM-01", { online: false });
    },
  },
  {
    key: "network-uplink-lost",
    label: "Network Uplink Lost",
    description: "The core network gateway loses uplink; the real, pre-existing physical chain downstream of it (data riser, floor branch, Apartment 6A's ONT/router, the common Wi-Fi AP) cascades to unreachable — the gateway's own real state, not a fabricated network-wide outage.",
    apply: () => {
      patch("LUNA-B1-NET-GATEWAY-01", { uplink_up: false }, "critical");
      lunaRuntimeInternals.recomputeNetworkState();
    },
  },
  {
    key: "apartment-leak",
    label: "Apartment Leak",
    description: "Apartment 6A's kitchen leak sensor triggers; the apartment water valve auto-closes.",
    apply: () => {
      patch("LUNA-L06-APT-A-KITCHEN-LEAK-01", { leak: true }, "critical");
      patch("LUNA-L06-APT-A-UTILITY-VALVE-01", { open: false });
      lunaRuntimeInternals.recomputeWaterNetwork();
    },
  },
  {
    key: "smoke-alert",
    label: "Smoke Alert",
    description: "Apartment 6A's entry smoke detector triggers; the building fire panel raises an alarm.",
    apply: () => {
      // Fire System V1 — the one real trigger (the detector itself) now
      // drives the real deterministic propagation (recomputeFireNetwork()
      // in lunaSimulationProvider.ts) instead of hand-setting the panel's
      // alarm_active separately — matching the exact pattern Water/
      // Electrical's own scenarios already established.
      patch("LUNA-L06-APT-A-ENTRY-SMOKE-01", { smoke: true }, "critical");
      lunaRuntimeInternals.recomputeFireNetwork();
    },
  },
  {
    key: "hvac-fault",
    label: "HVAC Fault",
    description: "Apartment 6A's Living Room AC develops a fault; cooling stops and the room drifts back toward ambient.",
    apply: () => {
      // HVAC System V1 — the one real trigger (the unit's own fault flag,
      // which also trips it off — faultAware/pumpBehavior's own "cannot
      // start while faulted" convention) drives the real deterministic
      // propagation (recomputeHvacNetwork()), matching Water/Electrical/
      // Fire's own scenario pattern exactly.
      patch("LUNA-L06-APT-A-LIVING-AC-01", { on: false, fault: true }, "critical");
      lunaRuntimeInternals.recomputeHvacNetwork();
    },
  },
  {
    key: "elevator-fault",
    label: "Elevator Fault",
    description: "Passenger Elevator 01 faults, stopped with its doors held open.",
    apply: () => {
      // v2 dynamic-lift schema (four-lift generalization) — faultState/
      // doorState/motionState are the fields advanceLift/requestLift and
      // every lift UI surface actually read; the older fault/door display
      // fields this scenario used to set are dead since Lift 01 moved off
      // the static elevatorBehavior state shape.
      patch("LUNA-LIFT-PASS-01", { faultState: "fault", motionState: "IDLE", direction: "idle", speed: 0, doorState: "OPEN", doorProgress: 1 }, "critical");
    },
  },
  {
    key: "drainage-blockage",
    label: "Drainage Blockage",
    description: "Apartment 6A's wet-area stack connection reports a blockage (reference simulation — no real sensor exists on a passive drain).",
    apply: () => {
      // Drainage V1 — a single, deterministic patch on the one asset this
      // phase gave real derived telemetry to. No recompute/cascade call is
      // needed (matching camera-offline's own pattern): unlike the network/
      // power/water resolvers, a fixture-level blockage doesn't propagate
      // upstream through a gravity system the way an energized/pressurized
      // source does, so resolveDrainageState() simply reads this asset's
      // own condition field fresh on every call.
      patch("LUNA-L06-APT-A-DRAIN-01", { condition: "blocked" }, "critical");
    },
  },
];
