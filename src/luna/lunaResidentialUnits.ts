// Luna Residences — generated per-level residential unit data (Phase 16A).
//
// ============================================================
// DISCLOSURE — matching the exact convention lunaInteriors.ts already
// established (see its own "canonical-STYLE refs" comment): only
// LUNA-L06-APT-A/B/C/D and LUNA-L10-APT-A are real, backend-seeded units
// (pilot/luna-residences/homes.csv). Every OTHER residential level's units
// generated here are conceptual/reference data — deterministic, not
// random, but not backed by any real database row — so the Level Card /
// Apartment Card presentation system (Phase 16A) has genuine data to
// render for every residential level, not just the one level Phase 3
// happened to model in full. This is disclosed here, in the Phase 16A
// completion report, and via `isCanonicalBackendUnit` on every record, not
// silently implied to already be real.
// ============================================================
//
// Two tiers, matching a believable real-tower convention (and matching the
// Phase 16A reference image's own "Premium Residential Floor — 3 Units"
// framing for the upper levels):
//   - STANDARD tier (L02-L09): 4 units per floor, reusing L06's own
//     quartered-around-a-core grid exactly (so L06 itself needs no special
//     casing — it's just the one standard-tier floor with real backend data).
//   - PREMIUM tier (L10-L12): 3 larger units per floor, matching L10's
//     already-modeled single "Apartment A (Premium)" unit's spirit.
//
// Occupancy for the 5 real units keeps using the SAME lunaUnitLifecycle.ts
// values untouched (never overridden here); every generated unit gets a
// deterministic (hash-based, never Math.random — matching this codebase's
// established "controlled variation" convention, e.g. LevelFacade.tsx's
// windowState()) occupied/available/reserved assignment.

import type { UnitLifecycleState } from "../engine/representationPolicy";
import { LUNA_LEVELS, LUNA_L06_UNITS, LUNA_L06_CORE_BAND, LUNA_L10_APT_A_UNIT, LUNA_L06 } from "./lunaProgramme";
import { LUNA_UNIT_LIFECYCLE } from "./policy/lunaUnitLifecycle";

export type ResidentialTier = "standard" | "premium";

export interface ResidentialUnitRecord {
  ref: string;
  label: string;
  levelRef: string;
  tier: ResidentialTier;
  unitType: string;
  bedrooms: number;
  /** Real backend-seeded row vs. Phase 16A generated reference data — see
   * the file-level disclosure above. */
  isCanonicalBackendUnit: boolean;
  lifecycle: UnitLifecycleState;
  planX: number;
  planZ: number;
  planWidth: number;
  planDepth: number;
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

function deterministicLifecycle(ref: string): UnitLifecycleState {
  // 65% occupied / 20% available / 15% reserved — a believable, stable,
  // non-random distribution (same bucketing spirit as LevelFacade's
  // windowState hash), not tuned to make any particular level's numbers
  // match a specific example.
  const bucket = hash(ref) % 20;
  if (bucket < 13) return "occupied";
  if (bucket < 17) return "available";
  return "reserved";
}

const STANDARD_LEVELS = ["LUNA-L02", "LUNA-L03", "LUNA-L04", "LUNA-L05", "LUNA-L06", "LUNA-L07", "LUNA-L08", "LUNA-L09"];
const PREMIUM_LEVELS = ["LUNA-L10", "LUNA-L11", "LUNA-L12"];

// The standard tier's plan geometry is L06's own quartered-around-a-core
// layout, applied identically to every standard level (same tower
// footprint, same core position — only the level and refs change).
const STANDARD_SLOTS = LUNA_L06_UNITS.map((u) => ({ suffix: u.ref.slice(-1), planX: u.planX, planZ: u.planZ, planWidth: u.planWidth, planDepth: u.planDepth }));

// Premium tier: 3 larger units per floor, spanning the same tower
// footprint (36x28) more generously than the 4-way standard split —
// two side units flanking the core, one full-depth unit across the back,
// deliberately different geometry so a premium floor's plan visibly reads
// as fewer/bigger residences, not just a relabeled standard floor.
const PREMIUM_SLOTS = [
  { suffix: "A", planX: -10, planZ: -3, planWidth: 15, planDepth: 20 },
  { suffix: "B", planX: 10, planZ: -3, planWidth: 15, planDepth: 20 },
  { suffix: "C", planX: 0, planZ: 11, planWidth: 34, planDepth: 6 },
];

// L06 Gold Standard (Part 4/12) — the real canonical programme is A=3BED,
// B=3BED, C=2BED, D=2BED, not a uniform "every standard-tier unit is
// 2-bedroom" default. L06 is the one standard-tier level with real
// backend-seeded units (isCanonicalBackendUnit: true below), so it is the
// one level this phase corrects at the source of truth rather than
// leaving every generated standard floor mislabeled — every OTHER
// standard level (L02-L05, L07-L09) keeps the disclosed-as-reference
// uniform 2-bedroom default unchanged, since this phase does not touch
// their canonical metadata.
const L06_BEDROOM_MIX: Record<string, { bedrooms: number; unitType: string }> = {
  A: { bedrooms: 3, unitType: "3 Bed Residence" },
  B: { bedrooms: 3, unitType: "3 Bed Residence" },
  C: { bedrooms: 2, unitType: "2 Bed Residence" },
  D: { bedrooms: 2, unitType: "2 Bed Residence" },
};

function buildUnitsForLevel(levelRef: string, tier: ResidentialTier): ResidentialUnitRecord[] {
  const slots = tier === "standard" ? STANDARD_SLOTS : PREMIUM_SLOTS;
  const defaultBedrooms = tier === "standard" ? 2 : 3;
  const defaultUnitType = tier === "standard" ? "2 Bed Residence" : "3 Bed Premium";
  const levelLabel = LUNA_LEVELS.find((l) => l.ref === levelRef)?.label ?? levelRef;

  return slots.map((slot) => {
    const ref = `${levelRef}-APT-${slot.suffix}`;
    const isCanonical = ref in LUNA_UNIT_LIFECYCLE;
    const mix = levelRef === "LUNA-L06" ? L06_BEDROOM_MIX[slot.suffix] : undefined;
    return {
      ref,
      label: `Apartment ${slot.suffix} — ${levelLabel}`,
      levelRef,
      tier,
      unitType: mix?.unitType ?? defaultUnitType,
      bedrooms: mix?.bedrooms ?? defaultBedrooms,
      isCanonicalBackendUnit: isCanonical,
      lifecycle: isCanonical ? LUNA_UNIT_LIFECYCLE[ref] : deterministicLifecycle(ref),
      planX: slot.planX,
      planZ: slot.planZ,
      planWidth: slot.planWidth,
      planDepth: slot.planDepth,
    };
  });
}

/** Every generated residential unit, across every standard + premium
 * level. L06's four entries here carry `isCanonicalBackendUnit: true` and
 * the real lifecycle values from lunaUnitLifecycle.ts unchanged. */
export const LUNA_RESIDENTIAL_UNITS: ResidentialUnitRecord[] = [
  ...STANDARD_LEVELS.flatMap((ref) => buildUnitsForLevel(ref, "standard")),
  ...PREMIUM_LEVELS.flatMap((ref) => buildUnitsForLevel(ref, "premium")),
];

export function residentialUnitsForLevel(levelRef: string): ResidentialUnitRecord[] {
  return LUNA_RESIDENTIAL_UNITS.filter((u) => u.levelRef === levelRef);
}

export function residentialUnit(unitRef: string): ResidentialUnitRecord | undefined {
  return LUNA_RESIDENTIAL_UNITS.find((u) => u.ref === unitRef);
}

// Re-exported so callers building a floor plan / level card don't need to
// separately import the core band shape from lunaProgramme.ts.
export const RESIDENTIAL_CORE_BAND = LUNA_L06_CORE_BAND;

// LUNA-L10's single canonical premium unit (LUNA-L10-APT-A, real backend
// data) intentionally keeps using its OWN existing record from
// lunaProgramme.ts rather than being folded into the 3-unit premium-tier
// generation above — Phase 3 modeled it as a deliberate single
// representative residence, not one of three. Level 10's card therefore
// shows exactly that one real unit (see LevelContextCard.tsx), while
// Levels 11-12 show the generated 3-unit premium layout. Exported here so
// LevelContextCard can special-case L10 without importing lunaProgramme.ts
// twice.
export const LUNA_L10_CANONICAL_UNIT = LUNA_L10_APT_A_UNIT;

export interface UnitPlanGeometry {
  levelRef: string;
  x: number;
  z: number;
  width: number;
  depth: number;
}

/** Uniform "where is this unit, in plan" lookup across all three unit data
 * sources (L06's own hand-authored units, L10's single canonical unit,
 * and every Phase 16A generated unit) — so camera/selection code never
 * needs to know which source a given unitRef came from. */
export function unitPlanGeometry(unitRef: string): UnitPlanGeometry | undefined {
  const l06 = LUNA_L06_UNITS.find((u) => u.ref === unitRef);
  if (l06) return { levelRef: LUNA_L06.ref, x: l06.planX, z: l06.planZ, width: l06.planWidth, depth: l06.planDepth };
  if (unitRef === LUNA_L10_APT_A_UNIT.ref) {
    return { levelRef: LUNA_L10_APT_A_UNIT.parentRef, x: LUNA_L10_APT_A_UNIT.x, z: LUNA_L10_APT_A_UNIT.z, width: LUNA_L10_APT_A_UNIT.width, depth: LUNA_L10_APT_A_UNIT.depth };
  }
  const generated = residentialUnit(unitRef);
  if (generated) return { levelRef: generated.levelRef, x: generated.planX, z: generated.planZ, width: generated.planWidth, depth: generated.planDepth };
  return undefined;
}
