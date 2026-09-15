// Luna Architectural Reality V1 — the Grand Lobby's feature ceiling
// system (brief Part 7/8). LUNA_REFERENCE_DESIGN. A coherent composition,
// not every lighting type combined at random: one perimeter soffit band
// (dropped edge), one recessed central field, one linear light seam where
// they meet, a downlight grid across the field, and — only over
// Reception, where the composition supports it — one feature pendant.
// Every emissive fixture is merged into as few draw calls as possible
// (Part 30: performance) and its brightness responds to the existing
// day/goldenHour/evening lighting mode, the same lerp convention
// LevelFacade's window glow already established — never an invisible
// light source with no corresponding fixture.

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { mergedBoxGeometry, type BoxSpec } from "../../engine/utils/geometryUtils";
import { lunaMaterialFactories } from "../lunaMaterials";
import { useLightingMode } from "../../engine/hooks/useLightingMode";

export interface GrandLobbyCeilingProps {
  x: number;
  z: number;
  width: number;
  depth: number;
  /** Local Y of the ceiling plane (matches the room's own wallHeight). */
  y: number;
  featurePendant?: boolean;
}

const SOFFIT_DROP = 0.16;
const SOFFIT_BAND = 1.1;
const DOWNLIGHT_SPACING = 3.2;

function useGlowIntensity(): number {
  const mode = useLightingMode();
  return mode === "day" ? 0.05 : mode === "goldenHour" ? 0.55 : 0.9;
}

export function GrandLobbyCeiling({ x, z, width, depth, y, featurePendant = false }: GrandLobbyCeilingProps) {
  const soffitMaterial = useMemo(() => lunaMaterialFactories.ceilingSoffit(), []);
  const fieldMaterial = useMemo(() => lunaMaterialFactories.ceilingFeature(), []);
  const downlightMaterial = useMemo(() => lunaMaterialFactories.downlightGlow(), []);
  const linearMaterial = useMemo(() => lunaMaterialFactories.linearLightGlow(), []);
  const pendantMaterial = useMemo(() => lunaMaterialFactories.lobbyFeaturePendant(), []);
  const glowRefs = useRef<THREE.Mesh[]>([]);
  const targetIntensity = useGlowIntensity();

  useFrame(() => {
    for (const mesh of glowRefs.current) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity += (targetIntensity - mat.emissiveIntensity) * 0.08;
    }
  });

  // Perimeter soffit — a dropped band around the field, four merged bars.
  const soffitGeometry = useMemo(() => {
    const hw = width / 2;
    const hd = depth / 2;
    const specs: BoxSpec[] = [
      { size: [width, SOFFIT_DROP, SOFFIT_BAND], position: [0, -SOFFIT_DROP / 2, -hd + SOFFIT_BAND / 2] },
      { size: [width, SOFFIT_DROP, SOFFIT_BAND], position: [0, -SOFFIT_DROP / 2, hd - SOFFIT_BAND / 2] },
      { size: [SOFFIT_BAND, SOFFIT_DROP, depth - SOFFIT_BAND * 2], position: [-hw + SOFFIT_BAND / 2, -SOFFIT_DROP / 2, 0] },
      { size: [SOFFIT_BAND, SOFFIT_DROP, depth - SOFFIT_BAND * 2], position: [hw - SOFFIT_BAND / 2, -SOFFIT_DROP / 2, 0] },
    ];
    return mergedBoxGeometry(specs);
  }, [width, depth]);

  // Recessed field — sits slightly higher than the soffit's underside.
  const fieldGeometry = useMemo(() => new THREE.BoxGeometry(Math.max(width - SOFFIT_BAND * 2, 0.5), 0.06, Math.max(depth - SOFFIT_BAND * 2, 0.5)), [width, depth]);

  // Linear light seam at the soffit/field transition — four thin merged strips.
  const linearGeometry = useMemo(() => {
    const hw = width / 2 - SOFFIT_BAND;
    const hd = depth / 2 - SOFFIT_BAND;
    const specs: BoxSpec[] = [
      { size: [Math.max(hw * 2, 0.5), 0.03, 0.06], position: [0, 0.01, -hd] },
      { size: [Math.max(hw * 2, 0.5), 0.03, 0.06], position: [0, 0.01, hd] },
      { size: [0.06, 0.03, Math.max(hd * 2, 0.5)], position: [-hw, 0.01, 0] },
      { size: [0.06, 0.03, Math.max(hd * 2, 0.5)], position: [hw, 0.01, 0] },
    ];
    return mergedBoxGeometry(specs);
  }, [width, depth]);

  // Downlight grid across the recessed field — merged into one geometry.
  const downlightGeometry = useMemo(() => {
    const fieldW = Math.max(width - SOFFIT_BAND * 2 - 0.6, 1);
    const fieldD = Math.max(depth - SOFFIT_BAND * 2 - 0.6, 1);
    const cols = Math.max(Math.round(fieldW / DOWNLIGHT_SPACING), 1);
    const rows = Math.max(Math.round(fieldD / DOWNLIGHT_SPACING), 1);
    const specs: BoxSpec[] = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const px = cols > 1 ? -fieldW / 2 + (i * fieldW) / (cols - 1) : 0;
        const pz = rows > 1 ? -fieldD / 2 + (j * fieldD) / (rows - 1) : 0;
        specs.push({ size: [0.16, 0.02, 0.16], position: [px, -0.01, pz] });
      }
    }
    return mergedBoxGeometry(specs);
  }, [width, depth]);

  return (
    <group position={[x, y, z]}>
      <mesh geometry={soffitGeometry} material={soffitMaterial} receiveShadow />
      <mesh geometry={fieldGeometry} material={fieldMaterial} receiveShadow />
      <mesh ref={(m) => { if (m) glowRefs.current[0] = m; }} geometry={linearGeometry} material={linearMaterial} />
      <mesh ref={(m) => { if (m) glowRefs.current[1] = m; }} geometry={downlightGeometry} material={downlightMaterial} />
      {featurePendant && (
        <group position={[0, -0.55, 0]}>
          <mesh material={pendantMaterial} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          </mesh>
          <mesh position={[0, -0.32, 0]} material={pendantMaterial} castShadow>
            <cylinderGeometry args={[0.55, 0.42, 0.22, 24]} />
          </mesh>
        </group>
      )}
    </group>
  );
}
