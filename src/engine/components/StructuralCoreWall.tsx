import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { CanonicalRef } from "../types";
import { useSelection, useIsSelected } from "../hooks/useSelection";
import { useSystemAssetOpacity } from "../hooks/useSystemAssetOpacity";
import { useCanonicalHoverHandlers } from "../hooks/useHover";
import { mergedBoxGeometry, type BoxSpec } from "../utils/geometryUtils";

import { rectangularPanels } from "../utils/rectangularPanels";

interface StructuralCoreWallProps {
  frontOpenings?: readonly { x: number; width: number; baseElevation: number; height: number }[];
  ref_: CanonicalRef;
  label: string;
  centerX: number;
  centerZ: number;
  halfWidth: number;
  halfDepth: number;
  thickness: number;
  baseElevation: number;
  topElevation: number;
  material: THREE.Material;
  selectedMaterial: THREE.Material;
  revealFront?: boolean;
}

/** A continuous, full-height, hollow-ring structural wall — four merged
 * wall segments framing a rectangular void (for whatever vertical
 * circulation/riser cluster sits inside it) rather than a solid block.
 * One addressable element, like CoreShaft/RiserShaft, and fixed regardless
 * of any single level's explode state for the same reason those are: a
 * real core wall doesn't separate floor by floor. */
export function StructuralCoreWall({
  ref_,
  label,
  centerX,
  centerZ,
  halfWidth,
  halfDepth,
  thickness,
  baseElevation,
  topElevation,
  material,
  selectedMaterial,
  revealFront = false,
  frontOpenings,
}: StructuralCoreWallProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  useSystemAssetOpacity("structure", meshRef);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "structural-element", label });

  const height = topElevation - baseElevation;
  const geometry = useMemo(() => {
    const specs: BoxSpec[] = [
      { size: [halfWidth * 2 + thickness * 2, height, thickness], position: [centerX, 0, centerZ - halfDepth - thickness / 2] },
      { size: [halfWidth * 2 + thickness * 2, height, thickness], position: [centerX, 0, centerZ + halfDepth + thickness / 2] },
      { size: [thickness, height, halfDepth * 2], position: [centerX - halfWidth - thickness / 2, 0, centerZ] },
      { size: [thickness, height, halfDepth * 2], position: [centerX + halfWidth + thickness / 2, 0, centerZ] },
    ];
    const withoutFront = specs.filter((_, i) => i !== 1);
    if (revealFront) return mergedBoxGeometry(withoutFront);
    if (!frontOpenings?.length) return mergedBoxGeometry(specs);
    const front = rectangularPanels(halfWidth * 2 + thickness * 2, height, thickness,
      frontOpenings.map(o => ({ x: o.x - centerX, y: o.baseElevation + o.height / 2 - baseElevation - height / 2, width: o.width, height: o.height })));
    return mergedBoxGeometry([...withoutFront, ...front.map(b => ({ ...b, position: [b.position[0] + centerX, b.position[1], centerZ + halfDepth + thickness / 2] as [number, number, number] }))]);
  }, [centerX, centerZ, halfWidth, halfDepth, thickness, height, revealFront, frontOpenings, baseElevation]);

  return (
    <mesh
      ref={meshRef}
      name={ref_}
      geometry={geometry}
      material={isSelected ? selectedMaterial : material}
      position={[0, baseElevation + height / 2, 0]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        select({ ref: ref_, kind: "structural-element", label });
      }}
      {...hoverHandlers}
    />
  );
}
