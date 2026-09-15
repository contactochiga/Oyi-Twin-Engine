// Luna Residences — engineering MEP backbone (Phase 10).
//
// Unlike lunaOperationalAssets.ts, nothing in this file is claimed to be
// backend-sourced or construction-accurate: this is a credible, additive
// ENGINEERING REPRESENTATION built for demonstration — a semantic service
// graph (source -> distribution -> riser -> floor branch -> isolation
// point -> destination) that happens to carry spatial geometry, not a set
// of facts derived from mesh proximity. It must never be presented as
// certified design documentation.
//
// Every riser/branch here is a normal OperationalAssetRecord, reusing the
// exact same TwinDataProvider/parentRef mechanism lunaOperationalAssets.ts
// already established (see OperationalRelationshipLines.tsx, which was
// already drawing parent/child lines before this phase existed) — Phase
// 10 does not invent a second relationship system, it populates the
// existing one with vertical service topology.
//
// Scope is deliberately representative, not exhaustive: one riser per
// system (B1 -> roof), one set of floor branches at Level 6 (the one
// floor with real interior/device detail), and termination points at
// Apartment 6A. A future phase can add more floors' branches without
// changing this shape.

import type { OperationalAssetRecord } from "../../engine/twinData";

const APT_A = "LUNA-L06-APT-A";

function asset(d: Omit<OperationalAssetRecord, "simulation">): OperationalAssetRecord {
  return { ...d, simulation: true };
}

// A drainage system needs its own terminal/source object the way
// electrical has Grid and water has the storage tank — municipal
// discharge is the closest real-world equivalent to a drainage "source".
export const DRAINAGE_SOURCE: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-B1-DRAINAGE-MAIN-01",
    label: "Main Drainage / Municipal Discharge",
    kind: "device",
    system: "drainage",
    type: "infrastructure_asset",
    locationLabel: "Basement (B1) — Drainage Plant",
    ownerLevelRef: "LUNA-B1",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 4, y: 0, z: -14 },
  }),
];

// The riser cluster sits alongside the architectural service shaft
// (LUNA-RISER-01 in lunaProgramme.ts's LUNA_CORES, x=-8/z=0) — these are
// the five services actually routed inside/beside that shaft, each its
// own selectable canonical asset so Oyi and the UI can address "the
// water riser" independently of "the electrical riser".
export const RISERS: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-RISER-ELECTRICAL-01",
    label: "Electrical Riser (Representative)",
    kind: "device",
    system: "electrical",
    type: "riser",
    locationLabel: "Vertical Service Shaft — B1 to Roof",
    ownerLevelRef: "LUNA-B1",
    parentRef: "LUNA-B1-ELECTRICAL-MDB-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -8, y: 0, z: -0.6 },
  }),
  asset({
    ref: "LUNA-RISER-WATER-01",
    label: "Water Riser (Representative)",
    kind: "device",
    system: "water",
    type: "riser",
    locationLabel: "Vertical Service Shaft — B1 to Roof",
    ownerLevelRef: "LUNA-B1",
    parentRef: "LUNA-B1-WATER-BP-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -8, y: 0, z: -0.2 },
  }),
  asset({
    ref: "LUNA-RISER-DRAINAGE-01",
    label: "Drainage Stack (Representative)",
    kind: "device",
    system: "drainage",
    type: "riser",
    locationLabel: "Vertical Service Shaft — B1 to Roof",
    ownerLevelRef: "LUNA-B1",
    parentRef: "LUNA-B1-DRAINAGE-MAIN-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -8, y: 0, z: 0.2 },
  }),
  asset({
    ref: "LUNA-RISER-FIRE-01",
    label: "Fire Riser (Representative)",
    kind: "device",
    system: "fire",
    type: "riser",
    locationLabel: "Vertical Service Shaft — B1 to Roof",
    ownerLevelRef: "LUNA-B1",
    parentRef: "LUNA-B1-FIRE-PUMP-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -8, y: 0, z: 0.6 },
  }),
  asset({
    ref: "LUNA-RISER-NETWORK-01",
    label: "Data / Fiber Riser (Representative)",
    kind: "device",
    system: "network-edge",
    type: "riser",
    locationLabel: "Vertical Service Shaft — B1 to Roof",
    ownerLevelRef: "LUNA-B1",
    parentRef: "LUNA-B1-NET-GATEWAY-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -8, y: 0, z: 1.0 },
  }),
];

// One representative floor tap-off per system at Level 6 — the DISTRIBUTION
// POINT a route passes through between the vertical riser and whatever
// isolation/meter point actually serves a unit on that floor.
export const LEVEL_06_BRANCHES: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-L06-ELECTRICAL-BRANCH-01",
    label: "Level 6 Electrical Distribution Point",
    kind: "device",
    system: "electrical",
    type: "floor_branch",
    locationLabel: "Level 6 — Riser Cupboard",
    ownerLevelRef: "LUNA-L06",
    parentRef: "LUNA-RISER-ELECTRICAL-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -8, y: 0, z: -0.6 },
  }),
  asset({
    ref: "LUNA-L06-WATER-BRANCH-01",
    label: "Level 6 Water Distribution Point",
    kind: "device",
    system: "water",
    type: "floor_branch",
    locationLabel: "Level 6 — Riser Cupboard",
    ownerLevelRef: "LUNA-L06",
    parentRef: "LUNA-RISER-WATER-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -8, y: 0, z: -0.2 },
  }),
  asset({
    ref: "LUNA-L06-DRAINAGE-BRANCH-01",
    label: "Level 6 Drainage Connection Point",
    kind: "device",
    system: "drainage",
    type: "floor_branch",
    locationLabel: "Level 6 — Riser Cupboard",
    ownerLevelRef: "LUNA-L06",
    parentRef: "LUNA-RISER-DRAINAGE-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -8, y: 0, z: 0.2 },
  }),
  asset({
    ref: "LUNA-L06-FIRE-BRANCH-01",
    label: "Level 6 Fire Distribution Point",
    kind: "device",
    system: "fire",
    type: "floor_branch",
    locationLabel: "Level 6 — Riser Cupboard",
    ownerLevelRef: "LUNA-L06",
    parentRef: "LUNA-RISER-FIRE-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -8, y: 0, z: 0.6 },
  }),
  asset({
    ref: "LUNA-L06-NETWORK-BRANCH-01",
    label: "Level 6 Data Distribution Point",
    kind: "device",
    system: "network-edge",
    type: "floor_branch",
    locationLabel: "Level 6 — Riser Cupboard",
    ownerLevelRef: "LUNA-L06",
    parentRef: "LUNA-RISER-NETWORK-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -8, y: 0, z: 1.0 },
  }),
];

// Apartment A termination points — Facility-owned service infrastructure
// (like the existing meters/valve), never resident-owned smart-home
// devices, even though physically inside the unit. Repositioned this
// phase (Apartment A Full Interior Reality V1) into the Utility room's new
// location (see interiors/lunaInteriors.ts) — the old grid this used to
// target no longer exists.
export const APARTMENT_A_MEP_TERMINATIONS: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-L06-APT-A-NET-ONT-01",
    label: "Fiber Termination Point (ONT)",
    kind: "device",
    system: "network-edge",
    type: "ont",
    locationLabel: "Level 06 — Apartment A — Utility",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-NETWORK-BRANCH-01",
    classification: "observable",
    capabilities: [],
    seededState: { simulated: true, uplink_up: true },
    position: { x: 0.2, y: 1.4, z: 5.7 },
  }),
  // Phase 13 — representative data topology beyond the fiber termination
  // itself: the resident's own router/AP, downstream of the ONT. Distinct
  // from the ONT (Facility-owned demarcation point) the same way a real
  // apartment's router is the resident's own equipment plugged into it.
  asset({
    ref: "LUNA-L06-APT-A-ROUTER-01",
    label: "Home Router / Wi-Fi AP",
    kind: "device",
    system: "network-edge",
    type: "router",
    locationLabel: "Level 06 — Apartment A — Utility",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-NET-ONT-01",
    classification: "observable",
    capabilities: [],
    seededState: { simulated: true, uplink_up: true },
    position: { x: 0.5, y: 1.6, z: 5.7 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-DRAIN-01",
    label: "Wet-Area Drainage Connection",
    kind: "device",
    system: "drainage",
    type: "drain_point",
    locationLabel: "Level 06 — Apartment A — Utility",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-DRAINAGE-BRANCH-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 1.1, y: 0, z: 5.7 },
  }),
  // Representative stack-connection branches — bathroom and kitchen each
  // drain to the same wet-area stack connection above rather than each
  // getting their own riser, matching how a real apartment's soil stack
  // collects multiple fixture groups.
  asset({
    ref: "LUNA-L06-APT-A-KITCHEN-DRAIN-01",
    label: "Kitchen Drain",
    kind: "device",
    system: "drainage",
    type: "drain_point",
    locationLabel: "Level 06 — Apartment A — Kitchen",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-DRAIN-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 5.4, y: 0, z: 0.3 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-BATH-01-DRAIN-01",
    label: "Primary Ensuite Drain",
    kind: "device",
    system: "drainage",
    type: "drain_point",
    locationLabel: "Level 06 — Apartment A — Primary Ensuite",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-DRAIN-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -4.763043, y: 0, z: -5.507971 },
  }),
  // Electrical distribution: Meter -> DB -> Circuit -> fixture. The DB
  // (consumer unit) is the one new intermediate node; lighting/AC circuits
  // are what the existing light/AC devices now parent to (see
  // lunaOperationalAssets.ts), replacing "everything hangs off the meter
  // directly" with a real, if representative, distribution layer.
  asset({
    ref: "LUNA-L06-APT-A-DB-01",
    label: "Apartment Distribution Board",
    kind: "device",
    system: "electrical",
    type: "panel",
    locationLabel: "Level 06 — Apartment A — Utility",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-METER-ELEC-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 0.2, y: 1.6, z: 4.6 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-LIGHTING-CIRCUIT-01",
    label: "Lighting Circuit A (Living / Kitchen)",
    kind: "device",
    system: "electrical",
    type: "circuit",
    locationLabel: "Level 06 — Apartment A — Utility",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-DB-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 0.0, y: 1.6, z: 4.4 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-LIGHTING-CIRCUIT-02",
    label: "Lighting Circuit B (Bedrooms)",
    kind: "device",
    system: "electrical",
    type: "circuit",
    locationLabel: "Level 06 — Apartment A — Utility",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-DB-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 0.4, y: 1.6, z: 4.4 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-AC-CIRCUIT-01",
    label: "AC Power Branch",
    kind: "device",
    system: "electrical",
    type: "circuit",
    locationLabel: "Level 06 — Apartment A — Utility",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-DB-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 0.8, y: 1.8, z: 4.4 },
  }),
  // HVAC: the indoor units already exist (lunaOperationalAssets.ts) — this
  // is the one new node, the shared outdoor condenser both indoor units
  // connect to (see LUNA_ENGINEERING_RELATIONSHIPS' connected_to edges).
  // V1: relocated to the apartment's real outdoor amenity space — the
  // Balcony, attached to Living — rather than the old layout's arbitrary
  // corner (the old position no longer corresponds to any real exterior
  // opening in the new plan).
  asset({
    ref: "LUNA-L06-APT-A-AC-OUTDOOR-01",
    label: "AC Outdoor Condenser Unit",
    kind: "device",
    system: "hvac",
    type: "condenser",
    locationLabel: "Level 06 — Apartment A — Balcony",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-AC-CIRCUIT-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 6.5, y: 1.0, z: -7.4 },
  }),
  // Water: Branch -> Isolation Valve -> Meter (see lunaOperationalAssets.ts
  // re-parent) -> apartment main -> hot/cold distribution concept. Fixture
  // branches are representative, not exhaustive (kitchen + primary ensuite).
  asset({
    ref: "LUNA-L06-APT-A-WATER-MAIN-01",
    label: "Apartment Water Main",
    kind: "device",
    system: "water",
    type: "distribution_point",
    locationLabel: "Level 06 — Apartment A — Utility",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-METER-WATER-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 0.7, y: 0.4, z: 4.6 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-WATER-HOT-01",
    label: "Hot Water Distribution",
    kind: "device",
    system: "water",
    type: "distribution_point",
    locationLabel: "Level 06 — Apartment A — Utility",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-WATER-MAIN-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 0.5, y: 0.4, z: 4.3 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-WATER-COLD-01",
    label: "Cold Water Distribution",
    kind: "device",
    system: "water",
    type: "distribution_point",
    locationLabel: "Level 06 — Apartment A — Utility",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-WATER-MAIN-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 0.9, y: 0.4, z: 4.3 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-KITCHEN-FIXTURE-BRANCH-01",
    label: "Kitchen Fixture Branch",
    kind: "device",
    system: "water",
    type: "distribution_point",
    locationLabel: "Level 06 — Apartment A — Kitchen",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-WATER-COLD-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 5.4, y: 0.9, z: 0.3 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-BATH-01-FIXTURE-BRANCH-01",
    label: "Primary Ensuite Fixture Branch",
    kind: "device",
    system: "water",
    type: "distribution_point",
    locationLabel: "Level 06 — Apartment A — Primary Ensuite",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-WATER-HOT-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -4.763043, y: 0.9, z: -5.507971 },
  }),
];

// Domestic Water Reference System V1 — the chain's upstream source object
// (municipal/borehole incoming supply + backflow/isolation demarcation),
// EQ-WATER-INTAKE in the master equipment schedule, previously
// unregistered (existingCanonicalRefs: []). The tank now parents to this
// instead of having no upstream — additive, the tank never had a parentRef
// before this, so nothing existing is changed by giving it one.
export const WATER_INTAKE: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-B1-WATER-INTAKE-01",
    label: "Incoming Water Supply / Backflow Isolation",
    kind: "device",
    system: "water",
    type: "infrastructure_asset",
    locationLabel: "Basement (B1) — Water Plant",
    ownerLevelRef: "LUNA-B1",
    classification: "observable",
    capabilities: [],
    seededState: { simulated: true, supply_active: true },
    position: { x: -8, y: 0, z: -10 },
  }),
];

// Domestic Water Reference System V1 — Apartment 6A cold-water fixture
// coverage extended to all three registered bathrooms (only the Primary
// Bathroom had any branch before, and it was hot-only). No guest WC ref is
// created (ROOM-LUNA-L06-A-GUEST-WC has no canonicalRef yet — DD05
// unresolved, not silently invented here). Positions derived from each
// room's own center in lunaInteriors.ts, offset the same way the existing
// BATH-01-FIXTURE-BRANCH-01 sits relative to its room center.
export const APARTMENT_A_BATHROOM_COLD_BRANCHES: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-L06-APT-A-BATH-01-FIXTURE-BRANCH-02",
    label: "Primary Ensuite Cold Fixture Branch (WC / Basin / Shower)",
    kind: "device",
    system: "water",
    type: "distribution_point",
    locationLabel: "Level 06 — Apartment A — Primary Ensuite",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-WATER-COLD-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -4.763043, y: 0.9, z: -5.4 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-BATH-02-FIXTURE-BRANCH-01",
    label: "Ensuite 2 Cold Fixture Branch (WC / Basin / Shower)",
    kind: "device",
    system: "water",
    type: "distribution_point",
    locationLabel: "Level 06 — Apartment A — Ensuite 2",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-WATER-COLD-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -4.763043, y: 0.9, z: -1.45 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-BATH-03-FIXTURE-BRANCH-01",
    label: "Ensuite 3 Cold Fixture Branch (WC / Basin / Shower)",
    kind: "device",
    system: "water",
    type: "distribution_point",
    locationLabel: "Level 06 — Apartment A — Ensuite 3",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-WATER-COLD-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -4.763043, y: 0.9, z: 2.607972 },
  }),
];

// Matching wastewater coverage for the same two newly-served bathrooms —
// same pattern as the existing Kitchen/Bathroom 1 drains, parenting to the
// same wet-area stack connection (LUNA-L06-APT-A-DRAIN-01), never a new
// stack per fixture group.
export const APARTMENT_A_BATHROOM_DRAINS: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-L06-APT-A-BATH-02-DRAIN-01",
    label: "Ensuite 2 Drain",
    kind: "device",
    system: "drainage",
    type: "drain_point",
    locationLabel: "Level 06 — Apartment A — Ensuite 2",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-DRAIN-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -4.763043, y: 0, z: -1.45 },
  }),
  asset({
    ref: "LUNA-L06-APT-A-BATH-03-DRAIN-01",
    label: "Ensuite 3 Drain",
    kind: "device",
    system: "drainage",
    type: "drain_point",
    locationLabel: "Level 06 — Apartment A — Ensuite 3",
    ownerLevelRef: "LUNA-L06",
    unitRef: APT_A,
    parentRef: "LUNA-L06-APT-A-DRAIN-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -4.763043, y: 0, z: 2.607972 },
  }),
];

// Drainage V1 — vent. Real single-stack venting (a legitimate, common
// configuration, not an invented shortcut) is modeled by letting the
// EXISTING soil/waste stack (LUNA-RISER-DRAINAGE-01) continue through the
// roof as its own vent, rather than fabricating a second, separate vent
// riser the canonical schedule never registered (EQ-DUCTS/EQ-STORM-style
// "no registered instance yet" gap). The one new asset needed is the roof
// termination itself — everything below it (fixture -> branch -> floor ->
// stack) is the SAME real chain wastewater already uses, which is exactly
// how single-stack venting works in a real building: one pipe serves both
// functions. Per-fixture individual venting, if ever required, remains
// DD10 (see docs/LUNA_MEP_COORDINATION_SPEC.md).
export const DRAINAGE_VENT: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-ROOF-VENT-TERMINATION-01",
    label: "Vent Stack Roof Termination",
    kind: "device",
    system: "drainage",
    type: "vent_termination",
    locationLabel: "Rooftop — Vent Stack Termination",
    ownerLevelRef: "LUNA-ROOFTOP",
    parentRef: "LUNA-RISER-DRAINAGE-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: -8, y: 2.6, z: 0.2 },
  }),
];

// Drainage V1 — stormwater. A genuinely separate system from soil/waste
// (never merged — see docs/LUNA_MEP_COORDINATION_SPEC.md's explicit
// warning), and EQ-STORM had zero registered instances before this phase.
// Three new reference assets complete the brief's required proof chain:
// roof collection -> downpipe -> site discharge. The downpipe's full
// vertical run from roof to grade is NOT rendered as continuous geometry
// (that would mix a floor-local and a building-fixed transform without a
// real coordinated route — MEP Coordination Spec rule #10); each asset is
// placed at its own real level instead, and the gap is disclosed, not
// papered over with a fabricated pipe.
export const DRAINAGE_STORMWATER: OperationalAssetRecord[] = [
  asset({
    ref: "LUNA-ROOFTOP-STORM-DRAIN-01",
    label: "Roof Drain / Stormwater Collection",
    kind: "device",
    system: "drainage",
    type: "roof_drain",
    locationLabel: "Rooftop — Roof Drain",
    ownerLevelRef: "LUNA-ROOFTOP",
    parentRef: "LUNA-STORM-DOWNPIPE-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 11, y: 0, z: 7 },
  }),
  asset({
    ref: "LUNA-STORM-DOWNPIPE-01",
    label: "Stormwater Downpipe (Roof Connection)",
    kind: "device",
    system: "drainage",
    type: "downpipe",
    locationLabel: "Rooftop — Downpipe Head",
    ownerLevelRef: "LUNA-ROOFTOP",
    parentRef: "LUNA-SITE-STORM-DISCHARGE-01",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 12, y: 0, z: 7.5 },
  }),
  asset({
    ref: "LUNA-SITE-STORM-DISCHARGE-01",
    label: "Site Stormwater Collection / Discharge Reference",
    kind: "device",
    system: "drainage",
    type: "infrastructure_asset",
    locationLabel: "Site — Stormwater Discharge Interface",
    ownerLevelRef: "LUNA-GROUND",
    classification: "asset-only",
    capabilities: [],
    seededState: null,
    position: { x: 12, y: 0, z: 16 },
  }),
];

export const LUNA_MEP_BACKBONE_ASSETS: OperationalAssetRecord[] = [
  ...DRAINAGE_SOURCE,
  ...WATER_INTAKE,
  ...RISERS,
  ...LEVEL_06_BRANCHES,
  ...APARTMENT_A_MEP_TERMINATIONS,
  ...APARTMENT_A_BATHROOM_COLD_BRANCHES,
  ...APARTMENT_A_BATHROOM_DRAINS,
  ...DRAINAGE_VENT,
  ...DRAINAGE_STORMWATER,
];

/** Riser refs, for components that need to treat them as a distinct
 * spatial category (continuous full-height geometry) rather than a
 * point marker — see RiserShaft.tsx. */
export const RISER_REFS = RISERS.map((r) => r.ref);
