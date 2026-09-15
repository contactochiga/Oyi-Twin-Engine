import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { TwinNodeDescriptor } from "../types";
import { useSelection, useIsSelected } from "../hooks/useSelection";
import { useLevelFadeOpacity } from "../hooks/useLevelFadeOpacity";

interface UnitVolumeProps {
  ref_: TwinNodeDescriptor["ref"];
  label: string;
  parentRef: TwinNodeDescriptor["ref"];
  /** position/size relative to the parent level's local origin */
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  material: THREE.Material;
  selectedMaterial: THREE.Material;
  /** Resting (non-isolated) opacity for the placeholder shell. Lower this
   * when the unit has a real interior nested inside it (see `children`) so
   * the shell doesn't visually bury the rooms/furniture. */
  restingOpacity?: number;
  /** An interior layer (rooms) nested at this unit's local origin — e.g.
   * Level 06 Apartment A's room layout. Optional: units without an
   * authored interior yet (B/C/D) just render the placeholder volume. */
  children?: ReactNode;
}

/** A placeholder volume for one addressable unit (apartment) within a
 * level. Phase 1/2 scope was a plain extruded box; Phase 3 adds an
 * optional nested interior (see `children`) positioned at this unit's own
 * origin, so entering an apartment's rooms is just normal group nesting —
 * not a second, separately-positioned scene. */
export function UnitVolume({ ref_, label, parentRef, x, z, width, depth, height, material, selectedMaterial, restingOpacity = 1, children }: UnitVolumeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  useLevelFadeOpacity(parentRef, meshRef, restingOpacity);

  const geometry = useMemo(() => new THREE.BoxGeometry(width, height * 0.92, depth), [width, depth, height]);

  return (
    <group position={[x, 0, z]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={isSelected ? selectedMaterial : material}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          select({ ref: ref_, kind: "unit", label, parentRef });
        }}
      />
      {children}
    </group>
  );
}
