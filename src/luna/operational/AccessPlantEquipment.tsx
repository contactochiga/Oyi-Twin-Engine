import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSelection, useIsSelected, useSystemAssetOpacity, useCanonicalHoverHandlers, useRuntimeAssetState } from "../../engine";
import type { CanonicalRef } from "../../engine/types";
import { statusTint } from "../../engine/utils/statusPresentation";

// Access & Security System V1 — recognizable reference hardware for the
// registered access points, replacing the generic tinted box every other
// operational asset still uses. Same contract as Water/Electrical/Fire/
// HvacPlantEquipment.tsx: REFERENCE DESIGN, manufacturer-neutral, credible
// enough that a knowledgeable viewer recognizes "that's an access reader/
// lock" before reading the label, never a manufacturer/model or security-
// certification claim. No door LEAF geometry exists anywhere in this
// codebase yet (InteriorRoom's doorSide only cuts a wall opening, never a
// door mesh — confirmed during this phase's audit) — this is a disclosed
// geometry gap, not fabricated here; both components below represent only
// the wall-mounted control hardware itself, which stands on its own as a
// recognizable object regardless of the door leaf.

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
      metal: new THREE.MeshStandardMaterial({ color: "#4b4f57", roughness: 0.4, metalness: 0.5, transparent: true, opacity: 0 }),
      metal2: new THREE.MeshStandardMaterial({ color: "#8a8f97", roughness: 0.3, metalness: 0.45, transparent: true, opacity: 0 }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tint.color, tint.emissiveIntensity]
  );
}

/** Common access-point control panel — a slim wall/post-mounted pedestal
 * with a card-reader face and a small status LED, the recognizable
 * "access control panel" silhouette. No lock/door telemetry is
 * instrumented for these registered points (see lunaSimulationProvider.ts's
 * schedule boundary), so the LED reflects only the asset's generic
 * runtime status, never a fabricated locked/unlocked read. */
export function AccessReaderPanelGeometry({ ref_, label, position, color }: EquipmentProps) {
  const postRef = useRef<THREE.Mesh>(null);
  const faceRef = useRef<THREE.Mesh>(null);
  const readerRef = useRef<THREE.Mesh>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("access", postRef);
  useSystemAssetOpacity("access", faceRef);
  useSystemAssetOpacity("access", readerRef);
  useSystemAssetOpacity("access", ledRef);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: "Registered access point" }));
  const { base, selected, metal, metal2 } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  useFrame(({ clock }) => {
    if (ledRef.current) (ledRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + Math.sin(clock.elapsedTime * 1.5) * 0.15;
  });

  return (
    <group position={position}>
      <mesh ref={postRef} position={[0, 0.55, 0]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.14, 1.1, 0.1]} />
      </mesh>
      <mesh ref={faceRef} position={[0, 0.95, 0.052]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.12, 0.16, 0.012]} />
      </mesh>
      <mesh ref={readerRef} position={[0, 0.95, 0.06]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.09, 0.09, 0.006]} />
      </mesh>
      <mesh ref={ledRef} position={[0, 1.16, 0.06]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <sphereGeometry args={[0.012, 10, 10]} />
      </mesh>
    </group>
  );
}

/** Apartment entrance lock/keypad — a compact wall-mounted plate beside
 * the door opening, with a keypad face and an indicator LED that reflects
 * this asset's OWN real locked state (green/secure when locked, amber
 * when unlocked) — the one governed, really-instrumented reference lock
 * in this catalog. Never a door leaf (see file header). */
export function AccessLockKeypadGeometry({ ref_, label, position, color }: EquipmentProps) {
  const plateRef = useRef<THREE.Mesh>(null);
  const keypadRef = useRef<THREE.Mesh>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("apartment-devices", plateRef);
  useSystemAssetOpacity("apartment-devices", keypadRef);
  useSystemAssetOpacity("apartment-devices", ledRef);
  const locked = Boolean(runtime?.state.locked);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: locked ? "Locked" : "Unlocked" }));
  const { base, selected, metal, metal2 } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };
  const ledColor = locked ? "#57cf9a" : "#f0a63e";

  useFrame(() => {
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(ledColor);
      mat.emissive.set(ledColor);
      mat.emissiveIntensity = 0.6;
    }
  });

  return (
    <group position={position}>
      <mesh ref={plateRef} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.1, 0.16, 0.02]} />
      </mesh>
      <mesh ref={keypadRef} position={[0, -0.02, 0.011]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.07, 0.08, 0.005]} />
      </mesh>
      <mesh ref={ledRef} position={[0, 0.06, 0.011]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.015, 0.015, 0.004]} />
      </mesh>
    </group>
  );
}
