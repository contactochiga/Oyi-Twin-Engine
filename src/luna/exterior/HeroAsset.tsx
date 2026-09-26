import {useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {useLevelFadeOpacity} from '../../engine/hooks/useLevelFadeOpacity';
import {useSceneMode} from '../../engine/hooks/useSceneMode';
import {sectionClipPlanes} from '../../engine/utils/sectionClip';
import {exteriorMaterials} from './exteriorMaterials';
import type {HeroPart,HeroVisual} from './heroAssets';
function partMaterial(part:HeroPart,kind:'sedan'|'palm'){
 if(kind==='palm')return part.material.clone();
 switch(part.name){case 'paint':return exteriorMaterials.carPaint();case 'glass':return exteriorMaterials.carGlass();case 'metal':return new THREE.MeshStandardMaterial({color:'#a2a5a6',roughness:.31,metalness:.8});case 'lens':return exteriorMaterials.lens();case 'tail':return exteriorMaterials.tailLens();case 'amber':return new THREE.MeshStandardMaterial({color:'#9b4d12',roughness:.3});default:return new THREE.MeshStandardMaterial({color:'#151718',roughness:.9});}
}
function HeroMesh({part,far,kind,levelRef}:{part:HeroPart;far:HeroPart;kind:'sedan'|'palm';levelRef:string}){
 const ref=useRef<THREE.Mesh>(null),world=useMemo(()=>new THREE.Vector3(),[]);
 const mode=useSceneMode();
 const material=useMemo(()=>{
  const owned=partMaterial(part,kind);
  owned.clippingPlanes=sectionClipPlanes(mode.sectionMode,mode.sectionSide);
  owned.clipShadows=true;
  return owned;
 },[part,kind,mode.sectionMode,mode.sectionSide]);
 useLevelFadeOpacity(levelRef,ref,1);
 useFrame(({camera})=>{const mesh=ref.current;if(!mesh)return;mesh.getWorldPosition(world);const close=camera.position.distanceToSquared(world)<32*32;mesh.geometry=close?part.geometry:far.geometry;mesh.castShadow=close;});
 useEffect(()=>()=>material.dispose(),[material]);
 return <mesh name={`exterior-hero-${kind}-${part.name}`} ref={ref} geometry={far.geometry} material={material} receiveShadow raycast={()=>null} dispose={null}/>;
}
export function HeroAsset({visual,kind,levelRef}:{visual:HeroVisual;kind:'sedan'|'palm';levelRef:string}){
 return <>{visual.near.map(part=><HeroMesh key={part.name} part={part} far={visual.far.find(p=>p.name===part.name)??part} kind={kind} levelRef={levelRef}/>)}</>;
}
