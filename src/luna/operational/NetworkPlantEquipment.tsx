import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSelection, useIsSelected, useSystemAssetOpacity, useCanonicalHoverHandlers, useRuntimeAssetState } from "../../engine";
import type { CanonicalRef } from "../../engine/types";
import { statusTint } from "../../engine/utils/statusPresentation";

// Network / Edge & Physical Connectivity V1 — recognizable reference
// hardware for the registered network/edge assets, replacing the generic
// tinted box every other operational asset still uses. Same contract as
// every prior system's own *PlantEquipment.tsx: REFERENCE DESIGN,
// manufacturer-neutral, no fabricated port count/cabling detail beyond
// what a viewer would recognize as "networking equipment" before reading
// the label. Every indicator LED reflects that asset's OWN real runtime
// field — geometry never owns state, it only ever renders it.

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
      metal: new THREE.MeshStandardMaterial({ color: "#3c3f45", roughness: 0.4, metalness: 0.5, transparent: true, opacity: 0 }),
      metal2: new THREE.MeshStandardMaterial({ color: "#787d85", roughness: 0.3, metalness: 0.45, transparent: true, opacity: 0 }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tint.color, tint.emissiveIntensity]
  );
}

/** Rack-mounted unit — the core gateway/router and the Oyi Edge/Core
 * controller share this silhouette (both live in the B1 Network Room): a
 * short cabinet with a front panel and a row of status LEDs, the
 * recognizable "networking rack unit" shape. The LED row's color follows
 * that asset's own real online/uplink field. */
export function NetworkRackUnitGeometry({ ref_, label, position, color }: EquipmentProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const panelRef = useRef<THREE.Mesh>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("network-edge", bodyRef);
  useSystemAssetOpacity("network-edge", panelRef);
  useSystemAssetOpacity("network-edge", ledRef);
  const state = runtime?.state as { uplink_up?: boolean; online?: boolean } | undefined;
  const healthy = state?.uplink_up !== false && state?.online !== false;
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: healthy ? "Healthy" : "Uplink down" }));
  const { base, selected, metal, metal2 } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };
  const ledColor = healthy ? "#57cf9a" : "#e8543f";

  useFrame(({ clock }) => {
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(ledColor);
      mat.emissive.set(ledColor);
      mat.emissiveIntensity = healthy ? 0.45 : 0.5 + Math.sin(clock.elapsedTime * 5) * 0.3;
    }
  });

  return (
    <group position={position}>
      <mesh ref={bodyRef} position={[0, 0.11, 0]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.5, 0.22, 0.38]} />
      </mesh>
      <mesh ref={panelRef} position={[0, 0.11, 0.191]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.46, 0.16, 0.01]} />
      </mesh>
      <mesh ref={ledRef} position={[-0.18, 0.11, 0.198]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.02, 0.02, 0.006]} />
      </mesh>
    </group>
  );
}

/** Ceiling-mounted Wi-Fi access point — a low, flat disc with a status
 * LED, the recognizable "common-area AP" silhouette. LED reflects the
 * asset's own real reachability. */
export function WifiApGeometry({ ref_, label, position, color }: EquipmentProps) {
  const discRef = useRef<THREE.Mesh>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("network-edge", discRef);
  useSystemAssetOpacity("network-edge", ledRef);
  const reachable = runtime?.state.reachable !== false;
  const clients = typeof runtime?.state.clients_connected === "number" ? runtime.state.clients_connected : 0;
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: reachable ? `${clients} clients` : "Unreachable" }));
  const { base, selected, metal } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  useFrame(({ clock }) => {
    if (ledRef.current) (ledRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = reachable ? 0.4 : 0.5 + Math.sin(clock.elapsedTime * 6) * 0.35;
  });

  return (
    <group position={position} rotation={[Math.PI, 0, 0]}>
      <mesh ref={discRef} material={metal} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.1, 0.1, 0.03, 20]} />
      </mesh>
      <mesh ref={ledRef} position={[0, 0.02, 0]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <sphereGeometry args={[0.012, 8, 8]} />
      </mesh>
    </group>
  );
}

/** Wall-mounted termination box — the apartment's ONT and its own router
 * share this compact wall-box silhouette (real apartment fiber
 * terminations and home routers look like this), distinguished only by
 * size. LED follows the asset's own real uplink_up field. */
export function NetworkTerminationBoxGeometry({ ref_, label, position, color }: EquipmentProps) {
  const boxRef = useRef<THREE.Mesh>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("network-edge", boxRef);
  useSystemAssetOpacity("network-edge", ledRef);
  const uplinkUp = runtime?.state.uplink_up !== false;
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: uplinkUp ? "Uplink up" : "Uplink down" }));
  const { base, selected, metal } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };
  const ledColor = uplinkUp ? "#57cf9a" : "#e8543f";

  useFrame(() => {
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(ledColor);
      mat.emissive.set(ledColor);
      mat.emissiveIntensity = 0.55;
    }
  });

  return (
    <group position={position}>
      <mesh ref={boxRef} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.16, 0.11, 0.035]} />
      </mesh>
      <mesh ref={ledRef} position={[0.06, 0.03, 0.019]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.014, 0.014, 0.004]} />
      </mesh>
    </group>
  );
}
