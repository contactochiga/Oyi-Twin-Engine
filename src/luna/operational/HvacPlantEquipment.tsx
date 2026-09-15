import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSelection, useIsSelected, useSystemAssetOpacity, useCanonicalHoverHandlers, useRuntimeAssetState } from "../../engine";
import type { CanonicalRef } from "../../engine/types";
import { statusTint } from "../../engine/utils/statusPresentation";

// HVAC System V1 — recognizable reference equipment geometry for the
// Apartment 6A reference chain (outdoor condenser + two indoor split
// units), replacing the generic tinted box every other operational asset
// still uses. Same contract as Water/Electrical/FirePlantEquipment.tsx:
// REFERENCE DESIGN, manufacturer-neutral, credible enough that a
// knowledgeable viewer recognizes the equipment category before reading
// the label, never a manufacturer/model claim. Geometry only ever renders
// runtime state, never owns it (Digital Building Standard §3).

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
      metal: new THREE.MeshStandardMaterial({ color: "#c9cdd3", roughness: 0.4, metalness: 0.45, transparent: true, opacity: 0 }),
      metal2: new THREE.MeshStandardMaterial({ color: "#9aa0a8", roughness: 0.35, metalness: 0.5, transparent: true, opacity: 0 }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tint.color, tint.emissiveIntensity]
  );
}

/** Outdoor condensing unit — cabinet with a top fan grille, side service
 * panel and a mounting/feet frame, the recognizable "box with a fan on
 * top" silhouette every real split-system outdoor unit shares. The fan
 * spins (slow, restrained) only while `demand` is true — read directly
 * from this asset's OWN runtime row, driven by recomputeHvacNetwork()
 * from the two indoor units it's connected_to, never a second,
 * independently-guessed notion of "is the condenser running". */
export function OutdoorCondenserGeometry({ ref_, label, position, color }: EquipmentProps) {
  const frameRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const grilleRef = useRef<THREE.Mesh>(null);
  const fanRef = useRef<THREE.Mesh>(null);
  const panelRef = useRef<THREE.Mesh>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("hvac", frameRef);
  useSystemAssetOpacity("hvac", bodyRef);
  useSystemAssetOpacity("hvac", grilleRef);
  useSystemAssetOpacity("hvac", panelRef);
  useSystemAssetOpacity("hvac", indicatorRef);
  const demand = Boolean(runtime?.state.demand);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: demand ? "Serving cooling demand" : "Idle" }));
  const { base, selected, metal, metal2 } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  useFrame((_, delta) => {
    if (demand && fanRef.current) fanRef.current.rotation.y += delta * 3.2;
    if (indicatorRef.current) (indicatorRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = demand ? 0.6 : 0.05;
  });

  return (
    <group position={position}>
      <mesh ref={frameRef} position={[0, 0.06, 0]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.82, 0.1, 0.62]} />
      </mesh>
      <mesh ref={bodyRef} position={[0, 0.42, 0]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.78, 0.62, 0.56]} />
      </mesh>
      <mesh ref={grilleRef} position={[0, 0.74, 0]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.26, 0.26, 0.03, 20]} />
      </mesh>
      <mesh ref={fanRef} position={[0, 0.72, 0]}>
        <boxGeometry args={[0.4, 0.015, 0.05]} />
        <meshBasicMaterial color="#6a6e76" transparent opacity={0} />
      </mesh>
      <mesh ref={panelRef} position={[0, 0.42, 0.285]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.3, 0.4, 0.015]} />
      </mesh>
      <mesh ref={indicatorRef} position={[0.3, 0.58, 0.285]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.05, 0.05, 0.012]} />
      </mesh>
    </group>
  );
}

/** Wall-mounted indoor split terminal — flat casing, a front discharge
 * louvre and a top/rear intake strip, the recognizable low-profile
 * silhouette every real indoor split head shares. Louvre glow + a slow
 * discharge-air shimmer read as "on" without an arcade animation. */
export function IndoorUnitGeometry({ ref_, label, position, color }: EquipmentProps) {
  const casingRef = useRef<THREE.Mesh>(null);
  const intakeRef = useRef<THREE.Mesh>(null);
  const louvreRef = useRef<THREE.Mesh>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("apartment-devices", casingRef);
  useSystemAssetOpacity("apartment-devices", intakeRef);
  useSystemAssetOpacity("apartment-devices", louvreRef);
  useSystemAssetOpacity("apartment-devices", indicatorRef);
  const on = Boolean(runtime?.state.on);
  const fault = Boolean(runtime?.state.fault);
  const roomTemp = typeof runtime?.state.room_temp_c === "number" ? runtime.state.room_temp_c : undefined;
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: fault ? "Fault" : on ? `On${roomTemp !== undefined ? ` · ${roomTemp}°C` : ""}` : "Off" }));
  const { base, selected, metal, metal2 } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  useFrame(({ clock }) => {
    if (louvreRef.current) {
      const mat = louvreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = fault ? 0.5 + Math.sin(clock.elapsedTime * 6) * 0.3 : on ? 0.45 : 0.04;
    }
  });

  return (
    <group position={position}>
      <mesh ref={casingRef} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.72, 0.2, 0.18]} />
      </mesh>
      <mesh ref={intakeRef} position={[0, 0.06, -0.06]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.64, 0.03, 0.08]} />
      </mesh>
      <mesh ref={louvreRef} position={[0, -0.06, 0.09]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.64, 0.05, 0.02]} />
      </mesh>
      <mesh ref={indicatorRef} position={[0.3, 0.03, 0.091]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.04, 0.015, 0.005]} />
      </mesh>
    </group>
  );
}
