import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CanonicalRef } from "../types";
import { useSelection, useIsSelected } from "../hooks/useSelection";
import { useCanonicalHoverHandlers } from "../hooks/useHover";

/** The default swing angle every HingedDoor caller gets unless it
 * overrides `openAngleRadians` — exported so a caller deriving real
 * clearance from `onAngleChange`'s fraction (via clearance.ts's
 * hingedBoundaryState()) can convert back to radians without duplicating
 * this magic number in a second file. */
export const HINGED_DOOR_DEFAULT_OPEN_ANGLE_RADIANS = Math.PI / 2.3;

export interface HingedDoorProps {
  ref_: CanonicalRef;
  label: string;
  /** True = swung open to openAngle; false = closed flush in the frame.
   * A real kinematic model (rotation around one vertical edge) — visually
   * and structurally distinct from SlidingGlassDoor's leaf translation,
   * per the brief's own "do not make every door use the same animation." */
  open?: boolean;
  openAngleRadians?: number;
  width?: number;
  height?: number;
  leafThickness?: number;
  /** Which vertical edge the door is hinged from. */
  hinge?: "left" | "right";
  leafMaterial?: THREE.Material;
  frameMaterial?: THREE.Material;
  onSelect?: () => void;
  /** Apartment A Full Interior Reality V1 (Part 8) — reports this door's
   * real, currently-animating swing progress (0 closed .. 1 fully open)
   * every frame, the same real-not-fabricated pattern SlidingGlassDoor's
   * own `progress` already feeds into clearance.ts's boundary state — so
   * a caller that needs real clearance (not a decorative animation
   * disconnected from runtime) can derive it from hingedBoundaryState(). */
  onAngleChange?: (openFraction: number) => void;
}

/** A building-agnostic hinged door — one leaf rotating around a fixed
 * vertical hinge edge. Used for stair/service/BOH doors, distinct from
 * the sliding automatic entrance. Reusable by any future ingested
 * building's own hinged openings; nothing here names Luna. */
export function HingedDoor({
  ref_,
  label,
  open = false,
  openAngleRadians = HINGED_DOOR_DEFAULT_OPEN_ANGLE_RADIANS,
  width = 1.0,
  height = 2.15,
  leafThickness = 0.05,
  hinge = "left",
  leafMaterial,
  frameMaterial,
  onSelect,
  onAngleChange,
}: HingedDoorProps) {
  const pivot = useRef<THREE.Group>(null);
  const angle = useRef(open ? openAngleRadians : 0);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const hover = useCanonicalHoverHandlers({ ref: ref_, kind: "door", label });

  const leaf = useMemo(() => leafMaterial ?? new THREE.MeshStandardMaterial({ color: "#3a3d40", roughness: 0.55, metalness: 0.15 }), [leafMaterial]);
  const frame = useMemo(() => frameMaterial ?? new THREE.MeshStandardMaterial({ color: "#232527", roughness: 0.45, metalness: 0.5 }), [frameMaterial]);
  const hingeSign = hinge === "left" ? 1 : -1;

  useFrame((_, delta) => {
    const target = open ? openAngleRadians : 0;
    angle.current += (target - angle.current) * Math.min(1, 5 * delta);
    if (pivot.current) pivot.current.rotation.y = hingeSign * angle.current;
    if (onAngleChange) onAngleChange(openAngleRadians > 0 ? angle.current / openAngleRadians : 0);
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (onSelect) onSelect();
    else select({ ref: ref_, kind: "door", label });
  };

  const hingeX = hinge === "left" ? -width / 2 : width / 2;

  return (
    <group name={ref_} onClick={handleClick} {...hover}>
      {/* Frame */}
      <mesh position={[0, height + 0.04, 0]} material={frame}>
        <boxGeometry args={[width + 0.14, 0.08, 0.14]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2 + 0.04), height / 2, 0]} material={frame}>
          <boxGeometry args={[0.08, height + 0.08, 0.14]} />
        </mesh>
      ))}
      {/* Leaf, pivoting around the hinge edge — local x runs from the
          hinge (0) to the free edge (±width), so the leaf mesh's own
          center sits at half that span, away from the hinge. */}
      <group ref={pivot} position={[hingeX, 0, 0]}>
        <mesh position={[hinge === "left" ? width / 2 : -width / 2, height / 2, leafThickness / 2]} material={isSelected ? frame : leaf} castShadow receiveShadow>
          <boxGeometry args={[width, height, leafThickness]} />
        </mesh>
      </group>
    </group>
  );
}
