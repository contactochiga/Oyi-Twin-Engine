/* oxlint-disable react/immutability -- This adapter owns mutable Three.js materials, updated outside React render. */
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneMode, systemFadeOverride } from '../../engine/hooks/useSceneMode';
import { useSelection, useIsSelected } from '../../engine/hooks/useSelection';
import { useCanonicalHoverHandlers } from '../../engine/hooks/useHover';
import { sectionClipPlanes } from '../../engine/utils/sectionClip';
import type { GroundAsset } from './groundAsset';

/** Only visual geometry is swapped. The existing LevelMassing group still
 * owns the floor transform/explode; rooms and runtime assets remain siblings. */
export function GroundArchitecture({ asset, levelHeight, label }: { asset: GroundAsset; levelHeight: number; label: string }) {
  const sceneMode = useSceneMode();
  const { select } = useSelection();
  const selected = useIsSelected('LUNA-GROUND');
  const descriptor = { ref: 'LUNA-GROUND', kind: 'level' as const, label };
  const hover = useCanonicalHoverHandlers(descriptor);
  const materials = useMemo(() => asset.meshes.flatMap(mesh => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(m => {
    const material = m as THREE.MeshStandardMaterial;
    return { material, opacity: material.opacity, transparent: material.transparent, emissive: material.emissive.clone(), intensity: material.emissiveIntensity };
  })), [asset]);
  useEffect(() => {
    const planes = sectionClipPlanes(sceneMode.sectionMode, sceneMode.sectionSide);
    for (const { material } of materials) {
      material.clippingPlanes = planes;
      material.clipShadows = true;
      material.needsUpdate = true;
    }
  }, [materials, sceneMode.sectionMode, sceneMode.sectionSide]);
  useFrame(() => {
    for (const base of materials) {
      const override = systemFadeOverride(sceneMode, 'LUNA-GROUND', base.opacity);
      const target = override ?? (sceneMode.isolatedLevelRef && sceneMode.isolatedLevelRef !== 'LUNA-GROUND' ? 0.02 : base.opacity);
      base.material.opacity += (target - base.material.opacity) * 0.15;
      base.material.transparent = base.transparent || base.material.opacity < 0.98;
      base.material.emissive.copy(base.emissive);
      if (selected) base.material.emissive.addScalar(0.12);
      base.material.emissiveIntensity = selected ? Math.max(base.intensity, 0.5) : base.intensity;
    }
  });
  return <group name="ground-imported-envelope" position={[0, -levelHeight / 2, 0]}
    onClick={event => { event.stopPropagation(); select(descriptor); }} {...hover}>
    <primitive object={asset.scene} dispose={null} />
  </group>;
}
