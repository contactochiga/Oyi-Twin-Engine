import {useHeroVisual} from './heroAssets';
import {HeroAsset} from './HeroAsset';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { palmLeaves, palmTrunk, shrubGeometry, leafMaterial } from './plantGeometry';
import { exteriorMaterials } from './exteriorMaterials';
import { metricFinishUV } from './exteriorTextureMaps';
import { useShrubVisual } from './landscapeAsset';
import { sitePlantingLayout } from './sitePlantingLayout';
import { mergedBoxGeometry, type BoxSpec } from '../../engine/utils/geometryUtils';

export function ExteriorPalm({position}:{position:[number,number,number]}) {
  const visual=useHeroVisual('palm');
  const near=useMemo(()=>palmLeaves('near'),[]),far=useMemo(()=>palmLeaves('far'),[]);
  const foliage=useRef<THREE.Mesh>(null),world=useMemo(()=>new THREE.Vector3(),[]);
  useFrame(({camera})=>{
    if(!foliage.current)return;
    foliage.current.getWorldPosition(world);
    foliage.current.geometry=camera.position.distanceToSquared(world)<32*32?near:far;
  });
  useEffect(()=>()=>{near.dispose();far.dispose();},[near,far]);
  const trunk=useMemo(()=>palmTrunk(),[]);
  const bark=useMemo(()=>exteriorMaterials.bark(),[]), leaf=useMemo(()=>leafMaterial(),[]);
  return <group position={position} rotation={[0,position[0]*.13+position[2]*.07,0]}>
    {visual?<HeroAsset visual={visual} kind="palm" levelRef="LUNA-GROUND"/>:<>
    <mesh geometry={trunk} material={bark} castShadow receiveShadow raycast={()=>null}/>
    <mesh ref={foliage} geometry={far} material={leaf} castShadow raycast={()=>null}/></>}
  </group>;
}
export function ExteriorShrub({position,scale=[1,1,1]}:{position:[number,number,number];scale?:[number,number,number]}){
  const geometry=useMemo(()=>shrubGeometry(),[]),material=useMemo(()=>leafMaterial(),[]);
  const visual=useShrubVisual();
  return <mesh position={position} scale={scale} geometry={visual?.geometry??geometry} material={visual?.material??material} dispose={null} raycast={()=>null}/>;
}
export interface ShrubPlacement {
  position:[number,number,number];
  scale:[number,number,number];
}
/** One draw per static landscape group; no per-frame matrix or React work. */
export function ExteriorShrubBatch({placements}:{placements:ShrubPlacement[]}) {
  const ref=useRef<THREE.InstancedMesh>(null);
  const geometry=useMemo(()=>shrubGeometry(),[]),material=useMemo(()=>leafMaterial(),[]);
  const visual=useShrubVisual();
  useLayoutEffect(()=>{
    const mesh=ref.current;if(!mesh)return;
    const transform=new THREE.Object3D();
    placements.forEach(({position,scale},i)=>{
      transform.position.set(...position);transform.scale.set(...scale);transform.updateMatrix();
      mesh.setMatrixAt(i,transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
  },[placements,visual]);
  return <instancedMesh ref={ref} args={[visual?.geometry??geometry,visual?.material??material,placements.length]} dispose={null} raycast={()=>null}/>;
}
export function LunaSiteSurface({width,depth}:{width:number;depth:number}){
  const material=useMemo(()=>exteriorMaterials.paving(),[]);
  const plane=useMemo(()=>{
    const source=new THREE.PlaneGeometry(width,depth);
    const geometry=metricFinishUV(source);source.dispose();return geometry;
  },[width,depth]);
  const spots=useMemo(()=>sitePlantingLayout(width,depth),[width,depth]);
  const beds=useMemo(()=>{
    const edges:BoxSpec[]=[],soil:BoxSpec[]=[];
    for(const {position:[x,,z]} of spots){
      for(const side of [-1,1]){
        edges.push({size:[2.1,.22,.1],position:[x,.06,z+side]});
        edges.push({size:[.1,.22,1.9],position:[x+side,.06,z]});
      }
      soil.push({size:[1.9,.03,1.9],position:[x,.14,z]});
    }
    return {edges:mergedBoxGeometry(edges),soil:mergedBoxGeometry(soil)};
  },[spots]);
  const bedMaterial=useMemo(()=>exteriorMaterials.limestone(),[]),soilMaterial=useMemo(()=>exteriorMaterials.soil(),[]);
  const joints=useMemo(()=>{
    const seams:BoxSpec[]=[];
    // Cut-stone joints sit on the existing slab; no new paths or boundaries.
    for(let x=-width/2+1.5;x<width/2;x+=1.5)
      seams.push({size:[.012,.004,depth],position:[x,-.047,0]});
    for(let z=-depth/2+1.5;z<depth/2;z+=1.5)
      seams.push({size:[width,.004,.012],position:[0,-.047,z]});
    return mergedBoxGeometry(seams);
  },[width,depth]);
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.05,0]} geometry={plane} material={material} receiveShadow raycast={()=>null}/>
    <mesh geometry={joints} raycast={()=>null}><meshStandardMaterial color="#77756a" roughness={1}/></mesh>
    <mesh geometry={beds.edges} material={bedMaterial} receiveShadow raycast={()=>null}/>
    <mesh geometry={beds.soil} material={soilMaterial} raycast={()=>null}/>
    <ExteriorShrubBatch placements={spots}/>
  </group>;
}
