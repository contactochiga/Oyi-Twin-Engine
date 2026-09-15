// Luna Residences — engineering relationship edges (Phase 13 §9).
//
// parentRef (lunaOperationalAssets.ts / lunaMepBackbone.ts) already answers
// most "where does this come from" questions via serviceRoute's chain walk
// — e.g. "what powers the Living Room AC" is just the AC's own parentRef
// chain (AC-CIRCUIT-01 -> DB-01 -> METER-ELEC-01), so it needs no new edge
// here. This file exists only for relationships that are NOT a parent/child
// walk: a valve isolates a branch it doesn't contain, a sensor protects a
// space it doesn't distribute anything to, two indoor AC units share one
// outdoor condenser they don't both descend from. Kept small and additive
// per the engine contract's own instruction — "add the minimum generic
// relationship abstraction needed," not a duplicate of the route graph.

import type { EngineeringRelationship } from "../../engine/engineeringRelationships";

const APT_A = "LUNA-L06-APT-A" as const;

export const LUNA_ENGINEERING_RELATIONSHIPS: EngineeringRelationship[] = [
  // Isolation — "Which valve isolates Apartment 6A?" The valve sits
  // upstream of the meter in the parentRef chain already, but the
  // isolated_by edge lets Oyi answer this as a direct lookup from the
  // apartment (or its water main) rather than requiring a full route walk.
  {
    from: APT_A,
    type: "isolated_by",
    to: "LUNA-L06-APT-A-UTILITY-VALVE-01",
    label: "water supply isolated by",
  },
  {
    from: "LUNA-L06-APT-A-WATER-MAIN-01",
    type: "isolated_by",
    to: "LUNA-L06-APT-A-UTILITY-VALVE-01",
  },

  // Fire protection — reverse direction of the smoke detector's own
  // parentRef (which points at the fire branch it's fed by, not at the
  // apartment it protects).
  {
    from: APT_A,
    type: "protected_by",
    to: "LUNA-L06-APT-A-ENTRY-SMOKE-01",
    label: "protected by",
  },

  // Leak monitoring — the kitchen leak sensor doesn't parent to the fixture
  // branch it watches (it's a standalone floor sensor, not a plumbing
  // component), so the relationship only exists as an edge.
  {
    from: "LUNA-L06-APT-A-KITCHEN-FIXTURE-BRANCH-01",
    type: "monitored_by",
    to: "LUNA-L06-APT-A-KITCHEN-LEAK-01",
    label: "leak-monitored by",
  },

  // HVAC — both indoor split units share one outdoor condenser. Their own
  // parentRef points at the electrical AC circuit (how they're powered),
  // which is a different relationship than what they're refrigerant-
  // connected to — exactly the case this abstraction exists for.
  {
    from: "LUNA-L06-APT-A-LIVING-AC-01",
    type: "connected_to",
    to: "LUNA-L06-APT-A-AC-OUTDOOR-01",
    label: "refrigerant-connected to",
  },
  {
    from: "LUNA-L06-APT-A-BED-01-AC-01",
    type: "connected_to",
    to: "LUNA-L06-APT-A-AC-OUTDOOR-01",
    label: "refrigerant-connected to",
  },

  // Phase 13 §7/§13 — Booster Pump 02 (lunaOperationalAssets.ts) has
  // existed since Phase 3C as a duty/standby pair with Booster Pump 01
  // (seededState.running: false — the standby member), but nothing
  // described what it actually serves: it isn't the water riser's own
  // parentRef target (BP-01 is), so "what does Booster Pump 02 serve?"
  // had no answer. This is the reverse-direction edge that gives it one —
  // relationshipsTo(edges, "LUNA-B1-WATER-BP-02", "supplied_by") resolves
  // to the water riser it stands by to supply.
  {
    from: "LUNA-RISER-WATER-01",
    type: "supplied_by",
    to: "LUNA-B1-WATER-BP-02",
    label: "standby-supplied by",
  },

  // Domestic Water Reference System V1 — the booster pumps' parentRef
  // points at the tank (unchanged — see lunaOperationalAssets.ts comment),
  // but they physically draw treated water, not raw storage. This edge
  // documents that real functional dependence without touching the
  // existing parentRef chain, exactly the case this file exists for.
  {
    from: "LUNA-B1-WATER-BP-01",
    type: "supplied_by",
    to: "LUNA-B1-WATER-TREAT-01",
    label: "treated water supplied by",
  },
  {
    from: "LUNA-B1-WATER-BP-02",
    type: "supplied_by",
    to: "LUNA-B1-WATER-TREAT-01",
    label: "treated water supplied by",
  },
  // The building-main header/isolation valve isn't in the riser's own
  // parentRef chain (the riser parents to BP-01, its pump source) — this
  // edge is what lets Oyi answer "which valve isolates the water riser?"
  // and is also the semantic link recomputeWaterNetwork()'s isolation
  // effect is grounded in (lunaSimulationProvider.ts).
  {
    from: "LUNA-RISER-WATER-01",
    type: "isolated_by",
    to: "LUNA-B1-WATER-VALVE-01",
    label: "isolated by (building main)",
  },

  // Electrical System V1 — ATS-01's parentRef points at MDB-01 (its
  // physical/distribution position), not at the two sources it actually
  // switches between. These edges let Oyi and recomputePowerNetwork()
  // answer "what feeds the ATS" as a direct lookup, matching the exact
  // precedent set by the water riser's standby-supply edge above.
  {
    from: "LUNA-B1-ELECTRICAL-ATS-01",
    type: "supplied_by",
    to: "LUNA-B1-ELECTRICAL-GRID-01",
    label: "primary source (utility)",
  },
  {
    from: "LUNA-B1-ELECTRICAL-ATS-01",
    type: "supplied_by",
    to: "LUNA-B1-ELECTRICAL-GEN-01",
    label: "standby source (generator)",
  },

  // Fire System V1 — PUMP-01's parentRef is PANEL-01 (its alarm/control
  // monitoring position, matching the alarm network's own hierarchy — see
  // docs/LUNA_FIRE_LIFE_SAFETY_REFERENCE_SPEC.md §3's "two distinct
  // networks" decision), not its hydraulic water source. This edge is the
  // separate real functional dependency, the same precedent as the water
  // pumps' own supplied_by-treatment edges above.
  {
    from: "LUNA-B1-FIRE-PUMP-01",
    type: "supplied_by",
    to: "LUNA-B1-FIRE-TANK-01",
    label: "fire water supplied by",
  },

  // CCTV & Spatial Security System V1 — camera-to-access-point coverage.
  // Deliberately NOT inferred from proximity/distance (the brief's own
  // explicit prohibition): only asserted where the two assets share the
  // same real locationLabel AND sit within ~1m of each other. Every other
  // access point/camera pair (Service Entrance vs the Parking camera,
  // different locationLabels 3m apart; Lift Lobby; Floor 6 corridor
  // camera) is deliberately left WITHOUT an edge — an honest, disclosed
  // DESIGN DECISION REQUIRED gap, not a guess.
  {
    from: "LUNA-GROUND-ACCESS-MAIN-01",
    type: "monitored_by",
    to: "LUNA-GROUND-SEC-CAM-01",
    label: "camera-monitored by",
  },
  // The apartment's own entrance lock and its video intercom/doorbell sit
  // at the identical locationLabel ("Level 06, Apartment A — Entry") less
  // than a metre apart — the intercom already IS a camera-kind device in
  // the canonical schedule (`kind: "camera"`), not a separate CCTV asset,
  // so this is the correct, real correlation for the one governed
  // reference access point Access V1 actually generates events for.
  {
    from: "LUNA-L06-APT-A-ENTRY-LOCK-01",
    type: "monitored_by",
    to: "LUNA-L06-APT-A-ENTRY-INTERCOM-01",
    label: "camera-monitored by",
  },
];
