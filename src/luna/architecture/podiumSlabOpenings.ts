import { LUNA_CORES } from "../lunaProgramme";
import { rectangularPanels } from "../../engine/utils/rectangularPanels";
import type { BoxSpec } from "../../engine/utils/geometryUtils";

/** Approved coordination apertures, derived only from existing canonical cores.
 * No atrium, enlargement, new core identity or inferred service penetration.
 * Network sleeve markers outside the registered riser remain a disclosed issue.
 */
export const PODIUM_SLAB_OPENINGS = LUNA_CORES.map(c => ({
  canonicalRef: c.ref, x: c.x, z: c.z, width: c.width, depth: c.depth,
}));

/** Local-centred horizontal slab cells. Keeps host dimensions, height and origin.
 * Additional exclusions are for already-existing room finish surfaces only. */
export function podiumSlabPanels(width: number, depth: number, thickness: number, y = 0,
  roomFinishes: readonly { x: number; z: number; width: number; depth: number }[] = []): BoxSpec[] {
  return rectangularPanels(width, depth, thickness,
    [...PODIUM_SLAB_OPENINGS, ...roomFinishes].map(o => ({ x: o.x, y: o.z, width: o.width, height: o.depth })))
    .map(b => ({ size: [b.size[0], thickness, b.size[1]], position: [b.position[0], y, b.position[1]] }));
}
