import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CanonicalRef } from "../types";
import type { OperationalSystem } from "../twinData";
import { useSelection, useIsSelected } from "../hooks/useSelection";
import { useSystemAssetOpacity } from "../hooks/useSystemAssetOpacity";

interface RiserShaftProps {
  ref_: CanonicalRef;
  label: string;
  system: OperationalSystem;
  baseElevation: number;
  topElevation: number;
  x: number;
  z: number;
  color: string;
  /** Electrical System V1 — same restrained emissive-pulse principle as
   * PipeRun's `flowing`, reused here rather than duplicated: an energized
   * riser reads as live continuously along its full height, a de-energized
   * one goes quiet. Optional and defaulted false so every other riser
   * caller (water/drainage/fire/network) is unaffected. */
  energized?: boolean;
  /** Electrical System V1.1 — "round" (default) keeps every existing
   * riser's pipe-like cylinder unchanged; "duct" gives a rectangular
   * busway/trunking cross-section, a closer physical read for an
   * electrical riser than a round pipe (Part 6/8's containment-realism
   * requirement) without altering water/drainage/fire/network's own
   * geometry at all. */
  shape?: "round" | "duct";
}

/** A continuous vertical MEP service run (electrical/water/drainage/fire/
 * network riser) spanning the full building height at a fixed plan
 * position — architecturally distinct from CoreShaft (a structural/
 * circulation element that is always present) in that a riser only
 * renders inside Engineering Layer Mode, fading with the rest of its
 * system via the same useSystemAssetOpacity every other operational asset
 * uses. Thin and continuous by design so B1-to-roof vertical continuity
 * reads clearly even when floors are exploded apart (see LunaLevel/App.tsx
 * explode logic, which this component intentionally ignores — a riser
 * never explodes with its floor, the same way CoreShaft doesn't). */
export function RiserShaft({ ref_, label, system, baseElevation, topElevation, x, z, color, energized = false, shape = "round" }: RiserShaftProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  useSystemAssetOpacity(system, meshRef);

  const height = topElevation - baseElevation;
  const geometry = useMemo(() => (shape === "duct" ? new THREE.BoxGeometry(0.3, height, 0.16) : new THREE.CylinderGeometry(0.16, 0.16, height, 10)), [height, shape]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0 }), [color]);
  const selectedMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffb454", emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.3, transparent: true, opacity: 0 }),
    []
  );

  useFrame(({ clock }) => {
    if (energized && !isSelected) material.emissiveIntensity = 0.35 + Math.sin(clock.elapsedTime * 1.6) * 0.15;
    else if (!energized) material.emissiveIntensity = 0.08;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={isSelected ? selectedMaterial : material}
      position={[x, baseElevation + height / 2, z]}
      onClick={(e) => {
        e.stopPropagation();
        select({ ref: ref_, kind: "device", label });
      }}
    />
  );
}
