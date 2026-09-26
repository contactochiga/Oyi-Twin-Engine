import { buildTraversalWaypoints } from "../../engine/spatial/cameraTraversal";
import type { SpatialTransition } from "../../engine/spatial/transitions";
import { LUNA_GROUND_LOBBY, LUNA_L01_CLUB } from "../interiors/lunaInteriors";
import { LUNA_LEVELS } from "../lunaProgramme";

/** Open, measured common circulation, bound into the EXISTING transition engine.
 * These are walking waypoints, not doors, access assets or a second route engine. */
function pair(from: string, to: string, levelRef: string, xz: [number, number][]): SpatialTransition[] {
  const y = LUNA_LEVELS.find(l => l.ref === levelRef)!.baseElevation + 1.7;
  const points = xz.map(([x,z]) => ({x,y,z}));
  const t: SpatialTransition = { transitionId: `${from}-TO-${to}`, type: "OPEN_PASSAGE", fromSpaceRef: from, toSpaceRef: to, approachPoint: points[0], entryPoint: points[1], exitPoint: points.at(-1)!, crossingPath: points, accessRequirement: "NONE", clearanceRule: { requiredClearWidthMeters: 0.9 }, status: "CONFIRMED" };
  const reverse = [...points].reverse();
  return [t, { ...t, transitionId: `${t.transitionId}-REVERSE`, fromSpaceRef: to, toSpaceRef: from, approachPoint: reverse[0], entryPoint: reverse[1], exitPoint: reverse.at(-1)!, crossingPath: reverse }];
}
const lobby = LUNA_GROUND_LOBBY.interiorRef;
export const PODIUM_PASSAGES = [
  ...pair("LUNA-GROUND", lobby, "LUNA-GROUND", [[0,5],[0,8]]),
  ...pair(lobby, `${lobby}-RECEPTION`, "LUNA-GROUND", [[0,8],[-4,6],[-4,5]]),
  ...pair(lobby, `${lobby}-LOUNGE`, "LUNA-GROUND", [[0,8],[-9,8],[-9,4.5],[-15,4.5],[-15,0]]),
  ...pair(lobby, `${lobby}-LIFTS`, "LUNA-GROUND", [[0,8],[0,5],[0,2.85]]),
  ...pair(LUNA_L01_CLUB.ownerLevelRef, LUNA_L01_CLUB.interiorRef, LUNA_L01_CLUB.ownerLevelRef, [[0,5],[0,5.2]]),
  ...LUNA_L01_CLUB.rooms.flatMap(room => pair(LUNA_L01_CLUB.ownerLevelRef, room.ref, LUNA_L01_CLUB.ownerLevelRef,
    [[0,5.2],[room.x,5.2],[room.x,room.z+room.depth/2],[room.x,room.z+room.depth/2-1.2]])),
];

/** Human-scale minimum distance prevents OrbitControls pulling settled walking
 * waypoints back to its building-scale default. Other routes retain their settings. */
export function podiumTraversalWaypoints(transition: SpatialTransition) {
  const points = buildTraversalWaypoints(transition);
  const podium = [transition.fromSpaceRef, transition.toSpaceRef].some(ref =>
    ref.startsWith("LUNA-GROUND") || ref === "LUNA-L01-AMENITIES" || ref.startsWith("LUNA-L01-CLUB"));
  return podium ? points.map(p => ({ ...p, minDistance: 0.1, maxPolarAngle: Math.PI })) : points;
}
