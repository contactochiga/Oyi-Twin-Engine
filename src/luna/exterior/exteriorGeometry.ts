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
    // Recessed lenses sit BELOW the soffit, not embedded inside it. Short
    // spaced fittings retain quiet balconies rather than continuous neon rings.
    light:mergedBoxGeometry([-1,1].flatMap(side=>[-.36,-.12,.12,.36].map(f=>({size:[.22,.012,.055] as [number,number,number],position:[w*f,bottom+.002,side*(depth/2+projection*.48)] as [number,number,number]})))),
    soffit:mergedBoxGeometry([
      ...[-1,1].map(s=>({size:[w-.08,.018,projection-.12] as [number,number,number],position:[0,bottom+.02,s*(depth/2+projection/2)] as [number,number,number]})),
      ...[-1,1].map(s=>({size:[projection-.12,.018,depth] as [number,number,number],position:[s*(width/2+projection/2),bottom+.02,0] as [number,number,number]})),
    ]),
  };
}

// Closed, shaped vehicle body at the existing decorative car origin. No identity,
// traffic simulation or device metadata. Shared geometry, ~1,000 triangles/car.
function loft(sections:Array<[number,number,number,number]>) {
  const v:number[]=[],ix:number[]=[],sides=8;
  for(const [z,w,low,high] of sections){
    const chamfer=Math.min(.08,(high-low)*.2),inset=w*.1;
    v.push(-w+inset,low,z,w-inset,low,z,w,low+chamfer,z,w,high-chamfer,z,
      w-inset,high,z,-w+inset,high,z,-w,high-chamfer,z,-w,low+chamfer,z);
  }
  for(let j=0;j<sections.length-1;j++)for(let k=0;k<sides;k++){
    const a=j*sides+k,b=j*sides+(k+1)%sides,c=b+sides,d=a+sides;ix.push(a,b,d,b,c,d);
  }
  for(let k=1;k<sides-1;k++){
    ix.push(0,k+1,k);const q=(sections.length-1)*sides;ix.push(q,q+k,q+k+1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
export function arrivalCarGeometry() {
  // A restrained, brand-free sedan; same 4.4m parking envelope. Wheel arches
  // are in the body skin, not black decals over a solid rectangular body.
  const control=[[-2.2,.70,.66],[-2.0,.86,.74],[-1.45,.91,.84],[-.9,.94,.89],[.8,.94,.89],[1.55,.9,.81],[2.05,.84,.68],[2.2,.70,.59]];
  const sections:Array<[number,number,number,number]>=[];
  for(let i=0;i<=88;i++){
    const z=-2.2+i*.05;let k=0;while(k<control.length-2&&z>control[k+1][0])k++;
    const a=control[k],b=control[k+1],u=Math.max(0,Math.min(1,(z-a[0])/(b[0]-a[0]))),t=u*u*(3-2*u);
    const width=a[1]+(b[1]-a[1])*t,top=a[2]+(b[2]-a[2])*t;
    let lower=.24;
    for(const axle of [-1.38,1.38])if(Math.abs(z-axle)<.385)lower=Math.max(lower,.34+Math.sqrt(.385**2-(z-axle)**2));
    sections.push([z,width,Math.min(lower,top-.06),top]);
  }
  const body=loft(sections);
  const glass=loft([[-1.18,.74,.86,.87],[-1.04,.73,.86,1.02],[-.62,.65,.86,1.38],[-.3,.65,.86,1.43],[.55,.65,.86,1.42],[.8,.67,.86,1.34],[1.28,.76,.86,.91]]);
  const roof=loft([[-.63,.65,1.375,1.4],[-.3,.66,1.425,1.46],[.55,.66,1.415,1.45],[.79,.67,1.33,1.355]]);
  const wheels:THREE.BufferGeometry[]=[],hubs:THREE.BufferGeometry[]=[],trim:THREE.BufferGeometry[]=[],lamps:THREE.BufferGeometry[]=[],red:THREE.BufferGeometry[]=[];
  const line=(points:THREE.Vector3[],radius:number)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(8,points.length*6),radius,5,false);
  for(const x of [-.86,.86])for(const z of [-1.38,1.38]){
    const tire=new THREE.TorusGeometry(.265,.075,10,32).rotateY(Math.PI/2).translate(x,.34,z);wheels.push(tire);
    wheels.push(new THREE.CylinderGeometry(.26,.26,.16,32).rotateZ(Math.PI/2).translate(x,.34,z));
    const face=x+Math.sign(x)*.081;
    hubs.push(new THREE.TorusGeometry(.226,.016,6,32).rotateY(Math.PI/2).translate(face,.34,z));
    hubs.push(new THREE.CylinderGeometry(.063,.063,.022,16).rotateZ(Math.PI/2).translate(face,.34,z));
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5;
      hubs.push(line([new THREE.Vector3(face,.34+Math.cos(a)*.058,z+Math.sin(a)*.058),new THREE.Vector3(face,.34+Math.cos(a+.12)*.218,z+Math.sin(a+.12)*.218)],.012));
    }
  }
  for(const side of [-1,1]){
    const x=side;
    // A/C pillars, sill and door shut lines follow this visual car shell.
    trim.push(line([new THREE.Vector3(x*.75,.88,-1.18),new THREE.Vector3(x*.65,1.39,-.63)],.026));
    trim.push(line([new THREE.Vector3(x*.66,1.44,.55),new THREE.Vector3(x*.76,.9,1.28)],.028));
    trim.push(new THREE.BoxGeometry(.035,.55,.065).translate(x*.67,1.15,.03));
    trim.push(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(x*.941,.45,.03),new THREE.Vector3(x*.941,.82,.03)),1,.004,4,false));
    trim.push(new THREE.BoxGeometry(.022,.027,.15).translate(x*.942,.78,.15));
    trim.push(new THREE.SphereGeometry(.1,12,8).scale(1,.5,1.6).translate(x*1.01,1.02,.79));
    lamps.push(new THREE.BoxGeometry(.36,.055,.022).translate(x*.49,.565,2.206));
    red.push(new THREE.BoxGeometry(.34,.052,.022).translate(x*.49,.565,-2.206));
    trim.push(new THREE.BoxGeometry(.23,.1,.025).translate(x*.49,.42,2.205));
  }
  for(let i=0;i<7;i++)trim.push(new THREE.BoxGeometry(.016,.13,.022).translate((i-3)*.075,.49,2.21));
  trim.push(new THREE.BoxGeometry(.62,.035,.03).translate(0,.39,2.21));
  const merge=(parts:THREE.BufferGeometry[])=>{const result=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());return result;};
  return {contact:new THREE.PlaneGeometry(2.05,4.35).rotateX(-Math.PI/2).translate(0,.003,0),body,glass,roof,wheels:merge(wheels),hubs:merge(hubs),lamps:merge(lamps),trim:merge(trim),red:merge(red)};
}

/** Only the outward face of an existing decorative window bay. Keeping the
 * exact outer face avoids reflective 3 cm box rims around the curtain glow. */
export function windowFaceGeometry(specs:BoxSpec[]) {
  const parts=specs.map(({size,position})=>{
    const sideFace=size[0]<size[2];
    const side=Math.sign(position[sideFace?0:2])||1;
    const g=new THREE.PlaneGeometry(sideFace?size[2]:size[0],size[1]);
    g.rotateY(sideFace?side*Math.PI/2:side<0?Math.PI:0);
    g.translate(position[0]+(sideFace?side*size[0]/2:0),position[1],position[2]+(sideFace?0:side*size[2]/2));
    return g;
  });
  const geometry=mergeGeometries(parts)??new THREE.BufferGeometry();
  parts.forEach(g=>g.dispose());return geometry;
}
