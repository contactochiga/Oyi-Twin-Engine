// Luna Residences — operational asset data (Phase 4).
//
// This is the "Luna local simulation" half of the Twin Data Provider
// principle: every ref, capability, and seeded state below is copied
// verbatim from the actual local backend data already applied in
// Ochiga-backend (pilot/luna-residences/phase3c_infrastructure.sql and
// devices.csv, imported via scripts/pilot-import.mjs's DEVICE_CAPABILITY_MAP)
// — nothing here is invented for the viewer. Where the backend seeded no
// device_states row (the 19 apartment devices — pilot-import.mjs only
// inserts into `devices`, never `device_states`), seededState is left
// `null` rather than fabricated, and the info panel is expected to say so
// plainly.
//
// Positions are local coordinates: relative to `unitRef`'s own origin when
// set (the same space InteriorLayer places rooms into for L06 Apartment A),
// otherwise relative to `ownerLevelRef`'s massing-group origin. `y` is each
// asset's floor/mount contact point — OperationalAssetMarker lifts its own
// geometry by half its height, so authors here always think in "where does
// this thing touch the floor/wall," not geometric centers.
//
// Placement is deliberately zoned, not routed: B1 electrical/water/fire
// each get their own clear sub-area of the basement footprint, matching the
// spirit (not literal engineering coordination) of the backend's own zone
// assignments (LUNA-BASEMENT-1 / LUNA-GROUND-1 / LUNA-ROOFTOP / LUNA-FLOOR-06
// in zones.csv and the twin_entity_placements rows in phase3c_infrastructure.sql).

import type { OperationalAssetRecord } from "../../engine/twinData";
import { LUNA_CORES } from "../lunaProgramme";
import { LUNA_MEP_BACKBONE_ASSETS } from "./lunaMepBackbone";

type Draft = Omit<OperationalAssetRecord, "simulation">;

function asset(d: Draft): OperationalAssetRecord {
  return { ...d, simulation: true };
}

// ============================================================
// Electrical — Basement (B1)
// ============================================================
const ELECTRICAL: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-B1-ELECTRICAL-GRID-01",
    label: "Grid / Incoming Supply",
    kind: "device",
    system: "electrical",
    type: "power_system",
    locationLabel: "Basement (B1) — Electrical Room",
    ownerLevelRef: "LUNA-B1",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -20, y: 0, z: -10 },
  }),
  asset({
    ref: "LUNA-B1-ELECTRICAL-MDB-01",
    label: "Main Electrical Distribution Board",
    kind: "device",
    system: "electrical",
    type: "power_system",
    locationLabel: "Basement (B1) — Electrical Room",
    ownerLevelRef: "LUNA-B1",
    parentRef: "LUNA-B1-ELECTRICAL-GRID-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -16, y: 0, z: -10 },
  }),
  asset({
    ref: "LUNA-B1-ELECTRICAL-GEN-01",
    label: "Standby Generator 01",
    kind: "device",
    system: "electrical",
    type: "power_system",
    locationLabel: "Basement (B1) — Electrical Room",
    ownerLevelRef: "LUNA-B1",
    classification: "controllable",
    capabilities: ["power.on", "power.off", "set_mode"],
    seededState: { simulated: true, running: false, fuel_level_pct: 82, mode: "auto" },
    position: { x: -20, y: 0, z: -5 },
  }),
  asset({
    ref: "LUNA-B1-ELECTRICAL-ATS-01",
    label: "ATS / Changeover Switch 01",
    kind: "device",
    system: "electrical",
    type: "controller",
    locationLabel: "Basement (B1) — Electrical Room",
    ownerLevelRef: "LUNA-B1",
    parentRef: "LUNA-B1-ELECTRICAL-MDB-01",
    classification: "controllable",
    capabilities: ["set_source"],
    seededState: { simulated: true, source: "grid", auto_mode: true, fault: false },
    position: { x: -16, y: 0, z: -5 },
  }),
  asset({
    ref: "LUNA-B1-ELECTRICAL-INV-01",
    label: "Inverter / Battery Backup (Representative)",
    kind: "device",
    system: "electrical",
    type: "power_system",
    locationLabel: "Basement (B1) — Electrical Room",
    ownerLevelRef: "LUNA-B1",
    parentRef: "LUNA-B1-ELECTRICAL-MDB-01",
    classification: "controllable",
    capabilities: ["power.on", "power.off"],
    seededState: { simulated: true, on: true, battery_pct: 76, load_pct: 32 },
    position: { x: -12, y: 0, z: -5 },
  }),
  asset({
    ref: "LUNA-B1-ELECTRICAL-METER-01",
    label: "Main Electricity Meter (Building)",
    kind: "device",
    system: "electrical",
    type: "energy_meter",
    locationLabel: "Basement (B1) — Electrical Room",
    ownerLevelRef: "LUNA-B1",
    parentRef: "LUNA-B1-ELECTRICAL-MDB-01",
    classification: "observable",
    capabilities: [],
    seededState: { simulated: true, reading_kwh: 0 },
    position: { x: -16, y: 0, z: 1 },
  }),
];

// ============================================================
// Water — Basement (B1)
// ============================================================
const WATER: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-B1-WATER-TANK-01",
    label: "Main Water Storage Tank",
    kind: "device",
    system: "water",
    type: "infrastructure_asset",
    locationLabel: "Basement (B1) — Water Plant",
    ownerLevelRef: "LUNA-B1",
    // Domestic Water Reference System V1 — the tank previously had no
    // parentRef (no upstream source was registered). LUNA-B1-WATER-INTAKE-01
    // (lunaMepBackbone.ts) is the new incoming-supply demarcation; this is
    // purely additive, not a change to an existing relationship.
    parentRef: "LUNA-B1-WATER-INTAKE-01",
    classification: "observable",
    capabilities: [],
    seededState: { simulated: true, level_pct: 68 },
    position: { x: -4, y: 0, z: -10 },
  }),
  asset({
    ref: "LUNA-B1-WATER-TREAT-01",
    label: "Water Treatment Unit",
    kind: "device",
    system: "water",
    type: "infrastructure_asset",
    locationLabel: "Basement (B1) — Water Plant",
    ownerLevelRef: "LUNA-B1",
    parentRef: "LUNA-B1-WATER-TANK-01",
    classification: "observable",
    capabilities: [],
    seededState: { simulated: true, running: true, fault: false },
    position: { x: 0, y: 0, z: -10 },
  }),
  asset({
    ref: "LUNA-B1-WATER-BP-01",
    label: "Booster Pump 01",
    kind: "device",
    system: "water",
    type: "pump",
    locationLabel: "Basement (B1) — Water Plant",
    ownerLevelRef: "LUNA-B1",
    parentRef: "LUNA-B1-WATER-TANK-01",
    classification: "controllable",
    capabilities: ["power.on", "power.off"],
    seededState: { simulated: true, running: true, pressure_bar: 3.2, fault: false },
    position: { x: -4, y: 0, z: -5 },
  }),
  asset({
    ref: "LUNA-B1-WATER-BP-02",
    label: "Booster Pump 02",
    kind: "device",
    system: "water",
    type: "pump",
    locationLabel: "Basement (B1) — Water Plant",
    ownerLevelRef: "LUNA-B1",
    parentRef: "LUNA-B1-WATER-TANK-01",
    classification: "controllable",
    capabilities: ["power.on", "power.off"],
    seededState: { simulated: true, running: false, pressure_bar: 0, fault: false },
    position: { x: 0, y: 0, z: -5 },
  }),
  asset({
    ref: "LUNA-B1-WATER-METER-01",
    label: "Main Water Meter (Building)",
    kind: "device",
    system: "water",
    type: "water_meter",
    locationLabel: "Basement (B1) — Water Plant",
    ownerLevelRef: "LUNA-B1",
    classification: "observable",
    capabilities: [],
    seededState: { simulated: true, reading_m3: 0 },
    position: { x: 4, y: 0, z: -5 },
  }),
  asset({
    ref: "LUNA-B1-WATER-VALVE-01",
    label: "Water Isolation/Control Valve (Building Main)",
    kind: "device",
    system: "water",
    type: "switch",
    locationLabel: "Basement (B1) — Water Plant",
    ownerLevelRef: "LUNA-B1",
    classification: "controllable",
    capabilities: ["open", "close"],
    seededState: { simulated: true, open: true },
    position: { x: 8, y: 0, z: -10 },
  }),
];

// ============================================================
// Fire — Basement (B1) panel/pump/tank, detector on Ground
// ============================================================
const FIRE: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-B1-FIRE-PANEL-01",
    label: "Fire Alarm Control Panel",
    kind: "device",
    system: "fire",
    type: "controller",
    locationLabel: "Basement (B1) — Fire Control Room",
    ownerLevelRef: "LUNA-B1",
    classification: "controllable",
    capabilities: ["silence", "reset"],
    seededState: { simulated: true, alarm_active: false, trouble: false, zones_ok: true },
    position: { x: 14, y: 0, z: -10 },
  }),
  asset({
    ref: "LUNA-B1-FIRE-PUMP-01",
    label: "Fire Pump",
    kind: "device",
    system: "fire",
    type: "pump",
    locationLabel: "Basement (B1) — Fire Control Room",
    ownerLevelRef: "LUNA-B1",
    parentRef: "LUNA-B1-FIRE-PANEL-01",
    classification: "controllable",
    capabilities: ["power.on", "power.off"],
    seededState: { simulated: true, running: false, pressure_bar: 0, fault: false },
    position: { x: 14, y: 0, z: -5 },
  }),
  asset({
    ref: "LUNA-B1-FIRE-TANK-01",
    label: "Fire Water Tank",
    kind: "device",
    system: "fire",
    type: "infrastructure_asset",
    locationLabel: "Basement (B1) — Fire Control Room",
    ownerLevelRef: "LUNA-B1",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 18, y: 0, z: -10 },
  }),
  asset({
    ref: "LUNA-GROUND-FIRE-DET-01",
    label: "Fire Detector (Common Area, Ground)",
    kind: "device",
    system: "fire",
    type: "sensor",
    locationLabel: "Ground — Common Area",
    ownerLevelRef: "LUNA-GROUND",
    parentRef: "LUNA-B1-FIRE-PANEL-01",
    classification: "observable",
    capabilities: [],
    seededState: { simulated: true, alarm: false },
    position: { x: 16, y: 2.3, z: 13 },
  }),
];

// ============================================================
// HVAC — common-area plant, Rooftop
// ============================================================
const HVAC: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-ROOFTOP-HVAC-PLANT-01",
    label: "Common-Area AHU / Chiller Plant (Rooftop)",
    kind: "device",
    system: "hvac",
    type: "climate",
    locationLabel: "Rooftop — Technical Zone",
    ownerLevelRef: "LUNA-ROOFTOP",
    classification: "controllable",
    capabilities: ["power.on", "power.off", "set_mode"],
    seededState: { simulated: true, power: "on", mode: "cool", supply_temp_c: 18 },
    position: { x: 3, y: 0, z: 0 },
  }),
];

// ============================================================
// Vertical transport — canonical refs and x/z match LUNA_CORES exactly
// (lunaProgramme.ts); markers sit at Ground (matches every elevator's
// seeded floor: "GROUND" state), just off the shaft centreline on the
// lobby-facing side so they read as door/call-point indicators rather
// than sitting invisibly inside the shaft's own solid mesh.
// ============================================================
const CORE_BY_REF = new Map(LUNA_CORES.map((c) => [c.ref, c]));
function elevatorPosition(ref: string) {
  const core = CORE_BY_REF.get(ref)!;
  return { x: core.x, y: 0, z: 2.3 };
}
const ELEVATORS: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-LIFT-PASS-01",
    label: "Passenger Elevator 01",
    kind: "device",
    system: "vertical-transport",
    type: "elevator",
    locationLabel: "Ground — Lift Lobby (current floor)",
    ownerLevelRef: "LUNA-GROUND",
    classification: "controllable",
    capabilities: ["call", "select_floor"],
    seededState: { simulated: true, floor: "GROUND", direction: "idle", door: "closed", fault: false },
    position: elevatorPosition("LUNA-LIFT-PASS-01"),
  }),
  asset({
    ref: "LUNA-LIFT-PASS-02",
    label: "Passenger Elevator 02",
    kind: "device",
    system: "vertical-transport",
    type: "elevator",
    locationLabel: "Ground — Lift Lobby (current floor)",
    ownerLevelRef: "LUNA-GROUND",
    classification: "controllable",
    capabilities: ["call", "select_floor"],
    seededState: { simulated: true, floor: "GROUND", direction: "idle", door: "closed", fault: false },
    position: elevatorPosition("LUNA-LIFT-PASS-02"),
  }),
  asset({
    ref: "LUNA-LIFT-PASS-03",
    label: "Passenger Elevator 03",
    kind: "device",
    system: "vertical-transport",
    type: "elevator",
    locationLabel: "Ground — Lift Lobby (current floor)",
    ownerLevelRef: "LUNA-GROUND",
    classification: "controllable",
    capabilities: ["call", "select_floor"],
    seededState: { simulated: true, floor: "GROUND", direction: "idle", door: "closed", fault: false },
    position: elevatorPosition("LUNA-LIFT-PASS-03"),
  }),
  asset({
    ref: "LUNA-LIFT-SERVICE-01",
    label: "Service / Fire Elevator 01",
    kind: "device",
    system: "vertical-transport",
    type: "elevator",
    locationLabel: "Ground — Lift Lobby (current floor)",
    ownerLevelRef: "LUNA-GROUND",
    classification: "controllable",
    capabilities: ["call", "select_floor", "fire_service_mode"],
    seededState: { simulated: true, floor: "GROUND", direction: "idle", door: "closed", fault: false, fire_service_mode: false },
    position: elevatorPosition("LUNA-LIFT-SERVICE-01"),
  }),
];

// ============================================================
// Security — cameras (facility_cameras table, not devices)
// ============================================================
const SECURITY: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-GROUND-SEC-CAM-01",
    label: "Ground Entrance Camera",
    kind: "camera",
    system: "security",
    type: "camera",
    locationLabel: "Ground — Main Entrance",
    ownerLevelRef: "LUNA-GROUND",
    classification: "observable",
    capabilities: [],
    seededState: null,
    position: { x: 0, y: 2.6, z: 15 },
  }),
  asset({
    ref: "LUNA-GROUND-LOBBY-CAM-01",
    label: "Lobby Camera",
    kind: "camera",
    system: "security",
    type: "camera",
    locationLabel: "Ground — Lobby",
    ownerLevelRef: "LUNA-GROUND",
    classification: "observable",
    capabilities: [],
    seededState: null,
    position: { x: 0, y: 2.6, z: 3 },
  }),
  asset({
    ref: "LUNA-B1-PARKING-CAM-01",
    label: "Parking / B1 Camera",
    kind: "camera",
    system: "security",
    type: "camera",
    locationLabel: "Basement Parking",
    ownerLevelRef: "LUNA-B1",
    classification: "observable",
    capabilities: [],
    seededState: null,
    position: { x: 10, y: 2.8, z: 5 },
  }),
  asset({
    ref: "LUNA-L06-COMMON-CAM-01",
    label: "Floor 6 Common Area Camera",
    kind: "camera",
    system: "security",
    type: "camera",
    locationLabel: "Level 6 Corridor",
    ownerLevelRef: "LUNA-L06",
    classification: "observable",
    capabilities: [],
    seededState: null,
    position: { x: 0, y: 2.4, z: -3 },
  }),
];

// ============================================================
// Access — access_points table
// ============================================================
const ACCESS: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-GROUND-ACCESS-MAIN-01",
    label: "Main Resident Entrance",
    kind: "access-point",
    system: "access",
    type: "pedestrian_entrance",
    locationLabel: "Ground — Main Entrance",
    ownerLevelRef: "LUNA-GROUND",
    classification: "observable",
    capabilities: [],
    seededState: null,
    position: { x: 0, y: 0.2, z: 16 },
  }),
  asset({
    ref: "LUNA-B1-ACCESS-SERVICE-01",
    label: "Service Entrance",
    kind: "access-point",
    system: "access",
    type: "service_entrance",
    locationLabel: "Basement (B1) — Service Entrance",
    ownerLevelRef: "LUNA-B1",
    classification: "observable",
    capabilities: [],
    seededState: null,
    position: { x: 10, y: 0.2, z: 8 },
  }),
  asset({
    ref: "LUNA-GROUND-ACCESS-LIFT-LOBBY-01",
    label: "Lift Lobby Access (Ground)",
    kind: "access-point",
    system: "access",
    type: "lift_lobby",
    locationLabel: "Ground — Lift Lobby",
    ownerLevelRef: "LUNA-GROUND",
    classification: "observable",
    capabilities: [],
    seededState: null,
    position: { x: 9, y: 0.2, z: -4.5 },
  }),
];

// ============================================================
// Network / Edge
// ============================================================
const NETWORK_EDGE: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-B1-NET-GATEWAY-01",
    label: "Core Network Gateway / Router",
    kind: "device",
    system: "network-edge",
    type: "gateway",
    locationLabel: "Basement (B1) — Network Room",
    ownerLevelRef: "LUNA-B1",
    classification: "observable",
    capabilities: [],
    seededState: { simulated: true, uplink_up: true },
    position: { x: -20, y: 0, z: 8 },
  }),
  asset({
    ref: "LUNA-GROUND-NET-WIFI-AP-01",
    label: "Wi-Fi Access Point (Common Area)",
    kind: "device",
    system: "network-edge",
    type: "gateway",
    locationLabel: "Ground — Common Area",
    ownerLevelRef: "LUNA-GROUND",
    parentRef: "LUNA-B1-NET-GATEWAY-01",
    classification: "observable",
    capabilities: [],
    seededState: { simulated: true, clients_connected: 0 },
    position: { x: -16, y: 2.4, z: 13 },
  }),
  asset({
    ref: "LUNA-EDGE-CORE-01",
    label: "Luna Oyi Edge Core",
    kind: "edge-node",
    system: "network-edge",
    type: "edge_node",
    locationLabel: "Basement (B1) — Network Room",
    ownerLevelRef: "LUNA-B1",
    classification: "observable",
    capabilities: [],
    seededState: { simulated: true, notes: "Local digital-twin prototype placeholder, no real edge runtime connected" },
    position: { x: -20, y: 0, z: 12 },
  }),
];

// ============================================================
// Apartment A devices — 19 devices, repositioned this phase (Apartment A
// Full Interior Reality V1) for the new 14-room layout (see
// interiors/lunaInteriors.ts LUNA_L06_APT_A) — the old grid these
// positions used to target no longer exists. Same refs/capabilities as
// before; only position/locationLabel changed. unitRef makes these local
// to the apartment's own origin, not the level's.
// ============================================================
const APT_A = "LUNA-L06-APT-A";
const APARTMENT_DEVICES: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-L06-APT-A-ENTRY-LOCK-01",
    label: "Entrance Smart Lock",
    kind: "device",
    system: "apartment-devices",
    type: "lock",
    locationLabel: "Level 06, Apartment A — Foyer",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    classification: "controllable",
    capabilities: ["lock", "unlock"],
    seededState: null,
    position: { x: 5.681818, y: 1.1, z: 5.9 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-ENTRY-INTERCOM-01",
    label: "Video Intercom / Doorbell",
    kind: "device",
    system: "apartment-devices",
    type: "camera",
    locationLabel: "Level 06, Apartment A — Foyer",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    classification: "controllable",
    capabilities: ["stream.start", "stream.stop", "door_release"],
    seededState: null,
    position: { x: 6.3, y: 1.6, z: 5.9 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-LIVING-LIGHT-01",
    label: "Living Room Light Circuit 1",
    kind: "device",
    system: "apartment-devices",
    type: "light",
    locationLabel: "Level 06, Apartment A — Living Room",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    // Phase 13 — every light now hangs off a real lighting circuit (see
    // lunaMepBackbone.ts's APARTMENT_A_MEP_TERMINATIONS), not the meter
    // directly: Meter -> DB -> Circuit -> Fixture, matching how a real
    // consumer unit actually distributes lighting.
    parentRef: "LUNA-L06-APT-A-LIGHTING-CIRCUIT-01",
    classification: "controllable",
    capabilities: ["power.on", "power.off"],
    seededState: null,
    position: { x: 1.5, y: 2.1, z: -3.0 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-LIVING-LIGHT-02",
    label: "Living Room Light Circuit 2",
    kind: "device",
    system: "apartment-devices",
    type: "light",
    locationLabel: "Level 06, Apartment A — Living Room",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-LIGHTING-CIRCUIT-01",
    classification: "controllable",
    capabilities: ["power.on", "power.off"],
    seededState: null,
    position: { x: 6.0, y: 2.1, z: -3.0 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-KITCHEN-LIGHT-01",
    label: "Kitchen Light Circuit",
    kind: "device",
    system: "apartment-devices",
    type: "light",
    locationLabel: "Level 06, Apartment A — Kitchen",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-LIGHTING-CIRCUIT-01",
    classification: "controllable",
    capabilities: ["power.on", "power.off"],
    seededState: null,
    position: { x: 5.663043, y: 2.1, z: 0.5 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-BED-01-LIGHT-01",
    label: "Primary Bedroom Light Circuit",
    kind: "device",
    system: "apartment-devices",
    type: "light",
    locationLabel: "Level 06, Apartment A — Primary Bedroom",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-LIGHTING-CIRCUIT-02",
    classification: "controllable",
    capabilities: ["power.on", "power.off"],
    seededState: null,
    position: { x: -4.763043, y: 2.1, z: -3.478986 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-BED-02-LIGHT-01",
    label: "Bedroom 2 Light Circuit",
    kind: "device",
    system: "apartment-devices",
    type: "light",
    locationLabel: "Level 06, Apartment A — Bedroom 2",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-LIGHTING-CIRCUIT-02",
    classification: "controllable",
    capabilities: ["power.on", "power.off"],
    seededState: null,
    position: { x: -4.763043, y: 2.1, z: 0.578986 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-BED-03-LIGHT-01",
    label: "Bedroom 3 Light Circuit",
    kind: "device",
    system: "apartment-devices",
    type: "light",
    locationLabel: "Level 06, Apartment A — Bedroom 3",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-LIGHTING-CIRCUIT-02",
    classification: "controllable",
    capabilities: ["power.on", "power.off"],
    seededState: null,
    position: { x: -4.763043, y: 2.1, z: 4.636957 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-LIVING-CURTAIN-01",
    label: "Living Room Curtain",
    kind: "device",
    system: "apartment-devices",
    type: "curtain",
    locationLabel: "Level 06, Apartment A — Living Room",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    classification: "controllable",
    capabilities: ["open", "close", "set_position"],
    seededState: null,
    // The real south exterior/facade wall — matches the real balcony door.
    position: { x: 3.763043, y: 2.0, z: -5.9 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-BED-01-CURTAIN-01",
    label: "Primary Bedroom Curtain",
    kind: "device",
    system: "apartment-devices",
    type: "curtain",
    locationLabel: "Level 06, Apartment A — Primary Bedroom",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    classification: "controllable",
    capabilities: ["open", "close", "set_position"],
    seededState: null,
    // The real west exterior/facade wall.
    position: { x: -7.6, y: 2.0, z: -3.478986 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-LIVING-AC-01",
    label: "Living Room AC",
    kind: "device",
    system: "apartment-devices",
    type: "climate",
    locationLabel: "Level 06, Apartment A — Living Room",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    // Phase 10: no dedicated HVAC riser is fabricated (split units are
    // electrically, not hydronically, served) — power provenance routes
    // through the unit's electricity meter, same as any other circuit.
    // Phase 13: routed through the dedicated AC power branch (see
    // lunaMepBackbone.ts), not the meter directly — Meter -> DB -> AC
    // Circuit -> unit, matching the lighting circuits' same layering.
    parentRef: "LUNA-L06-APT-A-AC-CIRCUIT-01",
    classification: "controllable",
    capabilities: ["power.on", "power.off", "set_temperature", "set_mode"],
    seededState: null,
    position: { x: 2.0, y: 2.2, z: -5.5 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-BED-01-AC-01",
    label: "Primary Bedroom AC",
    kind: "device",
    system: "apartment-devices",
    type: "climate",
    locationLabel: "Level 06, Apartment A — Primary Bedroom",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-AC-CIRCUIT-01",
    classification: "controllable",
    capabilities: ["power.on", "power.off", "set_temperature", "set_mode"],
    seededState: null,
    position: { x: -6.5, y: 2.2, z: -3.478986 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-LIVING-TH-01",
    label: "Living Room Temperature & Humidity Sensor",
    kind: "device",
    system: "apartment-devices",
    type: "sensor",
    locationLabel: "Level 06, Apartment A — Living Room",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    classification: "observable",
    capabilities: [],
    seededState: null,
    position: { x: 3.763043, y: 1.4, z: -3.0 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-LIVING-OCC-01",
    label: "Living Room Occupancy Sensor",
    kind: "device",
    system: "apartment-devices",
    type: "sensor",
    locationLabel: "Level 06, Apartment A — Living Room",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    classification: "observable",
    capabilities: [],
    seededState: null,
    position: { x: 5.0, y: 2.3, z: -3.0 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-ENTRY-SMOKE-01",
    label: "Entry Smoke Detector",
    kind: "device",
    system: "apartment-devices",
    type: "sensor",
    locationLabel: "Level 06, Apartment A — Foyer",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-FIRE-BRANCH-01",
    classification: "observable",
    capabilities: [],
    seededState: null,
    position: { x: 5.663043, y: 2.3, z: 4.5 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-KITCHEN-LEAK-01",
    label: "Kitchen Leak Sensor",
    kind: "device",
    system: "apartment-devices",
    type: "sensor",
    locationLabel: "Level 06, Apartment A — Kitchen",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    classification: "observable",
    capabilities: [],
    seededState: null,
    position: { x: 5.363043, y: 0.1, z: 0.3 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-UTILITY-VALVE-01",
    label: "Water Isolation Valve",
    kind: "device",
    system: "apartment-devices",
    type: "switch",
    locationLabel: "Level 06, Apartment A — Utility",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-WATER-BRANCH-01",
    classification: "controllable",
    capabilities: ["open", "close"],
    seededState: null,
    position: { x: 0.6, y: 0.4, z: 5.0 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-METER-ELEC-01",
    label: "Apartment Electricity Meter",
    kind: "device",
    system: "apartment-devices",
    type: "energy_meter",
    locationLabel: "Level 06, Apartment A — Utility",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-ELECTRICAL-BRANCH-01",
    classification: "observable",
    capabilities: [],
    seededState: null,
    position: { x: 0.9, y: 1.2, z: 5.5 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-METER-WATER-01",
    label: "Apartment Water Meter",
    kind: "device",
    system: "apartment-devices",
    type: "water_meter",
    locationLabel: "Level 06, Apartment A — Utility",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    // Phase 13: downstream of the isolation valve, not the floor branch
    // directly — Branch -> Isolation Valve -> Meter -> apartment main,
    // matching where a meter is actually installed relative to its valve.
    parentRef: "LUNA-L06-APT-A-UTILITY-VALVE-01",
    classification: "observable",
    capabilities: [],
    seededState: null,
    position: { x: 0.3, y: 0.4, z: 5.5 },
  }),
];

export const LUNA_OPERATIONAL_ASSETS: OperationalAssetRecord[] = [
  ...ELECTRICAL,
  ...WATER,
  ...FIRE,
  ...HVAC,
  ...ELEVATORS,
  ...SECURITY,
  ...ACCESS,
  ...NETWORK_EDGE,
  ...APARTMENT_DEVICES,
  ...LUNA_MEP_BACKBONE_ASSETS,
];
