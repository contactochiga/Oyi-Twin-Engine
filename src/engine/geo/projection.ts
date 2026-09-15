import type { GeoCoordinate, SiteAnchor } from "./types";

// Oyi Twin Engine — geographic ↔ local-metre projection (Phase 15).
//
// Deliberately dependency-free (no proj4, no turf): at the <5km radius any
// Oyi context ring ever needs, a flat equirectangular/ENU approximation
// has sub-metre error — far tighter than this engine's own modelling
// fidelity (facades are authored to the nearest ~0.1m). Pulling in a full
// geodesy library to convert a few hundred static points once, offline,
// would be disproportionate. See the Phase 15A readiness report §6.
//
// The metres-per-degree constants below are the standard WGS84
// mid-latitude series expansion (accurate to well under 1m across the
// ±10° latitude band this engine will ever be used in), not a bare
// spherical-Earth constant — cheap to compute, meaningfully more accurate,
// still fully dependency-free.

function metersPerDegLat(latDeg: number): number {
  const phi = (latDeg * Math.PI) / 180;
  return 111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi) - 0.0023 * Math.cos(6 * phi);
}

function metersPerDegLon(latDeg: number): number {
  const phi = (latDeg * Math.PI) / 180;
  return 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi) + 0.118 * Math.cos(5 * phi);
}

/** Projects a real-world coordinate into the site's local metre-based
 * frame, as an [x, z] pair ready to use directly as Three.js scene
 * coordinates (y is left to the caller — every Oyi ground plane is y=0 by
 * convention already).
 *
 * `headingDegrees` is the compass bearing (0 = true north, clockwise)
 * that the site's local +Z axis represents. At heading 0 this reduces to
 * the intuitive case: local +Z = geographic north, local +X = geographic
 * east. Non-zero headings rotate the incoming geography to match — the
 * building's own authored geometry is never the thing that rotates (see
 * the module-level note in ./types.ts). */
export function geoToLocal(coord: GeoCoordinate, site: SiteAnchor): [number, number] {
  const east = (coord.lon - site.anchor.lon) * metersPerDegLon(site.anchor.lat);
  const north = (coord.lat - site.anchor.lat) * metersPerDegLat(site.anchor.lat);
  const theta = (site.headingDegrees * Math.PI) / 180;
  const x = east * Math.cos(theta) - north * Math.sin(theta);
  const z = east * Math.sin(theta) + north * Math.cos(theta);
  return [x, z];
}

/** Inverse of geoToLocal — recovers a real-world coordinate from a local
 * [x, z] scene position. Exists for completeness/tooling (e.g. reporting
 * "this asset is approximately at lat/lon X" for a future Oyi query) —
 * not required by any Phase 15B rendering path. */
export function localToGeo(x: number, z: number, site: SiteAnchor): GeoCoordinate {
  const theta = (site.headingDegrees * Math.PI) / 180;
  const east = x * Math.cos(theta) + z * Math.sin(theta);
  const north = -x * Math.sin(theta) + z * Math.cos(theta);
  const lon = site.anchor.lon + east / metersPerDegLon(site.anchor.lat);
  const lat = site.anchor.lat + north / metersPerDegLat(site.anchor.lat);
  return { lat, lon };
}
