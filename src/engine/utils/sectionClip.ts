import * as THREE from "three";

// Oyi Twin Engine — section/cutaway clip planes (Phase 13 §11).
//
// A genuine GPU material-clipping-plane cut, not a boolean/CSG geometry
// operation — Three.js's per-material clippingPlanes is a stable, cheap,
// well-supported feature (a fragment-shader discard test), not the fragile
// kind of "clipping" the brief warns off; it is exactly the safe "simpler
// controlled sectional reveal" it asks for if full CSG would be fragile.
// One shared plane per side (not per mesh) — every facade/massing material
// building-wide references the same four THREE.Plane instances, so
// toggling section mode is a material-array swap, never new allocation
// per frame. Planes cut through the building's horizontal center (x=0 or
// z=0) rather than an arbitrary offset, since every Luna level's footprint
// is centered on that same origin regardless of its own width/depth.
export type SectionSide = "north" | "south" | "east" | "west";

const SECTION_PLANES: Record<SectionSide, THREE.Plane> = {
  // north = -z (matches lunaStructuralElements.ts's own RETAINING-N/S
  // convention) — cutting "north" keeps the +z half visible.
  north: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
  south: new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
  east: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
  west: new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
};

/** The clip-plane array to assign to a facade/massing material's own
 * `clippingPlanes` — empty (no clipping) when section mode is off. */
export function sectionClipPlanes(sectionMode: boolean, sectionSide: SectionSide): THREE.Plane[] {
  return sectionMode ? [SECTION_PLANES[sectionSide]] : [];
}
