import { groundInteriorMaterials, groundMetricUV } from "./groundInterior/groundInteriorMaterials";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergedBoxGeometry, type BoxSpec } from "../../engine/utils/geometryUtils";
import { rectangularPanels } from "../../engine/utils/rectangularPanels";
import { useSceneMode } from "../../engine/hooks/useSceneMode";
import { useLevelFadeOpacity } from "../../engine/hooks/useLevelFadeOpacity";
import { sectionClipPlanes } from "../../engine/utils/sectionClip";
import { LUNA_STRUCTURAL_ELEMENTS, LUNA_STRUCTURAL_CORE_WALL } from "../structure/lunaStructuralElements";
import { HingedDoor } from "../../engine/components/HingedDoor";
import { PODIUM_CORE_OPENINGS, L01_STAIR_DOORS } from "./podiumCoordination";
import type { LevelDescriptor } from "../../engine/types";
import { useSelection } from "../../engine/hooks/useSelection";

/** Plain architectural faces of EXISTING structure, not new structural assets.
 * The structural layer retains its independent engineering representation.
 * Real portal reveals connect the core face to the runtime landing door plane. */
export function PodiumCoreApproach({ level }: { level: LevelDescriptor }) {
  const mesh=useRef<THREE.Mesh>(null);
  const {activeSystem,sectionMode,sectionSide}=useSceneMode();
  const {select}=useSelection();
  useLevelFadeOpacity(level.ref,mesh);
  const material=useMemo(()=>{const m=groundInteriorMaterials.stone();m.side=THREE.DoubleSide;m.clippingPlanes=sectionClipPlanes(sectionMode,sectionSide);m.clipShadows=true;return m;},[sectionMode,sectionSide]);
  const geometry=useMemo(()=>{
    const core=LUNA_STRUCTURAL_CORE_WALL;
    const height=level.ref==='LUNA-GROUND'?4.65:2.9; // underside of existing L01 slab / transfer
    const openings=PODIUM_CORE_OPENINGS.filter(o=>o.baseElevation===level.baseElevation);
    const frontZ=core.centerZ+core.halfDepth+core.thickness;
    const panels=rectangularPanels(core.halfWidth*2+core.thickness*2,height,.06,openings.map(o=>({x:o.x-core.centerX,y:o.height/2-height/2,width:o.width,height:o.height})));
    const boxes:BoxSpec[]=panels.map(p=>({...p,position:[p.position[0]+core.centerX,p.position[1]+height/2,frontZ+.035]}));
    for(const o of openings){
      const depth=frontZ-1.5;
      for(const side of [-1,1])boxes.push({size:[.06,o.height,depth],position:[o.x+side*(o.width/2+.03),o.height/2,1.5+depth/2]});
      boxes.push({size:[o.width,.06,depth],position:[o.x,o.height+.03,1.5+depth/2]});
    }
    const g=mergedBoxGeometry(boxes);return groundMetricUV(g,2.4);
  },[level]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useEffect(()=>()=>material.dispose(),[material]);
  const columns=LUNA_STRUCTURAL_ELEMENTS.filter(e=>e.ownerLevelRef===level.ref&&e.elementType==='column');
  return <group name={`${level.ref}-coordinated-core-approach`} position={[0,-level.height/2,0]} visible={activeSystem===null}>
    <mesh ref={mesh} name={`${level.ref}-lift-portal-reveals`} geometry={geometry} material={material} castShadow receiveShadow />
    {level.ref === "LUNA-L01-AMENITIES" && L01_STAIR_DOORS.map(d=><group key={d.ref} position={[d.x,0,d.z]}><HingedDoor ref_={d.ref} label={d.label} width={d.width} height={d.height} open={false} /></group>)}
    {columns.map(c=><mesh key={c.ref} name={`${c.ref}-architectural-face`} position={[c.position.x,level.height/2+c.position.y,c.position.z]} material={material} castShadow receiveShadow
      userData={{canonicalRef:c.ref,representation:'architectural-face'}} onClick={e=>{e.stopPropagation();select({ref:c.ref,kind:'structural-element',label:c.label});}}>
      <boxGeometry args={[c.size.x,c.size.y,c.size.z]} />
    </mesh>)}
  </group>;
}
