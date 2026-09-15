import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSelection, useIsSelected, useSystemAssetOpacity, useCanonicalHoverHandlers, useRuntimeAssetState } from "../../engine";
import type { CanonicalRef } from "../../engine/types";
import { statusTint } from "../../engine/utils/statusPresentation";

// CCTV & Spatial Security System V1 — recognizable reference camera
// hardware, replacing the generic tinted box every other operational
// asset still uses. Same contract as Water/Electrical/Fire/HVAC/
// AccessPlantEquipment.tsx: REFERENCE DESIGN, manufacturer-neutral,
// credible enough that a knowledgeable viewer recognizes "that's a
// security camera" before reading the label — body, wall/ceiling bracket
// and a distinct lens direction, never a manufacturer/model claim. The
// status LED reflects the camera's OWN real `online` field (green=online,
// red=offline) — geometry only ever renders runtime state, never owns it.

interface EquipmentProps {
  ref_: CanonicalRef;
  label: string;
  position: [number, number, number];
  color: string;
}

function useTintedMaterials(color: string, runtime: ReturnType<typeof useRuntimeAssetState>) {
  const tint = statusTint(color, runtime?.status ?? "normal");
  return useMemo(
    () => ({
      base: new THREE.MeshStandardMaterial({ color: tint.color, emissive: tint.color, emissiveIntensity: tint.emissiveIntensity, roughness: 0.4, metalness: 0.35, transparent: true, opacity: 0 }),
      selected: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffb454", emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.3, transparent: true, opacity: 0 }),
      metal: new THREE.MeshStandardMaterial({ color: "#3c3f45", roughness: 0.35, metalness: 0.55, transparent: true, opacity: 0 }),
      lens: new THREE.MeshStandardMaterial({ color: "#0a0b0d", roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0 }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tint.color, tint.emissiveIntensity]
  );
}

/** Wall/ceiling-mounted bullet camera — a compact body on a short bracket
 * arm, a dark forward-facing lens, and a status LED. The LED's color (not
 * just intensity) follows the camera's own real online/offline state —
 * green while online, red once a scenario drops it offline. */
export function CameraGeometry({ ref_, label, position, color }: EquipmentProps) {
  const bracketRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const lensRef = useRef<THREE.Mesh>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("security", bracketRef);
  useSystemAssetOpacity("security", bodyRef);
  useSystemAssetOpacity("security", lensRef);
  useSystemAssetOpacity("security", ledRef);
  const online = runtime?.state.online !== false;
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: online ? "Online" : "Offline" }));
  const { base, selected, metal, lens } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };
  const ledColor = online ? "#57cf9a" : "#e8543f";

  useFrame(({ clock }) => {
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(ledColor);
      mat.emissive.set(ledColor);
      mat.emissiveIntensity = online ? 0.45 : 0.5 + Math.sin(clock.elapsedTime * 5) * 0.3;
    }
  });

  return (
    <group position={position} rotation={[0.28, 0, 0]}>
      <mesh ref={bracketRef} position={[0, 0.05, -0.05]} material={metal} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.04, 0.09, 0.06]} />
      </mesh>
      <mesh ref={bodyRef} position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.045, 0.045, 0.14, 16]} />
      </mesh>
      <mesh ref={lensRef} position={[0, 0, 0.095]} rotation={[Math.PI / 2, 0, 0]} material={lens} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.035, 0.035, 0.01, 16]} />
      </mesh>
      <mesh ref={ledRef} position={[0.05, 0.02, 0.07]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <sphereGeometry args={[0.01, 8, 8]} />
      </mesh>
    </group>
  );
}
