import { passengerStopAllowed } from "./lunaPassengerAccess";
import { isLiftRef, LIFT_DEFINITIONS } from "../lift/lunaLift";
import { initialLiftState, advanceLift, requestLift, LIFT_SIMULATION_COMMANDS, type LiftState } from "../lift/liftSimulation";
import { lunaRepresentationPolicy } from "../policy/lunaRepresentationPolicy";
import { lunaTwinDataProvider } from "../operational/lunaTwinDataProvider";
// Luna Simulation Provider (Phase 5) — the "Luna local simulation today"
// half of: Twin UI -> Command/State Contract -> Provider. Implements
// TwinRuntimeProvider entirely in memory; every mutation (a user command,
// a scenario, a simulated sensor event, ambient drift) flows through the
// same setAssetState() choke point, which is what "state changes flow
// through the provider" actually means in code, not just in principle.

import type { TwinRuntimeProvider, RuntimeAssetState, CommandRequest, CommandResult, OperationalStatus } from "../../engine/twinRuntime";
import type { CanonicalRef } from "../../engine/types";
import { RUNTIME_SEED_ROWS, availableCommandsFor, type RuntimeSeedRow } from "./lunaRuntimeSeed";

const ROWS_BY_REF = new Map(RUNTIME_SEED_ROWS.map((r) => [r.ref, r]));

function buildRow(row: RuntimeSeedRow): RuntimeAssetState {
  const dynamicLift = isLiftRef(row.ref);
  return {
    ref: row.ref,
    status: row.staticStatus ?? row.behavior.computeStatus(row.initialState),
    state: dynamicLift ? { ...initialLiftState(), sampledAt: Date.now() } : row.initialState,
    availableCommands: dynamicLift ? LIFT_SIMULATION_COMMANDS : availableCommandsFor(row),
    source: "simulated",
    updatedAt: Date.now(),
  };
}

function buildInitialStore(): Map<string, RuntimeAssetState> {
  return new Map(RUNTIME_SEED_ROWS.map((row) => [row.ref, buildRow(row)]));
}

let store = buildInitialStore();
const listeners = new Set<(states: RuntimeAssetState[]) => void>();

function notify() {
  const snapshot = Array.from(store.values());
  listeners.forEach((l) => l(snapshot));
}

/** The single place any state ever changes. `nextState` is always the
 * FULL resulting state object (behaviors already merge their own patch),
 * never a partial — callers that only have a patch spread it against
 * `store.get(ref)!.state` themselves before calling this. */
function setAssetState(ref: CanonicalRef, nextState: Record<string, unknown>, statusOverride?: OperationalStatus) {
  const current = store.get(ref);
  const row = ROWS_BY_REF.get(ref);
  if (!current || !row) return;
  const dynamicLift = isLiftRef(ref);
  const status = statusOverride ?? (dynamicLift ? (nextState.faultState ? "critical" : nextState.motionState !== "IDLE" ? "active" : "normal") : row.staticStatus ?? row.behavior.computeStatus(nextState));
  store.set(ref, { ...current, state: dynamicLift ? { ...nextState, sampledAt: Date.now() } : nextState, status, updatedAt: Date.now() });
  notify();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Domestic Water Reference System V1 — deterministic downstream
// pressure/flow propagation ----
// Behavioral realism (LUNA_DIGITAL_BUILDING_STANDARD.md §8): starting a
// booster pump must not merely flip text from OFF to ON — the riser/branch
// telemetry downstream of it must respond, and closing an isolation valve
// must cut apartment supply regardless of pump state. This is a small,
// deterministic, conceptual model (max of the running/fault-free pumps'
// own pressure, gated by the two isolation valves in series) — never
// certified hydraulics. Runs through the exact same setAssetState() choke
// point every command/scenario already uses; called explicitly after any
// water-relevant command or scenario patch (see WATER_NETWORK_TRIGGER_REFS
// below and lunaScenarios.ts), never wired into setAssetState() itself, so
// there is no risk of it recursing into unrelated systems.
const WATER_NETWORK_TRIGGER_REFS = new Set(["LUNA-B1-WATER-BP-01", "LUNA-B1-WATER-BP-02", "LUNA-B1-WATER-VALVE-01", "LUNA-L06-APT-A-UTILITY-VALVE-01"]);

function recomputeWaterNetwork() {
  const bp01 = store.get("LUNA-B1-WATER-BP-01");
  const bp02 = store.get("LUNA-B1-WATER-BP-02");
  const headerValve = store.get("LUNA-B1-WATER-VALVE-01");
  const riser = store.get("LUNA-RISER-WATER-01");
  const branch = store.get("LUNA-L06-WATER-BRANCH-01");
  const aptValve = store.get("LUNA-L06-APT-A-UTILITY-VALVE-01");
  const aptMeter = store.get("LUNA-L06-APT-A-METER-WATER-01");
  if (!bp01 || !bp02 || !headerValve || !riser || !branch || !aptValve || !aptMeter) return;

  const pumpPressure = (row: RuntimeAssetState) => {
    const s = row.state as { running?: boolean; fault?: boolean; pressure_bar?: number };
    return s.running && !s.fault ? Number(s.pressure_bar) || 0 : 0;
  };
  const headerOpen = Boolean((headerValve.state as { open?: boolean }).open);
  const riserPressure = headerOpen ? Math.max(pumpPressure(bp01), pumpPressure(bp02)) : 0;
  const flowStatus = riserPressure > 0 ? "flowing" : "no_flow";

  setAssetState(riser.ref, { pressure_bar: riserPressure, flow_status: flowStatus });
  // The L06 branch mirrors the riser's continuity — no per-floor
  // restriction modeled, matching how every riser/branch pair already
  // represents continuity for the other four systems.
  setAssetState(branch.ref, { pressure_bar: riserPressure, flow_status: flowStatus });

  const aptOpen = Boolean((aptValve.state as { open?: boolean }).open);
  const supplyActive = riserPressure > 0 && aptOpen;
  setAssetState(aptMeter.ref, { ...aptMeter.state, supply_active: supplyActive });
}

// ---- Electrical System V1 — deterministic power propagation ----
// Same shape as recomputeWaterNetwork() above: a small, deterministic,
// conceptual model (never certified electrical engineering) run through
// the same setAssetState() choke point, called explicitly after any
// electrical-relevant command or scenario patch — never wired into
// setAssetState() itself. Chain: GRID-01 (utility_available) -> ATS-01
// (source, auto-transfers to whichever of grid/generator is actually
// live) -> GEN-01 (auto-started on utility loss, auto-mode only) ->
// MDB-01 -> RISER-ELECTRICAL-01 -> L06-ELECTRICAL-BRANCH-01 ->
// METER-ELEC-01 -> DB-01 (energization cascades one-for-one downstream).
const ELECTRICAL_NETWORK_TRIGGER_REFS = new Set(["LUNA-B1-ELECTRICAL-GRID-01", "LUNA-B1-ELECTRICAL-ATS-01"]);
const GENERATOR_REF = "LUNA-B1-ELECTRICAL-GEN-01";
const ATS_REF = "LUNA-B1-ELECTRICAL-ATS-01";

// ---- Electrical System V1.1 — operational event log ----
// Derived from state transitions recomputePowerNetwork() itself observes
// (never manually maintained "what happened" UI state) — the single place
// that already polls every electrical asset each time it runs is also the
// natural place to notice "utility just went down", "the bus just
// de-energized", etc. Piggybacks on the EXISTING notify()/subscribe() pub-
// sub every asset-state change already uses — no new subscription system.
export interface ElectricalEvent {
  id: number;
  at: number;
  label: string;
  detail?: string;
}
const MAX_ELECTRICAL_EVENTS = 40;
let electricalEventSeq = 0;
let electricalEventLog: ElectricalEvent[] = [];
function logElectricalEvent(label: string, detail?: string) {
  electricalEventLog = [{ id: ++electricalEventSeq, at: Date.now(), label, detail }, ...electricalEventLog].slice(0, MAX_ELECTRICAL_EVENTS);
  notify();
}
function getElectricalEvents(): ElectricalEvent[] {
  return electricalEventLog;
}

// The provider owns believable start/stop timing (same principle as
// scheduleElevatorArrival below) — a generator doesn't reach RUNNING the
// instant it's commanded on, and doesn't drop to STOPPED the instant it's
// commanded off. Reference durations only, not a performance spec.
function sequenceGeneratorPhase(target: "start" | "stop") {
  const current = store.get(GENERATOR_REF);
  if (!current) return;
  const state = current.state as { running?: boolean; fault?: boolean };
  if (target === "start") {
    if (state.fault) return; // faulted units don't auto-sequence to running
    logElectricalEvent("Generator start initiated");
    setAssetState(GENERATOR_REF, { ...current.state, running: true, phase: "starting" });
    setTimeout(() => {
      const latest = store.get(GENERATOR_REF);
      if (!latest || !(latest.state as { running?: boolean }).running) return; // stopped again before finishing
      setAssetState(GENERATOR_REF, { ...latest.state, phase: "running" });
      logElectricalEvent("Generator available", "Generator 01 reached RUNNING");
      recomputePowerNetwork();
    }, 3000);
  } else {
    logElectricalEvent("Generator cooldown started");
    setAssetState(GENERATOR_REF, { ...current.state, running: false, phase: "stopping" });
    setTimeout(() => {
      const latest = store.get(GENERATOR_REF);
      if (!latest || (latest.state as { running?: boolean }).running) return; // started again before finishing
      setAssetState(GENERATOR_REF, { ...latest.state, phase: "stopped" });
      logElectricalEvent("Generator cooldown completed", "Generator 01 standing by");
      recomputePowerNetwork();
    }, 1500);
  }
}

// ATS changeover as a real, briefly-observable step (Part 2's "ATS
// TRANSFERRING" reference sequence) rather than an atomic label flip — a
// real ATS has a break-before-make mechanical changeover window during
// which the bus it feeds is momentarily without a live source (see
// recomputePowerNetwork()'s mdbEnergized calculation below).
function sequenceAtsTransfer(newSource: "grid" | "generator") {
  const current = store.get(ATS_REF);
  if (!current) return;
  const state = current.state as { source?: string; transitioning?: boolean };
  if (state.source === newSource || state.transitioning) return; // already there, or already mid-transfer
  logElectricalEvent("ATS transfer initiated", `Switching to ${newSource === "generator" ? "generator" : "utility"}`);
  setAssetState(ATS_REF, { ...current.state, transitioning: true });
  setTimeout(() => {
    const latest = store.get(ATS_REF);
    if (!latest) return;
    setAssetState(ATS_REF, { ...latest.state, source: newSource, transitioning: false });
    logElectricalEvent(newSource === "generator" ? "ATS transferred to Generator" : "ATS transferred to Utility");
    recomputePowerNetwork();
  }, 1000);
}

// Transition trackers — module-level, not asset state, purely so
// recomputePowerNetwork() (the single place that already polls every
// electrical asset on every trigger) can notice a genuine EDGE ("utility
// just went down") rather than logging its current level on every call.
let lastUtilityAvailable: boolean | undefined;
let lastGeneratorFault: boolean | undefined;
let lastMdbEnergized: boolean | undefined;

function recomputePowerNetwork() {
  const grid = store.get("LUNA-B1-ELECTRICAL-GRID-01");
  const gen = store.get(GENERATOR_REF);
  const ats = store.get(ATS_REF);
  const mdb = store.get("LUNA-B1-ELECTRICAL-MDB-01");
  const riser = store.get("LUNA-RISER-ELECTRICAL-01");
  const branch = store.get("LUNA-L06-ELECTRICAL-BRANCH-01");
  const meter = store.get("LUNA-L06-APT-A-METER-ELEC-01");
  const db = store.get("LUNA-L06-APT-A-DB-01");
  if (!grid || !gen || !ats || !mdb || !riser || !branch || !meter || !db) return;

  const utilityAvailable = (grid.state as { utility_available?: boolean }).utility_available !== false;
  if (lastUtilityAvailable !== undefined && lastUtilityAvailable !== utilityAvailable) {
    logElectricalEvent(utilityAvailable ? "Utility supply restored" : "Utility supply lost");
  }
  lastUtilityAvailable = utilityAvailable;

  const genState = gen.state as { phase?: string; fault?: boolean; mode?: string };
  if (lastGeneratorFault !== undefined && lastGeneratorFault !== Boolean(genState.fault)) {
    logElectricalEvent(genState.fault ? "Generator fault" : "Generator fault cleared");
  }
  lastGeneratorFault = Boolean(genState.fault);
  const generatorRunning = genState.phase === "running" && !genState.fault;
  const atsState = ats.state as { source?: string; auto_mode?: boolean; fault?: boolean; transitioning?: boolean };

  // Auto-transfer + auto-start-on-loss/auto-stand-down — only for an ATS
  // left in auto_mode, matching real ATS behavior (manual mode never
  // self-transfers). This is the "ATS recognizes source loss -> generator
  // sequence begins -> ATS transfers" chain Part 9 asks for.
  if (atsState.auto_mode && !atsState.fault) {
    if (!utilityAvailable && genState.mode === "auto" && genState.phase !== "starting" && genState.phase !== "running" && !genState.fault) {
      sequenceGeneratorPhase("start");
    }
    // Stand-down is scoped to "the ATS was actually drawing from the
    // generator and utility is available again" — NOT merely "the
    // generator happens to be running while utility is fine", which would
    // also incorrectly abort a manual test-start (Part 8: Start/Stop must
    // be real, meaningful commands, not immediately undone by the network
    // recompute that a manual command doesn't even trigger on its own).
    if (utilityAvailable && atsState.source === "generator" && !atsState.transitioning && (genState.phase === "starting" || genState.phase === "running")) {
      sequenceGeneratorPhase("stop"); // utility restored — stand the generator back down
    }
    const desiredSource = utilityAvailable ? "grid" : generatorRunning ? "generator" : atsState.source;
    if (desiredSource !== atsState.source && !atsState.transitioning) {
      sequenceAtsTransfer(desiredSource as "grid" | "generator");
    }
  }

  const liveAts = store.get(ATS_REF)!.state as { source?: string; fault?: boolean; transitioning?: boolean };
  // A transitioning ATS is mid break-before-make changeover — no live
  // source is connected to the bus during that brief window.
  const mdbEnergized = !liveAts.fault && !liveAts.transitioning && ((liveAts.source === "grid" && utilityAvailable) || (liveAts.source === "generator" && generatorRunning));
  if (lastMdbEnergized !== undefined && lastMdbEnergized !== mdbEnergized) {
    logElectricalEvent(mdbEnergized ? "Main distribution energized" : "Main distribution de-energized");
  }
  lastMdbEnergized = mdbEnergized;
  // voltage/current/frequency are reference/simulated nominal values, not
  // measured — 415V/50Hz three-phase LV is a plausible reference figure,
  // never a final engineering spec (DD08 unresolved).
  setAssetState(mdb.ref, {
    ...mdb.state,
    energized: mdbEnergized,
    voltage_v: mdbEnergized ? 415 : 0,
    frequency_hz: mdbEnergized ? 50 : 0,
    load_pct: mdbEnergized ? 42 : 0,
    current_a: mdbEnergized ? 118 : 0,
  });

  // No isolation point is modeled on the riser/branch yet (unlike water's
  // header valve) — energization is a straight cascade of MDB's own state.
  setAssetState(riser.ref, { ...riser.state, energized: mdbEnergized });
  setAssetState(branch.ref, { ...branch.state, energized: mdbEnergized });
  setAssetState(meter.ref, { ...meter.state, supply_active: mdbEnergized });
  setAssetState(db.ref, { ...db.state, energized: mdbEnergized });
}

// ---- Fire System V1 — deterministic alarm + hydraulic propagation ----
// Two distinct networks (Fire System V1 §3): the alarm/detection network
// (detectors -> panel -> building fire state) and the hydraulic network
// (tank -> pump -> riser -> branch). Deliberately NOT coupled to each
// other — a real fire pump starts on pressure drop from sprinkler flow,
// not directly from the alarm signal, and coupling them here would
// fabricate hydraulics this reference model doesn't model. Same
// setAssetState() choke point, same explicit-call-after-trigger pattern
// as recomputeWaterNetwork()/recomputePowerNetwork() above.
export interface FireEvent {
  id: number;
  at: number;
  label: string;
  detail?: string;
}
const MAX_FIRE_EVENTS = 40;
let fireEventSeq = 0;
let fireEventLog: FireEvent[] = [];
function logFireEvent(label: string, detail?: string) {
  fireEventLog = [{ id: ++fireEventSeq, at: Date.now(), label, detail }, ...fireEventLog].slice(0, MAX_FIRE_EVENTS);
  notify();
}
function getFireEvents(): FireEvent[] {
  return fireEventLog;
}

const FIRE_NETWORK_TRIGGER_REFS = new Set(["LUNA-GROUND-FIRE-DET-01", "LUNA-L06-APT-A-ENTRY-SMOKE-01", "LUNA-B1-FIRE-PUMP-01", "LUNA-B1-FIRE-PANEL-01"]);

// Transition trackers — module-level, not asset state, so
// recomputeFireNetwork() only logs a genuine edge, never its current
// level on every poll (same principle as the electrical trackers above).
let lastFireAlarm: boolean | undefined;
let lastFireTrouble: boolean | undefined;
let lastFirePumpRunning: boolean | undefined;

function recomputeFireNetwork() {
  const panel = store.get("LUNA-B1-FIRE-PANEL-01");
  const pump = store.get("LUNA-B1-FIRE-PUMP-01");
  const groundDet = store.get("LUNA-GROUND-FIRE-DET-01");
  const smokeDet = store.get("LUNA-L06-APT-A-ENTRY-SMOKE-01");
  const riser = store.get("LUNA-RISER-FIRE-01");
  const branch = store.get("LUNA-L06-FIRE-BRANCH-01");
  if (!panel || !pump || !groundDet || !smokeDet || !riser || !branch) return;

  // ---- Alarm/detection network ----
  const groundAlarm = Boolean((groundDet.state as { alarm?: boolean }).alarm);
  const smokeAlarm = Boolean((smokeDet.state as { smoke?: boolean }).smoke);
  const anyAlarm = groundAlarm || smokeAlarm;
  // 6A checked first — matches the reference incident chain (Part 4),
  // an arbitrary but deterministic tie-break if both ever fire at once.
  const activeZoneRef = smokeAlarm ? smokeDet.ref : groundAlarm ? groundDet.ref : null;

  if (lastFireAlarm !== undefined && lastFireAlarm !== anyAlarm) {
    logFireEvent(anyAlarm ? "Detector alarm received" : "Alarm cleared");
  }
  lastFireAlarm = anyAlarm;

  const panelState = panel.state as { trouble?: boolean };
  if (lastFireTrouble !== undefined && lastFireTrouble !== Boolean(panelState.trouble)) {
    logFireEvent(panelState.trouble ? "Controller trouble/fault" : "Controller trouble cleared");
  }
  lastFireTrouble = Boolean(panelState.trouble);

  setAssetState(panel.ref, { ...panel.state, alarm_active: anyAlarm, active_zone_ref: activeZoneRef });

  // ---- Hydraulic network — tracks the registered fire pump directly;
  // no jockey/standing-pressure asset is registered (DD11 unresolved). ----
  const pumpState = pump.state as { running?: boolean; fault?: boolean; pressure_bar?: number };
  const pumpRunning = Boolean(pumpState.running) && !pumpState.fault;
  if (lastFirePumpRunning !== undefined && lastFirePumpRunning !== pumpRunning) {
    logFireEvent(pumpRunning ? "Fire pump running — riser pressurizing" : "Fire pump stopped — riser depressurizing");
  }
  lastFirePumpRunning = pumpRunning;
  const pressureBar = pumpRunning && typeof pumpState.pressure_bar === "number" ? pumpState.pressure_bar : 0;
  setAssetState(riser.ref, { ...riser.state, pressurized: pumpRunning, pressure_bar: pressureBar });
  setAssetState(branch.ref, { ...branch.state, pressurized: pumpRunning, pressure_bar: pressureBar });
}

// HVAC System V1 — the reference chain's two commandable zones plus the
// shared outdoor condenser. Deliberately reuses the SAME ambientTick()
// interval below (no second simulator, Part 7) — a genuine 4s tick is
// close enough for "deterministic, coherent, visibly texture-live"
// without pretending to be a real thermal model. Each zone steps its own
// room_temp_c independently (bounded, deterministic exponential approach
// toward target when cooling / toward AMBIENT_ROOM_TEMP_C otherwise) —
// the two zones are NOT coupled to each other, matching the fire alarm/
// hydraulic non-coupling precedent (a bedroom unit faulting has no effect
// on the living room's own thermal state).
const HVAC_NETWORK_TRIGGER_REFS = new Set(["LUNA-L06-APT-A-LIVING-AC-01", "LUNA-L06-APT-A-BED-01-AC-01"]);
// Reference ambient baseline (Lagos, simulated only — SIMULATED THERMAL
// STATE, never claimed as live environmental telemetry, Part 18) that a
// room drifts toward once its AC is off or faulted.
const AMBIENT_ROOM_TEMP_C = 30;

function clampTemp(n: number): number {
  return Math.max(16, Math.min(34, n));
}

function stepZoneTemp(current: number, on: boolean, fault: boolean, targetTempC: number): number {
  const cooling = on && !fault;
  const goal = cooling ? targetTempC : AMBIENT_ROOM_TEMP_C;
  const rate = cooling ? 0.16 : 0.07; // cooling response is visibly faster than passive ambient drift
  const jitter = (Math.random() - 0.5) * 0.12; // small texture, never the dominant factor
  return Math.round(clampTemp(current + (goal - current) * rate + jitter) * 10) / 10;
}

function recomputeHvacNetwork() {
  const living = store.get("LUNA-L06-APT-A-LIVING-AC-01");
  const bed = store.get("LUNA-L06-APT-A-BED-01-AC-01");
  const outdoor = store.get("LUNA-L06-APT-A-AC-OUTDOOR-01");
  const th = store.get("LUNA-L06-APT-A-LIVING-TH-01");
  if (!living || !bed || !outdoor) return;

  const livingState = living.state as { on?: boolean; fault?: boolean; target_temp_c?: number; room_temp_c?: number };
  const livingNext = stepZoneTemp(typeof livingState.room_temp_c === "number" ? livingState.room_temp_c : AMBIENT_ROOM_TEMP_C, Boolean(livingState.on), Boolean(livingState.fault), typeof livingState.target_temp_c === "number" ? livingState.target_temp_c : 24);
  setAssetState(living.ref, { ...living.state, room_temp_c: livingNext });
  // LIVING-TH-01 is the one real registered sensor for this exact room —
  // mirrored, not independently simulated, so Oyi's "temperature in
  // Apartment 6A" (which resolves to this sensor, see lunaVocabulary.ts's
  // SPACE_SENSOR_ALIASES) always agrees with the AC's own room reading.
  if (th) setAssetState(th.ref, { ...th.state, temp_c: livingNext });

  const bedState = bed.state as { on?: boolean; fault?: boolean; target_temp_c?: number; room_temp_c?: number };
  const bedNext = stepZoneTemp(typeof bedState.room_temp_c === "number" ? bedState.room_temp_c : AMBIENT_ROOM_TEMP_C, Boolean(bedState.on), Boolean(bedState.fault), typeof bedState.target_temp_c === "number" ? bedState.target_temp_c : 24);
  setAssetState(bed.ref, { ...bed.state, room_temp_c: bedNext });

  const demand = (Boolean(livingState.on) && !livingState.fault) || (Boolean(bedState.on) && !bedState.fault);
  if (outdoor.state.demand !== demand) setAssetState(outdoor.ref, { ...outdoor.state, demand });
}

// ---- Access & Security System V1 — identity/credential authorization +
// access event log ----
// SCHEDULE BOUNDARY (docs/LUNA_MASTER_EQUIPMENT_SCHEDULE.md,
// EQ-BUILDING-ACCESS / EQ-UNIT-ACCESS / "Current instance register"): the
// three common access points (Main Resident Entrance, B1 Service
// Entrance, Ground Lift Lobby) are registered `observable; none` in the
// real backend data — no lock/door capability is instrumented for them
// (DD13 unresolved), so no command authorization runs for them at all.
// The one REAL, already-controllable access point is Apartment 6A's own
// entrance lock (`LUNA-L06-APT-A-ENTRY-LOCK-01`, pre-existing lockBehavior,
// UNCHANGED) — the reference chain this authorization/event model gates.
export type AccessIdentityRole = "facility" | "resident" | "public";
export interface AccessAuthorizationResult {
  granted: boolean;
  reason: string;
  role: AccessIdentityRole;
  /** Apartment A Full Interior Reality V1 (Part 6) — set when the caller
   * holds the RIGHT to enter (an assigned resident) but has not yet
   * presented a valid credential: a real, distinct outcome from `granted`,
   * never collapsed into it — being authorized to hold a key and having
   * actually used it are different facts. */
  requiresCredential?: boolean;
}
const ACCESS_GOVERNED_REFS = new Set<string>(["LUNA-L06-APT-A-ENTRY-LOCK-01"]);
export function isAccessGovernedRef(ref: string): boolean {
  return ACCESS_GOVERNED_REFS.has(ref);
}

// Apartment A Full Interior Reality V1 (Part 6) — SIMULATED / REFERENCE
// ACCESS, never physical biometric authentication: a fixed demo code per
// governed unit, checked ONLY inside this resolver (never inside a visual
// component — see the credential UI's own docstring). Real credential
// providers (PIN issuance, visitor codes, mobile/NFC, resident approval)
// are explicitly out of scope for this phase (Part 7) — this map exists
// only so an assigned resident's TOUR-mode arrival has something real,
// if simulated, to present before the existing governed lock unlocks.
const SIMULATED_ACCESS_CODES: Record<string, string> = { "LUNA-L06-APT-A": "4127" };

/** Deterministic reference authorization — reuses the SAME
 * RepresentationIdentity shape (role + assignedHomeRefs) every other
 * system already reads as the "credential" (Part 10's explicit
 * instruction: "Do not create a production identity-management system").
 * The pre-existing "public" role stands in for Visitor/Unauthorized.
 * PHYSICAL STATE vs AUTHORIZATION RESULT are kept strictly separate: this
 * function never reads or changes the lock's own state, only whether the
 * command may proceed at all.
 *
 * `presentedCredential` (Part 6) is only meaningful when `requireCredential`
 * is true: undefined on the first pass — an assigned resident with no
 * credential yet presented gets `requiresCredential: true`, not an
 * immediate grant, so the caller can show a real access-code prompt;
 * supplying the matching SIMULATED code on a second call is what actually
 * flips the result to `granted: true`.
 *
 * `requireCredential` defaults to false — the pre-existing direct command
 * path (a resident tapping "unlock" on the lock device itself, already
 * inside an authenticated app session) keeps its original instant-grant
 * behavior unchanged; only the physical Spatial Transition Engine entry
 * sequence (LunaRouteDriver, approaching the real door as part of a TOUR)
 * opts into the credential step, matching exactly where Part 6 puts the
 * simulated access-code surface — "near the door," not on every possible
 * remote unlock affordance. */
export function resolveAccessAuthorization(identity: CommandRequest["actor"], ref: CanonicalRef, presentedCredential?: string, requireCredential = false): AccessAuthorizationResult {
  const role: AccessIdentityRole = identity?.role === "facility" ? "facility" : identity?.role === "resident" ? "resident" : "public";
  if (!isAccessGovernedRef(ref)) {
    return { granted: false, reason: "This access point has no controllable capability in this reference build (DESIGN DECISION REQUIRED).", role };
  }
  const asset = lunaTwinDataProvider.getAsset(ref);
  const unitRef = asset?.unitRef;
  // Apartment 6A's own entrance lock — a private-home boundary. Facility
  // is deliberately NOT granted a master-key override: no such capability
  // is documented anywhere in the canonical catalog, mirroring the HVAC
  // phase's own disclosed precedent (resident-owned in-home devices stay
  // resident-only) rather than inventing new authority for this phase.
  if (role === "facility") {
    return { granted: false, reason: "Facility credentials are not authorized for a private home entrance. No master-key capability is modeled in this reference build.", role };
  }
  if (role === "resident" && unitRef && identity?.assignedHomeRefs.includes(unitRef)) {
    const expectedCode = requireCredential ? SIMULATED_ACCESS_CODES[unitRef] : undefined;
    if (!expectedCode) return { granted: true, reason: "Resident credential matches the assigned home.", role };
    if (presentedCredential === undefined) return { granted: false, requiresCredential: true, reason: "A simulated access code is required to enter this home.", role };
    if (presentedCredential === expectedCode) return { granted: true, reason: "Simulated access code accepted — resident credential matches the assigned home.", role };
    return { granted: false, reason: "Incorrect access code.", role };
  }
  if (role === "resident") {
    return { granted: false, reason: "Resident credential does not match this home.", role };
  }
  return { granted: false, reason: "No valid credential presented.", role };
}

export interface AccessEvent {
  id: number;
  at: number;
  label: string;
  detail?: string;
}
const MAX_ACCESS_EVENTS = 40;
let accessEventSeq = 0;
let accessEventLog: AccessEvent[] = [];
function logAccessEvent(label: string, detail?: string) {
  accessEventLog = [{ id: ++accessEventSeq, at: Date.now(), label, detail }, ...accessEventLog].slice(0, MAX_ACCESS_EVENTS);
  notify();
}
function getAccessEvents(): AccessEvent[] {
  return accessEventLog;
}

// ---- Network / Edge & Physical Connectivity V1 — deterministic
// reachability cascade ----
// THE NETWORK CARRIES TRUTH. IT DOES NOT CREATE TRUTH. This cascade only
// ever derives OTHER network-edge assets' own reachability from the one
// real, pre-existing parentRef chain already established in Phase 10
// (GATEWAY-01 <- RISER-NETWORK-01 <- L06-NETWORK-BRANCH-01 <- NET-ONT-01
// <- APT-A-ROUTER-01, and GATEWAY-01 <- GROUND-NET-WIFI-AP-01) — the same
// "cascade within one system's own domain" precedent as
// recomputePowerNetwork()'s MDB energization cascade. It never reaches
// into or overrides any OTHER system's own resolver/state (Electrical,
// Water, Fire, HVAC, Elevators, Access, CCTV all remain fully
// independent of this cascade, exactly Section 11's boundary).
const NETWORK_TRIGGER_REFS = new Set(["LUNA-B1-NET-GATEWAY-01"]);
const WIFI_AP_RESTING_CLIENTS = 14;

function recomputeNetworkState() {
  const gateway = store.get("LUNA-B1-NET-GATEWAY-01");
  const riser = store.get("LUNA-RISER-NETWORK-01");
  const branch = store.get("LUNA-L06-NETWORK-BRANCH-01");
  const ont = store.get("LUNA-L06-APT-A-NET-ONT-01");
  const router = store.get("LUNA-L06-APT-A-ROUTER-01");
  const wifiAp = store.get("LUNA-GROUND-NET-WIFI-AP-01");
  if (!gateway || !riser || !branch || !ont || !router || !wifiAp) return;

  const uplinkUp = (gateway.state as { uplink_up?: boolean }).uplink_up !== false;
  setAssetState(riser.ref, { ...riser.state, reachable: uplinkUp }, uplinkUp ? "normal" : "warning");
  setAssetState(branch.ref, { ...branch.state, reachable: uplinkUp }, uplinkUp ? "normal" : "warning");
  setAssetState(ont.ref, { ...ont.state, uplink_up: uplinkUp });
  setAssetState(router.ref, { ...router.state, uplink_up: uplinkUp });
  setAssetState(wifiAp.ref, { ...wifiAp.state, reachable: uplinkUp, clients_connected: uplinkUp ? WIFI_AP_RESTING_CLIENTS : 0 });
}

// ---- Elevator movement timing ----
// Behaviors only set *intent* (floor + direction:"moving") — the provider
// owns the believable timing of arrival, since "how long a lift takes" is
// operational behavior, not a pure state-transition rule.
function scheduleElevatorArrival(ref: CanonicalRef) {
  setTimeout(() => {
    const current = store.get(ref);
    if (!current) return;
    setAssetState(ref, { ...current.state, direction: "idle", door: "open" });
    setTimeout(() => {
      const arrived = store.get(ref);
      if (!arrived) return;
      setAssetState(ref, { ...arrived.state, door: "closed" });
    }, 1400);
  }, 2200);
}

// ---- Ambient drift ----
// A small, bounded random walk for readings that should visibly be "live"
// even with no user interaction — temperature/humidity and the two
// apartment meters. Deliberately modest: this is texture, not the point
// of the demo (scenarios are the deterministic, meaningful state changes).
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
const METER_FIELD: Array<{ ref: string; field: string }> = [
  { ref: "LUNA-L06-APT-A-METER-ELEC-01", field: "reading_kwh" },
  { ref: "LUNA-L06-APT-A-METER-WATER-01", field: "reading_m3" },
  { ref: "LUNA-B1-ELECTRICAL-METER-01", field: "reading_kwh" },
  { ref: "LUNA-B1-WATER-METER-01", field: "reading_m3" },
];
function ambientTick() {
  // HVAC System V1 — temp_c is no longer an independent random walk here;
  // it's driven by recomputeHvacNetwork() below (mirrored from LIVING-AC-
  // 01's own deterministic room_temp_c). Humidity has no HVAC dehumidify
  // modeling in this reference system (DD12 unresolved), so it keeps its
  // own small bounded random walk exactly as before.
  const th = store.get("LUNA-L06-APT-A-LIVING-TH-01");
  if (th) {
    const humidity = clamp(Math.round((th.state.humidity_pct as number) + (Math.random() - 0.5) * 2), 38, 62);
    setAssetState(th.ref, { ...th.state, humidity_pct: humidity });
  }
  for (const { ref, field } of METER_FIELD) {
    const asset = store.get(ref);
    if (!asset) continue;
    const value = (asset.state[field] as number) + Math.random() * 0.04;
    setAssetState(ref, { ...asset.state, [field]: Math.round(value * 100) / 100 });
  }
  recomputeHvacNetwork();
}
if (typeof window !== "undefined") {
  setInterval(ambientTick, 4000);
}

// One provider clock, independent of mounting/rendering, driving all four
// lifts — not four separate timers or four separate React state systems.
// Each lift keeps its OWN fixed-step remainder so a fresh request on one
// car (which resets nothing about another's in-flight sub-step budget)
// can never borrow or leak time across refs. A background-tab pause
// pauses simulation (bounded catch-up per lift), never teleports any car.
const liftRemainders = new Map<string, number>(LIFT_DEFINITIONS.map((d) => [d.ref, 0]));
function advanceLiftClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return;
  for (const def of LIFT_DEFINITIONS) {
    const current = store.get(def.ref);
    if (!current) continue;
    let remainder = (liftRemainders.get(def.ref) ?? 0) + seconds;
    let next = current.state as LiftState;
    while (remainder >= 0.02 - 1e-9) {
      next = advanceLift(next, 0.02);
      remainder = Math.max(0, remainder - 0.02);
    }
    liftRemainders.set(def.ref, remainder);
    if (next !== current.state) setAssetState(def.ref, next);
  }
}
if (typeof window !== "undefined") {
  let previous = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    advanceLiftClock(Math.min(0.1, (now - previous) / 1000));
    previous = now;
  }, 40);
  // Vite exposes import.meta.hot during development, while consumers such
  // as Facility OS compile this source through Next.js where ImportMeta has
  // no `hot` member. Keep HMR cleanup optional without coupling the runtime
  // provider to Vite's global typings.
  const hot = (import.meta as ImportMeta & {
    hot?: { dispose: (callback: () => void) => void };
  }).hot;
  hot?.dispose(() => clearInterval(timer));
}

// ---- Public provider ----
export const lunaSimulationProvider: TwinRuntimeProvider = {
  getState: (ref) => store.get(ref),
  listStates: () => Array.from(store.values()),
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async execute(request: CommandRequest): Promise<CommandResult> {
    if (isLiftRef(request.assetRef)) {
      const passenger = request.args?.purpose === "passenger" && ["callLift", "setPosition"].includes(request.command) && passengerStopAllowed(request.actor, request.assetRef, request.args?.originFloorRef ?? request.args?.floor);
      if (!passenger && (!request.actor || lunaRepresentationPolicy.resolveMode({ ref: request.assetRef, identity: request.actor }) !== "FULL_3D")) {
        return { ok: false, message: "Lift simulation control requires an authorized Facility host context. Passenger action admission is not enabled.", timestamp: Date.now() };
      }
      const current = store.get(request.assetRef)!;
      const result = requestLift(current.state as LiftState, request.command, request.args);
      // Each lift's state lives under its OWN canonical ref in the store —
      // a command to one ref only ever reads/writes that ref's row, so
      // Lift 01/02/03/Service state is isolated by construction, not by
      // any extra bookkeeping here.
      if (result.ok && result.state !== current.state) setAssetState(request.assetRef, result.state);
      return { ok: result.ok, message: result.message, timestamp: Date.now() };
    }
    const row = ROWS_BY_REF.get(request.assetRef);
    const current = store.get(request.assetRef);
    if (!row || !current) return { ok: false, message: "Unknown asset", timestamp: Date.now() };
    if (!current.availableCommands.includes(request.command)) {
      return { ok: false, message: `"${request.command}" is not supported by this asset.`, timestamp: Date.now() };
    }
    // Access & Security System V1 — an authorization gate INDEPENDENT of
    // RepresentationPolicy's visibility gate (the renderer must never
    // become authoritative): even a caller that could somehow reach this
    // command (a future UI path, a direct Oyi/API call) still has its
    // identity/credential checked here, at the one real choke point every
    // command already passes through. PHYSICAL STATE is left untouched on
    // denial — "door remains locked" — and both outcomes are recorded to
    // the SAME access event log Oyi/Control Board both read.
    if (isAccessGovernedRef(request.assetRef) && (request.command === "lock" || request.command === "unlock")) {
      const auth = resolveAccessAuthorization(request.actor, request.assetRef);
      const assetLabel = lunaTwinDataProvider.getAsset(request.assetRef)?.label ?? request.assetRef;
      if (!auth.granted) {
        logAccessEvent("ACCESS_DENIED", `${assetLabel}: ${auth.reason}`);
        return { ok: false, message: auth.reason, timestamp: Date.now() };
      }
      logAccessEvent("ACCESS_GRANTED", `${assetLabel}: ${auth.reason}`);
    }
    await delay(250); // small synthetic latency — a real command boundary, not an instant local mutation
    const { state, message } = row.behavior.apply(current.state, request.command, request.args);
    setAssetState(request.assetRef, state);
    if (isAccessGovernedRef(request.assetRef) && (request.command === "lock" || request.command === "unlock")) {
      logAccessEvent(request.command === "lock" ? "LOCKED" : "UNLOCKED", lunaTwinDataProvider.getAsset(request.assetRef)?.label);
    }
    if (request.assetRef.startsWith("LUNA-LIFT") && request.command === "setPosition" && state.direction === "moving") {
      scheduleElevatorArrival(request.assetRef);
    }
    if (WATER_NETWORK_TRIGGER_REFS.has(request.assetRef)) recomputeWaterNetwork();
    if (request.assetRef === GENERATOR_REF && (request.command === "turnOn" || request.command === "turnOff")) {
      // Manual start/stop goes through the same believable-timing sequencer
      // as an auto-transfer start — sequenceGeneratorPhase re-reads the
      // (already fault-gated) running value apply() just set and either
      // sequences it or no-ops if the command was blocked by fault.
      sequenceGeneratorPhase(request.command === "turnOn" ? "start" : "stop");
    } else if (ELECTRICAL_NETWORK_TRIGGER_REFS.has(request.assetRef)) {
      recomputePowerNetwork();
    }
    if (FIRE_NETWORK_TRIGGER_REFS.has(request.assetRef)) recomputeFireNetwork();
    if (HVAC_NETWORK_TRIGGER_REFS.has(request.assetRef)) recomputeHvacNetwork();
    if (NETWORK_TRIGGER_REFS.has(request.assetRef)) recomputeNetworkState();
    return { ok: true, message, timestamp: Date.now() };
  },
  simulateEvent(ref: CanonicalRef, event: string): CommandResult {
    const current = store.get(ref);
    if (!current) return { ok: false, message: "Unknown asset", timestamp: Date.now() };
    switch (event) {
      case "occupancy_detected": {
        setAssetState(ref, { ...current.state, occupied: true });
        setTimeout(() => {
          const latest = store.get(ref);
          if (latest) setAssetState(ref, { ...latest.state, occupied: false });
        }, 6000);
        return { ok: true, message: "Occupancy detected (test event) — clears automatically in a few seconds.", timestamp: Date.now() };
      }
      case "leak_detected":
        setAssetState(ref, { ...current.state, leak: true }, "critical");
        return { ok: true, message: "Leak detected (test event).", timestamp: Date.now() };
      case "smoke_detected":
        setAssetState(ref, { ...current.state, smoke: true }, "critical");
        if (FIRE_NETWORK_TRIGGER_REFS.has(ref)) recomputeFireNetwork();
        return { ok: true, message: "Smoke detected (test event).", timestamp: Date.now() };
      default:
        return { ok: false, message: `Unknown simulated event "${event}".`, timestamp: Date.now() };
    }
  },
};

// ---- Internal-only export for the scenario engine (same package) ----
// Deliberately NOT part of the public TwinRuntimeProvider interface: a
// scenario represents a facility/external event (a grid outage, a leak
// discovered), not a user command, so it legitimately bypasses the
// availableCommands gate — but it still only ever mutates state through
// this exact same setAssetState()/notify() path, never by reaching into
// React component state directly.
export const lunaRuntimeInternals = {
  advanceLiftClock,
  setAssetState,
  recomputeWaterNetwork,
  recomputePowerNetwork,
  recomputeFireNetwork,
  recomputeHvacNetwork,
  getElectricalEvents,
  getFireEvents,
  getAccessEvents,
  resolveAccessAuthorization,
  isAccessGovernedRef,
  recomputeNetworkState,
  getState: (ref: CanonicalRef) => store.get(ref),
  resetAll() {
    for (const def of LIFT_DEFINITIONS) liftRemainders.set(def.ref, 0);
    store = buildInitialStore();
    lastUtilityAvailable = undefined;
    lastGeneratorFault = undefined;
    lastMdbEnergized = undefined;
    electricalEventLog = [];
    lastFireAlarm = undefined;
    lastFireTrouble = undefined;
    lastFirePumpRunning = undefined;
    fireEventLog = [];
    accessEventLog = [];
    recomputeWaterNetwork();
    recomputePowerNetwork();
    recomputeFireNetwork();
    recomputeHvacNetwork();
    recomputeNetworkState();
    notify();
  },
};
