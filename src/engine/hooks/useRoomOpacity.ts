import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { useSceneMode } from "./useSceneMode";
import { useInteriorFocus } from "./useInteriorFocus";
import type { CanonicalRef } from "../types";

/**
 * Combined fade for anything belonging to a room: it fades the same way
 * the room's containing level does (via isolatedLevelRef, exactly like
 * useLevelFadeOpacity) AND, independently, dims when a sibling room in the
 * same entered interior is the one currently focused — "room focus" as
 * its own, additive layer on top of level isolation rather than a second
 * competing system.
 *
 * Precedence: if the containing level is isolated-elsewhere, that wins
 * (0.02) regardless of room focus — no point being subtle about a room the
 * level fade already hid. Otherwise, a sibling of the focused room dims to
 * 0.15 (still spatially legible, clearly de-emphasized); the focused room
 * itself (or every room, when nothing is focused) stays at 1.
 */
export function useRoomOpacity(ownerLevelRef: CanonicalRef, interiorRef: CanonicalRef, roomRef: CanonicalRef, meshRef: React.RefObject<THREE.Mesh | null>) {
  const { isolatedLevelRef } = useSceneMode();
  const { activeInteriorRef, focusedRoomRef } = useInteriorFocus();
  const opacityRef = useRef(1);

  useFrame(() => {
    const levelFadedElsewhere = isolatedLevelRef !== null && isolatedLevelRef !== ownerLevelRef;
    const roomDeprioritized = activeInteriorRef === interiorRef && focusedRoomRef !== null && focusedRoomRef !== roomRef;

    const target = levelFadedElsewhere ? 0.02 : roomDeprioritized ? 0.15 : 1;
    opacityRef.current += (target - opacityRef.current) * 0.15;

    const mat = meshRef.current?.material as (THREE.Material & { opacity: number }) | undefined;
    if (mat) {
      mat.transparent = opacityRef.current < 0.98;
      mat.opacity = opacityRef.current;
    }
  });
}
