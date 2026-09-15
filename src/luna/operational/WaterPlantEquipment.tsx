import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSelection, useIsSelected, useSystemAssetOpacity, useCanonicalHoverHandlers, useRuntimeAssetState } from "../../engine";
import type { CanonicalRef } from "../../engine/types";
import { statusTint } from "../../engine/utils/statusPresentation";

// Domestic Water Reference System V1 (Part D) — recognizable reference
// equipment geometry for the B1 water plant, replacing the generic tinted
// box every other operational asset still uses. REFERENCE DESIGN: credible
// enough that a knowledgeable viewer identifies the equipment category
// without relying on the label, never a manufacturer/model claim (LUNA_
// DIGITAL_BUILDING_STANDARD.md §7). State still comes from useRuntimeAssetState
// exactly like OperationalAssetMarker — geometry only ever RENDERS state,
// it never owns it (§3).
//
// useSystemAssetOpacity drives a single mesh's own material opacity +
// visible flag (see its own docstring) — it does not traverse a group's
// children, so every equipment item here is several meshes each wired to
// their own hook call rather than one call on a wrapping group. All calls
// compute the same target from the same scene-mode inputs and lerp with
// the same factor from the same starting value, so the parts stay visually
// synchronized in practice.

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
      metal: new THREE.MeshStandardMaterial({ color: "#8b8f96", roughness: 0.35, metalness: 0.6, transparent: true, opacity: 0 }),
      metal2: new THREE.MeshStandardMaterial({ color: "#8b8f96", roughness: 0.35, metalness: 0.6, transparent: true, opacity: 0 }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tint.color, tint.emissiveIntensity]
  );
}

function clampPct(v: unknown): number {
  const n = typeof v === "number" ? v : 0;
  return Math.max(0, Math.min(100, n));
}

/** Vertical storage tank — cylinder body, domed cap, and an inner fill
 * band whose height tracks the runtime level_pct so tank level reads
 * spatially, not just as a number (Part K). */
export function WaterTankGeometry({ ref_, label, position, color }: EquipmentProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const fillRef = useRef<THREE.Mesh>(null);
  const capRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("water", bodyRef);
  useSystemAssetOpacity("water", fillRef);
  useSystemAssetOpacity("water", capRef);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: typeof runtime?.state.level_pct === "number" ? `${runtime.state.level_pct}% full` : undefined }));
  const { base, selected, metal } = useTintedMaterials(color, runtime);

  const radius = 1.05;
  const height = 2.3;
  const levelPct = clampPct(runtime?.state.level_pct);
  const fillHeight = Math.max(0.08, (height - 0.3) * (levelPct / 100));
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  return (
    <group position={position}>
      <mesh ref={bodyRef} position={[0, height / 2, 0]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[radius, radius, height, 20]} />
      </mesh>
      <mesh ref={fillRef} position={[0, 0.15 + fillHeight / 2, 0]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[radius * 0.97, radius * 0.97, fillHeight, 20]} />
      </mesh>
      <mesh ref={capRef} position={[0, height + 0.22, 0]} material={metal} onClick={onClick} {...hoverHandlers}>
        <coneGeometry args={[radius * 1.02, 0.45, 20]} />
      </mesh>
    </group>
  );
}

/** Squat treatment/filtration assembly — a base housing with a filter
 * canister on top, a distinct silhouette from both the tank (taller,
 * narrower) and the pumps (horizontal). */
export function TreatmentUnitGeometry({ ref_, label, position, color }: EquipmentProps) {
  const baseRef = useRef<THREE.Mesh>(null);
  const canisterRef = useRef<THREE.Mesh>(null);
  const capRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("water", baseRef);
  useSystemAssetOpacity("water", canisterRef);
  useSystemAssetOpacity("water", capRef);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: runtime?.state.running ? "Running" : "Stopped" }));
  const { base, selected, metal } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  return (
    <group position={position}>
      <mesh ref={baseRef} position={[0, 0.4, 0]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[1.3, 0.8, 1.0]} />
      </mesh>
      <mesh ref={canisterRef} position={[0, 1.15, 0]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.42, 0.42, 0.9, 16]} />
      </mesh>
      <mesh ref={capRef} position={[0, 1.68, 0]} material={metal} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.44, 0.44, 0.08, 16]} />
      </mesh>
    </group>
  );
}

/** Booster pump — volute body + mounted motor on a base plate, with a
 * slow shaft-coupling rotation while running (subtle mechanical
 * indication, Part K — deliberately slow, not an arcade spin).
 *
 * Physical Reality V1 (§3) — a pump skid also needs its inlet/outlet
 * nozzles, a discharge isolation valve and a pressure gauge to read as a
 * complete pump ASSEMBLY rather than an isolated pump-shaped object. The
 * suction/discharge stubs and valve body are decorative pump-skid detail
 * (no canonical ref, no runtime state of their own — real pumps carry
 * bolted flanges and a local isolation valve that this twin doesn't
 * separately command) except the gauge needle, which reads the pump's
 * OWN pressure_bar so the instrument still only ever renders runtime
 * truth, never invents it. */
export function BoosterPumpGeometry({ ref_, label, position, color }: EquipmentProps) {
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
  useSystemAssetOpacity("water", baseRef);
  useSystemAssetOpacity("water", voluteRef);
  useSystemAssetOpacity("water", motorRef);
  useSystemAssetOpacity("water", suctionRef);
  useSystemAssetOpacity("water", dischargeRef);
  useSystemAssetOpacity("water", valveBodyRef);
  useSystemAssetOpacity("water", gaugeFaceRef);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: runtime?.state.fault ? "Fault" : runtime?.state.running ? `Running · ${runtime.state.pressure_bar ?? 0} bar` : "Stopped" }));
  const { base, selected, metal, metal2 } = useTintedMaterials(color, runtime);
  const running = Boolean(runtime?.state.running) && !runtime?.state.fault;
  const pressureBar = typeof runtime?.state.pressure_bar === "number" ? runtime.state.pressure_bar : 0;
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  useFrame((_, delta) => {
    if (running && shaftRef.current) shaftRef.current.rotation.y += delta * 1.4;
    if (motorRef.current) (motorRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = running ? 0.5 : 0;
    if (gaugeNeedleRef.current) {
      // 0-10 bar reference sweep across ~200° — decorative instrument
      // reading, never a claimed calibrated gauge.
      const target = -Math.PI * 0.15 - (Math.min(pressureBar, 10) / 10) * Math.PI * 1.1;
      gaugeNeedleRef.current.rotation.z += (target - gaugeNeedleRef.current.rotation.z) * 0.1;
    }
  });

  return (
    <group position={position}>
      <mesh ref={baseRef} position={[0, 0.06, 0]} material={metal} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.85, 0.12, 0.55]} />
      </mesh>
      <mesh ref={voluteRef} position={[-0.18, 0.34, 0]} rotation={[0, 0, Math.PI / 2]} material={isSelected ? selected : base} castShadow onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.24, 0.24, 0.34, 16]} />
      </mesh>
      <mesh ref={motorRef} position={[0.2, 0.34, 0]} material={metal2} castShadow onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.17, 0.17, 0.32, 16]} />
      </mesh>
      <mesh ref={shaftRef} position={[0.2, 0.34, 0]}>
        <boxGeometry args={[0.03, 0.03, 0.3]} />
        <meshBasicMaterial color="#ffd9a8" transparent opacity={0} />
      </mesh>
      {/* Suction stub (intake side, facing the tank) and discharge stub
          (header side) — the volute is not a floating shape, it visibly
          connects to piping in both directions. */}
      <mesh ref={suctionRef} position={[-0.42, 0.34, 0]} rotation={[0, 0, Math.PI / 2]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.1, 0.1, 0.2, 12]} />
      </mesh>
      <mesh ref={dischargeRef} position={[-0.18, 0.34, 0.32]} rotation={[Math.PI / 2, 0, 0]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.1, 0.1, 0.24, 12]} />
      </mesh>
      {/* Local discharge isolation valve body — decorative pump-skid
          detail, no independent ref/state (see docstring). */}
      <mesh ref={valveBodyRef} position={[-0.18, 0.34, 0.46]} material={metal} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.16, 0.16, 0.08]} />
      </mesh>
      {/* Pressure gauge mounted on the volute — needle rotates with the
          pump's OWN runtime pressure_bar (see useFrame above). */}
      <mesh ref={gaugeFaceRef} position={[-0.18, 0.58, 0]} rotation={[Math.PI / 2, 0, 0]} material={metal2} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.07, 0.07, 0.02, 14]} />
      </mesh>
      <mesh ref={gaugeNeedleRef} position={[-0.18, 0.585, 0]} rotation={[Math.PI / 2, 0, 0]} material={base}>
        <boxGeometry args={[0.012, 0.055, 0.005]} />
      </mesh>
    </group>
  );
}

/** Isolation valve — body + handle that visibly rotates between open
 * (parallel to the pipe run) and closed (perpendicular), so valve position
 * corresponds to state without reading a label (Part K). */
export function IsolationValveGeometry({ ref_, label, position, color }: EquipmentProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const handleRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("water", bodyRef);
  useSystemAssetOpacity("water", handleRef);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind: "device", label, detail: runtime?.state.open ? "Open" : "Closed" }));
  const { base, selected, metal } = useTintedMaterials(color, runtime);
  const open = Boolean(runtime?.state.open);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  useFrame(() => {
    if (!handleRef.current) return;
    const target = open ? 0 : Math.PI / 2;
    handleRef.current.rotation.y += (target - handleRef.current.rotation.y) * 0.15;
  });

  return (
    <group position={position}>
      <mesh ref={bodyRef} rotation={[0, 0, Math.PI / 2]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.16, 0.16, 0.4, 14]} />
      </mesh>
      <mesh ref={handleRef} position={[0, 0.22, 0]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.05, 0.05, 0.32]} />
      </mesh>
    </group>
  );
}
