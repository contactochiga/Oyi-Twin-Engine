import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LevelDescriptor } from "../types";
import { useSelection, useIsSelected } from "../hooks/useSelection";
import { useSceneMode, systemFadeOverride } from "../hooks/useSceneMode";
import { useCanonicalHoverHandlers } from "../hooks/useHover";
import { sectionClipPlanes } from "../utils/sectionClip";

interface LevelMassingProps {
  level: LevelDescriptor;
  /** stacking index used purely for the exploded-view vertical offset —
   * the engine doesn't care what building programme produced this order. */
  stackIndex: number;
  material: THREE.Material;
  selectedMaterial: THREE.Material;
  /** Target emissiveIntensity to lerp this level's own material toward —
   * a generic "night glow" knob (Phase 11). Harmless no-op for materials
   * with no emissive color set (stone, concrete, etc. default to black
   * emissive); only glazing-tier materials that opt in with a non-black
   * emissive color actually appear to glow. Omit/0 for no effect. */
  nightGlowIntensity?: number;
  /** Optional validated visual; keeps this component’s semantic transform alive. */
  visual?: React.ReactNode;
  hideVisual?: boolean;
  /** When a click on this level's own solid massing box lands inside this
   * region (in world space), the massing ignores it instead of selecting
   * the level — letting the click fall through to whatever real
   * architecture sits recessed behind that point (e.g. an exterior door
   * set back from the facade plane). The massing box is a solid, full-
   * footprint hit-target by design (see the module docstring below); this
   * is the one escape hatch for a genuine opening in that surface, not a
   * general-purpose mechanism — omit it and every level behaves exactly
   * as before. */
  isClickThrough?: (point: THREE.Vector3) => boolean;
  children?: React.ReactNode;
}

export function LevelMassing({ level, stackIndex, material, selectedMaterial, nightGlowIntensity = 0, visual, hideVisual = false, isClickThrough, children }: LevelMassingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(level.ref);
  const sceneMode = useSceneMode();
  const { isolatedLevelRef, exploded, explodeGap, sectionMode, sectionSide } = sceneMode;

  const isolatedElsewhere = isolatedLevelRef !== null && isolatedLevelRef !== level.ref;
  const restY = level.baseElevation + level.height / 2;
  const targetY = restY + (exploded ? stackIndex * explodeGap : 0);
  const systemOverride = systemFadeOverride(sceneMode, level.ref, 1);
  const targetOpacity = systemOverride !== null ? systemOverride : isolatedElsewhere ? 0.06 : 1;

  const offsetX = level.planOffset?.x ?? 0;
  const offsetZ = level.planOffset?.z ?? 0;

  // Set the resting position once on mount, imperatively — the group's
  // position is then owned entirely by useFrame below so a re-render never
  // fights the animation with a freshly-allocated JSX position array.
  useLayoutEffect(() => {
    groupRef.current?.position.set(offsetX, targetY, offsetZ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.12;
    }
    const mat = meshRef.current?.material as THREE.MeshStandardMaterial | undefined;
    if (mat && "opacity" in mat) {
      mat.transparent = targetOpacity < 1;
      mat.opacity += (targetOpacity - mat.opacity) * 0.15;
    }
    if (mat && "emissiveIntensity" in mat) {
      mat.emissiveIntensity += (nightGlowIntensity - mat.emissiveIntensity) * 0.08;
    }
  });

  const geometry = useMemo(
    () => new THREE.BoxGeometry(level.footprint.width, level.height, level.footprint.depth),
    [level.footprint.width, level.footprint.depth, level.height]
  );

  // Section/cutaway (Phase 13 §11) — the level's own solid massing box
  // needs the same clip as its facade detail (LevelFacade's FacadeMesh),
  // otherwise the box itself would still block the view even with every
  // decorative facade element cut away.
  useEffect(() => {
    const planes = sectionClipPlanes(sectionMode, sectionSide);
    material.clippingPlanes = planes;
    selectedMaterial.clippingPlanes = planes;
  }, [material, selectedMaterial, sectionMode, sectionSide]);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: level.ref, kind: "level", label: level.label });

  return (
    <group ref={groupRef}>
      <group visible={!hideVisual}>{visual ?? <mesh
        ref={meshRef}
        geometry={geometry}
        material={isSelected ? selectedMaterial : material}
        castShadow
        receiveShadow
        onClick={(e) => {
          if (isClickThrough?.(e.point)) return;
          e.stopPropagation();
          select({ ref: level.ref, kind: "level", label: level.label });
        }}
        {...hoverHandlers}
      />}</group>
      {children}
    </group>
  );
}
