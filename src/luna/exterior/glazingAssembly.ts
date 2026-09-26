import * as THREE from 'three';
import {exteriorWindowMaterial} from './exteriorMaterials';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
/** Fixed visual bay grid, not an apartment window/room schedule. The opaque
 * back plane is never removed: no imported/private interior is revealed. */
export function glazingAssembly(width:number,depth:number,height:number,frontBays:number,sideBays:number,seed:number){
 const frame:THREE.BufferGeometry[]=[],glass:THREE.BufferGeometry[]=[],curtain:THREE.BufferGeometry[]=[],dim:THREE.BufferGeometry[]=[];
 const top=height*.43,bottom=-height/2+.55,clear=top-bottom,mid=(top+bottom)/2;
 for(let face=0;face<4;face++){
  const sideFace=face>=2,sign=face%2===0?1:-1,span=sideFace?depth:width,count=sideFace?sideBays:frontBays,edge=(sideFace?width:depth)/2;
  const put=(g:THREE.BufferGeometry)=>{g.rotateY(sideFace?sign*Math.PI/2:sign<0?Math.PI:0);g.translate(sideFace?sign*edge:0,0,sideFace?0:sign*edge);return g;};
  const box=(x:number,y:number,z:number,w:number,h:number,d:number)=>put(new THREE.BoxGeometry(w,h,d).translate(x,y,z));
  for(let i=0;i<=count;i++)frame.push(box(-span/2+i*span/count,mid,.165,.065,clear+.08,.27));
  frame.push(box(0,top,.165,span,.065,.27),box(0,bottom,.165,span,.07,.27));
  // Double sill channel/gaskets make the setback visible at balcony distance.
  frame.push(box(0,bottom+.046,.27,span,.014,.023));
  for(let i=0;i<count;i++){
   const bay=span/count,x=-span/2+(i+.5)*bay,w=bay-.075;
   glass.push(put(new THREE.PlaneGeometry(w,clear-.065).translate(x,mid,.205)));
   const state=(seed*13+face*29+i*7)%20;
   if(state>=14)continue;
   // Actual pleats at 45–95mm in front of the opaque back. All geometry is
   // non-navigable dressing; variation does not represent occupancy.
   const fraction=state<5?.7:state<10?.38:.2,cw=w*fraction,cx=x+(i%2?1:-1)*(w-cw)/2;
   const g=new THREE.PlaneGeometry(cw,clear-.11,Math.max(8,Math.ceil(cw/.035)),1),p=g.attributes.position;
   for(let j=0;j<p.count;j++)p.setZ(j,.07+.025*Math.cos(p.getX(j)*Math.PI/.045));
   g.translate(cx,mid,0);g.computeVertexNormals();(state<8?curtain:dim).push(put(g));
  }
 }
 const merge=(parts:THREE.BufferGeometry[])=>{const g=mergeGeometries(parts)??new THREE.BufferGeometry();parts.forEach(p=>p.dispose());return g;};
 return {frames:merge(frame),glass:merge(glass),curtain:merge(curtain),dim:merge(dim)};
}
export const glazingAssemblyMaterials={
 shadow:()=>new THREE.MeshStandardMaterial({color:'#171d1e',roughness:.96,side:THREE.DoubleSide}),
 glass:()=>new THREE.MeshPhysicalMaterial({color:'#c0caca',roughness:.085,ior:1.52,metalness:0,clearcoat:1,clearcoatRoughness:.06,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:1.2}),
 curtain:()=>{const source=exteriorWindowMaterial();const map=source.emissiveMap;source.dispose();return new THREE.MeshStandardMaterial({color:'#777368',roughness:1,emissive:'#e0b078',emissiveMap:map,emissiveIntensity:0,side:THREE.DoubleSide});},
};
