import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { TwinNodeKind, CanonicalRef } from "../types";
import type { OperationalSystem } from "../twinData";
import { useSelection, useIsSelected } from "../hooks/useSelection";
import { useSystemAssetOpacity } from "../hooks/useSystemAssetOpacity";
import { useCanonicalHoverHandlers } from "../hooks/useHover";
import { useRuntimeAssetState } from "../twinRuntime";
import { statusTint } from "../utils/statusPresentation";

/** A short "what is this, right now" phrase for the Spatial Glass hover
 * label (Phase 12) — generic across device types since the runtime state
 * shape is free-form: prefer a "running"/"on" boolean if present (plus a
 * target temperature for climate devices), otherwise fall back to the
 * asset's own status word ("Normal", "Critical", ...). */
function hoverDetailFor(state: ReturnType<typeof useRuntimeAssetState>): string | undefined {
  if (!state) return undefined;
  const s = state.state as Record<string, unknown>;
  if (typeof s.running === "boolean") return s.running ? "Running" : "Stopped";
  if (typeof s.on === "boolean") {
    const temp = typeof s.target_temp_c === "number" ? ` · ${s.target_temp_c}°C` : "";
    return `${s.on ? "On" : "Off"}${temp}`;
  }
  if (typeof s.locked === "boolean") return s.locked ? "Locked" : "Unlocked";
  return state.status.charAt(0).toUpperCase() + state.status.slice(1);
}

interface OperationalAssetMarkerProps {
  ref_: CanonicalRef;
  label: string;
  kind: TwinNodeKind;
  parentRef?: CanonicalRef;
  system: OperationalSystem;
  /** Floor/mount contact point, local to whatever group this is nested in
   * (a level's massing group or a unit's own group) — not a geometric
   * center. The marker lifts its own geometry by half its height. */
  position: [number, number, number];
  color: string;
  shape?: "box" | "cone" | "disc";
  /** A single number keeps the previous uniform-cube behavior; a
   * [width, height, depth] tuple (Phase 12) lets specific device types
   * read as a credible fixture shape — e.g. a wide, flat wall-mounted AC
   * unit — without inventing a whole new marker component per device type. */
  scale?: number | [number, number, number];
  /** When true, this marker emits a real THREE.PointLight while its
   * runtime state.on is truthy — used for apartment light circuits so
   * "light OFF" visibly changes the room's illumination, not just the
   * marker's own tiny box. Only ever set for light-type assets. */
  emitsLight?: boolean;
}

/** A generic, building-agnostic representation of one operational asset
 * (a device, camera, access point, or edge node) — a small, distinctly
 * shaped and colored marker rather than an engineering-grade equipment
 * model, matching Phase 4's "credible operational placement, not
 * fabrication-level coordination" scope. Fully invisible and
 * non-interactive outside Systems Mode (see useSystemAssetOpacity), so it
 * never competes with or alters the Phase 1-3 architectural/interior
 * experience.
 *
 * Phase 5: color/emissive respond to the asset's live runtime status
 * (see statusPresentation.ts) — the same restrained five-state language
 * every marker uses, never bespoke per-asset color logic. */
export function OperationalAssetMarker({ ref_, label, kind, parentRef, system, position, color, shape = "box", scale = 0.55, emitsLight = false }: OperationalAssetMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity(system, meshRef);

  const uniformScale = typeof scale === "number" ? scale : Math.max(...scale);
  const boxSize: [number, number, number] = typeof scale === "number" ? [scale, scale, scale] : scale;

  const geometry = useMemo(() => {
    switch (shape) {
      case "cone":
        return new THREE.ConeGeometry(uniformScale * 0.55, uniformScale, 12);
      case "disc":
        return new THREE.CylinderGeometry(uniformScale * 0.7, uniformScale * 0.7, uniformScale * 0.25, 16);
      case "box":
      default:
        return new THREE.BoxGeometry(...boxSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, boxSize[0], boxSize[1], boxSize[2], uniformScale]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, roughness: 0.4, metalness: 0.2, transparent: true, opacity: 0 }), [color]);
  const selectedMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffb454", emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.3, transparent: true, opacity: 0 }),
    []
  );

  const tint = statusTint(color, runtime?.status ?? "normal");
  useEffect(() => {
    material.color.set(tint.color);
    material.emissive.set(tint.color);
    if (!tint.pulse) material.emissiveIntensity = tint.emissiveIntensity;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tint.color, tint.emissiveIntensity, tint.pulse]);

  // Critical assets pulse gently — the one place status uses motion, kept
  // subtle so it reads as "needs attention" rather than a game HUD alarm.
  useFrame(({ clock }) => {
    if (tint.pulse) {
      material.emissiveIntensity = tint.emissiveIntensity + Math.sin(clock.elapsedTime * 4) * 0.35;
    }
  });

  const liftedY = position[1] + (shape === "disc" ? uniformScale * 0.125 : boxSize[1] / 2);
  const lightOn = emitsLight && Boolean(runtime?.state.on);
  const hoverHandlers = useCanonicalHoverHandlers(() => ({ ref: ref_, kind, label, detail: hoverDetailFor(runtime) }));

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={isSelected ? selectedMaterial : material}
        position={[position[0], liftedY, position[2]]}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          select({ ref: ref_, kind, label, parentRef });
        }}
        {...hoverHandlers}
      />
      {/* Deliberately a sibling of the marker mesh, not a child: the mesh's
       * own `visible` flag is driven by useSystemAssetOpacity and turns
       * false outside Systems Mode (so the marker box doesn't clutter
       * normal browsing) — three.js skips a whole subtree when a parent is
       * invisible, which would silently kill this light too if it were
       * nested inside the mesh. Room illumination must work in normal
       * browsing, not just Systems Mode. */}
      {lightOn && <pointLight position={[position[0], liftedY, position[2]]} color="#ffd9a8" intensity={2.2} distance={4.5} decay={2} />}
    </>
  );
}
