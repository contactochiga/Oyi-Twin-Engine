import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries,mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {groundMetricUV,type GroundMaterialKey} from './groundInteriorMaterials';
import type {GroundFurnishing} from './groundInteriorLayout';
import {shrubGeometry} from '../../exterior/plantGeometry';
type V=[number,number,number];
export type FinishBatch={key:GroundMaterialKey;geometry:THREE.BufferGeometry;instances?:V[]};
/** Shared optimized Luna construction. Ground wrapper keeps its exact schedule. */
export function createInteriorConstruction(){
 const batches=new Map<GroundMaterialKey,THREE.BufferGeometry[]>();
 function add(key:GroundMaterialKey,g:THREE.BufferGeometry,p:V=[0,0,0],rotation:V=[0,0,0]) {
  g.rotateX(rotation[0]);g.rotateY(rotation[1]);g.rotateZ(rotation[2]);g.translate(...p);
  const geo=g.index?g.toNonIndexed():g;if(geo!==g)g.dispose();
  if(key!=='foliage')geo.deleteAttribute('color');if(!geo.getAttribute('uv'))geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count*2),2));
  const list=batches.get(key)??[];list.push(geo);batches.set(key,list);
 }
 const box=(key:GroundMaterialKey,size:V,p:V,r=0,radius=0)=>add(key,radius?new RoundedBoxGeometry(...size,key==='rug'?1:2,radius):new THREE.BoxGeometry(...size),p,[0,r,0]);
 const cyl=(key:GroundMaterialKey,rt:number,rb:number,h:number,p:V)=>add(key,new THREE.CylinderGeometry(rt,rb,h,24),p);
 function rod(key:GroundMaterialKey,a:V,b:V,r:number){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const g=new THREE.CylinderGeometry(r,r,d.length(),8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));add(key,g,av.add(bv).multiplyScalar(.5).toArray() as V);}
 return {add,box,cyl,rod,finish(planters:readonly GroundFurnishing[]):FinishBatch[]{
 return [...batches].map(([key,parts])=>{const geometry=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());if(!['cream','olive','rug','foliage','shadow'].includes(key))groundMetricUV(geometry,key==='floor'?1.2:2.4);const indexed=mergeVertices(geometry,1e-6);geometry.dispose();
  return {key,geometry:indexed,...(key==='foliage'?{instances:planters.map(p=>[p.x,0,p.z] as V)}:{})};});
 }};
}
export function appendInteriorFurniture(furnishings:readonly GroundFurnishing[],builder:ReturnType<typeof createInteriorConstruction>){
 const {add,box,cyl,rod}=builder;
 const planters=furnishings.filter(f=>f.kind==='planter');
 for(const f of furnishings){
  const r=f.rotation??0,c=Math.cos(r),s=Math.sin(r);
  const wp=(x:number,y:number,z:number):V=>[f.x+c*x+s*z,y,f.z-s*x+c*z];
  const local=(key:GroundMaterialKey,size:V,p:V,rad=0)=>box(key,size,wp(...p),r,rad);
  if(f.kind!=='feature')add('shadow',new THREE.PlaneGeometry(f.width*1.22,f.depth*1.22),[f.x,.022,f.z],[-Math.PI/2,r,0]);
  if(f.kind==='sofa'||f.kind==='chair'){
   const mat=f.palette??'cream',w=f.width,d=f.depth;
   local('dark',[w-.18,.13,d-.16],[0,.135,0],.045);
   local(mat,[w,.30,d],[0,.35,0],.13);
   if(f.kind==='sofa')local(mat,[w-.05,.49,.24],[0,.60,-d/2+.13],.11);
   else {
    const shape=new THREE.Shape();shape.absarc(0,0,.49,0,Math.PI,false);shape.absarc(0,0,.34,Math.PI,0,true);shape.closePath();
    const shell=new THREE.ExtrudeGeometry(shape,{depth:.44,bevelEnabled:true,bevelSize:.022,bevelThickness:.025,bevelSegments:3,steps:1,curveSegments:24});
    shell.rotateX(-Math.PI/2);shell.rotateY(r);add(mat,shell,wp(0,.39,0));
   }
   if(f.kind==='sofa')for(const sign of [-1,1])local(mat,[.24,.44,d-.04],[sign*(w/2-.12),.56,.01],.11);
   const count=f.kind==='sofa'?3:1,cw=(w-.5)/count;
   for(let i=0;i<count;i++){
    local(mat,[cw-.018,.17,d-.30],[-(w-.5)/2+cw*(i+.5),.555,.12],.073);
    if(f.kind==='sofa')local(mat,[cw-.04,.32,.16],[-(w-.5)/2+cw*(i+.5),.735,-.27],.064);
   }
   for(const sign of [-1,1])for(const z of [-.3,.3])cyl('bronze',.023,.03,.15,wp(sign*(w/2-.2),.085,z));
   if(f.kind==='sofa')for(const sign of [-1,1])local('olive',[.38,.30,.15],[sign*(w/2-.47),.70,-.1],.07);
  }
  if(f.kind==='table'){
   cyl('bronze',f.width*.37,f.width*.38,f.height-.07,[f.x,(f.height-.07)/2+.015,f.z]);
   cyl('darkStone',f.width/2,f.width/2,.055,[f.x,f.height-.027,f.z]);
   cyl('warmMetal',f.width/2+.003,f.width/2+.003,.008,[f.x,f.height-.06,f.z]);
   box('timber',[.29,.035,.22],[f.x-.12,f.height+.018,f.z]);
   cyl('stone',.09,.075,.14,[f.x+.2,f.height+.07,f.z-.1]);
  }
  if(f.kind==='desk'){
   local('bronze',[f.width-.12,.1,f.depth-.16],[0,.06,0],.025);
   local('darkStone',[f.width,.86,f.depth],[0,.53,0],.07);
   local('stone',[f.width+.03,.055,f.depth+.03],[0,.99,0],.018);
   local('light',[.016,.018,f.depth-.14],[-f.width/2-.004,.135,0]);
   local('warmMetal',[.018,.025,f.depth-.12],[-f.width/2-.005,.94,0]);
   for(const z of [-1,1]){
    local('dark',[.025,.22,.32],[.12,1.16,z],.01);
    local('bronze',[.18,.016,.21],[.23,1.026,z]);
   }
  }
  if(f.kind==='feature'){
   local('stone',[f.width,f.height,f.depth],[0,f.height/2,0]);
   for(const sign of [-1,1]){
    local('timber',[.025,4.1,.72],[-.075,2.05,sign*(f.depth/2-.43)]);
    for(let t=-.31;t<=.32;t+=.085)local('bronze',[.03,4.08,.016],[-.095,2.05,sign*(f.depth/2-.43)+t]);
    local('light',[.012,3.96,.018],[-.089,2.04,sign*(f.depth/2-.84)]);
   }
   local('bronze',[.02,.08,f.depth],[-.07,.045,0]);
  }
  if(f.kind==='planter'){
   const rr=f.width/2;
   add('bronze',new THREE.LatheGeometry([new THREE.Vector2(rr*.66,0),new THREE.Vector2(rr*.88,.035),new THREE.Vector2(rr,.16),new THREE.Vector2(rr,.52),new THREE.Vector2(rr*.94,.66),new THREE.Vector2(rr*.85,.66),new THREE.Vector2(rr*.85,.59)],24),[f.x,.014,f.z]);
   cyl('dark',rr*.85,rr*.85,.035,[f.x,.61,f.z]);
   rod('timber',[f.x,.61,f.z],[f.x+.055,f.height-.15,f.z-.02],.025);
   for(let i=0;i<9;i++){
    const a=i*2.39996,yy=.95+i*.15,reach=.20+(i%3)*.07;
    const tip:V=[f.x+Math.cos(a)*reach,yy+.3,f.z+Math.sin(a)*reach];
    rod('timber',[f.x,yy-.3,f.z],tip,.009);
    // Existing bounded leaf geometry reused at indoor scale; no imported metadata.
    // The three crowns have identical local construction. Upload once and
    // instance their preserved translations; every leaf and colour is retained.
    if(f===planters[0]){const g=shrubGeometry(.46,.46,.46,72+i);add('foliage',g,[tip[0]-f.x,tip[1],tip[2]-f.z]);}
   }
  }
 }
}
