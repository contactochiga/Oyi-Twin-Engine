import { useMemo } from 'react';
import * as THREE from 'three';
import { palmLeaves, shrubGeometry, leafMaterial } from './plantGeometry';
import { exteriorMaterials } from './exteriorMaterials';
import { mergedBoxGeometry } from '../../engine/utils/geometryUtils';

export function ExteriorPalm({position}:{position:[number,number,number]}) {
  const leaves=useMemo(()=>palmLeaves(),[]);
  const trunk=useMemo(()=>new THREE.CylinderGeometry(.18,.28,4.4,16).translate(0,2.2,0),[]);
  const bark=useMemo(()=>exteriorMaterials.timber(),[]), leaf=useMemo(()=>leafMaterial(),[]);
  // Trunk ring scars give scale without alpha cards or per-leaf draw calls.
  const scars=useMemo(()=>{
    const vertices:number[]=[];
    for(let i=1;i<37;i++){const y=i*.118,r=.28-(y/4.4)*.1;
      for(let j=0;j<16;j++){const a=j*Math.PI/8,b=(j+1)*Math.PI/8;vertices.push(Math.cos(a)*r,y,Math.sin(a)*r,Math.cos(b)*r,y+.018,Math.sin(b)*r);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));return g;
  },[]);
  return <group position={position}>
    <mesh geometry={trunk} material={bark} castShadow receiveShadow raycast={()=>null}/>
    <lineSegments geometry={scars} raycast={()=>null}><lineBasicMaterial color="#61513e"/></lineSegments>
    <mesh geometry={leaves} material={leaf} castShadow raycast={()=>null}/>
  </group>;
}
export function ExteriorShrub({position,scale=[1,1,1]}:{position:[number,number,number];scale?:[number,number,number]}){
  const geometry=useMemo(()=>shrubGeometry(),[]),material=useMemo(()=>leafMaterial(),[]);
  return <mesh position={position} scale={scale} geometry={geometry} material={material} raycast={()=>null}/>;
}
export function LunaSiteSurface({width,depth}:{width:number;depth:number}){
  const material=useMemo(()=>exteriorMaterials.paving(),[]);
  // Exactly the inherited SiteBase plant origins. Decorative refinement only.
  const spots=useMemo(()=>Array.from({length:14},(_,i)=>{
    const a=i/14*Math.PI*2;
    return [Math.cos(a)*(width/2-3)*(.85+.15*Math.sin(i*2.1)),0,Math.sin(a)*(depth/2-3)*(.85+.15*Math.cos(i*1.7))] as [number,number,number];
  }),[width,depth]);
  const joints=useMemo(()=>mergedBoxGeometry([-1,1].flatMap(s=>[
    {size:[.015,.008,depth],position:[s*(width/2-1.3),-.042,0]},
  ])),[width,depth]);
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.05,0]} material={material} receiveShadow raycast={()=>null}><planeGeometry args={[width,depth]}/></mesh>
    <mesh geometry={joints} raycast={()=>null}><meshStandardMaterial color="#595951" roughness={1}/></mesh>
    {spots.map((position,i)=><ExteriorShrub key={i} position={position} scale={[1.8,1.4,1.8]}/>)}
  </group>;
}
