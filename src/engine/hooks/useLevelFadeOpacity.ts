import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { useSceneMode, systemFadeOverride } from "./useSceneMode";
import type { CanonicalRef } from "../types";

/**
 * Any mesh that belongs to a level — the level's own massing box, its
 * facade detail, or a unit placeholder nested inside it — should fade the
 * same way when a *different* level gets isolated. Rather than threading
 * opacity down through props (which would force facade components to know
 * about their parent's render internals), every such mesh independently
 * asks this hook "is my level currently isolated-elsewhere?" and animates
 * its own material toward the answer. They all converge on the same
 * target within a frame or two, which reads as perfectly in sync.
 *
 * ownerLevelRef is the ref of the LEVEL this mesh belongs to — for a unit
 * placeholder that's its parent level's ref, not the unit's own ref.
 *
 * Takes the *mesh* ref (not a material ref directly) so it keeps working
 * correctly even for meshes that swap between a base material and a
 * selected-highlight material — it always reads whichever material is
 * currently assigned.
 *
 * `restingOpacity` (default 1) is what the mesh settles at when its level
 * is NOT faded-elsewhere — the hook owns opacity entirely once attached,
 * so a lower "resting" value set on the material's constructor would just
 * get overwritten on the first frame; this is the correct way to give a
 * mesh a permanently-translucent look (e.g. an apartment shell that has a
 * real interior nested inside it and shouldn't visually bury it) that
 * *still* fades further, to near-zero, when a sibling level is isolated.
 */
export function useLevelFadeOpacity(ownerLevelRef: CanonicalRef, meshRef: React.RefObject<THREE.Mesh | null>, restingOpacity = 1) {
  const sceneMode = useSceneMode();
  const opacityRef = useRef(restingOpacity);

  useFrame(() => {
    const override = systemFadeOverride(sceneMode, ownerLevelRef, restingOpacity);
    const isolatedElsewhere = sceneMode.isolatedLevelRef !== null && sceneMode.isolatedLevelRef !== ownerLevelRef;
    const target = override !== null ? override : isolatedElsewhere ? 0.02 : restingOpacity;
    opacityRef.current += (target - opacityRef.current) * 0.15;

    const mat = meshRef.current?.material as (THREE.Material & { opacity: number }) | undefined;
    if (mat) {
      mat.transparent = opacityRef.current < 0.98;
      mat.opacity = opacityRef.current;
    }
  });
}
