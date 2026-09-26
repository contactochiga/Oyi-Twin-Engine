import { useEffect, useState } from 'react';
import * as THREE from 'three';
export interface HeroPart { name:string; geometry:THREE.BufferGeometry; material:THREE.MeshStandardMaterial }
export interface HeroVisual { near:HeroPart[]; far:HeroPart[] }
/** Decorative projection only: copy geometry/materials, discard source hierarchy,
 * names/metadata as semantic authority, cameras, lights and animations. */
export function prepareHero(scene:THREE.Group,kind:'sedan'|'palm'):HeroPart[]{
 scene.updateMatrixWorld(true);const parts:HeroPart[]=[];let triangles=0;
 const bounds=new THREE.Box3().setFromObject(scene),size=bounds.getSize(new THREE.Vector3());
 if(![size.x,size.y,size.z,bounds.min.y].every(Number.isFinite)||bounds.min.y<-.001||size.y<=0||size.y>(kind==='palm'?6.11:1.5)||size.x>(kind==='palm'?5.8:2.2)||size.z>(kind==='palm'?5.8:4.401))throw Error('Hero asset bounds rejected');
 const meshes:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>[]=[];
 scene.traverse(o=>{if(!(o instanceof THREE.Mesh))return;
  if(!(o.material instanceof THREE.MeshStandardMaterial))throw Error('Unexpected hero material');
  triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
  if(triangles>(kind==='palm'?2500:10000))throw Error('Hero asset budget exceeded');
  if(kind==='palm'&&(!o.material.map?.image||!o.material.normalMap?.image))throw Error('Incomplete palm textures');
  meshes.push(o as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>);
 });
 for(const o of meshes){
  const material=o.material.clone();const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
  if(kind==='palm'){material.roughness=.86;material.alphaTest=.4;material.side=THREE.DoubleSide;material.normalScale.set(.5,.5);if(material.map)material.map.anisotropy=4;}
  parts.push({name:o.name,geometry,material});
 }
 if(!parts.length)throw Error('Empty hero asset');return parts;
}
const pending=new Map<string,Promise<HeroVisual|null>>();
function load(kind:'sedan'|'palm'){
 if(!pending.has(kind))pending.set(kind,import('three/examples/jsm/loaders/GLTFLoader.js').then(async({GLTFLoader})=>{
  const loader=new GLTFLoader();
  const settled=await Promise.allSettled([loader.loadAsync(`/exterior-assets/${kind==='palm'?'palm':kind+'-near'}.gltf`),loader.loadAsync(`/exterior-assets/${kind}-far.gltf`)]);
  const scenes=settled.flatMap(s=>s.status==='fulfilled'?[s.value]:[]),visuals:HeroPart[][]=[];let accepted=false;
  try{
   if(scenes.length!==2)throw Error('Incomplete hero LOD pair');
   for(const s of scenes)visuals.push(prepareHero(s.scene,kind));
   accepted=true;return {near:visuals[0],far:visuals[1]};
  }finally{
   const textures=new Set<THREE.Texture>();
   scenes.forEach(s=>s.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const v of Object.values(m))if(v instanceof THREE.Texture)textures.add(v);m.dispose();}}}));
   if(!accepted){visuals.flat().forEach(p=>{p.geometry.dispose();p.material.dispose();});textures.forEach(t=>{t.dispose();const image=t.image as {close?:()=>void};image?.close?.();});}
  }

 }).catch(error=>{console.warn(`Optional ${kind} visual unavailable; procedural fallback retained.`,error);return null;}));
 return pending.get(kind)!;
}
export function useHeroVisual(kind:'sedan'|'palm'){
 const [value,setValue]=useState<HeroVisual|null>(null);
 useEffect(()=>{let active=true;void load(kind).then(v=>{if(active)setValue(v);});return()=>{active=false;};},[kind]);return value;
}
