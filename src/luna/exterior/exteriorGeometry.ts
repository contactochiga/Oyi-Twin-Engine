import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mergedBoxGeometry, type BoxSpec } from '../../engine/utils/geometryUtils';

// Surface additions use the existing balcony extents, never the canonical plan.
export function balconyFinish(width:number,depth:number,projection:number,bottom:number,frontScale=1) {
  const w=width*frontScale+2*projection,d=depth+2*projection-.1;
  const ring=(y:number,height:number,t:number,inset=0):BoxSpec[]=>[
    ...[-1,1].map(s=>({size:[w,height,t] as [number,number,number],position:[0,y,s*(depth/2+projection-.05-inset)] as [number,number,number]})),
    ...[-1,1].map(s=>({size:[t,height,d] as [number,number,number],position:[s*(width/2+projection-.05-inset),y,0] as [number,number,number]})),
  ];
  const fittings=ring(bottom+1.24,.038,.045);
  fittings.push(...ring(bottom+.28,.065,.065));
  // Small glazing joints/clamps; not new partitions or private room openings.
  for(let i=1;i<Math.ceil(w/1.5);i++)for(const s of [-1,1]) fittings.push({size:[.024,.94,.022],position:[-w/2+i*w/Math.ceil(w/1.5),bottom+.75,s*(depth/2+projection-.05)]});
  for(let i=1;i<Math.ceil(d/1.5);i++)for(const s of [-1,1]) fittings.push({size:[.022,.94,.024],position:[s*(width/2+projection-.05),bottom+.75,-d/2+i*d/Math.ceil(d/1.5)]});
  return {
    fittings:mergedBoxGeometry(fittings),
    shadow:mergedBoxGeometry(ring(bottom+.065,.025,.012)),
    light:mergedBoxGeometry(ring(bottom+.022,.016,.028,.22)),
    soffit:mergedBoxGeometry([
      ...[-1,1].map(s=>({size:[w-.08,.018,projection-.12] as [number,number,number],position:[0,bottom+.02,s*(depth/2+projection/2)] as [number,number,number]})),
      ...[-1,1].map(s=>({size:[projection-.12,.018,depth] as [number,number,number],position:[s*(width/2+projection/2),bottom+.02,0] as [number,number,number]})),
    ]),
  };
}

// Closed, shaped vehicle body at the existing decorative car origin. No identity,
// traffic simulation or device metadata. Shared geometry, ~1,000 triangles/car.
function loft(sections:Array<[number,number,number,number]>) {
  const v:number[]=[], ix:number[]=[];
  for(const [z,w,low,high] of sections) v.push(-w,low,z,w,low,z,w,high,z,-w,high,z);
  for(let j=0;j<sections.length-1;j++)for(let k=0;k<4;k++){const a=j*4+k,b=j*4+(k+1)%4,c=b+4,d=a+4;ix.push(a,b,d,b,c,d);}
  ix.push(0,3,1,1,3,2);const q=(sections.length-1)*4;ix.push(q,q+1,q+3,q+1,q+2,q+3);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
export function arrivalCarGeometry() {
  const body=loft([[-2.2,.75,.36,.62],[-1.95,.93,.28,.75],[-1.1,.95,.26,.81],[.8,.95,.26,.82],[1.9,.89,.32,.72],[2.2,.75,.4,.6]]);
  const glass=loft([[-1.25,.72,.79,.81],[-.68,.68,.8,1.25],[.65,.68,.8,1.25],[1.35,.75,.8,.82]]);
  const roof=loft([[-.68,.69,1.24,1.27],[.65,.69,1.24,1.27]]);
  const wheels:THREE.BufferGeometry[]=[];const hubs:THREE.BufferGeometry[]=[];
  for(const x of [-.87,.87])for(const z of [-1.38,1.38]){
    wheels.push(new THREE.CylinderGeometry(.32,.32,.19,20).rotateZ(Math.PI/2).translate(x,.32,z));
    hubs.push(new THREE.CylinderGeometry(.21,.21,.195,16).rotateZ(Math.PI/2).translate(x,.32,z));
  }
  const lamps=mergedBoxGeometry([-1,1].flatMap(s=>[-1,1].map(x=>({size:[.45,.075,.04] as [number,number,number],position:[x*.52,.59,s*2.19] as [number,number,number]}))));
  const wheelGeo=mergeGeometries(wheels)!;const hubGeo=mergeGeometries(hubs)!;
  wheels.forEach(g=>g.dispose());hubs.forEach(g=>g.dispose());
  return {body,glass,roof,wheels:wheelGeo,hubs:hubGeo,lamps};
}
