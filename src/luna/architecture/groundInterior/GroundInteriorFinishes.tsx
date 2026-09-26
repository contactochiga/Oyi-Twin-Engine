/* oxlint-disable react/immutability -- Owned Three.js material/texture objects are updated in effects/frame callbacks, never React state. */
import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useSceneMode} from '../../../engine/hooks/useSceneMode';
import {useInteriorFocus} from '../../../engine/hooks/useInteriorFocus';
import {useCanonicalHoverHandlers} from '../../../engine/hooks/useHover';
import {useSelection} from '../../../engine/hooks/useSelection';
import {useRepresentation} from '../../../engine/hooks/useRepresentation';
import {useTwinRuntime} from '../../../engine/twinRuntime';
import {sectionClipPlanes} from '../../../engine/utils/sectionClip';
import {LUNA_CORES,LUNA_LEVELS} from '../../lunaProgramme';
import {GroundInteriorLettering} from './GroundInteriorLettering';
import {buildGroundInterior,type FinishBatch} from './groundInteriorGeometry';
import {groundInteriorMaterials} from './groundInteriorMaterials';

const ignorePicking=()=>{};
const levelLabels=new Map(LUNA_LEVELS.map(l=>[l.ref,l.label]));
export function DecorativeBatch({batch,material}:{batch:FinishBatch;material:THREE.Material}){
 const instances=useRef<THREE.InstancedMesh>(null);
 useLayoutEffect(()=>{
  if(!instances.current||!batch.instances)return;
  const matrix=new THREE.Matrix4();
  batch.instances.forEach((p,i)=>instances.current!.setMatrixAt(i,matrix.makeTranslation(...p)));
  instances.current.instanceMatrix.needsUpdate=true;
  instances.current.computeBoundingBox();instances.current.computeBoundingSphere();
 },[batch]);
 const props={name:`ground-finish-${batch.key}`,receiveShadow:true,castShadow:batch.key==='cream'||batch.key==='darkStone'||batch.key==='bronze',matrixAutoUpdate:false,raycast:ignorePicking};
 // World matrices remain parent-driven so floor isolation/explode still works.
 return batch.instances?<instancedMesh ref={instances} args={[batch.geometry,material,batch.instances.length]} {...props}/>:<mesh geometry={batch.geometry} material={material} {...props}/>;
}
/** New visual call station projects the existing canonical lift; no new asset or
 * command bypass. Selecting it opens the existing policy-aware lift card. */
export function GroundLiftControl({liftRef,x,label}:{liftRef:string;x:number;label:string}){
 const runtime=useTwinRuntime(),{select}=useSelection(),{policy,identity}=useRepresentation();
 const hover=useCanonicalHoverHandlers({ref:liftRef,kind:'device',label});
 const last=useRef(''),elapsed=useRef(0);
 const canvas=useMemo(()=>{const c=document.createElement('canvas');c.width=256;c.height=128;return c;},[]);
 const map=useMemo(()=>new THREE.CanvasTexture(canvas),[canvas]);
 const {sectionMode,sectionSide}=useSceneMode();
 const face=useMemo(()=>new THREE.MeshStandardMaterial({color:'#282421',metalness:.65,roughness:.35,clippingPlanes:sectionClipPlanes(sectionMode,sectionSide)}),[sectionMode,sectionSide]);
 const screen=useMemo(()=>new THREE.MeshBasicMaterial({map,toneMapped:false,clippingPlanes:sectionClipPlanes(sectionMode,sectionSide)}),[map,sectionMode,sectionSide]);
 useFrame((_,delta)=>{
  elapsed.current+=delta;if(elapsed.current<.1)return;elapsed.current=0;
  const state=runtime.getState(liftRef)?.state;
  const floor=levelLabels.get(String(state?.currentFloor))??'—';
  const text=(state?.direction==='UP'?'↑ ':state?.direction==='DOWN'?'↓ ':'')+floor;
  if(text===last.current)return;last.current=text;
  const c=canvas.getContext('2d')!;c.fillStyle='#151b1a';c.fillRect(0,0,256,128);c.fillStyle='#e7d0a3';c.font='42px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(text,128,64);map.needsUpdate=true;
 });
 useEffect(()=>()=>map.dispose(),[map]);
 useEffect(()=>()=>{face.dispose();screen.dispose();},[face,screen]);
 const mode=policy.resolveMode({ref:liftRef,identity});if(mode!=='FULL_3D'&&mode!=='CONTEXT_3D')return null;
 const inspect=()=>select({ref:liftRef,kind:'device',label});
 return <group name={`ground-control-${liftRef}`} userData={{canonicalRef:liftRef,representation:'canonical-context-control'}} position={[x,0,0]} {...hover} onClick={e=>{e.stopPropagation();inspect();}}>
  <mesh position={[1,1.35,2.83]} material={face}><boxGeometry args={[.16,.39,.045]}/></mesh>
  <mesh position={[1,1.445,2.857]} material={screen}><planeGeometry args={[.125,.075]}/></mesh>
  <mesh position={[1,1.26,2.86]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.026,.026,.007,24]}/><meshStandardMaterial color="#bfa575" metalness={.7} roughness={.35}/></mesh>
 </group>;
}
export function GroundInteriorFinishes(){
 const {activeSystem,isolatedLevelRef,sectionMode,sectionSide}=useSceneMode();
 const {activeInteriorRef}=useInteriorFocus();
 const batches=useMemo(()=>buildGroundInterior(),[]);
 const materials=useMemo(()=>Object.fromEntries(batches.map(b=>[b.key,groundInteriorMaterials[b.key]()])),[batches]);
 useEffect(()=>{for(const m of Object.values(materials)){m.clippingPlanes=sectionClipPlanes(sectionMode,sectionSide);m.clipShadows=true;}},[materials,sectionMode,sectionSide]);
 useEffect(()=>()=>{batches.forEach(b=>b.geometry.dispose());Object.values(materials).forEach(m=>m.dispose());},[batches,materials]);
 const visible=activeSystem===null&&(!isolatedLevelRef||isolatedLevelRef==='LUNA-GROUND');
 return <group name="ground-interior-gold-standard" visible={visible} userData={{classification:'LUNA_REFERENCE_DESIGN',authority:'visual-only'}}>
  {batches.map(b=><DecorativeBatch key={b.key} batch={b} material={materials[b.key]}/>)}
  <GroundInteriorLettering/>
  {LUNA_CORES.filter(c=>c.ref.includes('LIFT-PASS')).map(c=><GroundLiftControl key={c.ref} liftRef={c.ref} x={c.x} label={c.label}/>)}
  {/* Three bounded, unshadowed lights. Visible rod emitters add no real lights. */}
  {activeInteriorRef==='LUNA-GROUND-LOBBY'&&<group>
   <pointLight name="ground-arrival-ambient" position={[0,3.95,11]} color="#ffe0b3" intensity={48} distance={15} decay={2}/>
   <pointLight name="ground-concierge-wash" position={[3.7,3.75,6.2]} color="#ffddb0" intensity={35} distance={9} decay={2}/>
   <pointLight name="ground-lounge-ambient" position={[-15,3.3,-2]} color="#ffe3bc" intensity={42} distance={12} decay={2}/>
  </group>}
 </group>;
}
