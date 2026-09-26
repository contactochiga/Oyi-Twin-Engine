import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {useSceneMode} from '../../../engine/hooks/useSceneMode';
import {sectionClipPlanes} from '../../../engine/utils/sectionClip';
import {LUNA_CORES} from '../../lunaProgramme';
import {GROUND_FURNISHINGS} from './groundInteriorLayout';

/** Six unchanged static signs share one atlas/material/draw. Runtime floor
 * indicators remain independent textures on their canonical call stations. */
export interface InteriorSign {text:string;color:string;p:number[];r:number;w:number;h:number}
export function GroundInteriorLettering({signs:customSigns}:{signs?:InteriorSign[]}={}){
 const {sectionMode,sectionSide}=useSceneMode();
 const {map,geometry}=useMemo(()=>{
  const feature=GROUND_FURNISHINGS.find(f=>f.kind==='feature')!;
  const signs=customSigns??[
   {text:'L U N A',color:'#504135',p:[feature.x-.073,2.64,feature.z],r:-Math.PI/2,w:2.1,h:.48},
   {text:'R E S I D E N C E S',color:'#504135',p:[feature.x-.076,2.3,feature.z],r:-Math.PI/2,w:1.45,h:.25},
   {text:'RESIDENTS’ LIFTS',color:'#b9a078',p:[-5.4,2.15,2.83],r:0,w:1.3,h:.22},
   ...LUNA_CORES.filter(c=>c.ref.includes('LIFT-PASS')).map((c,i)=>({text:`0${i+1}`,color:'#b9a078',p:[c.x,2.655,2.82],r:0,w:.4,h:.13})),
  ];
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256*signs.length;
  const context=canvas.getContext('2d')!;context.font='400 95px Arial';context.textAlign='center';context.textBaseline='middle';
  const parts=signs.map((s,i)=>{
   context.fillStyle=s.color;context.fillText(s.text,512,i*256+128,940);
   const g=new THREE.PlaneGeometry(s.w,s.h),uv=g.attributes.uv;
   for(let v=0;v<uv.count;v++)uv.setY(v,(signs.length-1-i+uv.getY(v))/signs.length);
   g.rotateY(s.r);g.translate(s.p[0],s.p[1],s.p[2]);return g;
  });
  const geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  return {map,geometry};
 },[customSigns]);
 const material=useMemo(()=>new THREE.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:.5,metalness:.3,clippingPlanes:sectionClipPlanes(sectionMode,sectionSide)}),[map,sectionMode,sectionSide]);
 useEffect(()=>()=>{map.dispose();geometry.dispose();},[map,geometry]);
 useEffect(()=>()=>material.dispose(),[material]);
 return <mesh name="ground-static-lettering" geometry={geometry} material={material} matrixAutoUpdate={false} raycast={()=>{}}/>;
}
