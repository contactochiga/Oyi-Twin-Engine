import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergedBoxGeometry } from "../../engine/utils/geometryUtils";
import { useCeilingOpacity } from "../../engine/hooks/useCeilingOpacity";
import { useSceneMode } from "../../engine/hooks/useSceneMode";
import { sectionClipPlanes } from "../../engine/utils/sectionClip";

/** Phase 2 working shell: y is FINISHED CLEAR underside, not mesh centre.
 * Shallow flush reference lights; no pendant or final decorative lighting package. */
export function GrandLobbyCeiling({ x, z, width, depth, y, roomRef }: {
  x: number; z: number; width: number; depth: number; y: number; roomRef: string;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const lights = useRef<THREE.Mesh>(null);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d7d5ce", roughness: 0.9, side: THREE.DoubleSide }), []);
  const lightMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#efe5cf", emissive: "#efe5cf", emissiveIntensity: 0.35 }), []);
  const { sectionMode, sectionSide } = useSceneMode();
  useCeilingOpacity("LUNA-GROUND", "LUNA-GROUND-LOBBY", roomRef, mesh);
  useCeilingOpacity("LUNA-GROUND", "LUNA-GROUND-LOBBY", roomRef, lights);
  const lightGeometry = useMemo(() => mergedBoxGeometry([-0.3, 0.3].map(f => ({ size: [0.14, 0.012, 0.14], position: [width * f, 0, 0] }))), [width]);
  useEffect(() => {
    for (const m of [material, lightMaterial]) { m.clippingPlanes = sectionClipPlanes(sectionMode, sectionSide); m.clipShadows = true; }
  }, [material, lightMaterial, sectionMode, sectionSide]);
  useEffect(() => () => { material.dispose(); lightMaterial.dispose(); lightGeometry.dispose(); }, [material, lightMaterial, lightGeometry]);
  return <group name={`ceiling-${roomRef}`} position={[x, y, z]} userData={{ finishedClearHeight: y }}>
    <mesh ref={mesh} position={[0, 0.03, 0]} material={material} receiveShadow><boxGeometry args={[width, 0.06, depth]} /></mesh>
    <mesh ref={lights} position={[0, -0.006, 0]} geometry={lightGeometry} material={lightMaterial} />
  </group>;
}
