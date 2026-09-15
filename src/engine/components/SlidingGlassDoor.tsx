import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CanonicalRef } from "../types";
import { useSelection, useIsSelected } from "../hooks/useSelection";
import { useCanonicalHoverHandlers } from "../hooks/useHover";

export type SlidingDoorState = "CLOSED" | "OPENING" | "OPEN" | "CLOSING";

export interface SlidingGlassDoorProps {
  ref_: CanonicalRef;
  label: string;
  /** Real runtime-driven state — the geometry never decides this itself
   * (brief: "The geometry does not own operational truth"). */
  state: SlidingDoorState;
  /** Total clear opening width the two leaves slide apart to reveal. */
  openingWidth: number;
  height?: number;
  frameThickness?: number;
  glassMaterial?: THREE.Material;
  frameMaterial?: THREE.Material;
  onSelect?: () => void;
  /** Spatial Transition Engine V1 Part 5 — fires every frame with this
   * door's own real, currently-animating leaf progress (0..1, matching
   * this file's internal `progress` ref exactly). Additive and optional:
   * a clearance check that needs this door's ACTUAL rendered openness
   * (not a parallel/duplicated estimate) reads it from here rather than
   * re-deriving it independently. */
  onProgressChange?: (progress: number) => void;
}

const OPEN_TRAVEL_FRACTION = 0.92; // each leaf slides ~92% of the half-opening clear, leaving a small overlap at the header track

/** A building-agnostic automatic sliding glass entrance — two leaves
 * translating along a fixed header track between real CLOSED/OPEN
 * endpoints, driven entirely by the `state` prop (brief Part 4: "runtime
 * state controls the visual door state"). Every future ingested
 * building's own main entrance can reuse this exact component; nothing
 * here names Luna. */
export function SlidingGlassDoor({
  ref_,
  label,
  state,
  openingWidth,
  height = 2.6,
  frameThickness = 0.08,
  glassMaterial,
  frameMaterial,
  onSelect,
  onProgressChange,
}: SlidingGlassDoorProps) {
  const leftLeaf = useRef<THREE.Group>(null);
  const rightLeaf = useRef<THREE.Group>(null);
  const progress = useRef(state === "OPEN" ? 1 : 0);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const hover = useCanonicalHoverHandlers({ ref: ref_, kind: "door", label });

  const glass = useMemo(() => glassMaterial ?? new THREE.MeshStandardMaterial({ color: "#dfeaf0", roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.22, side: THREE.DoubleSide }), [glassMaterial]);
  const frame = useMemo(() => frameMaterial ?? new THREE.MeshStandardMaterial({ color: "#202225", roughness: 0.35, metalness: 0.9 }), [frameMaterial]);
  const leafHalfWidth = openingWidth / 2;
  const travel = leafHalfWidth * OPEN_TRAVEL_FRACTION;

  useFrame((_, delta) => {
    const target = state === "OPEN" || state === "OPENING" ? 1 : 0;
    const rate = state === "OPENING" || state === "CLOSING" ? 1.4 : 6; // real transitional states animate at a believable speed; CLOSED/OPEN snap to their own resting position (e.g. on first mount)
    progress.current += (target - progress.current) * Math.min(1, rate * delta);
    const p = progress.current;
    if (leftLeaf.current) leftLeaf.current.position.x = -leafHalfWidth / 2 - p * travel;
    if (rightLeaf.current) rightLeaf.current.position.x = leafHalfWidth / 2 + p * travel;
    onProgressChange?.(p);
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (onSelect) onSelect();
    else select({ ref: ref_, kind: "door", label });
  };

  return (
    <group name={ref_} onClick={handleClick} {...hover}>
      {/* Header track */}
      <mesh position={[0, height + frameThickness / 2, 0]} material={frame} castShadow>
        <boxGeometry args={[openingWidth + leafHalfWidth, frameThickness * 1.5, frameThickness * 3]} />
      </mesh>
      {/* Fixed side panels beyond the sliding leaves */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (openingWidth / 2 + leafHalfWidth / 2 + frameThickness), height / 2, 0]} material={glass} castShadow>
            <boxGeometry args={[leafHalfWidth, height, 0.03]} />
          </mesh>
          <mesh position={[side * (openingWidth / 2 + frameThickness / 2), height / 2, 0]} material={frame}>
            <boxGeometry args={[frameThickness, height, frameThickness * 2]} />
          </mesh>
        </group>
      ))}
      {/* Moving leaves */}
      <group ref={leftLeaf} position={[-leafHalfWidth / 2, 0, 0]}>
        <mesh position={[0, height / 2, 0]} material={glass} castShadow receiveShadow>
          <boxGeometry args={[leafHalfWidth, height, 0.03]} />
        </mesh>
        <mesh position={[leafHalfWidth / 2 - frameThickness / 2, height / 2, 0]} material={isSelected ? frame : frame}>
          <boxGeometry args={[frameThickness, height, frameThickness * 2]} />
        </mesh>
      </group>
      <group ref={rightLeaf} position={[leafHalfWidth / 2, 0, 0]}>
        <mesh position={[0, height / 2, 0]} material={glass} castShadow receiveShadow>
          <boxGeometry args={[leafHalfWidth, height, 0.03]} />
        </mesh>
        <mesh position={[-leafHalfWidth / 2 + frameThickness / 2, height / 2, 0]} material={frame}>
          <boxGeometry args={[frameThickness, height, frameThickness * 2]} />
        </mesh>
      </group>
      {/* Threshold */}
      <mesh position={[0, 0.02, 0]} material={frame}>
        <boxGeometry args={[openingWidth + leafHalfWidth * 2 + frameThickness * 2, 0.04, 0.25]} />
      </mesh>
    </group>
  );
}
