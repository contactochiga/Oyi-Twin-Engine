import * as THREE from 'three';
import {createInteriorConstruction,appendInteriorFurniture} from './groundInterior/interiorConstruction';
import {L01_FURNISHINGS,L01_LOUNGERS,L01_POOL_STUDY as pool} from './l01InteriorLayout';
import {LUNA_L01_CLUB} from '../interiors/lunaInteriors';
import {LUNA_CORES} from '../lunaProgramme';
import {podiumSlabPanels} from './podiumSlabOpenings';
/** Removable finish layers. No slab edits, engineered basin or new openings. */
export function buildL01Interior(){
 const b=createInteriorConstruction(),{add,box,cyl}=b;
 appendInteriorFurniture(L01_FURNISHINGS,b);
 for(const p of podiumSlabPanels(40,30,.01,0,LUNA_L01_CLUB.rooms))add('floor',new THREE.PlaneGeometry(p.size[0],p.size[2]),[p.position[0],.0004,p.position[2]],[-Math.PI/2,0,0]);
 box('rug',[4.6,.012,4.8],[16,.008,-4.25],0,.004);
 box('rug',[5.7,.012,4.1],[13.7,.008,-9.4],0,.004);
 for(const r of LUNA_L01_CLUB.rooms){
  add('floor',new THREE.PlaneGeometry(r.width-.12,r.depth-.12),[r.x,.0004,r.z],[-Math.PI/2,0,0]);
  // Finish at existing inside faces; preserved north opening, no new wall.
  for(const side of [-1,1]){
   box('bronze',[.018,.065,r.depth-.15],[r.x+side*(r.width/2-.069),.035,r.z]);
   box('timber',[.018,2.69,3.4],[r.x+side*(r.width/2-.07),1.4,-8.6]);
   box('light',[.022,.008,r.depth-1],[r.x+side*(r.width/2-.24),2.794,r.z]);
   box('dark',[r.width-1,.006,.024],[r.x,2.797,r.z+side*(r.depth/2-.3)]);
  }
  box('bronze',[r.width-.15,.065,.018],[r.x,.035,r.z-r.depth/2+.069]);
  for(const sign of [-1,1])box('timber',[.15,2.77,.07],[r.x+sign*.815,1.385,3.965]);
  box('timber',[1.78,.03,.07],[r.x,2.785,3.965]);
  // Thin surface emitters, no claimed recessed plenum or new MEP devices.
  for(const z of [0,-4,-8])for(const x of [r.x-2.5,r.x+2.5])cyl('light',.035,.035,.007,[x,2.795,z]);
 }
 // Residential display joinery on existing east wall, no new operational room.
 box('timber',[.08,2.25,4],[18.89,1.18,-8.5]);
 for(const y of [.25,.85,1.45,2.1])box('timber',[.28,.04,4],[18.79,y,-8.5]);
 for(const z of [-10.45,-8.5,-6.55])box('timber',[.28,2.25,.045],[18.79,1.18,z]);
 for(const z of [-9.7,-7.5])for(const y of [.32,.92,1.52]){
  cyl('stone',.075,.055,.23,[18.72,y+.09,z]);
  box('darkStone',[.18,.025,.26],[18.72,y-.02,z+.32]);
 }
 // Small abstract relief, shared stone/metal rather than another image texture.
 box('bronze',[.055,1.4,2],[10.10,1.55,-4]);
 box('stone',[.025,1.32,1.92],[10.14,1.55,-4]);
 for(let i=0;i<5;i++)box(i%2?'timber':'olive',[.02,.6+i*.1,.17],[10.16,1.5,-4.7+i*.34]);
 // Same physical portal finish family as Ground, around actual door openings.
 for(const c of LUNA_CORES.filter(c=>c.ref.includes('LIFT-PASS'))){
  for(const s of [-1,1]){
   box('stone',[.28,2.78,.065],[c.x+s*.875,1.39,2.782]);
   box('warmMetal',[.014,2.47,.025],[c.x+s*.717,1.235,2.821]);
  }
  box('bronze',[1.4,.15,.045],[c.x,2.64,2.788]);
  box('timber',[1.95,.09,.032],[c.x,2.755,2.78]);
  box('light',[1.25,.012,.025],[c.x,2.535,2.816]);
 }
 // Gallery canopy is a thin finish below transfer, above the existing portals.
 box('stone',[12,.035,1.5],[0,2.8175,3.57]);
 box('light',[11.6,.008,.024],[0,2.795,4.24]);
 // Surface mock-up: intact slab remains below. The study area is not walkable.
 for(const s of [-1,1]){
  box('stone',[pool.edgeWidth,.07,pool.depth+pool.edgeWidth*2],[pool.x+s*(pool.width+pool.edgeWidth)/2,.035,pool.z]);
  box('stone',[pool.width,.07,pool.edgeWidth],[pool.x,.035,pool.z+s*(pool.depth+pool.edgeWidth)/2]);
 }
 for(const f of L01_LOUNGERS){
  box('timber',[f.width,.07,2],[f.x,.25,f.z],0,.03);
  box('cream',[f.width-.05,.13,1.48],[f.x,.35,f.z+.24],0,.06);
  add('cream',new THREE.BoxGeometry(f.width-.05,.13,.6),[f.x,.49,f.z-.72],[.38,0,0]);
  for(const s of [-1,1])for(const z of [-.78,.78])box('bronze',[.04,.25,.04],[f.x+s*.32,.125,f.z+z]);
 }
 const batches=b.finish(L01_FURNISHINGS.filter(f=>f.kind==='planter'));
 // Reuse the full crown topology, fitted below the real 2.80m amenity ceiling.
 batches.find(b=>b.key==='foliage')!.geometry.scale(1,.88,1);
 return batches;
}
