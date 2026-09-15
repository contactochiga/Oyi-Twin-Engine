import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { OperationalSystem } from "../twinData";
import { useSystemAssetOpacity } from "../hooks/useSystemAssetOpacity";

interface SystemRelationshipLineProps {
  /** World-space endpoints — parent/child asset positions resolved by the
   * caller (level baseElevation + optional unit offset), since only the
   * building composition knows how to turn a local asset position into a
   * world one. */
  from: [number, number, number];
  to: [number, number, number];
  system: OperationalSystem;
  color: string;
}

/** A clean schematic connector between two operational assets — deliberately
 * not a literal pipe/cable run (Phase 4 explicitly stops short of
 * engineering-grade MEP routing). Unlit (MeshBasicMaterial) so it reads
 * clearly as a diagram overlay regardless of scene lighting, and not
 * clickable — the parent/child relationship is demonstrated by the line
 * itself, not a separate selectable node. */
export function SystemRelationshipLine({ from, to, system, color }: SystemRelationshipLineProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  useSystemAssetOpacity(system, meshRef);

  const { geometry, position, quaternion } = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = Math.max(dir.length(), 0.001);
    const geo = new THREE.CylinderGeometry(0.045, 0.045, length, 6);
    geo.translate(0, length / 2, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { geometry: geo, position: start, quaternion: quat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from[0], from[1], from[2], to[0], to[1], to[2]]);

  const material = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 }), [color]);

  return <mesh ref={meshRef} geometry={geometry} material={material} position={position} quaternion={quaternion} />;
}
