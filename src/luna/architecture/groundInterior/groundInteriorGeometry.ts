import * as THREE from 'three';
import {GROUND_FURNISHINGS,GROUND_FINISH_LIMITS} from './groundInteriorLayout';
import {podiumSlabPanels} from '../podiumSlabOpenings';
import {LUNA_CORES} from '../../lunaProgramme';
import {LUNA_STRUCTURAL_ELEMENTS} from '../../structure/lunaStructuralElements';
import {PODIUM_CEILINGS} from '../podiumCoordination';
import {createInteriorConstruction,appendInteriorFurniture,type FinishBatch} from './interiorConstruction';
export type {FinishBatch} from './interiorConstruction';

/** Authored reusable construction, batched by finish (not one object per cushion,
 * leaf or luminaire). All dimensions are decorative within preserved shell. */
export function buildGroundInterior():FinishBatch[]{
 const builder=createInteriorConstruction();
 const {add,box,rod}=builder;
 const planters=GROUND_FURNISHINGS.filter(f=>f.kind==='planter');
 // Coplanar finish film with polygon offset, not a new floor/slab or datum.
 for(const p of podiumSlabPanels(44,34,.01))add('floor',new THREE.PlaneGeometry(p.size[0],p.size[2]),[p.position[0],.0004,p.position[2]],[-Math.PI/2,0,0]);
 // Exact retained column faces: millimetre visual veneer, no moved structure.
 for(const c of LUNA_STRUCTURAL_ELEMENTS.filter(e=>e.ownerLevelRef==='LUNA-GROUND'&&e.elementType==='column')){
  box('stone',[c.size.x+.004,c.size.y,c.size.z+.004],[c.position.x,c.position.y+2.5,c.position.z]);
  box('bronze',[c.size.x+.006,.06,c.size.z+.006],[c.position.x,.031,c.position.z]);
 }
 // Wall veneers only along the actual west/rear opaque shell.
 box('stone',[.018,3.58,10],[-21.825,1.79,-2]);
 box('timber',[.026,2.88,5],[-21.811,1.52,-2]);
 for(let z=-4.45;z<.5;z+=.1)box('bronze',[.013,2.85,.014],[-21.79,1.52,z]);
 box('bronze',[.024,.08,33.4],[-21.818,.045,0]);
 // A discreet stone border outlines existing gallery apron without a new barrier.
 box('bronze',[13.8,.002,.018],[1.8,.002,3]);
 // Portal finish is OUTSIDE existing 1.4m approach openings. No fake door leaves.
 for(const c of LUNA_CORES.filter(c=>c.ref.includes('LIFT-PASS'))){
  for(const s of [-1,1])box('stone',[.28,2.92,.065],[c.x+s*.875,1.46,2.782]);
  box('bronze',[1.4,.15,.045],[c.x,2.64,2.788]);
  box('timber',[1.95,.22,.032],[c.x,2.835,2.78]);
  for(const s of [-1,1])box('warmMetal',[.014,2.47,.025],[c.x+s*.717,1.235,2.821]);
  box('light',[1.25,.012,.025],[c.x,2.535,2.816]);
  box('bronze',[.074,.54,.046],[c.x+1.16,1.92,2.82]);
  box('light',[.032,.45,.052],[c.x+1.16,1.92,2.83]);
 }
 // Rugs lie below the same unobstructed routes, two smaller seating compositions.
 box('rug',[4.5,.012,5.7],[-18,.008,-3.35],0,.004);
 box('rug',[3.25,.012,5.7],[-12.1,.008,-3.35],0,.004);
 appendInteriorFurniture(GROUND_FURNISHINGS,builder);
 // Safe suspended rods use the real arrival ceiling. Lowest point 3.12m.
 for(let i=0;i<16;i++){
  const x=-1.45+(i%4)*.96,z=10.1+Math.floor(i/4)*.6,low=GROUND_FINISH_LIMITS.pendantBottom+(i%3)*.14;
  rod('bronze',[x,4.18,z],[x,low,z],.006);
  rod('light',[x,low,z],[x+.24,low+.46,z+.12],.009);
 }
 for(let i=0;i<5;i++)rod('light',[-1.3+i*.53,3.53+i*.035,10.1],[.1+i*.43,3.69-i*.03,11.7],.008);
 // Physical ventilation impression only: no ducts, flow values or new MEP assets.
 for(const [x,z,w,d,y] of [[0,12.5,14,7,PODIUM_CEILINGS.arrival],[0,6,14,6,PODIUM_CEILINGS.reception],[-15,-2,10,10,PODIUM_CEILINGS.lounge],[1.8,2.35,13.8,1.3,PODIUM_CEILINGS.gallery]]){
  for(const sign of [-1,1]){
   box('bronze',[.04,.008,Math.max(.4,d-.6)],[x+sign*(w/2-.25),y-.004,z]);
   box('light',[.025,.009,Math.max(.4,d-.6)],[x+sign*(w/2-.19),y-.007,z]);
   box('dark',[Math.max(.4,w-1.3),.006,.025],[x,y-.003,z+sign*(d/2-.43)]);
  }
 }
 return builder.finish(planters);
}
