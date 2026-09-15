import { LUNA_L06_APT_A, type RoomLayoutSpec } from "../interiors/lunaInteriors";
import { L06_APT_A_MASSING_FRAME, L06_LEVEL_FRAME } from "./l06AptAFrame";
import type { SpatialTransition } from "../../engine/spatial/transitions";
import type { NormalizedRoom, NormalizedDoor } from "../../engine/spatial/types";
import type { CameraFlightTarget } from "../../engine/components/CameraRig";
export const APARTMENT_REFERENCE_STATUS = "LUNA_REFERENCE_DESIGN";
export const apartmentRooms = LUNA_L06_APT_A.rooms;
export function apartmentWorldPoint(x: number, z: number) { return {x:x+L06_APT_A_MASSING_FRAME.x,y:L06_LEVEL_FRAME.baseElevation+1.7,z:z+L06_APT_A_MASSING_FRAME.z}; }
export function apartmentPlanPoint(x: number, z: number) {return {x:x-L06_APT_A_MASSING_FRAME.x,z:z-L06_APT_A_MASSING_FRAME.z};}
export function apartmentRoomCamera(room: RoomLayoutSpec): CameraFlightTarget {
 const p=apartmentWorldPoint(room.x,room.z);
 return {position:[p.x,p.y,p.z],target:[p.x,p.y,p.z-1],fov:65,minDistance:.1};
}
const openings=apartmentRooms.flatMap(room=>(room.doors??[]).map((d,index)=>({room,index,side:d.side,width:d.width??1,x:room.x+(d.side==='east'?room.width/2:d.side==='west'?-room.width/2:d.offset??0),z:room.z+(d.side==='north'?room.depth/2:d.side==='south'?-room.depth/2:d.offset??0)})));
const opposite={north:'south',south:'north',east:'west',west:'east'};
export const apartmentPortals=openings.flatMap((a,i)=>openings.slice(i+1).filter(b=>opposite[a.side]===b.side&&Math.hypot(a.x-b.x,a.z-b.z)<.025).map(b=>({ref:`${a.room.ref}-DOOR-${String(a.index+1).padStart(2,'0')}`,a:a.room,b:b.room,x:a.x,z:a.z,width:Math.min(a.width,b.width)})));
function passage(ref:string,a:string,b:string,points:ReturnType<typeof apartmentWorldPoint>[]):SpatialTransition{return {transitionId:ref,type:'OPEN_PASSAGE',fromSpaceRef:a,toSpaceRef:b,boundaryRef:ref,approachPoint:points[0],entryPoint:points[1],exitPoint:points[points.length-1],crossingPath:points,accessRequirement:'NONE',clearanceRule:{requiredClearWidthMeters:.8},status:'CONFIRMED'};}
export const apartmentTransitions=apartmentPortals.flatMap(p=>{
 const points=[apartmentWorldPoint(p.a.x,p.a.z),apartmentWorldPoint(p.x,p.z),apartmentWorldPoint(p.b.x,p.b.z)];
 const t=passage(p.ref,p.a.ref,p.b.ref,points);
 return [t,passage(`${p.ref}-REVERSE`,p.b.ref,p.a.ref,[...points].reverse())];
});
const foyer=apartmentRooms.find(r=>r.ref.endsWith('-ENTRY'))!;
// FIX (Apartment A Full Interior Reality V1, golden-journey browser proof):
// the original 3-point crossingPath here repeated the SAME final point
// twice ([nearThreshold, foyerCenter, foyerCenter]) — a degenerate path
// that left the camera's real settled position mismatched against this
// transition's own expected waypoint (arrival detection is a real X/Z
// proximity check against buildTraversalWaypoints()'s output, never a
// fixed timer — see LunaRouteDriver's sameWaypoint()), so a route
// continuing past "home" (e.g. "Take me home" immediately followed by
// "walk me to the kitchen") got permanently stuck narrating "Approaching
// the entrance." Rebuilt as a real two-point hop from just inside the
// Foyer's own north (entrance) wall to its center — the same room-edge-
// to-room-center shape every other real portal in this file already uses
// successfully (see apartmentTransitions above).
const homePassage=passage('LUNA-L06-APT-A-FOYER-PASSAGE',LUNA_L06_APT_A.interiorRef,foyer.ref,[apartmentWorldPoint(foyer.x,foyer.z+foyer.depth/2-0.3),apartmentWorldPoint(foyer.x,foyer.z)]);
apartmentTransitions.push(homePassage,{...homePassage,transitionId:homePassage.transitionId+'-REVERSE',fromSpaceRef:foyer.ref,toSpaceRef:LUNA_L06_APT_A.interiorRef,crossingPath:[...homePassage.crossingPath].reverse()});
export function normalizedApartmentRooms():NormalizedRoom[]{return apartmentRooms.map(r=>({canonicalRef:r.ref,sourceRefs:[r.ref],source2DRefs:[r.ref],source3DRefs:[r.ref],parentRef:LUNA_L06_APT_A.interiorRef,levelRef:LUNA_L06_APT_A.ownerLevelRef,spaceType:'room',name:r.label,boundary:{kind:'rect',x:r.x+L06_APT_A_MASSING_FRAME.x,z:r.z+L06_APT_A_MASSING_FRAME.z,width:r.width,depth:r.depth},confidence:1,reviewStatus:'CONFIRMED',provenance:{derivedFrom:'authored',sourceIds:[r.ref],note:APARTMENT_REFERENCE_STATUS}}));}
export function normalizedApartmentDoors():NormalizedDoor[]{return apartmentTransitions.filter((_,i)=>i%2===0).map(t=>({canonicalRef:t.boundaryRef!,sourceRefs:[t.boundaryRef!],source2DRefs:[t.boundaryRef!],source3DRefs:[t.boundaryRef!],levelRef:'LUNA-L06',spaceType:'door',name:'Reference interior passage',doorKind:'unknown',fromSpaceRef:t.fromSpaceRef,toSpaceRef:t.toSpaceRef,confidence:1,reviewStatus:'CONFIRMED',animationReadiness:'STATIC_BOUNDARY',provenance:{derivedFrom:'computed',sourceIds:[t.fromSpaceRef,t.toSpaceRef],note:'Paired real wall openings; no actuator or moving door leaf claimed.'}}));}
