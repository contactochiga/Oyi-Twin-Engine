import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LevelDescriptor } from "../../engine/types";
import { useLevelFadeOpacity } from "../../engine/hooks/useLevelFadeOpacity";
import { useSceneMode } from "../../engine/hooks/useSceneMode";
import { sectionClipPlanes } from "../../engine/utils/sectionClip";
import { mergedBoxGeometry, type BoxSpec } from "../../engine/utils/geometryUtils";
import { podiumSlabPanels } from "./podiumSlabOpenings";
import { LUNA_L01_CLUB } from "../interiors/lunaInteriors";
import { useSelection } from "../../engine/hooks/useSelection";

/** Same L01 outer envelope. Floor finish is partitioned around room floors,
 * so each point has one finished surface. Only registered core apertures pass through the floor/roof skins;
 * no architectural atrium is introduced. Existing opaque exterior backing is retained. */
export function AmenityEnvelope({level}:{level:LevelDescriptor}) {
  const mesh=useRef<THREE.Mesh>(null);const {select}=useSelection();
  const {sectionMode,sectionSide}=useSceneMode();
  const material=useMemo(()=>new THREE.MeshStandardMaterial({color:'#bdbbb4',roughness:.9,side:THREE.DoubleSide,clippingPlanes:sectionClipPlanes(sectionMode,sectionSide),clipShadows:true}),[sectionMode,sectionSide]);
  useLevelFadeOpacity(level.ref,mesh);
  const geometry=useMemo(()=>{
    const {width:w,depth:d}=level.footprint,h=level.height,t=.12;
    const boxes:BoxSpec[]=[
      {size:[t,h,d],position:[-w/2+t/2,0,0]}, {size:[t,h,d],position:[w/2-t/2,0,0]},
      {size:[w,h,t],position:[0,0,-d/2+t/2]}, {size:[w,h,t],position:[0,0,d/2-t/2]},
      ...podiumSlabPanels(w,d,.06,h/2-.03),
    ];
    boxes.push(...podiumSlabPanels(w,d,.08,-h/2-.04,LUNA_L01_CLUB.rooms));
    return mergedBoxGeometry(boxes);
  },[level]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useEffect(()=>()=>material.dispose(),[material]);
  return <mesh ref={mesh} name="l01-coordinated-envelope" material={material} geometry={geometry} receiveShadow castShadow
    onClick={e=>{e.stopPropagation();select({ref:level.ref,kind:'level',label:level.label});}} />;
}
