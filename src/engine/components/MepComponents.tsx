import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CanonicalRef } from "../types";
import type { OperationalSystem } from "../twinData";
import { useSelection, useIsSelected } from "../hooks/useSelection";
import { useSystemAssetOpacity } from "../hooks/useSystemAssetOpacity";
import { useEngineeringRevealOpacity } from "../hooks/useEngineeringRevealOpacity";
import { useCanonicalHoverHandlers } from "../hooks/useHover";

// Oyi Twin Engine — MEP component primitives (Phase 13 §8).
//
// Building-agnostic, reusable engineering geometry a building's own data
// module can point at two 3D points (or one point, for Sleeve/AccessPanel)
// rather than hand-authoring bespoke geometry per building. Scale here is
// representative (tens of runs, not thousands), so each run is its own
// mesh/material — the same "one component per addressable element" choice
// StructuralElement and RiserShaft already made at this catalogue size.
// If a future building's MEP catalogue grows into the thousands, switch
// these to InstancedMesh/merged geometry the same way LevelFacade already
// does for repeated decorative detail — the ref/label/system stay the
// selection/opacity identity either way, so optimizing later doesn't
// require touching the data shape.

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

interface RunProps {
  ref_: CanonicalRef;
  label: string;
  system: OperationalSystem;
  from: Point3;
  to: Point3;
  color: string;
  /** Cross-section radius (pipe/conduit) or half-thickness (duct/tray). */
  thickness?: number;
  /** When true, the run pulses gently to read as actively carrying
   * service (Domestic Water Reference System V1, Part K) — restrained,
   * the same slow emissive pulse OperationalAssetMarker already uses for
   * critical status, never a directional particle/arcade effect. Optional
   * and defaulted false, so every existing caller is unaffected. */
  flowing?: boolean;
}

function useRunTransform(from: Point3, to: Point3) {
  return useMemo(() => {
    const start = new THREE.Vector3(from.x, from.y, from.z);
    const end = new THREE.Vector3(to.x, to.y, to.z);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const length = start.distanceTo(end) || 0.001;
    const direction = end.clone().sub(start).normalize();
    // Cylinders/box-runs are authored along +Y by default — align that
    // axis to the run's actual direction rather than assuming axis-aligned
    // runs, so a diagonal riser-to-branch transition still reads correctly.
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    return { mid, length, quaternion };
  }, [from.x, from.y, from.z, to.x, to.y, to.z]);
}

function useRunMaterials(color: string) {
  return useMemo(
    () => ({
      base: new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.5, metalness: 0.3, transparent: true, opacity: 0 }),
      selected: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffb454", emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.3, transparent: true, opacity: 0 }),
    }),
    [color]
  );
}

/** A round pipe run — water/drainage/fire distribution between two points. */
export function PipeRun({ ref_, label, system, from, to, color, thickness = 0.05, flowing = false }: RunProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  useSystemAssetOpacity(system, meshRef);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "device", label });
  const { mid, length, quaternion } = useRunTransform(from, to);
  const geometry = useMemo(() => new THREE.CylinderGeometry(thickness, thickness, length, 8), [thickness, length]);
  const { base, selected } = useRunMaterials(color);

  useFrame(({ clock }) => {
    if (flowing && !isSelected) base.emissiveIntensity = 0.3 + Math.sin(clock.elapsedTime * 2) * 0.18;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={isSelected ? selected : base}
      position={mid}
      quaternion={quaternion}
      onClick={(e) => {
        e.stopPropagation();
        select({ ref: ref_, kind: "device", label });
      }}
      {...hoverHandlers}
    />
  );
}

/** A rectangular duct run — HVAC supply/return between two points. */
export function DuctRun({ ref_, label, system, from, to, color, thickness = 0.18 }: RunProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  useSystemAssetOpacity(system, meshRef);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "device", label });
  const { mid, length, quaternion } = useRunTransform(from, to);
  const geometry = useMemo(() => new THREE.BoxGeometry(thickness, length, thickness), [thickness, length]);
  const { base, selected } = useRunMaterials(color);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={isSelected ? selected : base}
      position={mid}
      quaternion={quaternion}
      onClick={(e) => {
        e.stopPropagation();
        select({ ref: ref_, kind: "device", label });
      }}
      {...hoverHandlers}
    />
  );
}

/** A flat, wide cable tray run — electrical/network backbone between two
 * points. Cross-section width (0.3) intentionally matches the electrical
 * riser's own "duct" shape (RiserShaft shape="duct", Electrical V1.1) so
 * horizontal containment and the vertical busway read as the same
 * physical containment language, not two unrelated conventions.
 * `flowing` mirrors PipeRun's restrained emissive pulse (Physical Reality
 * V1) so a tray segment can still read as carrying the live source when
 * the electrical runtime resolver says so — replacing the previous
 * round-pipe stand-in with tray geometry must not lose that behavior. */
export function CableTray({ ref_, label, system, from, to, color, thickness = 0.06, flowing = false }: RunProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  useSystemAssetOpacity(system, meshRef);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "device", label });
  const { mid, length, quaternion } = useRunTransform(from, to);
  const geometry = useMemo(() => new THREE.BoxGeometry(0.3, length, thickness), [thickness, length]);
  const { base, selected } = useRunMaterials(color);

  useFrame(({ clock }) => {
    if (flowing && !isSelected) base.emissiveIntensity = 0.3 + Math.sin(clock.elapsedTime * 2) * 0.18;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={isSelected ? selected : base}
      position={mid}
      quaternion={quaternion}
      onClick={(e) => {
        e.stopPropagation();
        select({ ref: ref_, kind: "device", label });
      }}
      {...hoverHandlers}
    />
  );
}

/** A thin conduit run — low-voltage/control cabling between two points. */
export function ConduitRun({ ref_, label, system, from, to, color, thickness = 0.03 }: RunProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  useSystemAssetOpacity(system, meshRef);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "device", label });
  const { mid, length, quaternion } = useRunTransform(from, to);
  const geometry = useMemo(() => new THREE.CylinderGeometry(thickness, thickness, length, 6), [thickness, length]);
  const { base, selected } = useRunMaterials(color);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={isSelected ? selected : base}
      position={mid}
      quaternion={quaternion}
      onClick={(e) => {
        e.stopPropagation();
        select({ ref: ref_, kind: "device", label });
      }}
      {...hoverHandlers}
    />
  );
}

interface SleeveProps {
  ref_: CanonicalRef;
  label: string;
  position: Point3;
  /** Which local axis the penetration is drilled through — "y" for a
   * riser passing through a slab (the common case), "x"/"z" for a
   * horizontal run passing through a wall. */
   axis?: "x" | "y" | "z";
  radius?: number;
}

/** A representative sleeve/penetration marker — a short hollow ring
 * sitting where a vertical or horizontal MEP run passes through structure
 * (Phase 13 §4: "introduce representative sleeves, penetrations, riser
 * openings... where required"). Not a real boolean cut through the slab/
 * wall geometry (too fragile for this scope, matching §11's own "if full
 * clipping is too fragile, keep it simpler" guidance) — a torus overlaid
 * at the crossing point reads clearly as "there's an opening here" without
 * needing CSG. Reveals only in Engineering Layer Mode via
 * useEngineeringRevealOpacity, the same "concealed fabric" fade a service
 * void uses, since a penetration is only interesting once you're already
 * looking at structure/MEP together. */
export function Sleeve({ ref_, label, position, axis = "y", radius = 0.22 }: SleeveProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  useEngineeringRevealOpacity(meshRef, 0.55);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "service-zone", label });

  const geometry = useMemo(() => new THREE.TorusGeometry(radius, 0.04, 8, 16), [radius]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a3f47", roughness: 0.6, metalness: 0.2, transparent: true, opacity: 0 }), []);
  const selectedMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffb454", roughness: 0.4, metalness: 0.2, transparent: true, opacity: 0 }), []);

  const rotation: [number, number, number] = axis === "y" ? [Math.PI / 2, 0, 0] : axis === "x" ? [0, Math.PI / 2, 0] : [0, 0, 0];

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={isSelected ? selectedMaterial : material}
      position={[position.x, position.y, position.z]}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        select({ ref: ref_, kind: "service-zone", label });
      }}
      {...hoverHandlers}
    />
  );
}

interface AccessPanelProps {
  ref_: CanonicalRef;
  label: string;
  position: Point3;
  width?: number;
  depth?: number;
  /** Reveal whenever this interior is entered, not only in Engineering
   * Layer Mode — see useEngineeringRevealOpacity's own docstring. */
  revealInInteriorRef?: CanonicalRef;
}

/** A representative ceiling access panel — a flat plate marking where
 * maintenance staff would physically reach a concealed asset (Phase 13
 * §14's maintenance-oriented reveal). Reveals with the ceiling it belongs
 * to via the same engineering-reveal opacity as Sleeve/ServiceVoidZone. */
export function AccessPanel({ ref_, label, position, width = 0.6, depth = 0.6, revealInInteriorRef }: AccessPanelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  useEngineeringRevealOpacity(meshRef, 0.85, revealInInteriorRef);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "service-zone", label });

  const geometry = useMemo(() => new THREE.BoxGeometry(width, 0.02, depth), [width, depth]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c7cbd1", roughness: 0.5, metalness: 0.4, transparent: true, opacity: 0 }), []);
  const selectedMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffb454", roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0 }), []);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={isSelected ? selectedMaterial : material}
      position={[position.x, position.y, position.z]}
      onClick={(e) => {
        e.stopPropagation();
        select({ ref: ref_, kind: "service-zone", label });
      }}
      {...hoverHandlers}
    />
  );
}

interface ServiceZoneProps {
  ref_: CanonicalRef;
  label: string;
  center: Point3;
  size: Point3;
  /** Reveal whenever this interior is entered, not only in Engineering
   * Layer Mode — see useEngineeringRevealOpacity's own docstring. */
  revealInInteriorRef?: CanonicalRef;
}

/** A concealed service-void volume — the space between a room's finished
 * ceiling and the structural slab above it, where risers/branches/ducts
 * actually run (Phase 13 §5). Invisible/non-interactive in normal
 * Presentation Mode; a faint translucent box in any Engineering Layer
 * Mode, distinguishing "occupied room volume" from "concealed service
 * volume" without needing to model a full plenum. */
export function ServiceZone({ ref_, label, center, size, revealInInteriorRef }: ServiceZoneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  useEngineeringRevealOpacity(meshRef, 0.16, revealInInteriorRef);
  const hoverHandlers = useCanonicalHoverHandlers({ ref: ref_, kind: "service-zone", label });

  const geometry = useMemo(() => new THREE.BoxGeometry(size.x, size.y, size.z), [size.x, size.y, size.z]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7d8794", roughness: 0.8, metalness: 0.1, transparent: true, opacity: 0, side: THREE.DoubleSide }), []);
  const selectedMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffb454", roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    []
  );

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={isSelected ? selectedMaterial : material}
      position={[center.x, center.y, center.z]}
      onClick={(e) => {
        e.stopPropagation();
        select({ ref: ref_, kind: "service-zone", label });
      }}
      {...hoverHandlers}
    />
  );
}
