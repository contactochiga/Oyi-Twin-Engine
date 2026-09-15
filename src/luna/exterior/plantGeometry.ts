import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Authored leaf surfaces, not cones/billboards. Deterministic, shared per species.
// This is a visual tropical planting study, not a botanical/canonical inventory.
function leafQuad(out:number[],a:THREE.Vector3,b:THREE.Vector3,width:number) {
  const mid=a.clone().lerp(b,.5);mid.y+=width*.4;
  const side=new THREE.Vector3(-(b.z-a.z),0,b.x-a.x).normalize().multiplyScalar(width);
  const l=mid.clone().add(side),r=mid.clone().sub(side);
  for(const p of [a,l,b,a,b,r])out.push(p.x,p.y,p.z);
}
function leafBuffer(vertices:number[]) {const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;}
export function palmLeaves() {
  const out:number[]=[];
  for(let f=0;f<11;f++) {
    const angle=f*Math.PI*2/11,scale=.86+(f%3)*.07;
    const point=(t:number)=>new THREE.Vector3(Math.cos(angle)*t*2.9*scale,4.4+Math.sin(t*Math.PI)*.9-t*t*.85,Math.sin(angle)*t*2.9*scale);
    for(let j=0;j<21;j++) {
      const t=.08+j*.041,a=point(t),next=point(Math.min(1,t+.045));
      leafQuad(out,a,next,.014);
      for(const s of [-1,1]){
        const b=a.clone().add(new THREE.Vector3(-Math.sin(angle)*s,0,Math.cos(angle)*s).multiplyScalar(Math.sin(t*Math.PI)*.62));
        b.add(new THREE.Vector3(Math.cos(angle)*.25,-.16-t*.12,Math.sin(angle)*.25));
        leafQuad(out,a,b,.055*(1-t*.55));
      }
    }
  }
  return leafBuffer(out);
}
export function shrubGeometry(width=1,depth=1,height=.7,seed=1) {
  const out:number[]=[];
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<210;i++){
    const angle=random()*Math.PI*2,r=Math.sqrt(random()),y=random();
    const a=new THREE.Vector3(Math.cos(angle)*r*width*.45,y*height,Math.sin(angle)*r*depth*.45);
    const b=a.clone().add(new THREE.Vector3(Math.cos(angle)*.18,.04,Math.sin(angle)*.18));
    leafQuad(out,a,b,.065);
  }
  return leafBuffer(out);
}
export function plantingFromBoxes(source:THREE.BufferGeometry) {
  const attr=source.getAttribute('position'),parts:THREE.BufferGeometry[]=[];
  // mergedBoxGeometry preserves each source BoxGeometry's 24 vertices.
  for(let i=0;i<attr.count;i+=24){
    const box=new THREE.Box3();for(let j=i;j<Math.min(i+24,attr.count);j++)box.expandByPoint(new THREE.Vector3().fromBufferAttribute(attr,j));
    const s=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
    parts.push(shrubGeometry(s.x*.95,s.z*.95,.45,i+43).translate(c.x,box.max.y-.05,c.z));
  }
  const merged=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());return merged;
}
export function leafMaterial(){return new THREE.MeshStandardMaterial({color:'#435b30',roughness:.92,side:THREE.DoubleSide});}
