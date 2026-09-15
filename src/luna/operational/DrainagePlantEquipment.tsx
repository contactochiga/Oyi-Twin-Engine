import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useSelection, useIsSelected, useSystemAssetOpacity, useCanonicalHoverHandlers, useRuntimeAssetState } from "../../engine";
import type { CanonicalRef } from "../../engine/types";
import { statusTint } from "../../engine/utils/statusPresentation";

// Drainage V1 — recognizable reference equipment geometry for the
// wastewater/vent/stormwater reference chains, replacing the generic
// tinted box every other operational asset still uses for these refs.
// Same contract as Water/Electrical/Fire/HvacPlantEquipment.tsx:
// REFERENCE DESIGN, manufacturer-neutral, no fabricated pipe diameters or
// gradients — a knowledgeable viewer recognizes the equipment category
// before reading the label, never a manufacturer/model claim. Geometry
// only ever renders runtime state, never owns it.

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
      base: new THREE.MeshStandardMaterial({ color: tint.color, emissive: tint.color, emissiveIntensity: tint.emissiveIntensity, roughness: 0.5, metalness: 0.2 }),
      selected: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffb454", emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.3 }),
      pvc: new THREE.MeshStandardMaterial({ color: "#8a7a68", roughness: 0.7, metalness: 0.1 }),
      metal: new THREE.MeshStandardMaterial({ color: "#9aa0a8", roughness: 0.4, metalness: 0.5 }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tint.color, tint.emissiveIntensity]
  );
}

/** A recessed floor drain grate — the shared reference silhouette for
 * every fixture-level drain point (kitchen, each bathroom, and the
 * apartment's own wet-area stack connection). The center indicator tints
 * per this asset's own real `condition` field where one exists (only the
 * stack connection carries real derived telemetry this phase — see
 * lunaDrainageResolver.ts), never a fabricated per-fixture sensor. */
export function DrainPointGeometry({ ref_, label, position, color }: EquipmentProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const grateRef = useRef<THREE.Mesh>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("drainage", bodyRef);
  useSystemAssetOpacity("drainage", grateRef);
  useSystemAssetOpacity("drainage", indicatorRef);
  const condition = typeof runtime?.state.condition === "string" ? runtime.state.condition : undefined;
  const detail = condition === "blocked" ? "Blocked (reference simulation)" : condition === "restricted" ? "Restricted (reference simulation)" : "Clear";
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "device", label, detail });
  const { base, selected, pvc } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  return (
    <group position={position}>
      <mesh ref={bodyRef} position={[0, 0.01, 0]} material={pvc} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.16, 0.18, 0.03, 16]} />
      </mesh>
      <mesh ref={grateRef} position={[0, 0.026, 0]} material={pvc} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.13, 0.13, 0.008, 12]} />
      </mesh>
      <mesh ref={indicatorRef} position={[0, 0.032, 0]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.03, 0.03, 0.006, 10]} />
      </mesh>
    </group>
  );
}

/** A ground/inspection-level access chamber — the shared reference
 * silhouette for the B1 discharge/inspection reference point and the
 * site stormwater discharge reference. A raised access cover, not a
 * treatment-plant claim. */
export function DischargeChamberGeometry({ ref_, label, position, color }: EquipmentProps) {
  const chamberRef = useRef<THREE.Mesh>(null);
  const coverRef = useRef<THREE.Mesh>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("drainage", chamberRef);
  useSystemAssetOpacity("drainage", coverRef);
  useSystemAssetOpacity("drainage", indicatorRef);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "device", label, detail: "Discharge / inspection access — reference only" });
  const { base, selected, metal } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  return (
    <group position={position}>
      <mesh ref={chamberRef} position={[0, 0.14, 0]} material={metal} castShadow onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.6, 0.28, 0.6]} />
      </mesh>
      <mesh ref={coverRef} position={[0, 0.29, 0]} material={metal} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.32, 0.32, 0.03, 20]} />
      </mesh>
      <mesh ref={indicatorRef} position={[0, 0.31, 0]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.05, 0.05, 0.01, 12]} />
      </mesh>
    </group>
  );
}

/** Roof vent stack termination — a short pipe stub with a weather cap,
 * the recognizable "pipe poking through the roof" silhouette every real
 * plumbing vent termination shares. */
export function VentCapGeometry({ ref_, label, position, color }: EquipmentProps) {
  const stubRef = useRef<THREE.Mesh>(null);
  const capRef = useRef<THREE.Mesh>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("drainage", stubRef);
  useSystemAssetOpacity("drainage", capRef);
  useSystemAssetOpacity("drainage", indicatorRef);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "device", label, detail: "Single-stack vent termination — reference" });
  const { base, selected, pvc } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  return (
    <group position={position}>
      <mesh ref={stubRef} position={[0, 0.14, 0]} material={pvc} castShadow onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.05, 0.05, 0.28, 12]} />
      </mesh>
      <mesh ref={capRef} position={[0, 0.29, 0]} material={pvc} onClick={onClick} {...hoverHandlers}>
        <coneGeometry args={[0.075, 0.06, 12]} />
      </mesh>
      <mesh ref={indicatorRef} position={[0, 0.32, 0]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <sphereGeometry args={[0.018, 8, 8]} />
      </mesh>
    </group>
  );
}

/** Roof drain — a domed leaf-strainer basket, the recognizable roof-level
 * counterpart to a floor drain grate (distinct silhouette so it doesn't
 * read as the same object as DrainPointGeometry despite the shared
 * function). */
export function RoofDrainGeometry({ ref_, label, position, color }: EquipmentProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const domeRef = useRef<THREE.Mesh>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("drainage", bodyRef);
  useSystemAssetOpacity("drainage", domeRef);
  useSystemAssetOpacity("drainage", indicatorRef);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "device", label, detail: "Stormwater reference — DESIGN DECISION REQUIRED" });
  const { base, selected, metal } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  return (
    <group position={position}>
      <mesh ref={bodyRef} position={[0, 0.015, 0]} material={metal} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.2, 0.22, 0.03, 16]} />
      </mesh>
      <mesh ref={domeRef} position={[0, 0.09, 0]} material={metal} onClick={onClick} {...hoverHandlers}>
        <sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh ref={indicatorRef} position={[0, 0.035, 0]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.035, 0.035, 0.006, 10]} />
      </mesh>
    </group>
  );
}

/** Stormwater downpipe — a short vertical pipe segment with a wall
 * bracket, the recognizable exterior downpipe silhouette. Represents the
 * downpipe's roof-level connection only, not a claimed continuous run to
 * grade (see lunaMepBackbone.ts's DRAINAGE_STORMWATER comment). */
export function DownpipeGeometry({ ref_, label, position, color }: EquipmentProps) {
  const pipeRef = useRef<THREE.Mesh>(null);
  const bracketRef = useRef<THREE.Mesh>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("drainage", pipeRef);
  useSystemAssetOpacity("drainage", bracketRef);
  useSystemAssetOpacity("drainage", indicatorRef);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "device", label, detail: "Reference segment — full run to grade not modeled" });
  const { base, selected, pvc, metal } = useTintedMaterials(color, runtime);
  const onClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); select({ ref: ref_, kind: "device", label }); };

  return (
    <group position={position}>
      <mesh ref={pipeRef} position={[0, 0.35, 0]} material={pvc} castShadow onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.045, 0.045, 0.7, 12]} />
      </mesh>
      <mesh ref={bracketRef} position={[0.05, 0.55, 0]} material={metal} onClick={onClick} {...hoverHandlers}>
        <boxGeometry args={[0.03, 0.06, 0.09]} />
      </mesh>
      <mesh ref={indicatorRef} position={[0, 0.71, 0]} material={isSelected ? selected : base} onClick={onClick} {...hoverHandlers}>
        <cylinderGeometry args={[0.05, 0.05, 0.012, 12]} />
      </mesh>
    </group>
  );
}
