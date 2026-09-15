// Luna explainable-response layer (Phase 6). Every sentence here is built
// directly from live runtime.state fields — never invented telemetry.
// Dispatch is by *state shape*, not by asset.type, since several backend
// types (all four "power_system" assets, for instance) share one type
// string but genuinely different state shapes; the shape itself is the
// more reliable signal for how to phrase it.

import type { TwinDataProvider } from "../../engine/twinData";
import type { TwinRuntimeProvider } from "../../engine/twinRuntime";
import { LUNA_LEVELS } from "../lunaProgramme";
import { resolveBuildingPower, type BuildingElectricalState } from "../runtime/lunaPowerResolver";
import { resolveFireState, type FireOperationalState } from "../runtime/lunaFireResolver";
import { resolveHvacState, type HvacOperationalState, type HvacZoneState } from "../runtime/lunaHvacResolver";
import { resolveAccessState, type AccessOperationalState, type AccessPointState } from "../runtime/lunaAccessResolver";
import { resolveCameraState } from "../runtime/lunaCameraResolver";
import { resolveNetworkState, type NetworkOperationalState } from "../runtime/lunaNetworkResolver";
import { resolveDrainageState, type DrainageOperationalState, type DrainageChainNode } from "../runtime/lunaDrainageResolver";

function formatFloor(floorRef: unknown): string {
  if (typeof floorRef !== "string") return "an unknown floor";
  const level = LUNA_LEVELS.find((l) => l.ref === floorRef);
  return level?.label ?? floorRef;
}

// Electrical System V1.1 — the one canonical "what is Luna running on"
// narrative, built directly from resolveBuildingPower()'s live truth.
// Every caller (the "what/why" building-power questions below, and
// anything else that ever wants to say this) gets the exact same
// sentence for the exact same state — there is no second wording.
function describeActiveSource(power: BuildingElectricalState): string {
  if (power.activeSource === "utility") return "Luna is currently running on utility supply.";
  if (power.activeSource === "generator") return "Luna is currently running on generator supply.";
  if (power.activeSource === "mixed") return "Luna's electrical supply is currently transferring between sources.";
  return "Luna currently has no valid electrical supply.";
}

function describeSecondary(power: BuildingElectricalState): string {
  const genPhraseWord = power.generator.fault ? "faulted" : power.generator.phase === "running" ? "running normally" : power.generator.phase === "starting" ? "starting" : power.generator.phase === "stopping" ? "cooling down" : "on standby";
  return [
    `Utility is ${power.utilityAvailable ? "available" : "unavailable"}.`,
    `Generator 01 is ${genPhraseWord}${typeof power.generator.fuelPct === "number" ? `, ${power.generator.fuelPct}% fuel` : ""}.`,
    `The ATS is ${power.ats.transitioning ? "transferring" : `on ${power.ats.source === "generator" ? "generator" : "utility"}`}.`,
    `Main distribution is ${power.mainBusEnergized ? "energized" : "de-energized"}.`,
  ].join(" ");
}

function timeAgo(at: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 5) return "moments ago";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

/** The causal, "why" version — always includes the most recent real
 * source transition from the electrical event log (Part 11), so Oyi can
 * actually explain a transfer rather than only describing the current
 * snapshot. Used for both general and "why" building-power questions —
 * the causal context is a strict superset, never wrong to include. */
export function explainBuildingPower(power: BuildingElectricalState): string {
  const base = `${describeActiveSource(power)} ${describeSecondary(power)}`;
  if (!power.lastTransition) return base;
  const t = power.lastTransition;
  return `${base} Most recent transition: ${t.label}${t.detail ? ` (${t.detail})` : ""}, ${timeAgo(t.at)}.`;
}

// Fire & Life Safety System V1 — the one canonical "what is Luna's fire
// status" narrative, built directly from resolveFireState()'s live truth.
// SAFETY BOUNDARY: this is an observational/reference summary, never a
// certified fire panel readout or a life-safety directive (see docs/
// LUNA_FIRE_LIFE_SAFETY_REFERENCE_SPEC.md §6).
export function explainFireState(fire: FireOperationalState): string {
  const stateWord = fire.fireState === "alarm" ? "ALARM" : fire.fireState === "trouble" ? "TROUBLE" : "NORMAL";
  const parts = [`Luna's fire system is currently ${stateWord} (reference simulation).`];
  if (fire.alarmActive) {
    parts.push(`Origin: ${fire.originatingZoneLabel ?? "unknown device"}${fire.affectedLevelRef ? `, ${fire.affectedLevelRef}` : ""}.`);
    parts.push(`${fire.activeAlarmDeviceCount} device${fire.activeAlarmDeviceCount === 1 ? "" : "s"} currently active.`);
  } else {
    parts.push("No active alarms.");
  }
  parts.push(`Fire pump is ${fire.pump.fault ? "faulted" : fire.pump.running ? `running (${fire.pump.pressureBar} bar)` : "stopped"}.`);
  parts.push(`Controller communication is ${fire.controllerCommunicationOk ? "OK" : "faulted"}.`);
  if (fire.lastEvent) parts.push(`Most recent event: ${fire.lastEvent.label}, ${timeAgo(fire.lastEvent.at)}.`);
  return parts.join(" ");
}

// HVAC System V1 — a single per-zone sentence covering state, target/room
// temperature and (when not actively cooling) WHY, so "is the AC
// running", "what is the current setpoint" and "why isn't Apartment 6A
// cooling" all resolve to the SAME live narrative for that zone, never
// three divergent descriptions of the same runtime truth.
function describeHvacZone(z: HvacZoneState): string {
  if (z.state === "fault") return `${z.label} has a fault and is not cooling. It cannot be restarted until the fault clears (reference simulation).`;
  if (!z.on) return `${z.label} is off${z.roomTempC !== null ? `, room reads ${z.roomTempC}°C` : ""} (reference simulation).`;
  const atTarget = z.roomTempC !== null && z.roomTempC <= z.targetTempC + 0.3;
  const progress = atTarget ? `has reached its ${z.targetTempC}°C target` : `is actively cooling toward its ${z.targetTempC}°C target`;
  return `${z.label} is on (${z.mode} mode) and ${progress}${z.roomTempC !== null ? `, currently ${z.roomTempC}°C` : ""} (reference simulation).`;
}

// HVAC System V1 — the one canonical "what is the HVAC status" narrative
// for the Apartment 6A reference chain, built directly from
// resolveHvacState()'s live truth. Every caller (the outdoor condenser's
// own lookup, and any aggregate HVAC question) gets the exact same
// sentence for the exact same state.
export function explainHvacState(hvac: HvacOperationalState): string {
  const stateWord = hvac.hvacState === "fault" ? "FAULT" : hvac.hvacState === "running" ? "RUNNING" : "OFF";
  const parts = [`Apartment 6A's HVAC (reference chain) is currently ${stateWord} (reference simulation).`];
  for (const z of hvac.zones) parts.push(describeHvacZone(z));
  parts.push(`Outdoor condenser demand: ${hvac.outdoorDemand ? "active — serving connected zone(s)" : "idle"}.`);
  return parts.join(" ");
}

// Access & Security System V1 — a single per-point sentence covering
// whether that point is instrumented and, if so, its real locked state —
// honest disclosure rather than a fabricated read, matching the schedule
// boundary documented in lunaSimulationProvider.ts.
function describeAccessPoint(p: AccessPointState): string {
  if (!p.instrumented) return `${p.label} has no lock/door telemetry instrumented in this reference build (DESIGN DECISION REQUIRED).`;
  return `${p.label} is ${p.locked ? "locked" : "unlocked"}.`;
}

// Access & Security System V1 — the one canonical "what is Luna's access
// status" narrative, covering every registered access point plus the real
// access event log, built directly from resolveAccessState()'s live
// truth. SAFETY BOUNDARY: this is a reference/observational summary, not
// a certified security system readout — no biometric, credential-
// technology or statutory-compliance claim is made anywhere in it.
export function explainAccessState(access: AccessOperationalState): string {
  const parts = ["Access & Security (reference simulation):", ...access.points.map(describeAccessPoint)];
  if (access.lastEvent) parts.push(`Most recent access event: ${access.lastEvent.label}${access.lastEvent.detail ? ` (${access.lastEvent.detail})` : ""}, ${timeAgo(access.lastEvent.at)}.`);
  else parts.push("No access events recorded yet.");
  return parts.join(" ");
}

// Network/Edge & Physical Connectivity V1 — the one canonical "what is
// Luna's network status" narrative, covering the core gateway's own
// uplink, the real physical backbone chain (data riser -> floor branch ->
// Apartment 6A's ONT -> Apartment 6A's own router), the common-area
// Wi-Fi AP, and Oyi Edge/Core. THE NETWORK CARRIES TRUTH, IT DOES NOT
// CREATE TRUTH: this narrative never claims a connection for Edge/Core
// that isn't established anywhere in canonical data.
export function explainNetworkState(network: NetworkOperationalState): string {
  const parts = [`The core network gateway's uplink is ${network.gatewayUplinkUp ? "up" : "down"} (reference simulation).`];
  for (const node of network.backbone) parts.push(`${node.label} is ${node.reachable ? "reachable" : "unreachable"}.`);
  parts.push(`Common-area Wi-Fi AP is ${network.wifiApReachable ? `reachable, ${network.wifiApClientsConnected} clients connected` : "unreachable"}.`);
  parts.push(`Oyi Edge/Core is ${network.edgeCoreOnline ? "online" : "offline"}, but has no established connection to this network infrastructure (DESIGN DECISION REQUIRED).`);
  return parts.join(" ");
}

// Drainage V1 — the one canonical "show me the drainage from Apartment
// 6A" narrative, built directly from resolveDrainageState()'s live truth.
// Direction note: this reads fixture -> discharge, the REAL physical flow
// direction — resolveDrainageState()'s own arrays are already ordered
// this way (see its own direction comment), the opposite of
// buildServiceRoute()'s generic graph-root-first reading for drainage.
// DD10 (final discharge/stormwater design) is stated explicitly, never
// silently omitted — matching the brief's own required answer shape:
// "The reference drainage route is traced to the B1 collection point.
// Final discharge strategy is DESIGN DECISION REQUIRED."
function describeDrainageNode(node: DrainageChainNode): string {
  if (node.state === "DESIGN_REFERENCE") return `${node.label} is a reference-only asset (DESIGN DECISION REQUIRED).`;
  if (node.state === "BLOCKED") return `${node.label} is BLOCKED (reference simulation).`;
  if (node.state === "RESTRICTED") return `${node.label} is RESTRICTED (reference simulation).`;
  return `${node.label} is clear.`;
}

export function explainDrainageState(drainage: DrainageOperationalState): string {
  const parts = ["Drainage (reference simulation) — wastewater path from Apartment 6A's fixtures to the B1 reference discharge point:"];
  for (const node of drainage.wastewaterBackbone) parts.push(describeDrainageNode(node));
  parts.push("Final discharge strategy beyond the B1 reference point (municipal connection, treatment, pump) is DESIGN DECISION REQUIRED (DD10).");
  parts.push(`Vent: single-stack — the same soil/waste stack continues to its roof termination (a real, common configuration); per-fixture individual venting, if required, is DESIGN DECISION REQUIRED (DD10).`);
  parts.push("Stormwater is a genuinely separate reference chain (roof drain, downpipe, site discharge) — none of it is engineered yet; all DESIGN DECISION REQUIRED (DD10).");
  return parts.join(" ");
}

export function explainAsset(twinData: TwinDataProvider, twinRuntime: TwinRuntimeProvider, ref: string): string {
  const asset = twinData.getAsset(ref);
  if (!asset) return "I don't have information on that.";
  const runtime = twinRuntime.getState(ref);
  if (!runtime) return `${asset.label}: no runtime state available.`;
  const s = runtime.state;
  const label = asset.label;

  // Electrical System V1.1 — GRID-01 and GEN-01 are the two anchors
  // building-level power questions resolve to (see lunaIntentParser.ts's
  // matchBuildingPower and matchQuery's own asset-alias resolution for
  // "Are we on generator?"/"Is utility available?") — both get the exact
  // same building-power narrative, never two divergent explanations of
  // the same live state.
  if (ref === "LUNA-B1-ELECTRICAL-GRID-01" || ref === "LUNA-B1-ELECTRICAL-GEN-01") {
    const power = resolveBuildingPower();
    if (power) return explainBuildingPower(power);
  }
  // L06 distribution / 6A meter / 6A DB — "what source is L06 using",
  // "is Apartment 6A powered" answer with the SAME live activeSource,
  // never a separate guess.
  if (ref === "LUNA-L06-ELECTRICAL-BRANCH-01" || ref === "LUNA-L06-APT-A-METER-ELEC-01" || ref === "LUNA-L06-APT-A-DB-01") {
    const power = resolveBuildingPower();
    const energized = ref === "LUNA-L06-APT-A-METER-ELEC-01" ? s.supply_active !== false : s.energized !== false;
    const sourceNote = power && energized ? ` (currently via ${power.activeSource === "generator" ? "the generator" : power.activeSource === "utility" ? "utility" : "no active source"})` : "";
    return `${label} is ${energized ? "energized" : "de-energized"}${sourceNote}.`;
  }

  // Fire & Life Safety System V1 — PANEL-01 is the one anchor
  // "what is the fire status"/"where is the alarm"/"what triggered it"/
  // "what devices responded"/"show the active incident" questions resolve
  // to (see lunaIntentParser.ts's matchFireStatus). Always the SAME
  // narrative built from resolveFireState() — never a second, divergent
  // description of the same live state.
  if (ref === "LUNA-B1-FIRE-PANEL-01") {
    const fire = resolveFireState();
    if (fire) return explainFireState(fire);
  }
  // The L06 fire zone additionally reports whether IT is the current
  // alarm origin — "show me the affected floor" resolves here.
  if (ref === "LUNA-L06-FIRE-BRANCH-01") {
    const fire = resolveFireState();
    const pressurized = s.pressurized !== false;
    const base = `${label} is ${pressurized ? "pressurized" : "not pressurized"}.`;
    if (fire?.alarmActive && fire.affectedLevelRef === asset.ownerLevelRef) return `${base} This zone is the origin of the active alarm.`;
    return base;
  }

  // HVAC System V1 — AC-OUTDOOR-01 is the one aggregate anchor general
  // HVAC questions resolve to (see lunaIntentParser.ts's matchHvacStatus)
  // — the FULL reference-chain narrative, both zones plus condenser
  // demand, always built from resolveHvacState()'s live truth.
  if (ref === "LUNA-L06-APT-A-AC-OUTDOOR-01") {
    const hvac = resolveHvacState();
    if (hvac) return explainHvacState(hvac);
  }
  // A specific indoor unit gets its OWN zone sentence (state/target/room
  // temp/why-not-cooling) rather than the full aggregate narrative —
  // "is the AC running", "what is the setpoint" name one unit, not the
  // whole reference chain.
  if (ref === "LUNA-L06-APT-A-LIVING-AC-01" || ref === "LUNA-L06-APT-A-BED-01-AC-01") {
    const hvac = resolveHvacState();
    const zone = hvac?.zones.find((z) => z.ref === ref);
    if (zone) return describeHvacZone(zone);
  }

  // Access & Security System V1 — MAIN-01 is the one aggregate anchor
  // general access questions resolve to (see lunaIntentParser.ts's
  // matchAccessStatus), covering every registered point plus the real
  // event log — always the SAME narrative built from resolveAccessState(),
  // never a second, divergent description of the same live state.
  if (ref === "LUNA-GROUND-ACCESS-MAIN-01") {
    const access = resolveAccessState();
    if (access) return explainAccessState(access);
  }
  // The other two common points get their OWN single-point disclosure —
  // "is the service entrance locked" names one point, not the whole system.
  if (ref === "LUNA-B1-ACCESS-SERVICE-01" || ref === "LUNA-GROUND-ACCESS-LIFT-LOBBY-01") {
    const access = resolveAccessState();
    const point = access?.points.find((p) => p.ref === ref);
    if (point) return describeAccessPoint(point);
  }
  // CCTV & Spatial Security System V1 — the apartment video intercom is
  // the ONE real, canonical camera-to-access-point correlation in this
  // catalog (see lunaEngineeringRelationships.ts) — its own narrative
  // composes the camera's state, what it monitors, and the most recent
  // real access event at that point, so "show me the camera associated
  // with the last denied access" reads as a genuine investigation, not
  // just a bare online/offline line.
  if (ref === "LUNA-L06-APT-A-ENTRY-INTERCOM-01") {
    const camera = resolveCameraState(ref);
    const access = resolveAccessState();
    const lockPoint = access?.points.find((p) => p.ref === "LUNA-L06-APT-A-ENTRY-LOCK-01");
    if (camera) {
      const parts = [`${label} is ${camera.state} (reference simulation).`];
      if (lockPoint) parts.push(`It monitors Apartment 6A's entrance lock, currently ${lockPoint.locked ? "locked" : "unlocked"}.`);
      if (access?.lastEvent) parts.push(`Most recent access event: ${access.lastEvent.label}${access.lastEvent.detail ? ` (${access.lastEvent.detail})` : ""}.`);
      else parts.push("No access events recorded yet.");
      return parts.join(" ");
    }
  }
  // The four registered CCTV cameras all get the same live-state narrative,
  // built from resolveCameraState() — the single truth the CCTV Control
  // Board, Oyi and the 3D representation all share — plus which access
  // point (if any) it has a real, canonical monitored_by relationship to.
  if (ref === "LUNA-GROUND-SEC-CAM-01" || ref === "LUNA-GROUND-LOBBY-CAM-01" || ref === "LUNA-B1-PARKING-CAM-01" || ref === "LUNA-L06-COMMON-CAM-01") {
    const camera = resolveCameraState(ref);
    if (camera) {
      const monitored = camera.monitorsAccessPointRef ? twinData.getAsset(camera.monitorsAccessPointRef)?.label : null;
      return `${label} is ${camera.state} (reference simulation).${monitored ? ` Monitors: ${monitored}.` : ""}`;
    }
  }
  // Network/Edge & Physical Connectivity V1 — GATEWAY-01 is the one
  // aggregate anchor general network questions resolve to (see
  // lunaIntentParser.ts's matchNetworkInvestigation), covering the real
  // physical backbone chain plus the Wi-Fi AP and Oyi Edge/Core — always
  // the SAME narrative built from resolveNetworkState(), never a second,
  // divergent description of the same live state. THE NETWORK CARRIES
  // TRUTH, IT DOES NOT CREATE TRUTH: this narrative never claims a
  // connection for Edge/Core that isn't real.
  if (ref === "LUNA-B1-NET-GATEWAY-01") {
    const network = resolveNetworkState();
    if (network) return explainNetworkState(network);
  }
  if (ref === "LUNA-EDGE-CORE-01") {
    const network = resolveNetworkState();
    const onlineWord = network?.edgeCoreOnline ? "online" : "offline";
    return `${label} is ${onlineWord} (reference simulation). No established physical or logical connection exists between Oyi Edge/Core and the building's network infrastructure in this reference build (DESIGN DECISION REQUIRED) — this asset's own record already discloses it as a local prototype placeholder.`;
  }
  if (ref === "LUNA-GROUND-NET-WIFI-AP-01") {
    const network = resolveNetworkState();
    if (network) return `${label} is ${network.wifiApReachable ? `reachable, ${network.wifiApClientsConnected} clients connected` : "unreachable"} (reference simulation).`;
  }
  if (ref === "LUNA-RISER-NETWORK-01" || ref === "LUNA-L06-NETWORK-BRANCH-01" || ref === "LUNA-L06-APT-A-NET-ONT-01" || ref === "LUNA-L06-APT-A-ROUTER-01") {
    const network = resolveNetworkState();
    const node = network?.backbone.find((n) => n.ref === ref);
    if (node) return `${label} is ${node.reachable ? "reachable" : "unreachable"} (reference simulation), part of the real physical chain from Apartment 6A's own router up to the core network gateway.`;
  }
  // Drainage V1 — the apartment's own wet-area stack connection is the
  // aggregate anchor "show me the drainage from Apartment 6A" resolves to
  // (see lunaIntentParser.ts's matchDrainageInvestigation), covering the
  // whole wastewater/vent/stormwater picture plus DD10 in one narrative.
  if (ref === "LUNA-L06-APT-A-DRAIN-01") {
    const drainage = resolveDrainageState();
    if (drainage) return explainDrainageState(drainage);
  }
  // "Where does wastewater from this apartment terminate?" resolves
  // directly to the B1 reference point — a focused answer, not the full
  // aggregate dump, matching the brief's own required answer shape.
  if (ref === "LUNA-B1-DRAINAGE-MAIN-01") {
    return `${label}: the reference drainage route is traced to this collection/inspection point. Final discharge strategy (municipal connection, treatment, pump) is DESIGN DECISION REQUIRED (DD10).`;
  }
  // "Show me the soil stack serving Apartment 6A." Single-stack venting
  // means this same riser also functions as the vent — stated explicitly
  // so the answer is honest about what "soil stack" and "vent stack" both
  // refer to here.
  if (ref === "LUNA-RISER-DRAINAGE-01") {
    return `${label} carries wastewater from Apartment 6A's fixtures down to the B1 discharge reference point, and — in this reference building's single-stack configuration — continues up through the roof as the same system's vent.`;
  }
  if (ref === "LUNA-L06-DRAINAGE-BRANCH-01") {
    return `${label} is the Level 6 drainage connection point between Apartment 6A's own stack connection and the building's drainage riser.`;
  }
  if (ref === "LUNA-L06-APT-A-KITCHEN-DRAIN-01" || ref === "LUNA-L06-APT-A-BATH-01-DRAIN-01" || ref === "LUNA-L06-APT-A-BATH-02-DRAIN-01" || ref === "LUNA-L06-APT-A-BATH-03-DRAIN-01") {
    return `${label} drains to Apartment 6A's wet-area stack connection.`;
  }
  if (ref === "LUNA-ROOF-VENT-TERMINATION-01") {
    return `${label} is where the soil/waste stack terminates above the roof (single-stack venting, a real reference configuration). Per-fixture individual venting, if required, is DESIGN DECISION REQUIRED (DD10).`;
  }
  // "Show me the stormwater route from the roof." — the roof drain is the
  // aggregate anchor for the stormwater half of explainDrainageState().
  if (ref === "LUNA-ROOFTOP-STORM-DRAIN-01") {
    return `${label} is a reference stormwater collection point, feeding ${twinData.getAsset("LUNA-STORM-DOWNPIPE-01")?.label ?? "the downpipe"} toward ${twinData.getAsset("LUNA-SITE-STORM-DISCHARGE-01")?.label ?? "the site discharge reference"}. Sizing, gradient, coverage and the approved discharge authority are all DESIGN DECISION REQUIRED (DD10) — this reference chain exists to prove stormwater is modeled as a genuinely separate system from soil/waste drainage, never to claim an engineered design.`;
  }
  if (ref === "LUNA-STORM-DOWNPIPE-01") {
    return `${label} is a reference segment only — the full vertical run to grade is not modeled as continuous geometry. Routing is DESIGN DECISION REQUIRED (DD10).`;
  }
  if (ref === "LUNA-SITE-STORM-DISCHARGE-01") {
    return `${label} is a reference discharge point. Site levels, gravity feasibility and the approved discharge authority are DESIGN DECISION REQUIRED (DD10).`;
  }
  if (asset.kind === "camera") return `${label} is ${s.online === false ? "offline" : "online"}.`;
  if (asset.kind === "edge-node") return `${label} is ${s.online === false ? "offline" : "online"}${typeof s.uplink_up === "boolean" ? `, uplink ${s.uplink_up ? "up" : "down"}` : ""}.`;
  if (asset.kind === "access-point") return `${label} is online.`;

  if (s.schemaVersion === "luna.elevator/2") return `${label}: ${s.currentFloor ? `at ${formatFloor(s.currentFloor)}` : `passing ${formatFloor(s.passingFloorRef)} (estimated)`}, ${s.direction}, ${Number(s.positionY).toFixed(2)}m, doors ${s.doorState}${s.targetFloor ? `, destination ${formatFloor(s.targetFloor)}` : ""}. Simulated.`;
  if ("floor" in s) return `${label} is at ${formatFloor(s.floor)}, ${s.fault ? "faulted" : s.direction === "idle" ? "idle" : `moving ${s.direction}`}, doors ${s.door}.`;
  // Access & Security System V1 — the one governed, really-instrumented
  // reference lock also reports its last real access event (GRANTED,
  // DENIED, LOCKED, UNLOCKED), so "who attempted access"-style follow-ups
  // about THIS specific door read the same event log the Control Board does.
  if (ref === "LUNA-L06-APT-A-ENTRY-LOCK-01") {
    const access = resolveAccessState();
    const point = access?.points.find((p) => p.ref === ref);
    if (point) {
      const base = describeAccessPoint(point);
      return access?.lastEvent ? `${base} Most recent event: ${access.lastEvent.label}${access.lastEvent.detail ? ` (${access.lastEvent.detail})` : ""}, ${timeAgo(access.lastEvent.at)}.` : base;
    }
  }
  if ("locked" in s) return `${label} is ${s.locked ? "locked" : "unlocked"}.`;
  if ("position" in s) return `${label} is ${s.position === 0 ? "closed" : s.position === 100 ? "fully open" : `at ${s.position}% open`}.`;
  if ("target_temp_c" in s) return `${label} is ${s.on ? "on" : "off"}${s.on ? `, set to ${s.target_temp_c}°C in ${s.mode} mode` : ""}.`;
  if ("leak" in s) return s.leak ? `A leak has been detected at ${label}.` : `No leak detected at ${label}.`;
  if ("smoke" in s) return s.smoke ? `Smoke has been detected at ${label}.` : `No smoke detected at ${label}.`;
  if ("occupied" in s) return `${label} currently reads ${s.occupied ? "occupied" : "unoccupied"}.`;
  if ("temp_c" in s) return `${label}: ${s.temp_c}°C, ${s.humidity_pct}% humidity.`;
  if ("source" in s) return `Power is currently supplied by the ${s.source}${s.fault ? " (fault present)" : ""}.`;
  if ("fuel_level_pct" in s) return `${label} is ${s.running ? "running" : "off"}, ${s.mode} mode, ${s.fuel_level_pct}% fuel.`;
  if ("battery_pct" in s) return `${label} is ${s.on ? "on" : "off"}, battery ${s.battery_pct}%, load ${s.load_pct}%.`;
  if ("pressure_bar" in s) return `${label} is ${s.fault ? "faulted" : s.running ? `running at ${s.pressure_bar} bar` : "stopped"}.`;
  if ("running" in s) return `${label} is ${s.fault ? "faulted" : s.running ? "running" : "stopped"}.`;
  if ("level_pct" in s) return `${label} is at ${s.level_pct}% level.`;
  if ("reading_kwh" in s) return `${label} reads ${s.reading_kwh} kWh.`;
  if ("reading_m3" in s) return `${label} reads ${s.reading_m3} m³.`;
  if ("on" in s) return `${label} is ${s.on ? "on" : "off"}.`;
  if ("open" in s) return `${label} is ${s.open ? "open" : "closed"}.`;
  if ("alarm_active" in s) return `${label}: ${s.alarm_active ? "alarm active" : "normal"}${s.trouble ? ", trouble condition" : ""}.`;
  if ("alarm" in s) return `${label}: ${s.alarm ? "alarm triggered" : "normal"}.`;
  if ("pressurized" in s) return `${label} is ${s.pressurized ? `pressurized (${s.pressure_bar} bar)` : "not pressurized"}.`;
  if ("clients_connected" in s) return `${label}: ${s.clients_connected} clients connected.`;
  if ("uplink_up" in s) return `${label}: uplink ${s.uplink_up ? "up" : "down"}.`;
  if (Object.keys(s).length === 0) return `${label} is a context asset with no live telemetry point.`;
  return `${label}: ${JSON.stringify(s)}`;
}
