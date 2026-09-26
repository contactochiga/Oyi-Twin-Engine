import { LUNA_CORES, LUNA_LEVELS } from "../lunaProgramme";

/** Ground/L01 Phase 2 — LUNA_REFERENCE_DESIGN, not engineered construction.
 * Level datums are finished walking surfaces, matching existing lift thresholds.
 * No atrium/overlook is defined. The 14×6 Reception remains the future study zone.
 */
export const PODIUM_LEVEL_REFS = ["LUNA-GROUND", "LUNA-L01-AMENITIES"] as const;
export const isCoordinatedPodiumLevel = (ref: string) => PODIUM_LEVEL_REFS.some(r => r === ref);
export const PODIUM_CEILINGS = {
  arrival: 4.2,
  reception: 4.2, // Reception's existing footprint is the Grand Arrival study zone.
  lounge: 3.6,
  gallery: 2.95,
  amenities: 2.8,
} as const;
export const L01_AMENITY_CENTER_Z = -4;
export const L01_AMENITY_DOOR_WIDTH = 1.4;
export const GROUND_ARRIVAL = { x: 0, z: 12.5, width: 14, depth: 7 };
export const FUTURE_ATRIUM_STUDY = {
  x: 0, z: 6, width: 14, depth: 6,
  status: "FUTURE OPTION — GROUND/L01 GRAND ATRIUM + L01 OVERLOOK; NOT IMPLEMENTED",
} as const;

/** Existing portals are authoritative; openings here provide their approach through
 * the reference core wall, without relocating any shaft or operational door. */
export const PODIUM_CORE_OPENINGS = PODIUM_LEVEL_REFS.flatMap(ref => {
  const level = LUNA_LEVELS.find(l => l.ref === ref)!;
  return LUNA_CORES.filter(c => c.ref.includes("LIFT")).map(c => ({ x: c.x, width: 1.4, baseElevation: level.baseElevation, height: 2.5 }));
});

/** L01 stair access faces use the existing Ground reference door dimensions.
 * Static architectural boundaries: no actuator, fire rating or stair traversal claimed. */
export const L01_STAIR_DOORS = LUNA_CORES.filter(c=>c.ref.includes("STAIR")).map(c=>({
  ref: `${c.ref}-L01-DOOR-01`, stairRef:c.ref, label:`${c.label} — L01 Door`,
  x:c.x, z:c.z-c.depth/2-.06, width:1.05, height:2.1,
}));
