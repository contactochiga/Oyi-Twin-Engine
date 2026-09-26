/* oxlint-disable react/immutability -- Owned Three.js presentation resources; no React state mutations. */
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useSceneMode} from '../../engine/hooks/useSceneMode';
import {useRepresentation} from '../../engine/hooks/useRepresentation';
import {sectionClipPlanes} from '../../engine/utils/sectionClip';
import {LUNA_CORES} from '../lunaProgramme';
import {DecorativeBatch,GroundLiftControl} from './groundInterior/GroundInteriorFinishes';
import {GroundInteriorLettering,type InteriorSign} from './groundInterior/GroundInteriorLettering';
import {groundInteriorMaterials} from './groundInterior/groundInteriorMaterials';
import {buildL01Interior} from './l01InteriorGeometry';
import {L01_POOL_STUDY as pool} from './l01InteriorLayout';
const signs:InteriorSign[]=[
 {text:'LEVEL 01 · AMENITIES',color:'#ba9c6d',p:[-6.3,2.1,2.83],r:0,w:2.2,h:.24},
 {text:'← POOL & RELAXATION',color:'#ba9c6d',p:[-6.3,1.7,2.83],r:0,w:2.2,h:.2},
 {text:'RESIDENTS’ LOUNGE →',color:'#ba9c6d',p:[-6.3,1.4,2.83],r:0,w:2.2,h:.2},
 {text:'RESIDENTS’ LOUNGE',color:'#514238',p:[16.8,2.1,4.066],r:0,w:2.3,h:.24},
 {text:'POOL & RELAXATION',color:'#514238',p:[-16.8,2.1,4.066],r:0,w:2.3,h:.24},
 {text:'VISUAL STUDY · NON-OPERATIONAL',color:'#514238',p:[-16.8,1.8,4.066],r:0,w:2.4,h:.18},
 {text:'POOL DESIGN STUDY · NOT ENGINEERED',color:'#514238',p:[-16.8,2,3.934],r:Math.PI,w:2.5,h:.2},
 ...LUNA_CORES.filter(c=>c.ref.includes('LIFT-PASS')).map((c,i)=>({text:`0${i+1}`,color:'#b9a078',p:[c.x,2.655,2.82],r:0,w:.4,h:.13})),
];
/** Camera-near decoration only; canonical shell and selection remain independent. */
export function L01InteriorFinishes(){
 const root=useRef<THREE.Group>(null),lights=useRef<THREE.Group>(null);
 const {activeSystem,isolatedLevelRef,sectionMode,sectionSide}=useSceneMode();
 const {policy,identity}=useRepresentation();
 const batches=useMemo(()=>buildL01Interior(),[]);
 const materials=useMemo(()=>Object.fromEntries(batches.map(b=>[b.key,groundInteriorMaterials[b.key]()])),[batches]);
 const water=useMemo(()=>{
  const time={value:0};
  const material=new THREE.MeshStandardMaterial({color:'#477e7b',metalness:.18,roughness:.24,transparent:true,opacity:.94,envMapIntensity:.55});
  material.onBeforeCompile=shader=>{
   shader.uniforms.l01StudyTime=time;
   shader.fragmentShader='uniform float l01StudyTime;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal = normalize(normal + vec3(0.025*sin(vViewPosition.x*16.0+l01StudyTime*.65),0.02*cos(vViewPosition.z*19.0-l01StudyTime*.5),0.0));');
  };
  material.customProgramCacheKey=()=> 'l01-nonoperational-water-v1';
  return {material,time};
 },[]);
 useEffect(()=>{for(const m of [...Object.values(materials),water.material]){m.clippingPlanes=sectionClipPlanes(sectionMode,sectionSide);m.clipShadows=true;}},[materials,water,sectionMode,sectionSide]);
 useEffect(()=>()=>{batches.forEach(b=>b.geometry.dispose());Object.values(materials).forEach(m=>m.dispose());water.material.dispose();},[batches,materials,water]);
 const mode=policy.resolveMode({ref:'LUNA-L01-AMENITIES',identity});
 const allowed=(mode==='FULL_3D'||mode==='CONTEXT_3D')&&activeSystem===null&&(!isolatedLevelRef||isolatedLevelRef==='LUNA-L01-AMENITIES');
 useFrame(({camera},delta)=>{
  const near=camera.position.y>=5&&camera.position.y<8.5&&Math.abs(camera.position.x)<20&&Math.abs(camera.position.z)<15;
  if(root.current)root.current.visible=allowed&&(near||isolatedLevelRef==='LUNA-L01-AMENITIES');
  if(lights.current)lights.current.visible=allowed&&near;
  if(allowed&&near)water.time.value+=Math.min(delta,.1);
 });
 return <group ref={root} name="l01-interior-v1" visible={false} userData={{authority:'visual-only',pool:pool.classification}}>
  {batches.map(b=><DecorativeBatch key={b.key} batch={b} material={materials[b.key]}/>)}
  <GroundInteriorLettering signs={signs}/>
  {LUNA_CORES.filter(c=>c.ref.includes('LIFT-PASS')).map(c=><GroundLiftControl key={c.ref} liftRef={c.ref} x={c.x} label={c.label}/>)}
  <mesh name="l01-pool-nonoperational-study" position={[pool.x,pool.surfaceY,pool.z]} rotation={[-Math.PI/2,0,0]} material={water.material} raycast={()=>{}} userData={{classification:pool.classification}}><planeGeometry args={[pool.width,pool.depth]}/></mesh>
  <group ref={lights} visible={false}>
   <pointLight position={[0,2.65,4.2]} color="#ffe0b3" intensity={35} distance={8} decay={2}/>
   <pointLight position={[14.5,2.6,-4]} color="#ffe3bc" intensity={48} distance={12} decay={2}/>
   <pointLight position={[-14.5,2.6,-4]} color="#ffe3bc" intensity={42} distance={12} decay={2}/>
  </group>
 </group>;
}
