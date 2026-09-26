import * as THREE from 'three';
import {mergedBoxGeometry,type BoxSpec} from '../../engine/utils/geometryUtils';
import {LUNA_CORES} from '../lunaProgramme';
/** Finish the already-modelled stair enclosure through its owner level. */
export function crownCoreSkins(height:number){
 const skins:BoxSpec[]=[],joints:BoxSpec[]=[];
 for(const c of LUNA_CORES.filter(c=>c.ref.includes('STAIR'))){for(const side of [-1,1]){
  skins.push({size:[c.width,height,.014],position:[c.x,0,c.z+side*(c.depth/2+.007)]},{size:[.014,height,c.depth],position:[c.x+side*(c.width/2+.007),0,c.z]});
  for(let y=-height/2+.9;y<height/2;y+=.9)joints.push({size:[c.width,.012,.017],position:[c.x,y,c.z+side*(c.depth/2+.018)]});
 }}return {skins:mergedBoxGeometry(skins),joints:mergedBoxGeometry(joints)};
}
export function crownConstruction(width:number,depth:number,top:number){
 const stone:BoxSpec[]=[],metal:BoxSpec[]=[],joints:BoxSpec[]=[],soil:BoxSpec[]=[];
 const cx=width*.06,pw=width*.42,pd=depth*.5;
 // Coping at the existing pool perimeter; no new basin/terrace dimensions.
 for(const s of [-1,1]){
  stone.push({size:[pw+.48,.12,.24],position:[cx,top+.29,s*(pd/2+.12)]},{size:[.24,.12,pd],position:[cx+s*(pw/2+.12),top+.29,0]});
  // Missing longitudinal members connect the four EXISTING pergola cross beams.
  metal.push({size:[.18,.18,depth*.55],position:[cx+s*width*.19,top+3.23,0]});
  for(const z of [-depth*.275,depth*.275]){
   metal.push({size:[.4,.035,.4],position:[cx+s*width*.19,top+.02,z]});
   metal.push({size:[.34,.35,.025],position:[cx+s*width*.19,top+3.15,z+.155]});
  }
 }
 for(let x=-width/2+1;x<width/2;x++)joints.push({size:[.008,.003,depth],position:[x,top+.023,0]});
 for(let z=-depth/2+1;z<depth/2;z++)joints.push({size:[width,.003,.008],position:[0,top+.023,z]});
 for(const x of [-width/2+1,width/2-1])for(const z of [-depth/2+3,depth/2-3])soil.push({size:[1.42,.012,1.42],position:[x,top+.708,z]});
 // Finish the existing private relaxation enclosure's open glazed face.
 const lw=width*.24,ld=depth*.55,lx=-width/2+lw/2+.6,gx=lx+lw/2-.08;
 for(let i=0;i<=4;i++)metal.push({size:[.08,2.34,.055],position:[gx,top+1.3,-ld/2+.1+i*(ld-.2)/4]});
 for(const y of [top+.13,top+2.47])metal.push({size:[.08,.06,ld-.2],position:[gx,y,0]});
 return {stone:mergedBoxGeometry(stone),metal:mergedBoxGeometry(metal),joints:mergedBoxGeometry(joints),soil:mergedBoxGeometry(soil),terrace:new THREE.BoxGeometry(width,.018,depth).translate(0,top+.012,0)};
}
