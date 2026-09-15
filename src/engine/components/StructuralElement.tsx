import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { CanonicalRef } from "../types";
import { useSelection, useIsSelected } from "../hooks/useSelection";
import { useSystemAssetOpacity } from "../hooks/useSystemAssetOpacity";
import { useCanonicalHoverHandlers } from "../hooks/useHover";

interface StructuralElementProps {
  ref_: CanonicalRef;
  label: string;
  position: [number, number, number];
  size: [number, number, number];
  material: THREE.Material;
  selectedMaterial: THREE.Material;
  visualGeometry?: THREE.BufferGeometry;
  inspectionOpacity?: number;
}

/** One addressable structural element (column, slab, core wall segment,
 * foundation zone, ...) — a plain box, since Phase 13 is a conceptual
 * coordinated reference twin, not a modeled construction assembly. Reuses
 * the exact same Engineering Layer Mode opacity mechanism every other
 * operational marker uses (useSystemAssetOpacity with system="structure"),
 * so Structure mode fades in/out with zero new visibility logic — see
 * useSceneMode's systemFadeOverride, which already fades every level's
 * finish architecture to near-invisible when the active system has no
 * matching entries in the operational asset table (structure never does,
 * by design), leaving these elements as the only fully-opaque thing on
 * screen. Nested inside a level's own LevelMassing group (like
 * LevelFacade) so it explodes/isolates with that level for free — a
 * column is physically part of its own floor's structure, unlike a
 * continuous core wall or riser, which stays fixed (see
 * StructuralCoreWall). */
export function StructuralElement({ ref_, label, position, size, material, selectedMaterial, visualGeometry, inspectionOpacity }: StructuralElementProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  useSystemAssetOpacity("structure", meshRef, inspectionOpacity);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "structural-element", label });

  const geometry = useMemo(() => new THREE.BoxGeometry(...size), [size[0], size[1], size[2]]);

  return (
    <mesh
      ref={meshRef}
      name={ref_}
      geometry={visualGeometry ?? geometry}
      material={isSelected ? selectedMaterial : material}
      position={position}
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
