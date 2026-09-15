import type { SiteAnchor } from "../engine/geo/types";
import { IDENTITY_BUILDING_TRANSFORM } from "../engine/geo/types";
import { LUNA_SITE } from "./lunaProgramme";

// Luna Residences — geospatial site configuration (Phase 15B).
//
// This file is Luna-specific on purpose (see LunaBuilding.tsx's own
// header note) — it is the "content" fed into the building-agnostic
// src/engine/geo primitives, exactly the way lunaProgramme.ts feeds the
// building-agnostic level/structure engine.

/** Explicit conceptual-site disclosure — surfaced in the UI/report, not
 * just a code comment, per the Phase 15 brief's own instruction not to
 * bury this. Luna Residences is a fictional/conceptual Oyi reference
 * development. LUNA_SITE_ANCHOR marks a conceptual spatial location along
 * the Ahmadu Bello Way / Eko Atlantic-facing corridor of Victoria Island,
 * Lagos — it is not a cadastral parcel, and it is not a claim that Ochiga
 * owns, develops, or has any right to the real land at this coordinate.
 * Every other feature in this project's Ring 2/3 context (real roads,
 * real neighbouring building footprints) is genuine OpenStreetMap data —
 * see OSM_ATTRIBUTION.md for provenance — surrounding, not underneath,
 * the fictional Luna parcel (see LUNA_RING1_ENVELOPE below, and the
 * Ring 2 prep script's exclusion-zone culling).
 */
export const LUNA_SITE_DISPLAY = {
  name: "Luna Residences",
  location: "Ahmadu Bello Way / Coastal Victoria Island axis, Lagos, Nigeria",
  disclosure: "Conceptual development / Oyi reference building",
} as const;

/** The real-world anchor.
 *
 * Phase 15C: nudged ~99m north from the original Phase 15B anchor
 * (6.4213 → 6.4222, longitude unchanged) so Luna reads as a credible
 * Ahmadu Bello Way frontage/setback site rather than a plot 145m removed
 * from the named road. Verified against the same real Overpass extract
 * (OSM_ATTRIBUTION.md) before moving: at this anchor the nearest Ahmadu
 * Bello Way point is only ~45m away (a plausible tower setback/forecourt
 * depth — see the Ring 1 access connector in LunaEnvironment.tsx, which
 * now reaches Ahmadu Bello Way itself, not a side street), while the
 * nearest real OSM building is ~88m away — safely outside Luna's own
 * Ring 1 envelope (LUNA_RING1_ENVELOPE below), so this move introduces no
 * conflict with any identifiable mapped/occupied building. Even so, per
 * the Phase 15C brief, Luna's canonical location is worded as "Ahmadu
 * Bello Way / Coastal Victoria Island axis" — not "on Ahmadu Bello Way" —
 * since a 45m setback is a frontage relationship, not a literal street
 * address, and the site itself remains explicitly fictional/conceptual
 * (see LUNA_SITE_DISPLAY above).
 *
 * Heading is derived from actual geography, not chosen for convenience:
 * at this anchor, Ahmadu Bello Way's nearest point bears 350.5° — still
 * essentially due north (9.5° of error, inside this exercise's own
 * tolerance) — and Luna's existing Phase 2–14 architecture already faces
 * its arrival canopy/driveway/signage toward local +Z (see
 * LunaEnvironment.tsx). Setting heading=0 keeps local +Z coincident with
 * true north, so the real road (Ring 2) connects to Luna's *already-built*
 * arrival sequence (Ring 1) with minimal distortion — the single
 * relationship this phase's own brief weighs most heavily.
 *
 * One disclosed consequence, unchanged from Phase 15B: real coastline/Eko
 * Atlantic bears ~166° from the anchor (nearly due south) — under
 * heading=0 that lands at local -Z, directly *behind* the building, not
 * at local -X where Phase 1–14's original artistic waterfront plane sat
 * (already retired — see the Phase 15B report §6). */
export const LUNA_SITE_ANCHOR: SiteAnchor = {
  anchor: { lat: 6.4222, lon: 3.4238 },
  headingDegrees: 0,
};

/** Identity — Luna's authored local (0,0,0) already coincides with its
 * site's own local ENU origin, so nothing about its existing geometry
 * needs to move (see src/engine/geo/types.ts's BuildingTransform doc for
 * why this type still exists for a future, non-identity building). */
export const LUNA_BUILDING_TRANSFORM = IDENTITY_BUILDING_TRANSFORM;

/** The conceptual Ring 1 envelope — a generous rectangle around Luna's
 * authored site footprint (LUNA_SITE is 62m × 52m, centred on local
 * origin) padded to also cover the arrival driveway/forecourt/landscaping
 * LunaEnvironment.tsx already extends beyond the bare footprint. Any real
 * OSM building whose local bounding box intersects this envelope is
 * culled by the Ring 2 prep script — the real parcel underneath/adjacent
 * to the anchor is never rendered as if it were the proposed Luna site. */
export const LUNA_RING1_ENVELOPE = {
  minX: -LUNA_SITE.width / 2 - 8,
  maxX: LUNA_SITE.width / 2 + 8,
  minZ: -LUNA_SITE.depth / 2 - 10,
  maxZ: LUNA_SITE.depth / 2 + 24,
};

/** Ring radii, metres from local origin — the three context bands the
 * Phase 15 brief defines. Ring 2's outer radius doubles as the
 * distance-gate threshold past which Ring 2 detail is hidden to protect
 * close-building/interior performance (§8 of the Phase 15B report). */
export const LUNA_CONTEXT_RINGS = {
  ring1OuterRadius: 100,
  ring2OuterRadius: 500,
  ring3OuterRadius: 1400,
};
