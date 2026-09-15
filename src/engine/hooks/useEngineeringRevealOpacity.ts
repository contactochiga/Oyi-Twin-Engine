import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { useSceneMode } from "./useSceneMode";
import { useInteriorFocus } from "./useInteriorFocus";
import type { CanonicalRef } from "../types";

/**
 * Fades a mesh in whenever ANY engineering layer is active (activeSystem
 * !== null), regardless of which one — for elements like a service-void
 * shell or a slab penetration marker that represent "there is concealed
 * building fabric here" in general, not one system's own asset. Individual
 * runs placed inside a void still use useSystemAssetOpacity so only the
 * system currently being inspected highlights; the void/sleeve itself is
 * the container and should appear for any of them. Same lerp/visibility
 * pattern as useSystemAssetOpacity so it composes visually with everything
 * else that fades in Engineering Layer Mode.
 *
 * `revealInInteriorRef` adds a second, independent trigger: reveal
 * whenever the entered interior matches this ref, regardless of
 * activeSystem. This exists because activating an Engineering Layer
 * button (selectSystem in the standalone harness) exits any entered
 * interior as part of its own existing, pre-Phase-13 "Systems Mode is a
 * building-wide overview" design — meaning a service void attached to a
 * room ref would otherwise be structurally unreachable while actually
 * standing in that room, the exact case §5 describes ("reveal concealed
 * building systems without visually destroying the room"). Mirrors the
 * precedent useSystemAssetOpacity already set for apartment-devices
 * ("visible while inside any interior, no Systems Mode toggle needed").
 */
export function useEngineeringRevealOpacity(meshRef: React.RefObject<THREE.Mesh | null>, revealedOpacity = 0.28, revealInInteriorRef?: CanonicalRef) {
  const { activeSystem } = useSceneMode();
  const { activeInteriorRef } = useInteriorFocus();
  const opacityRef = useRef(0);

  useFrame(() => {
    const inOwnInterior = revealInInteriorRef !== undefined && activeInteriorRef === revealInInteriorRef;
    const target = activeSystem !== null || inOwnInterior ? revealedOpacity : 0;
    opacityRef.current += (target - opacityRef.current) * 0.15;

    const mesh = meshRef.current;
    const mat = mesh?.material as (THREE.Material & { opacity: number }) | undefined;
    if (mat) {
      mat.transparent = true;
      mat.opacity = opacityRef.current;
    }
    if (mesh) mesh.visible = opacityRef.current > 0.02;
  });
}
