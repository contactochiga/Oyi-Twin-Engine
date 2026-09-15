import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSelection, useIsSelected, useSystemAssetOpacity, useCanonicalHoverHandlers, useRuntimeAssetState } from "../../engine";
import type { CanonicalRef } from "../../engine/types";
import { statusTint } from "../../engine/utils/statusPresentation";

// Fire & Life Safety System V1 (Part 7) — recognizable reference equipment
// geometry for the B1 fire plant + detection devices, replacing the
// generic tinted box every other operational asset still uses. Same
// contract as WaterPlantEquipment.tsx/ElectricalPlantEquipment.tsx:
// REFERENCE DESIGN, manufacturer-neutral, credible enough that a
// knowledgeable viewer recognizes the equipment category before reading
// the label, never a manufacturer/model claim. Geometry only ever renders
// runtime state, never owns it — and never implies certified life-safety
// authority (see docs/LUNA_FIRE_LIFE_SAFETY_REFERENCE_SPEC.md §6).

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
      metal2: new THREE.MeshStandardMaterial({ color: "#6a6e76", roughness: 0.35, metalness: 0.55, transparent: true, opacity: 0 }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tint.color, tint.emissiveIntensity]
  );
}

/** Fire alarm control panel/cabinet — wall-mounted enclosure with a
 * vertical LED status strip (green/normal, amber/trouble, red/alarm) so
 * the panel's own state reads without a label, and a small zone-lamp row
 * suggesting monitored loops. */
export function FireAlarmPanelGeometry({ ref_, label, position, color }: EquipmentProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const doorRef = useRef<THREE.Mesh>(null);
  const statusLedRef = useRef<THREE.Mesh>(null);
  const zoneLampsRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("fire", bodyRef);
  useSystemAssetOpacity("fire", doorRef);
  useSystemAssetOpacity("fire", statusLedRef);
  useSystemAssetOpacity("fire", zoneLampsRef);
  const alarm = Boolean(runtime?.state.alarm_active);
  const trouble = Boolean(runtime?.state.trouble);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: alarm ? "ALARM" : trouble ? "Trouble" : "Normal" }));
  const { base, selected, metal, metal2 } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  useFrame(({ clock }) => {
    if (statusLedRef.current) {
      const mat = statusLedRef.current.material as THREE.MeshStandardMaterial;
      mat.color.set(alarm ? "#e8543f" : trouble ? "#e0a83c" : "#3fbf6a");
      mat.emissive.set(alarm ? "#e8543f" : trouble ? "#e0a83c" : "#3fbf6a");
      mat.emissiveIntensity = alarm ? 0.6 + Math.sin(clock.elapsedTime * 6) * 0.35 : 0.5;
    }
  });

  return (
    <group position={position}>
      <mesh ref={bodyRef} position={[0, 1.0, 0]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.7, 1.0, 0.28]} />
      </mesh>
      <mesh ref={doorRef} position={[0, 1.0, 0.15]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.6, 0.86, 0.02]} />
      </mesh>
      <mesh ref={statusLedRef} position={[0.28, 1.35, 0.17]} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.05, 0.14, 0.015]} />
        <meshStandardMaterial color="#3fbf6a" emissive="#3fbf6a" emissiveIntensity={0.5} transparent opacity={0} />
      </mesh>
      <mesh ref={zoneLampsRef} position={[-0.05, 0.95, 0.17]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.42, 0.3, 0.015]} />
      </mesh>
    </group>
  );
}

/** Fire pump — volute + motor on a base plate, same reference silhouette
 * language as the domestic booster pump but in the fire system's own
 * color, with a slow shaft-coupling rotation while RUNNING.
 *
 * Physical Reality V1 (§3) — same pump-ASSEMBLY completion as the
 * domestic booster pump: suction/discharge stubs, a local discharge
 * valve and a pressure gauge whose needle reads the pump's own
 * pressure_bar. The stubs/valve are decorative pump-skid detail with no
 * canonical ref or state of their own (see WaterPlantEquipment.tsx's
 * matching docstring) — kept visually distinguishable from the domestic
 * pump by proportion and the fire system's own color only, never a
 * different silhouette language. */
export function FirePumpGeometry({ ref_, label, position, color }: EquipmentProps) {
  const baseRef = useRef<THREE.Mesh>(null);
  const voluteRef = useRef<THREE.Mesh>(null);
  const motorRef = useRef<THREE.Mesh>(null);
  const shaftRef = useRef<THREE.Mesh>(null);
  const suctionRef = useRef<THREE.Mesh>(null);
  const dischargeRef = useRef<THREE.Mesh>(null);
  const valveBodyRef = useRef<THREE.Mesh>(null);
  const gaugeFaceRef = useRef<THREE.Mesh>(null);
  const gaugeNeedleRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("fire", baseRef);
  useSystemAssetOpacity("fire", voluteRef);
  useSystemAssetOpacity("fire", motorRef);
  useSystemAssetOpacity("fire", suctionRef);
  useSystemAssetOpacity("fire", dischargeRef);
  useSystemAssetOpacity("fire", valveBodyRef);
  useSystemAssetOpacity("fire", gaugeFaceRef);
  const running = Boolean(runtime?.state.running) && !runtime?.state.fault;
  const pressureBar = typeof runtime?.state.pressure_bar === "number" ? runtime.state.pressure_bar : 0;
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: runtime?.state.fault ? "Fault" : running ? `Running · ${runtime?.state.pressure_bar ?? 0} bar` : "Stopped" }));
  const { base, selected, metal, metal2 } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  useFrame((_, delta) => {
    if (running && shaftRef.current) shaftRef.current.rotation.y += delta * 1.6;
    if (motorRef.current) (motorRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = running ? 0.5 : 0;
    if (gaugeNeedleRef.current) {
      // Fire pump reference duty is higher than domestic booster — sweep
      // scaled to a 0-16 bar reference range, still purely decorative.
      const target = -Math.PI * 0.15 - (Math.min(pressureBar, 16) / 16) * Math.PI * 1.1;
      gaugeNeedleRef.current.rotation.z += (target - gaugeNeedleRef.current.rotation.z) * 0.1;
    }
  });

  return (
    <group position={position}>
      <mesh ref={baseRef} position={[0, 0.06, 0]} material={metal} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.9, 0.12, 0.58]} />
      </mesh>
      <mesh ref={voluteRef} position={[-0.19, 0.36, 0]} rotation={[0, 0, Math.PI / 2]} material={isSelected ? selected : base} castShadow onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.26, 0.26, 0.36, 16]} />
      </mesh>
      <mesh ref={motorRef} position={[0.21, 0.36, 0]} material={metal2} castShadow onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.18, 0.18, 0.34, 16]} />
      </mesh>
      <mesh ref={shaftRef} position={[0.21, 0.36, 0]}>
        <boxGeometry args={[0.03, 0.03, 0.32]} />
        <meshBasicMaterial color="#ffd9a8" transparent opacity={0} />
      </mesh>
      <mesh ref={suctionRef} position={[-0.45, 0.36, 0]} rotation={[0, 0, Math.PI / 2]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.11, 0.11, 0.2, 12]} />
      </mesh>
      <mesh ref={dischargeRef} position={[-0.19, 0.36, 0.34]} rotation={[Math.PI / 2, 0, 0]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.11, 0.11, 0.26, 12]} />
      </mesh>
      <mesh ref={valveBodyRef} position={[-0.19, 0.36, 0.5]} material={metal} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.18, 0.18, 0.08]} />
      </mesh>
      <mesh ref={gaugeFaceRef} position={[-0.19, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.075, 0.075, 0.02, 14]} />
      </mesh>
      <mesh ref={gaugeNeedleRef} position={[-0.19, 0.625, 0]} rotation={[Math.PI / 2, 0, 0]} material={base}>
        <boxGeometry args={[0.012, 0.058, 0.005]} />
      </mesh>
    </group>
  );
}

/** Fire water storage tank — rectangular (distinct silhouette from the
 * domestic water system's cylindrical tank) with a fire-service tag plate,
 * so the two "tank" categories never read as the same equipment. */
export function FireTankGeometry({ ref_, label, position, color }: EquipmentProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const capRef = useRef<THREE.Mesh>(null);
  const tagRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("fire", bodyRef);
  useSystemAssetOpacity("fire", capRef);
  useSystemAssetOpacity("fire", tagRef);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: "Fire water storage (reference)" }));
  const { base, selected, metal } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  return (
    <group position={position}>
      <mesh ref={bodyRef} position={[0, 0.95, 0]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[1.5, 1.9, 1.3]} />
      </mesh>
      <mesh ref={capRef} position={[0, 1.94, 0]} material={metal} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[1.56, 0.1, 1.36]} />
      </mesh>
      <mesh ref={tagRef} position={[0, 1.1, 0.66]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.4, 0.24, 0.02]} />
      </mesh>
    </group>
  );
}

/** Ceiling-mounted smoke/heat detector — a shallow disc with a small LED
 * that glows steady when normal and pulses when in alarm, the exact
 * detector silhouette a knowledgeable viewer expects (never a floating
 * marker cube). Used for both the common-area detector and the 6A entry
 * smoke detector. */
export function SmokeDetectorGeometry({ ref_, label, position, color }: EquipmentProps) {
  const discRef = useRef<THREE.Mesh>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("fire", discRef);
  useSystemAssetOpacity("fire", ledRef);
  const inAlarm = Boolean(runtime?.state.alarm ?? runtime?.state.smoke);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: inAlarm ? "ALARM" : "Normal" }));
  const { base, selected, metal } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  useFrame(({ clock }) => {
    if (ledRef.current) (ledRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = inAlarm ? 0.5 + Math.sin(clock.elapsedTime * 7) * 0.4 : 0.35;
  });

  return (
    <group position={position} rotation={[Math.PI, 0, 0]}>
      <mesh ref={discRef} material={metal} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.11, 0.13, 0.045, 20]} />
      </mesh>
      <mesh ref={ledRef} position={[0, 0.03, 0]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <sphereGeometry args={[0.016, 8, 8]} />
      </mesh>
    </group>
  );
}
