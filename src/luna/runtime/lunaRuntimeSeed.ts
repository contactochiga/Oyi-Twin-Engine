// Luna Simulation Provider — seed table (Phase 5).
//
// One row per operational asset: which behavior it uses (see
// lunaRuntimeBehaviors.ts) and its initial simulated state. Where Phase 4's
// backend-sourced seededState already exists (the 20 building-wide
// devices with a real device_states row), that exact value is reused
// verbatim — this table only *adds* runtime state for the 30 assets Phase
// 4 correctly left as seededState: null (the 19 apartment devices, 4
// cameras, 3 access points, edge node — none of which have a
// device_states/equivalent row in the backend). Those additions are
// disclosed as simulation-layer defaults, not implied to be real seeded
// backend values.
//
// availableCommands is never hand-typed here: it is always the asset's
// real capabilities[] (from lunaOperationalAssets.ts, i.e. the actual
// backend devices.capabilities column) mapped through CAPABILITY_TO_COMMAND
// and intersected with what the chosen behavior actually implements. An
// asset can only ever offer a command if BOTH its real backend
// capabilities and its runtime behavior agree it supports that command.

import type { CommandName } from "../../engine/twinRuntime";
import type { Behavior } from "./lunaRuntimeBehaviors";
import {
  lightBehavior,
  inverterBehavior,
  generatorBehavior,
  pumpBehavior,
  atsBehavior,
  climateBehavior,
  curtainBehavior,
  lockBehavior,
  valveBehavior,
  elevatorBehavior,
  readOnlyBehavior,
} from "./lunaRuntimeBehaviors";
import { LUNA_OPERATIONAL_ASSETS } from "../operational/lunaOperationalAssets";
import type { OperationalStatus } from "../../engine/twinRuntime";

// Real backend capability strings -> the small conceptual verb vocabulary.
// Anything not listed here (stream.start/stop, door_release, call,
// fire_service_mode, silence) is deliberately not mapped — either it has
// no non-fake way to represent (camera streams) or it's outside Phase 5's
// required interactive scope (fire panel silence/reset, intercom release).
const CAPABILITY_TO_COMMAND: Record<string, CommandName> = {
  "power.on": "turnOn",
  "power.off": "turnOff",
  lock: "lock",
  unlock: "unlock",
  open: "open",
  close: "close",
  set_position: "setPosition",
  set_temperature: "setTemperature",
  set_mode: "setMode",
  set_source: "setMode",
  select_floor: "setPosition",
};

export interface RuntimeSeedRow {
  ref: string;
  behavior: Behavior;
  initialState: Record<string, unknown>;
  /** Only set for assets whose status doesn't come from their own
   * behavior's computeStatus — context-only assets (Grid, MDB, fire water
   * tank) that carry no real state fields to derive a status from. */
  staticStatus?: OperationalStatus;
}

function readOnlySensorRow(ref: string, initialState: Record<string, unknown>, statusField: string): RuntimeSeedRow {
  return {
    ref,
    behavior: readOnlyBehavior((state) => (state[statusField] ? "critical" : "normal")),
    initialState,
  };
}

const ROWS: RuntimeSeedRow[] = [
  // ---- Electrical ----
  // Electrical System V1 — utility_available is the source-loss trigger
  // recomputePowerNetwork() watches (see lunaSimulationProvider.ts),
  // mirroring the water intake's supply_active field exactly.
  { ref: "LUNA-B1-ELECTRICAL-GRID-01", behavior: readOnlyBehavior((s) => (s.utility_available === false ? "critical" : "normal")), initialState: { utility_available: true } },
  // MDB-01 upgraded this phase from static/context-only to real derived
  // energization telemetry — reference/simulated voltage and load, not a
  // measured value (DD08 unresolved).
  // frequency_hz/current_a added V1.1 — reference/simulated nominal values
  // matching what recomputePowerNetwork() itself would produce for the
  // default all-utility-available state (the seed IS the pre-computed
  // baseline; no automatic recompute runs at module load).
  { ref: "LUNA-B1-ELECTRICAL-MDB-01", behavior: readOnlyBehavior((s) => (s.energized === false ? "critical" : "normal")), initialState: { energized: true, voltage_v: 415, frequency_hz: 50, load_pct: 42, current_a: 118 } },
  // phase/fault are new fields recomputePowerNetwork()/sequenceGeneratorPhase()
  // manage directly (not through generatorBehavior, which stays untouched
  // since LUNA-ROOFTOP-HVAC-PLANT-01 also reuses it — see that row below).
  { ref: "LUNA-B1-ELECTRICAL-GEN-01", behavior: generatorBehavior, initialState: { running: false, phase: "stopped", fault: false, fuel_level_pct: 82, mode: "auto" } },
  // transitioning added V1.1 — the ATS's brief break-before-make changeover
  // window, managed by sequenceAtsTransfer() in lunaSimulationProvider.ts.
  { ref: "LUNA-B1-ELECTRICAL-ATS-01", behavior: atsBehavior, initialState: { source: "grid", auto_mode: true, fault: false, transitioning: false } },
  { ref: "LUNA-B1-ELECTRICAL-INV-01", behavior: inverterBehavior, initialState: { on: true, battery_pct: 76, load_pct: 32 } },
  { ref: "LUNA-B1-ELECTRICAL-METER-01", behavior: readOnlyBehavior(() => "normal"), initialState: { reading_kwh: 18420 } },

  // ---- Water ----
  { ref: "LUNA-B1-WATER-TANK-01", behavior: readOnlyBehavior(() => "normal"), initialState: { level_pct: 68 } },
  { ref: "LUNA-B1-WATER-TREAT-01", behavior: readOnlyBehavior((s) => (s.fault ? "critical" : "normal")), initialState: { running: true, fault: false } },
  { ref: "LUNA-B1-WATER-BP-01", behavior: pumpBehavior(), initialState: { running: true, pressure_bar: 3.2, fault: false } },
  { ref: "LUNA-B1-WATER-BP-02", behavior: pumpBehavior(), initialState: { running: false, pressure_bar: 0, fault: false } },
  { ref: "LUNA-B1-WATER-METER-01", behavior: readOnlyBehavior(() => "normal"), initialState: { reading_m3: 9840 } },
  { ref: "LUNA-B1-WATER-VALVE-01", behavior: valveBehavior, initialState: { open: true } },
  // Domestic Water Reference System V1 — new incoming-supply demarcation
  // (EQ-WATER-INTAKE, previously unregistered). Observable only, matching
  // the tank/treatment pattern: no commands, a simple presence flag.
  { ref: "LUNA-B1-WATER-INTAKE-01", behavior: readOnlyBehavior((s) => (s.supply_active === false ? "critical" : "normal")), initialState: { supply_active: true } },

  // ---- Fire ----
  // active_zone_ref is new (Fire V1) — derived by recomputeFireNetwork(),
  // never manually set: the specific detector ref currently in alarm, or
  // null. trouble is left independently settable by a fault scenario, not
  // derived from the alarm cascade (a real panel fault and an alarm are
  // distinct conditions).
  { ref: "LUNA-B1-FIRE-PANEL-01", behavior: readOnlyBehavior((s) => (s.alarm_active ? "critical" : s.trouble ? "warning" : "normal")), initialState: { alarm_active: false, trouble: false, zones_ok: true, active_zone_ref: null } },
  { ref: "LUNA-B1-FIRE-PUMP-01", behavior: pumpBehavior(), initialState: { running: false, pressure_bar: 0, fault: false } },
  { ref: "LUNA-B1-FIRE-TANK-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
  { ref: "LUNA-GROUND-FIRE-DET-01", behavior: readOnlyBehavior((s) => (s.alarm ? "critical" : "normal")), initialState: { alarm: false } },

  // ---- HVAC ----
  { ref: "LUNA-ROOFTOP-HVAC-PLANT-01", behavior: generatorBehavior, initialState: { running: true, mode: "auto", fuel_level_pct: 100 } },

  // ---- Elevators ----
  { ref: "LUNA-LIFT-PASS-01", behavior: elevatorBehavior, initialState: { floor: "LUNA-GROUND", direction: "idle", door: "closed", fault: false } },
  { ref: "LUNA-LIFT-PASS-02", behavior: elevatorBehavior, initialState: { floor: "LUNA-GROUND", direction: "idle", door: "closed", fault: false } },
  { ref: "LUNA-LIFT-PASS-03", behavior: elevatorBehavior, initialState: { floor: "LUNA-GROUND", direction: "idle", door: "closed", fault: false } },
  { ref: "LUNA-LIFT-SERVICE-01", behavior: elevatorBehavior, initialState: { floor: "LUNA-GROUND", direction: "idle", door: "closed", fault: false } },

  // ---- Security / Access / Network-Edge — simulation-layer defaults
  // (Phase 4 correctly left these seededState: null; no backend
  // device_states/equivalent row exists for them) ----
  { ref: "LUNA-GROUND-SEC-CAM-01", behavior: readOnlyBehavior((s) => (s.online === false ? "offline" : "normal")), initialState: { online: true } },
  { ref: "LUNA-GROUND-LOBBY-CAM-01", behavior: readOnlyBehavior((s) => (s.online === false ? "offline" : "normal")), initialState: { online: true } },
  { ref: "LUNA-B1-PARKING-CAM-01", behavior: readOnlyBehavior((s) => (s.online === false ? "offline" : "normal")), initialState: { online: true } },
  { ref: "LUNA-L06-COMMON-CAM-01", behavior: readOnlyBehavior((s) => (s.online === false ? "offline" : "normal")), initialState: { online: true } },
  { ref: "LUNA-GROUND-ACCESS-MAIN-01", behavior: readOnlyBehavior(() => "normal"), initialState: { online: true } },
  { ref: "LUNA-B1-ACCESS-SERVICE-01", behavior: readOnlyBehavior(() => "normal"), initialState: { online: true } },
  { ref: "LUNA-GROUND-ACCESS-LIFT-LOBBY-01", behavior: readOnlyBehavior(() => "normal"), initialState: { online: true } },
  { ref: "LUNA-B1-NET-GATEWAY-01", behavior: readOnlyBehavior((s) => (s.uplink_up === false ? "critical" : "normal")), initialState: { uplink_up: true } },
  { ref: "LUNA-GROUND-NET-WIFI-AP-01", behavior: readOnlyBehavior(() => "normal"), initialState: { clients_connected: 14 } },
  { ref: "LUNA-EDGE-CORE-01", behavior: readOnlyBehavior((s) => (s.online === false ? "offline" : "normal")), initialState: { online: true, uplink_up: true } },

  // ---- Apartment 6A — the representative Consumer-capable scope ----
  { ref: "LUNA-L06-APT-A-ENTRY-LOCK-01", behavior: lockBehavior, initialState: { locked: true } },
  { ref: "LUNA-L06-APT-A-ENTRY-INTERCOM-01", behavior: readOnlyBehavior(() => "normal"), initialState: { online: true } },
  { ref: "LUNA-L06-APT-A-LIVING-LIGHT-01", behavior: lightBehavior, initialState: { on: false } },
  { ref: "LUNA-L06-APT-A-LIVING-LIGHT-02", behavior: lightBehavior, initialState: { on: false } },
  { ref: "LUNA-L06-APT-A-KITCHEN-LIGHT-01", behavior: lightBehavior, initialState: { on: false } },
  { ref: "LUNA-L06-APT-A-BED-01-LIGHT-01", behavior: lightBehavior, initialState: { on: false } },
  { ref: "LUNA-L06-APT-A-BED-02-LIGHT-01", behavior: lightBehavior, initialState: { on: false } },
  { ref: "LUNA-L06-APT-A-BED-03-LIGHT-01", behavior: lightBehavior, initialState: { on: false } },
  { ref: "LUNA-L06-APT-A-LIVING-CURTAIN-01", behavior: curtainBehavior, initialState: { position: 100 } },
  { ref: "LUNA-L06-APT-A-BED-01-CURTAIN-01", behavior: curtainBehavior, initialState: { position: 100 } },
  // HVAC System V1 — room_temp_c is this unit's OWN simulated thermal
  // reading (recomputeHvacNetwork() in lunaSimulationProvider.ts), driven
  // toward target_temp_c when on/healthy and toward the reference ambient
  // baseline otherwise. LIVING-AC-01's own room_temp_c is mirrored onto
  // the real registered LIVING-TH-01 sensor (same physical room); BED-01-
  // AC-01 has no separate registered sensor, so its room_temp_c is the
  // only simulated reading for that zone — disclosed, not a fabricated
  // sensor asset.
  { ref: "LUNA-L06-APT-A-LIVING-AC-01", behavior: climateBehavior, initialState: { on: false, target_temp_c: 24, mode: "cool", fault: false, room_temp_c: 24.6 } },
  { ref: "LUNA-L06-APT-A-BED-01-AC-01", behavior: climateBehavior, initialState: { on: false, target_temp_c: 24, mode: "cool", fault: false, room_temp_c: 25.4 } },
  { ref: "LUNA-L06-APT-A-LIVING-TH-01", behavior: readOnlyBehavior(() => "normal"), initialState: { temp_c: 24.6, humidity_pct: 52 } },
  // HVAC System V1 — the outdoor condenser has no independent runtime
  // capabilities (classification "asset-only" in lunaMepBackbone.ts — the
  // brief's own "do not give the outdoor unit arbitrary start/stop
  // controls" instruction), so `demand` is the one derived, read-only
  // field: true whenever EITHER connected indoor unit is actually cooling
  // (recomputeHvacNetwork() sets it from the two indoor units' own
  // on/fault state — never a second, independently-invented notion of
  // "is the condenser running").
  { ref: "LUNA-L06-APT-A-AC-OUTDOOR-01", behavior: readOnlyBehavior((s) => (s.demand ? "active" : "normal")), initialState: { demand: false } },
  { ref: "LUNA-L06-APT-A-LIVING-OCC-01", behavior: readOnlyBehavior((s) => (s.occupied ? "active" : "normal")), initialState: { occupied: false } },
  readOnlySensorRow("LUNA-L06-APT-A-ENTRY-SMOKE-01", { smoke: false }, "smoke"),
  readOnlySensorRow("LUNA-L06-APT-A-KITCHEN-LEAK-01", { leak: false }, "leak"),
  { ref: "LUNA-L06-APT-A-UTILITY-VALVE-01", behavior: valveBehavior, initialState: { open: true } },
  // gained supply_active this phase, mirroring METER-WATER-01 exactly.
  { ref: "LUNA-L06-APT-A-METER-ELEC-01", behavior: readOnlyBehavior((s) => (s.supply_active === false ? "warning" : "normal")), initialState: { reading_kwh: 1240.5, supply_active: true } },
  // 6A DB stays asset-only (EQ-DB) but gains a minimal energized flag so
  // the control board/geometry can show it de-energizing downstream of a
  // utility+generator loss, without upgrading its schedule classification.
  { ref: "LUNA-L06-APT-A-DB-01", behavior: readOnlyBehavior((s) => (s.energized === false ? "warning" : "normal")), initialState: { energized: true } },
  // Domestic Water Reference System V1 — supply_active is a NEW derived
  // field alongside the existing reading_m3, recomputed by
  // recomputeWaterNetwork() from upstream riser pressure AND this
  // apartment's own isolation valve — the isolation-valve effect the
  // simulation must demonstrate.
  { ref: "LUNA-L06-APT-A-METER-WATER-01", behavior: readOnlyBehavior((s) => (s.supply_active === false ? "warning" : "normal")), initialState: { reading_m3: 85.2, supply_active: true } },

  // ---- Phase 10 — MEP engineering backbone (risers, floor branches,
  // Apartment 6A terminations). All asset-only/observable context
  // objects — no live device behind them to seed a real state from, so
  // these carry a static "normal" status like the other context-only
  // rows above (Grid, MDB, Fire Water Tank). ----
  { ref: "LUNA-B1-DRAINAGE-MAIN-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
  // upgraded this phase from static/context-only to real derived telemetry
  // (matches LUNA-RISER-WATER-01's own upgrade exactly).
  { ref: "LUNA-RISER-ELECTRICAL-01", behavior: readOnlyBehavior((s) => (s.energized === false ? "warning" : "normal")), initialState: { energized: true } },
  // Domestic Water Reference System V1 — upgraded from a static context-only
  // row to real derived telemetry (pressure_bar/flow_status), recomputed by
  // recomputeWaterNetwork() in lunaSimulationProvider.ts whenever a booster
  // pump or isolation valve command/scenario changes upstream state. Initial
  // values match the seed's own duty pump (BP-01 running, 3.2 bar) and open
  // header valve, so a fresh load and a post-command recompute agree.
  { ref: "LUNA-RISER-WATER-01", behavior: readOnlyBehavior((s) => (s.flow_status === "no_flow" ? "warning" : "normal")), initialState: { pressure_bar: 3.2, flow_status: "flowing" } },
  { ref: "LUNA-RISER-DRAINAGE-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
  // upgraded this phase from static/context-only to real derived hydraulic
  // telemetry, tracking the registered fire pump directly — no jockey
  // pump/elevated-tank standing-pressure asset is registered, so at rest
  // (pump off) the riser reads not-pressurized rather than fabricating a
  // standing-pressure source that isn't modeled (DD11 unresolved).
  { ref: "LUNA-RISER-FIRE-01", behavior: readOnlyBehavior((s) => (s.pressurized === false ? "warning" : "normal")), initialState: { pressurized: false, pressure_bar: 0 } },
  { ref: "LUNA-RISER-NETWORK-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
  { ref: "LUNA-L06-ELECTRICAL-BRANCH-01", behavior: readOnlyBehavior((s) => (s.energized === false ? "warning" : "normal")), initialState: { energized: true } },
  // Domestic Water Reference System V1 — mirrors the riser's derived
  // telemetry (no per-floor restriction modeled, same reference
  // simplification the riser/branch pair already uses elsewhere).
  { ref: "LUNA-L06-WATER-BRANCH-01", behavior: readOnlyBehavior((s) => (s.flow_status === "no_flow" ? "warning" : "normal")), initialState: { pressure_bar: 3.2, flow_status: "flowing" } },
  { ref: "LUNA-L06-DRAINAGE-BRANCH-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
  { ref: "LUNA-L06-FIRE-BRANCH-01", behavior: readOnlyBehavior((s) => (s.pressurized === false ? "warning" : "normal")), initialState: { pressurized: false, pressure_bar: 0 } },
  { ref: "LUNA-L06-NETWORK-BRANCH-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
  { ref: "LUNA-L06-APT-A-NET-ONT-01", behavior: readOnlyBehavior((s) => (s.uplink_up === false ? "critical" : "normal")), initialState: { uplink_up: true } },
  // Network/Edge & Physical Connectivity V1 — this asset already existed
  // (Phase 10) with its own seededState declaring uplink_up:true, but had
  // no corresponding runtime row at all (a real, confirmed pre-existing
  // gap — lunaSimulationProvider's store simply had no entry for it).
  // Completing the wiring with the exact value already declared, not
  // inventing new data.
  { ref: "LUNA-L06-APT-A-ROUTER-01", behavior: readOnlyBehavior((s) => (s.uplink_up === false ? "critical" : "normal")), initialState: { uplink_up: true } },
  // Drainage V1 — upgraded from a static/context-only row to real derived
  // telemetry, the same "give the phase's one demonstrable asset a real
  // condition field" move every prior phase's riser/branch upgrade already
  // made (see LUNA-RISER-WATER-01/FIRE-01 above). `condition` is the
  // apartment's own wet-area stack connection state, driven by the new
  // reference blockage scenario — never claimed as real sensor data (see
  // lunaDrainageResolver.ts's explicit "reference simulation" labeling).
  { ref: "LUNA-L06-APT-A-DRAIN-01", behavior: readOnlyBehavior((s) => (s.condition === "blocked" ? "critical" : s.condition === "restricted" ? "warning" : "normal")), initialState: { condition: "clear" } },
  // Drainage V1 — these four fixture-level drain points already existed
  // (Phase 10/Domestic Water Reference System V1) as real canonical assets
  // with parentRef chains, but — like LUNA-L06-APT-A-ROUTER-01 before the
  // Network/Edge phase fixed it — had no corresponding runtime row at all.
  // Completing the wiring with the same static "normal" treatment their own
  // upstream stack connection used before this phase's upgrade above.
  { ref: "LUNA-L06-APT-A-KITCHEN-DRAIN-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
  { ref: "LUNA-L06-APT-A-BATH-01-DRAIN-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
  { ref: "LUNA-L06-APT-A-BATH-02-DRAIN-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
  { ref: "LUNA-L06-APT-A-BATH-03-DRAIN-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
  // Drainage V1 — vent (single-stack; see lunaMepBackbone.ts) and
  // stormwater reference chain. All asset-only context objects with no
  // live device behind them, same static "normal" treatment as every
  // other context-only riser/branch/discharge row in this file.
  { ref: "LUNA-ROOF-VENT-TERMINATION-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
  { ref: "LUNA-ROOFTOP-STORM-DRAIN-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
  { ref: "LUNA-STORM-DOWNPIPE-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
  { ref: "LUNA-SITE-STORM-DISCHARGE-01", behavior: readOnlyBehavior(() => "normal"), initialState: {}, staticStatus: "normal" },
];

export const RUNTIME_SEED_ROWS: RuntimeSeedRow[] = ROWS;

const CAPABILITIES_BY_REF = new Map(LUNA_OPERATIONAL_ASSETS.map((a) => [a.ref, a.capabilities]));

/** The command list actually offered for a given row: real backend
 * capabilities, mapped to the conceptual vocabulary, intersected with
 * what the assigned behavior implements — never the behavior's full list
 * on its own (that would offer a command the real device was never
 * declared capable of). */
export function availableCommandsFor(row: RuntimeSeedRow): CommandName[] {
  const capabilities = CAPABILITIES_BY_REF.get(row.ref) ?? [];
  const fromCapabilities = new Set(capabilities.map((c) => CAPABILITY_TO_COMMAND[c]).filter((c): c is CommandName => Boolean(c)));
  return row.behavior.commands.filter((c) => fromCapabilities.has(c));
}
