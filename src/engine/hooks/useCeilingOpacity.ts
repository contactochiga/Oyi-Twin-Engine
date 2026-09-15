import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { useSceneMode } from "./useSceneMode";
import { useInteriorFocus } from "./useInteriorFocus";
import type { CanonicalRef } from "../types";

/**
 * Same room-isolation/room-focus fade as useRoomOpacity, plus one more
 * orthogonal term: a ceiling goes translucent whenever ANY engineering
 * layer is active (activeSystem !== null), not just when its own system is
 * selected — a ceiling conceals many different systems at once, so opening
 * it up is a "look above the finish" gesture rather than a per-system
 * highlight (individual runs/voids above still use useSystemAssetOpacity
 * for their own per-system visibility). Kept as its own hook rather than
 * a flag on useRoomOpacity because walls/floor deliberately do NOT get
 * this treatment — Phase 13 §5 wants concealed systems revealed without
 * "visually destroying the room," i.e. the walls stay solid and legible;
 * only the ceiling opens.
 */
export function useCeilingOpacity(ownerLevelRef: CanonicalRef, interiorRef: CanonicalRef, roomRef: CanonicalRef, meshRef: React.RefObject<THREE.Mesh | null>) {
  const { isolatedLevelRef, activeSystem } = useSceneMode();
  const { activeInteriorRef, focusedRoomRef } = useInteriorFocus();
  const opacityRef = useRef(1);

  useFrame(() => {
    const levelFadedElsewhere = isolatedLevelRef !== null && isolatedLevelRef !== ownerLevelRef;
    const roomDeprioritized = activeInteriorRef === interiorRef && focusedRoomRef !== null && focusedRoomRef !== roomRef;
    const engineeringReveal = activeSystem !== null;

    const target = levelFadedElsewhere ? 0.02 : roomDeprioritized ? 0.15 : engineeringReveal ? 0.12 : 1;
    opacityRef.current += (target - opacityRef.current) * 0.15;

    const mat = meshRef.current?.material as (THREE.Material & { opacity: number }) | undefined;
    if (mat) {
      mat.transparent = opacityRef.current < 0.98;
      mat.opacity = opacityRef.current;
    }
  });
}
