// Oyi Twin Engine — geospatial anchoring contract (Phase 15).
//
// Building-agnostic on purpose, matching every other file under
// src/engine: nothing here may name Luna or hardcode any Luna-specific
// value. A future building anchors itself to a real position with its own
// SiteAnchor + BuildingTransform, reusing this exact module.
//
// Critical architecture decision carried over from Phase 15A/15B: the
// existing twin's own local coordinate frame is NEVER moved or
// reprojected. Real-world geography is projected INTO the twin's existing
// local metre-based frame, not the other way around. This is what
// preserves every world-space-coupled system already built on that frame
// (section/cutaway clip planes, camera presets, room presets) without
// touching any of them — see src/engine/utils/sectionClip.ts and
// src/engine/components/CameraRig.tsx, both of which assume the twin's
// local origin never changes.

/** A real-world position, WGS84 degrees. Elevation is optional and, for
 * this phase, unused — Victoria Island's reclaimed-land site is flat
 * enough that a single ground datum (the twin's own y=0) is sufficient;
 * see the Phase 15A audit for why real DEM/terrain data was judged
 * unnecessary here. */
export interface GeoCoordinate {
  lat: number;
  lon: number;
  elevation?: number;
}

/** Where a building's local scene sits on Earth, and which way its local
 * +Z axis points. `headingDegrees` is a compass bearing (0 = true north,
 * 90 = east, clockwise) that local +Z represents *before* any
 * BuildingTransform rotation is applied — i.e. it defines the orientation
 * of the site's own local ENU frame, not the building's authored geometry
 * directly. Context geometry (roads, footprints, coastline) is projected
 * through this anchor; the building's own authored local coordinates are
 * never touched. */
export interface SiteAnchor {
  anchor: GeoCoordinate;
  headingDegrees: number;
}

/** How a building's already-authored local coordinates sit within its
 * site's local ENU frame. For a building whose local (0,0,0) already
 * coincides with its site's own local origin — true for Luna, see
 * src/luna/lunaSite.ts — this is the identity transform. It exists as a
 * real, non-Luna-specific concept for a future building whose authored
 * local origin sits elsewhere within its site (e.g. a corner rather than
 * a centreline), so that building's own local coordinates still don't
 * need to change — only this transform needs to be non-identity. */
export interface BuildingTransform {
  position: [number, number, number];
  rotationY: number;
}

export const IDENTITY_BUILDING_TRANSFORM: BuildingTransform = {
  position: [0, 0, 0],
  rotationY: 0,
};
