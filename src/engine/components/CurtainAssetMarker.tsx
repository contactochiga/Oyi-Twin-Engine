import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CanonicalRef } from "../types";
import type { OperationalSystem } from "../twinData";
import { useSelection, useIsSelected } from "../hooks/useSelection";
import { useSystemAssetOpacity } from "../hooks/useSystemAssetOpacity";
import { useRuntimeAssetState } from "../twinRuntime";
import { statusTint } from "../utils/statusPresentation";

interface CurtainAssetMarkerProps {
  ref_: CanonicalRef;
  label: string;
  parentRef?: CanonicalRef;
  system: OperationalSystem;
  /** Track center — top of the window opening this curtain covers. */
  position: [number, number, number];
  color: string;
  /** Full width of the window/track this curtain spans when fully closed. */
  trackWidth?: number;
  height?: number;
}

/** A real, animated curtain panel rather than a generic marker box —
 * curtains are one of the few operational assets Phase 5 explicitly asks
 * to visibly animate. Closed (position 0) is a full-width panel centered
 * on the track; opening gathers it into a thin bunch toward one edge,
 * exactly like a real curtain being drawn — driven by the runtime
 * provider's `position` field (0-100), never a locally-invented UI state. */
export function CurtainAssetMarker({ ref_, label, parentRef, system, position, color, trackWidth = 3, height = 1.9 }: CurtainAssetMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity(system, meshRef);

  const geometry = useMemo(() => new THREE.BoxGeometry(1, height, 0.08), [height]);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.75, metalness: 0.03, transparent: true, opacity: 0 }),
    [color]
  );
  const selectedMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffb454", emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.3, transparent: true, opacity: 0 }),
    []
  );

  const openPct = typeof runtime?.state.position === "number" ? (runtime.state.position as number) : 0;
  const tint = statusTint(color, runtime?.status ?? "normal");
  const activeMaterial = isSelected ? selectedMaterial : material;

  useEffect(() => {
    activeMaterial.color.set(tint.color);
    activeMaterial.emissive.set(tint.color);
    activeMaterial.emissiveIntensity = tint.emissiveIntensity;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tint.color, tint.emissiveIntensity, activeMaterial]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const openFrac = openPct / 100;
    const bunchedWidth = trackWidth * 0.12;
    const targetWidth = trackWidth - (trackWidth - bunchedWidth) * openFrac;
    const targetX = (trackWidth / 2 - targetWidth / 2) * openFrac;
    mesh.scale.x += (targetWidth - mesh.scale.x) * 0.08;
    mesh.position.x += (targetX - mesh.position.x) * 0.08;
  });

  return (
    <group position={[position[0], position[1] - height / 2, position[2]]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={activeMaterial}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          select({ ref: ref_, kind: "device", label, parentRef });
        }}
      />
    </group>
  );
}
