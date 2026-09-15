import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSelection, useIsSelected, useSystemAssetOpacity, useCanonicalHoverHandlers, useRuntimeAssetState } from "../../engine";
import type { CanonicalRef } from "../../engine/types";
import { statusTint } from "../../engine/utils/statusPresentation";

// Electrical System V1 — recognizable reference equipment geometry for the
// B1 electrical plant + Apartment 6A distribution, replacing the generic
// tinted box every other operational asset still uses. Same contract as
// WaterPlantEquipment.tsx (Part D precedent): REFERENCE DESIGN, manufacturer-
// neutral, credible enough that a knowledgeable viewer recognizes the
// equipment category before reading the label, never a manufacturer/model
// claim. Geometry only ever renders runtime state, never owns it.
//
// useSystemAssetOpacity is called once per mesh (never once per group) —
// see WaterPlantEquipment.tsx's own docstring for why.

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
      metal: new THREE.MeshStandardMaterial({ color: "#4b4f57", roughness: 0.4, metalness: 0.55, transparent: true, opacity: 0 }),
      metal2: new THREE.MeshStandardMaterial({ color: "#6a6e76", roughness: 0.35, metalness: 0.6, transparent: true, opacity: 0 }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tint.color, tint.emissiveIntensity]
  );
}

function clampPct(v: unknown): number {
  const n = typeof v === "number" ? v : 0;
  return Math.max(0, Math.min(100, n));
}

/** Freestanding LV switchboard/switchgear cabinet — a tall floor-mounted
 * enclosure on a plinth, a hinged door panel, and a vent louvre strip near
 * the top. Used for both the utility intake demarcation (GRID-01) and the
 * main distribution board (MDB-01) — the two roles the current schedule
 * doesn't yet separate into distinct assets (no registered EQ-TRANSFORMER/
 * switchgear instance — see docs/LUNA_ELECTRICAL_REFERENCE_SPEC.md). An
 * indicator strip on the door reads the asset's own energized/status field
 * so a de-energized board visibly reads differently, not just via label. */
export function SwitchboardCabinetGeometry({ ref_, label, position, color }: EquipmentProps) {
  const plinthRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const doorLeftRef = useRef<THREE.Mesh>(null);
  const doorRightRef = useRef<THREE.Mesh>(null);
  const handleLeftRef = useRef<THREE.Mesh>(null);
  const handleRightRef = useRef<THREE.Mesh>(null);
  const louvreRef = useRef<THREE.Mesh>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("electrical", plinthRef);
  useSystemAssetOpacity("electrical", bodyRef);
  useSystemAssetOpacity("electrical", doorLeftRef);
  useSystemAssetOpacity("electrical", doorRightRef);
  useSystemAssetOpacity("electrical", handleLeftRef);
  useSystemAssetOpacity("electrical", handleRightRef);
  useSystemAssetOpacity("electrical", louvreRef);
  useSystemAssetOpacity("electrical", indicatorRef);
  const energized = runtime?.state.energized !== false && runtime?.state.utility_available !== false;
  const detailParts: string[] = [];
  if (typeof runtime?.state.voltage_v === "number") detailParts.push(`${runtime.state.voltage_v}V`);
  if (typeof runtime?.state.load_pct === "number") detailParts.push(`${runtime.state.load_pct}% load`);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: detailParts.length ? detailParts.join(" · ") : energized ? "Energized" : "De-energized" }));
  const { base, selected, metal, metal2 } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  useFrame(() => {
    if (indicatorRef.current) (indicatorRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = energized ? 0.9 : 0.05;
  });

  return (
    <group position={position}>
      <mesh ref={plinthRef} position={[0, 0.08, 0]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[1.1, 0.16, 0.6]} />
      </mesh>
      <mesh ref={bodyRef} position={[0, 1.1, 0]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[1.0, 1.9, 0.55]} />
      </mesh>
      {/* Two door leaves with a visible seam — reads as a real segmented
          switchboard/switchgear panel run rather than a single flat door. */}
      <mesh ref={doorLeftRef} position={[-0.215, 1.1, 0.28]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.41, 1.7, 0.03]} />
      </mesh>
      <mesh ref={doorRightRef} position={[0.215, 1.1, 0.28]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.41, 1.7, 0.03]} />
      </mesh>
      <mesh ref={handleLeftRef} position={[-0.02, 1.1, 0.3]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.03, 0.22, 0.02]} />
      </mesh>
      <mesh ref={handleRightRef} position={[0.02, 1.1, 0.3]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.03, 0.22, 0.02]} />
      </mesh>
      <mesh ref={louvreRef} position={[0, 1.85, 0.29]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.7, 0.14, 0.02]} />
      </mesh>
      <mesh ref={indicatorRef} position={[0.32, 1.7, 0.3]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.08, 0.08, 0.02]} />
      </mesh>
    </group>
  );
}

/** ATS / changeover cabinet — a squat freestanding enclosure with two
 * source indicator lamps (grid/generator) whose active one lights up from
 * the ATS's own `source` field. */
export function ATSCabinetGeometry({ ref_, label, position, color }: EquipmentProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const doorRef = useRef<THREE.Mesh>(null);
  const gridLampRef = useRef<THREE.Mesh>(null);
  const genLampRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("electrical", bodyRef);
  useSystemAssetOpacity("electrical", doorRef);
  useSystemAssetOpacity("electrical", gridLampRef);
  useSystemAssetOpacity("electrical", genLampRef);
  const source = runtime?.state.source === "generator" ? "generator" : "grid";
  const fault = Boolean(runtime?.state.fault);
  // V1.1 — the ATS's brief break-before-make changeover window (Part 2's
  // "ATS TRANSFERRING" reference step) reads as BOTH lamps flickering
  // rather than either one solid, so the changeover is visible without
  // reading a label.
  const transitioning = Boolean(runtime?.state.transitioning);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: fault ? "Fault" : transitioning ? "Transferring…" : `Source: ${source === "generator" ? "Generator" : "Utility"}` }));
  const { base, selected, metal, metal2 } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  useFrame(({ clock }) => {
    const flicker = 0.3 + Math.sin(clock.elapsedTime * 9) * 0.3;
    if (gridLampRef.current) (gridLampRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = fault ? 0.05 : transitioning ? flicker : source === "grid" ? 0.9 : 0.05;
    if (genLampRef.current) (genLampRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = fault ? 0.05 : transitioning ? flicker : source === "generator" ? 0.9 : 0.05;
  });

  return (
    <group position={position}>
      <mesh ref={bodyRef} position={[0, 0.7, 0]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.78, 1.3, 0.5]} />
      </mesh>
      <mesh ref={doorRef} position={[0, 0.7, 0.26]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.66, 1.14, 0.03]} />
      </mesh>
      <mesh ref={gridLampRef} position={[-0.14, 1.2, 0.28]} material={base} onClick={onClick} {...hoverHandlers}>
        <sphereGeometry args={[0.045, 10, 10]} />
      </mesh>
      <mesh ref={genLampRef} position={[0.14, 1.2, 0.28]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <sphereGeometry args={[0.045, 10, 10]} />
      </mesh>
    </group>
  );
}

/** Standby generator set — skid base, engine/alternator body, radiator
 * grille, canopy hood and an exhaust stack, with a slow cooling-fan spin
 * and a faint exhaust glow while RUNNING (never an arcade pulse). */
export function GeneratorSetGeometry({ ref_, label, position, color }: EquipmentProps) {
  const skidRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const radiatorRef = useRef<THREE.Mesh>(null);
  const fanRef = useRef<THREE.Mesh>(null);
  const canopyRef = useRef<THREE.Mesh>(null);
  const stackRef = useRef<THREE.Mesh>(null);
  const controlPanelRef = useRef<THREE.Mesh>(null);
  const controlPanelLampRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("electrical", skidRef);
  useSystemAssetOpacity("electrical", bodyRef);
  useSystemAssetOpacity("electrical", radiatorRef);
  useSystemAssetOpacity("electrical", canopyRef);
  useSystemAssetOpacity("electrical", stackRef);
  useSystemAssetOpacity("electrical", controlPanelRef);
  useSystemAssetOpacity("electrical", controlPanelLampRef);
  const phase = typeof runtime?.state.phase === "string" ? runtime.state.phase : runtime?.state.running ? "running" : "stopped";
  const fault = Boolean(runtime?.state.fault);
  const running = phase === "running";
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: fault ? "Fault" : `${String(phase).toUpperCase()}${typeof runtime?.state.fuel_level_pct === "number" ? ` · ${runtime.state.fuel_level_pct}% fuel` : ""}` }));
  const { base, selected, metal, metal2 } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  useFrame((_, delta) => {
    if (fanRef.current && (running || phase === "starting")) fanRef.current.rotation.z += delta * (running ? 5 : 2.2);
    if (radiatorRef.current) (radiatorRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = running ? 0.35 : phase === "starting" ? 0.18 : 0;
    if (controlPanelLampRef.current) (controlPanelLampRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = fault ? 0.9 : running ? 0.6 : 0.05;
  });

  return (
    <group position={position}>
      <mesh ref={skidRef} position={[0, 0.1, 0]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[1.9, 0.2, 0.95]} />
      </mesh>
      <mesh ref={bodyRef} position={[0.15, 0.62, 0]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[1.3, 0.85, 0.8]} />
      </mesh>
      <mesh ref={radiatorRef} position={[-0.75, 0.62, 0]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.14, 0.7, 0.7]} />
      </mesh>
      <mesh ref={fanRef} position={[-0.83, 0.62, 0]}>
        <boxGeometry args={[0.02, 0.5, 0.08]} />
        <meshBasicMaterial color="#ffd9a8" transparent opacity={0} />
      </mesh>
      <mesh ref={canopyRef} position={[0.05, 1.16, 0]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[1.85, 0.14, 0.98]} />
      </mesh>
      <mesh ref={stackRef} position={[0.55, 1.42, 0.28]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.055, 0.055, 0.4, 10]} />
      </mesh>
      {/* Control/annunciator panel — the small instrument box every real
          genset mounts on its body, the visual tell that reads "generator
          set" rather than "engine block". */}
      <mesh ref={controlPanelRef} position={[0.62, 0.78, 0.41]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.28, 0.22, 0.04]} />
      </mesh>
      <mesh ref={controlPanelLampRef} position={[0.62, 0.83, 0.435]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.06, 0.05, 0.01]} />
      </mesh>
    </group>
  );
}

/** Slim inverter/battery-backup cabinet — narrower than a switchboard, with
 * a fill band tracking battery_pct the same way the water tank tracks
 * level_pct, so charge state reads spatially. */
export function InverterCabinetGeometry({ ref_, label, position, color }: EquipmentProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const fillRef = useRef<THREE.Mesh>(null);
  const doorRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("electrical", bodyRef);
  useSystemAssetOpacity("electrical", fillRef);
  useSystemAssetOpacity("electrical", doorRef);
  const batteryPct = clampPct(runtime?.state.battery_pct);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: runtime?.state.on ? `On · ${batteryPct}% battery` : "Off" }));
  const { base, selected, metal, metal2 } = useTintedMaterials(color, runtime);
  const bodyHeight = 1.5;
  const fillHeight = Math.max(0.06, (bodyHeight - 0.2) * (batteryPct / 100));
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  return (
    <group position={position}>
      <mesh ref={bodyRef} position={[0, bodyHeight / 2, 0]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.6, bodyHeight, 0.4]} />
      </mesh>
      <mesh ref={fillRef} position={[0, 0.1 + fillHeight / 2, 0.21]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.46, fillHeight, 0.02]} />
      </mesh>
      <mesh ref={doorRef} position={[0, bodyHeight - 0.15, 0.21]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.46, 0.2, 0.02]} />
      </mesh>
    </group>
  );
}

/** Wall/panel-mounted electricity meter — a shallow box with a small
 * recessed display face, distinct from the deep floor-standing cabinets.
 * Used for both the common building meter and the Apartment 6A meter. */
export function ElectricityMeterGeometry({ ref_, label, position, color }: EquipmentProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const faceRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("electrical", bodyRef);
  useSystemAssetOpacity("electrical", faceRef);
  const supplyActive = runtime?.state.supply_active !== false;
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: typeof runtime?.state.reading_kwh === "number" ? `${runtime.state.reading_kwh.toFixed(1)} kWh${supplyActive ? "" : " · no supply"}` : undefined }));
  const { base, selected, metal } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  useFrame(() => {
    if (faceRef.current) (faceRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = supplyActive ? 0.55 : 0.05;
  });

  return (
    <group position={position}>
      <mesh ref={bodyRef} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.34, 0.46, 0.14]} />
      </mesh>
      <mesh ref={faceRef} position={[0, 0.02, 0.075]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.24, 0.16, 0.01]} />
      </mesh>
    </group>
  );
}

/** Apartment distribution board — a flush wall panel with a hinged door
 * and a small breaker row texture, so it reads as "the board inside the
 * utility closet" rather than a generic marker. */
export function DistributionBoardGeometry({ ref_, label, position, color }: EquipmentProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const doorRef = useRef<THREE.Mesh>(null);
  const breakersRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("electrical", bodyRef);
  useSystemAssetOpacity("electrical", doorRef);
  useSystemAssetOpacity("electrical", breakersRef);
  const energized = runtime?.state.energized !== false;
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: energized ? "Energized" : "De-energized" }));
  const { base, selected, metal, metal2 } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  return (
    <group position={position}>
      <mesh ref={bodyRef} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.5, 0.7, 0.14]} />
      </mesh>
      <mesh ref={breakersRef} position={[0, 0, 0.075]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.4, 0.5, 0.01]} />
      </mesh>
      <mesh ref={doorRef} position={[0.27, 0, 0.04]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.03, 0.72, 0.16]} />
      </mesh>
    </group>
  );
}
