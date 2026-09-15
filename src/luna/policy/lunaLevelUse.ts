// Luna Residences — level-use classification for the Phase 8
// representation policy. Deliberately separate from lunaMaterials.ts's
// private LevelTier (which only ever picks facade/massing materials) —
// policy logic should not depend on a rendering-only module, and the two
// classifications are allowed to diverge later (e.g. a level could change
// tenancy without changing its facade material).

export type LunaLevelUse = "plant" | "common" | "amenity" | "residential" | "rooftop";

export const LUNA_LEVEL_USE: Record<string, LunaLevelUse> = {
  "LUNA-B1": "plant",
  "LUNA-GROUND": "common",
  "LUNA-L01-AMENITIES": "amenity",
  "LUNA-L02": "residential",
  "LUNA-L03": "residential",
  "LUNA-L04": "residential",
  "LUNA-L05": "residential",
  "LUNA-L06": "residential",
  "LUNA-L07": "residential",
  "LUNA-L08": "residential",
  "LUNA-L09": "residential",
  "LUNA-L10": "residential",
  "LUNA-L11": "residential",
  "LUNA-L12": "residential",
  "LUNA-PENTHOUSE": "residential",
  "LUNA-ROOFTOP": "rooftop",
};

export function levelUse(levelRef: string): LunaLevelUse | undefined {
  return LUNA_LEVEL_USE[levelRef];
}

export function isResidentialLevel(levelRef: string): boolean {
  return LUNA_LEVEL_USE[levelRef] === "residential";
}

/** Facility-managed levels remain fully explorable in 3D under the Phase 8
 * privacy policy — everything that isn't a private residential floor. */
export function isFacilityManagedLevel(levelRef: string): boolean {
  const use = LUNA_LEVEL_USE[levelRef];
  return use === "plant" || use === "common" || use === "amenity" || use === "rooftop";
}
