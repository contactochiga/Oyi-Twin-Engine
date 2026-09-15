import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { TwinNodeDescriptor } from "../types";
import { useSelection, useIsSelected } from "../hooks/useSelection";

interface CoreShaftProps {
  ref_: TwinNodeDescriptor["ref"];
  label: string;
  /** base and top elevation in metres, site datum = 0 */
  baseElevation: number;
  topElevation: number;
  /** plan position of the shaft centreline */
  x: number;
  z: number;
  width: number;
  depth: number;
  material: THREE.Material;
  selectedMaterial: THREE.Material;
}

/** A vertical circulation/service core element (elevator shaft, stair, riser)
 * that spans a fixed elevation range regardless of how individual levels
 * are being isolated or exploded — cores are load-bearing/continuous by
 * nature and Phase 1 intentionally keeps them static so the exploded view
 * reads as "floors peeling away from a fixed spine." */
export function CoreShaft({ ref_, label, baseElevation, topElevation, x, z, width, depth, material, selectedMaterial }: CoreShaftProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const height = topElevation - baseElevation;

  const geometry = useMemo(() => new THREE.BoxGeometry(width, height, depth), [width, height, depth]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={isSelected ? selectedMaterial : material}
      position={[x, baseElevation + height / 2, z]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        select({ ref: ref_, kind: "core-shaft", label });
      }}
    />
  );
}
