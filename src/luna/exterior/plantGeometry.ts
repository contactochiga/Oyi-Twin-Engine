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
function leafBuffer(vertices:number[], colors?:number[]) {
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  const palette=['#34442a','#435a31','#536738','#3c512b'].map(value=>new THREE.Color(value));
  const tint=colors??vertices.map((_,i)=>palette[Math.floor(i/18)%palette.length].toArray()[i%3]);
  g.setAttribute('color',new THREE.Float32BufferAttribute(tint,3));
  g.computeVertexNormals();return g;
}
export function palmLeaves(quality: 'near' | 'far' = 'near') {
  const out:number[]=[],colors:number[]=[];
  const dark=new THREE.Color('#254322'),light=new THREE.Color('#647947');
  // Curved, keeled leaflets catch light on different planes. Bounded crown
  // radius preserves the existing canopy/glazing clearance at all four palms.
  const emit=(p:THREE.Vector3)=>{
    const r=Math.hypot(p.x,p.z);if(r>2.9){p.x*=2.9/r;p.z*=2.9/r;}
    out.push(p.x,p.y,p.z);
  };
  const fronds=quality==='near'?19:11,pairs=quality==='near'?32:20,steps=quality==='near'?4:2;
  for(let f=0;f<fronds;f++){
    const angle=f*2.399963,reach=1.9+(f%4)*.24,arch=.7+(f%3)*.16,drop=.45+(f%4)*.18;
    const forward=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle));
    const side=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle));
    const point=(t:number)=>forward.clone().multiplyScalar(t*reach).setY(4.4+Math.sin(t*Math.PI)*arch-t*t*drop);
    for(let j=0;j<pairs;j++){
      const t=.07+j*(.868/(pairs-1)),a=point(t),next=point(t+.035);
      const before=out.length;leafQuad(out,a,next,.013);
      const tint=dark.clone().lerp(light,.2+(f%5)*.13);
      for(let i=before;i<out.length;i+=3)colors.push(tint.r,tint.g,tint.b);
      for(const sign of [-1,1]){
        const length=Math.sin(t*Math.PI)*(.58+(f%3)*.07),width=.025*(1-t*.6);
        const rows:THREE.Vector3[][]=[];
        for(let k=0;k<=steps;k++){
          const u=k/steps,p=a.clone().addScaledVector(side,sign*length*u).addScaledVector(forward,.3*u);
          p.y-=.12*u+.20*u*u;
          const w=Math.sin(u*Math.PI)*width+.001;
          rows.push([p.clone().addScaledVector(forward,-w),p.clone().add(new THREE.Vector3(0,.012*Math.sin(u*Math.PI),0)),p.clone().addScaledVector(forward,w)]);
        }
        for(let k=0;k<steps;k++)for(let half=0;half<2;half++){
          const pts=[rows[k][half],rows[k+1][half],rows[k][half+1],rows[k][half+1],rows[k+1][half],rows[k+1][half+1]];
          for(const p of pts){emit(p.clone());colors.push(tint.r,tint.g,tint.b);}
        }
      }
    }
  }
  return leafBuffer(out,colors);
}
export function palmTrunk(){
  const geometry=new THREE.CylinderGeometry(.18,.28,4.4,24,88).translate(0,2.2,0),p=geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){
    const y=p.getY(i),ridge=1+.028*Math.sin(y*54),bend=.07*Math.sin(y/4.4*Math.PI);
    p.setXYZ(i,p.getX(i)*ridge+bend,y,p.getZ(i)*ridge);
  }
  geometry.computeVertexNormals();return geometry;
}
export function shrubGeometry(width=1,depth=1,height=.7,seed=1) {
  const out:number[]=[],colors:number[]=[];
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const dark=new THREE.Color('#263f20'),light=new THREE.Color('#627442');
  const tintNew=(from:number,color:THREE.Color)=>{
    for(let i=from;i<out.length;i+=3)colors.push(color.r,color.g,color.b);
  };
  // A rounded crown and inclined leaves avoid the old horizontal box-shaped
  // cloud. Dimensions still derive from the same planter/species envelope.
  for(let i=0;i<300;i++){
    const angle=random()*Math.PI*2,y=.13+random()*.82;
    const r=Math.sqrt(random())*Math.sqrt(Math.max(0,1-Math.pow((y-.5)/.53,2)));
    const a=new THREE.Vector3(Math.cos(angle)*r*width*.43,y*height,Math.sin(angle)*r*depth*.43);
    const length=.09+random()*.065,heading=angle+(random()-.5)*1.3;
    const b=a.clone().add(new THREE.Vector3(Math.cos(heading)*length,(random()-.35)*.13,Math.sin(heading)*length));
    const from=out.length;leafQuad(out,a,b,.027+random()*.018);
    tintNew(from,dark.clone().lerp(light,.15+random()*.6+y*.15));
  }
  // Small real stems root the foliage. Merged into the same draw, no alpha
  // overdraw, per-leaf objects, physics or operational plant identity.
  const bark=new THREE.Color('#594c36');
  for(let i=0;i<12;i++){
    const angle=i*Math.PI/6,a=new THREE.Vector3(0,.01,0);
    const b=new THREE.Vector3(Math.cos(angle)*width*.29,height*(.45+(i%3)*.14),Math.sin(angle)*depth*.29);
    const direction=b.clone().sub(a),stem=new THREE.CylinderGeometry(.006,.012,direction.length(),5,1,true).toNonIndexed();
    stem.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize()));
    stem.translate(...a.clone().lerp(b,.5).toArray());
    const from=out.length;out.push(...stem.getAttribute('position').array);tintNew(from,bark);stem.dispose();
  }
  return leafBuffer(out,colors);
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
export function leafMaterial(){return new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.92,side:THREE.DoubleSide});}
