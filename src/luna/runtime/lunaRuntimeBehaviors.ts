// Luna Simulation Provider — behavior kinds (Phase 5).
//
// A "behavior" is a small, reusable command handler + status rule shared
// by every asset of that operational shape (every light behaves like
// every other light, every pump like every other pump) — not a per-asset
// special case. Command *availability* is still gated per-asset against
// its real backend capabilities[] (see lunaRuntimeSeed.ts), so an asset
// only ever offers a command its behavior AND its real capabilities both
// support.

import type { CommandName, OperationalStatus } from "../../engine/twinRuntime";

export interface BehaviorResult {
  state: Record<string, unknown>;
  message: string;
}

export interface Behavior {
  /** Every command this behavior knows how to perform — intersected with
   * an asset's real capabilities-derived command list to produce what the
   * UI actually offers. */
  commands: CommandName[];
  apply(state: Record<string, unknown>, command: CommandName, args: Record<string, unknown> | undefined): BehaviorResult;
  computeStatus(state: Record<string, unknown>): OperationalStatus;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** on/off with an optional fault field — booster pumps, the fire pump, the
 * generator, the inverter, common-area HVAC plant. */
export function toggleBehavior(onField: string, opts: { faultAware?: boolean } = {}): Behavior {
  return {
    commands: ["turnOn", "turnOff"],
    apply(state, command) {
      if (command === "turnOn") {
        if (opts.faultAware && state.fault) {
          return { state, message: "Cannot start — fault active. Resolve via Normal Operations reset." };
        }
        return { state: { ...state, [onField]: true }, message: "Turned on" };
      }
      if (command === "turnOff") {
        return { state: { ...state, [onField]: false }, message: "Turned off" };
      }
      return { state, message: "Unsupported command" };
    },
    computeStatus(state) {
      if (opts.faultAware && state.fault) return "critical";
      return state[onField] ? "active" : "normal";
    },
  };
}

export const lightBehavior = toggleBehavior("on");
export const inverterBehavior = toggleBehavior("on");
export const generatorBehavior: Behavior = {
  commands: ["turnOn", "turnOff", "setMode"],
  apply(state, command, args) {
    if (command === "setMode") {
      const mode = args?.mode === "manual" ? "manual" : "auto";
      return { state: { ...state, mode }, message: `Mode set to ${mode}` };
    }
    // faultAware is additive and safe for LUNA-ROOFTOP-HVAC-PLANT-01 (the
    // only other generatorBehavior consumer) — it never sets state.fault,
    // so the guard is always falsy there and its turnOn/turnOff is
    // unchanged. For GEN-01 this blocks a manual start while faulted,
    // matching the pumpBehavior() precedent exactly.
    return toggleBehavior("running", { faultAware: true }).apply(state, command, args);
  },
  computeStatus(state) {
    if (state.fault) return "critical";
    if (state.running) return "active";
    if (typeof state.fuel_level_pct === "number" && state.fuel_level_pct < 15) return "warning";
    return "normal";
  },
};

/** Booster/fire pumps — on/off plus a fault flag that only the scenario
 * engine can set (no user-facing resetFault: real backend capabilities
 * for these are power.on/power.off only). */
export function pumpBehavior(): Behavior {
  const base = toggleBehavior("running", { faultAware: true });
  return {
    commands: base.commands,
    apply(state, command, args) {
      const result = base.apply(state, command, args);
      if (command === "turnOn" && result.state.running) {
        return { state: { ...result.state, pressure_bar: 3.2 }, message: "Started — pressure normalizing" };
      }
      if (command === "turnOff") {
        return { state: { ...result.state, pressure_bar: 0 }, message: result.message };
      }
      return result;
    },
    computeStatus: base.computeStatus,
  };
}

export const atsBehavior: Behavior = {
  commands: ["setMode"],
  apply(state, command, args) {
    if (command === "setMode") {
      const source = args?.mode === "generator" ? "generator" : "grid";
      return { state: { ...state, source }, message: `Source set to ${source}` };
    }
    return { state, message: "Unsupported command" };
  },
  computeStatus(state) {
    if (state.fault) return "critical";
    return state.source === "generator" ? "warning" : "normal";
  },
};

// HVAC System V1 — fault-aware, the same faultAware guard toggleBehavior
// already gives the generator/pumps/ATS: a unit cannot be started while
// faulted (Part 2's "Cannot start" convention), and only the scenario
// engine ever sets state.fault (no user-facing resetFault, matching the
// pumpBehavior()/generatorBehavior() precedent exactly). Purely additive:
// an asset whose seed never sets fault behaves exactly as before.
export const climateBehavior: Behavior = {
  commands: ["turnOn", "turnOff", "setTemperature", "setMode"],
  apply(state, command, args) {
    if (command === "setTemperature") {
      const raw = Number(args?.temperature);
      if (Number.isNaN(raw)) return { state, message: "Invalid temperature" };
      const target_temp_c = clamp(raw, 16, 30);
      return { state: { ...state, target_temp_c }, message: `Target set to ${target_temp_c}°C` };
    }
    if (command === "setMode") {
      const mode = ["cool", "heat", "fan", "auto"].includes(String(args?.mode)) ? String(args?.mode) : "cool";
      return { state: { ...state, mode }, message: `Mode set to ${mode}` };
    }
    return toggleBehavior("on", { faultAware: true }).apply(state, command, args);
  },
  computeStatus(state) {
    if (state.fault) return "critical";
    return state.on ? "active" : "normal";
  },
};

export const curtainBehavior: Behavior = {
  commands: ["open", "close", "setPosition"],
  apply(state, command, args) {
    if (command === "open") return { state: { ...state, position: 100 }, message: "Opening" };
    if (command === "close") return { state: { ...state, position: 0 }, message: "Closing" };
    if (command === "setPosition") {
      const raw = Number(args?.position);
      if (Number.isNaN(raw)) return { state, message: "Invalid position" };
      return { state: { ...state, position: clamp(raw, 0, 100) }, message: `Position set to ${clamp(raw, 0, 100)}%` };
    }
    return { state, message: "Unsupported command" };
  },
  computeStatus(state) {
    return (state.position as number) > 0 ? "active" : "normal";
  },
};

export const lockBehavior: Behavior = {
  commands: ["lock", "unlock"],
  apply(state, command) {
    if (command === "lock") return { state: { ...state, locked: true }, message: "Locked" };
    if (command === "unlock") return { state: { ...state, locked: false }, message: "Unlocked" };
    return { state, message: "Unsupported command" };
  },
  computeStatus(state) {
    return state.locked ? "normal" : "active";
  },
};

/** Water isolation valves — the building main and the apartment shutoff. */
export const valveBehavior: Behavior = {
  commands: ["open", "close"],
  apply(state, command) {
    if (command === "open") return { state: { ...state, open: true }, message: "Opened" };
    if (command === "close") return { state: { ...state, open: false }, message: "Closed" };
    return { state, message: "Unsupported command" };
  },
  computeStatus(state) {
    return state.open ? "active" : "normal";
  },
};

/** Elevators — setPosition (mapped from the backend's select_floor
 * capability) takes args.floor as a level ref already known to
 * lunaProgramme.ts (never an invented location). Direction/door timing is
 * driven by the provider itself (see lunaSimulationProvider.ts), not this
 * pure function — apply() here only sets the *intent*. */
export const elevatorBehavior: Behavior = {
  commands: ["setPosition"],
  apply(state, command, args) {
    if (command === "setPosition" && typeof args?.floor === "string") {
      if (state.fault) return { state, message: "Cannot move — fault active." };
      if (state.floor === args.floor) return { state, message: "Already at that floor" };
      return { state: { ...state, floor: args.floor, direction: "moving" }, message: `Moving to ${args.floor}` };
    }
    return { state, message: "Unsupported command" };
  },
  computeStatus(state) {
    if (state.fault) return "critical";
    return state.direction !== "idle" ? "active" : "normal";
  },
};

/** No commands at all — sensors, meters, cameras, access points, the edge
 * node, and context-only assets (Grid, MDB, fire water tank). Status is
 * derived per asset kind by the caller (see lunaRuntimeSeed.ts), since
 * "no commands" covers several very different status rules. */
export function readOnlyBehavior(computeStatus: (state: Record<string, unknown>) => OperationalStatus): Behavior {
  return {
    commands: [],
    apply(state) {
      return { state, message: "This asset does not accept commands." };
    },
    computeStatus,
  };
}
