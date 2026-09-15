import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { LevelDescriptor } from '../../engine/types';
import { useLevelFadeOpacity } from '../../engine/hooks/useLevelFadeOpacity';
import { useSceneMode } from '../../engine/hooks/useSceneMode';
import { useSelection, useIsSelected } from '../../engine/hooks/useSelection';
import { useCanonicalHoverHandlers } from '../../engine/hooks/useHover';
import { sectionClipPlanes } from '../../engine/utils/sectionClip';
import { mergedBoxGeometry } from '../../engine/utils/geometryUtils';
import { GROUND_ENTRANCE_OPENING_WIDTH } from '../architecture/GroundEntrance';
import { exteriorMaterials } from './exteriorMaterials';

/** Procedural fallback VISUAL only. Same Ground extents and semantic parent.
 * The existing full-height lobby glass covers .92w x .82h on the +Z face.
 * Removing opaque backing ONLY there reveals the already-modeled common lobby.
 * Other sides stay closed. No new room/window/door or access capability.
 */
export function GroundExteriorEnvelope({level}:{level:LevelDescriptor}) {
  const mesh=useRef<THREE.Mesh>(null);
  const material=useMemo(()=>exteriorMaterials.limestone(),[]);
  const selectedMaterial=useMemo(()=>new THREE.MeshStandardMaterial({color:'#d6d0c3',emissive:'#78512b',emissiveIntensity:.25,roughness:.76,side:THREE.DoubleSide}),[]);
  const selected=useIsSelected(level.ref),{select}=useSelection();
  const hover=useCanonicalHoverHandlers({ref:level.ref,kind:'level',label:level.label});
  const {sectionMode,sectionSide}=useSceneMode();
  useLevelFadeOpacity(level.ref,mesh);
  useEffect(()=>{for(const m of [material,selectedMaterial]){m.side=THREE.DoubleSide;m.clippingPlanes=sectionClipPlanes(sectionMode,sectionSide);m.clipShadows=true;}},[material,selectedMaterial,sectionMode,sectionSide]);
  const geometry=useMemo(()=>{
    const {width:w,depth:d}=level.footprint,h=level.height,t=.16,halfEntry=GROUND_ENTRANCE_OPENING_WIDTH/2;
    // Existing glazing y=[-.46h,.36h]; do not invent a taller opening.
    return mergedBoxGeometry([
      {size:[t,h,d],position:[-w/2+t/2,0,0]},
      {size:[t,h,d],position:[w/2-t/2,0,0]},
      {size:[w,h,t],position:[0,0,-d/2+t/2]},
      {size:[w,t,d],position:[0,h/2-t/2,0]},
      {size:[w,t,d],position:[0,-h/2+t/2,0]},
      {size:[w*.04,h,t],position:[-w*.48,0,d/2-t/2]},
      {size:[w*.04,h,t],position:[w*.48,0,d/2-t/2]},
      {size:[w*.92,h*.14,t],position:[0,h*.43,d/2-t/2]},
      // Ground glazing has a low plinth. Leave the known entrance axis clear.
      {size:[w*.46-halfEntry,h*.04,t],position:[-(w*.46+halfEntry)/2,-h*.48,d/2-t/2]},
      {size:[w*.46-halfEntry,h*.04,t],position:[(w*.46+halfEntry)/2,-h*.48,d/2-t/2]},
    ]);
  },[level]);
  return <mesh ref={mesh} name="ground-procedural-envelope" geometry={geometry} material={selected?selectedMaterial:material} castShadow receiveShadow
    onClick={e=>{e.stopPropagation();select({ref:level.ref,kind:'level',label:level.label});}} {...hover}/>;
}
