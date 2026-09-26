import {L01_OBSTACLES} from "../architecture/l01InteriorLayout";
import { GROUND_FURNITURE_OBSTACLES } from "../architecture/groundInterior/groundInteriorLayout";
import { LUNA_CORES, LUNA_LEVELS } from "../lunaProgramme";
import { LUNA_STRUCTURAL_ELEMENTS } from "../structure/lunaStructuralElements";
import { LUNA_L01_CLUB } from "../interiors/lunaInteriors";

interface Point { x: number; y: number; z: number }
interface Rect { x: number; z: number; width: number; depth: number }
const BODY_RADIUS = 0.22;
const inRect = (p: Point, r: Rect, margin = BODY_RADIUS) => Math.abs(p.x-r.x) < r.width/2+margin && Math.abs(p.z-r.z) < r.depth/2+margin;
const cores: Rect[] = LUNA_CORES.map(c => ({ x:c.x,z:c.z,width:c.width,depth:c.depth }));
const columns = LUNA_STRUCTURAL_ELEMENTS.filter(e => e.elementType === "column").map(e => ({ levelRef:e.ownerLevelRef,x:e.position.x,z:e.position.z,width:e.size.x,depth:e.size.z }));
const amenityWalls: Rect[] = LUNA_L01_CLUB.rooms.flatMap(r => {
  const gap = r.doors?.[0]?.width ?? 1;
  return [
    { x:r.x-r.width/2,z:r.z,width:.12,depth:r.depth },
    { x:r.x+r.width/2,z:r.z,width:.12,depth:r.depth },
    { x:r.x,z:r.z-r.depth/2,width:r.width,depth:.12 },
    ...[-1,1].map(sign => ({ x:r.x+sign*(r.width+gap)/4,z:r.z+r.depth/2,width:(r.width-gap)/2,depth:.12 })),
  ];
});

/** Conservative podium collision admission in the SAME world frame as rooms/cores.
 * No vertical escape, physics world, private-home admission or stair traversal.
 * Lift boarding remains the existing runtime handoff; manual shaft entry is blocked.
 * Swept samples prevent tunnelling on slow rendering frames. */
export function podiumStepAllowed(from: Point, to: Point, entranceOpen: boolean): boolean {
  const level = LUNA_LEVELS.find(l => ["LUNA-GROUND", "LUNA-L01-AMENITIES"].includes(l.ref) && Math.abs(from.y-(l.baseElevation+1.7)) < .5);
  if (!level) return true;
  const steps = Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.05));
  for(let i=1;i<=steps;i++) {
    const p={x:from.x+(to.x-from.x)*i/steps,y:from.y,z:from.z+(to.z-from.z)*i/steps};
    const hw=level.footprint.width/2, hd=level.footprint.depth/2;
    // Only the existing Ground entrance crosses the shell. Exterior movement
    // elsewhere stays the existing system's responsibility, not a new site model.
    const inShell = Math.abs(p.x)<hw+.4 && Math.abs(p.z)<hd+.4;
    if (!inShell && level.ref === "LUNA-GROUND") continue;
    if (Math.abs(p.x)>hw-.4 || p.z < -hd+.4) return false;
    if (p.z>hd-.4 && (level.ref !== "LUNA-GROUND" || Math.abs(p.x)>1.3)) return false;
    if (level.ref === "LUNA-GROUND" && Math.abs(p.z-16)<.25 && (!entranceOpen || Math.abs(p.x)>1.3)) return false;
    if (level.ref === "LUNA-GROUND" && GROUND_FURNITURE_OBSTACLES.some(r=>inRect(p,r))) return false;
    if (level.ref === "LUNA-L01-AMENITIES" && L01_OBSTACLES.some(r=>inRect(p,r))) return false;
    if (cores.some(c=>inRect(p,c)) || columns.some(c=>c.levelRef===level.ref && inRect(p,c))) return false;
    // The core front has true portals, but closed/runtime landing doors are
    // not a licence to walk into a shaft. Allow approach up to z=1.95 only.
    if (p.x>-9.8-BODY_RADIUS && p.x<9.2+BODY_RADIUS && p.z>-2.7-BODY_RADIUS && p.z<2.7+BODY_RADIUS) {
      const portal = LUNA_CORES.some(c=>c.ref.includes("LIFT") && Math.abs(p.x-c.x)<.7-BODY_RADIUS && p.z>1.95);
      if(!portal) return false;
    }
    if(level.ref === "LUNA-L01-AMENITIES" && amenityWalls.some(r=>inRect(p,r))) return false;
  }
  return true;
}
