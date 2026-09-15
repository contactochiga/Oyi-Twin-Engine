import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { useSceneMode } from "./useSceneMode";
import { useInteriorFocus } from "./useInteriorFocus";
import type { OperationalSystem } from "../twinData";

/**
 * Operational asset markers and relationship lines are invisible and
 * non-interactive outside Systems Mode (activeSystem === null) — Phase 4
 * must not assume every user sees every building asset by default, and a
 * marker sitting at 0 opacity but still mounted would otherwise still
 * block raycasts, so this also drives the mesh's `visible` flag rather
 * than opacity alone.
 *
 * Inside Systems Mode: "all" shows everything at full opacity; a specific
 * system shows only its own assets at full opacity and fades every other
 * system's assets to a barely-there 0.03 (present enough that switching
 * modes doesn't feel like items vanish from the world, too faint to
 * compete for attention or accept clicks).
 *
 * Phase 5 exception: "apartment-devices" is the representative
 * Consumer-capable scope (Systems Mode itself stays Facility-scope), so a
 * resident's own home devices — lights, curtains, the entry lock — are
 * also fully visible/interactive simply by being inside any interior
 * (activeInteriorRef set), with no Facility "Systems Mode" toggle
 * involved. A resident shouldn't need to enable a facility systems view
 * just to watch their own curtain open.
 */
export function useSystemAssetOpacity(assetSystem: OperationalSystem, meshRef: React.RefObject<THREE.Mesh | null>, opacityOverride?: number) {
  const { activeSystem } = useSceneMode();
  const { activeInteriorRef } = useInteriorFocus();
  const opacityRef = useRef(0);

  useFrame(() => {
    const consumerScopeVisible = assetSystem === "apartment-devices" && activeInteriorRef !== null;
    const target = opacityOverride ?? (consumerScopeVisible ? 1 : activeSystem === null ? 0 : activeSystem === "all" ? 1 : activeSystem === assetSystem ? 1 : 0.03);
    opacityRef.current += (target - opacityRef.current) * 0.15;

    const mesh = meshRef.current;
    const mat = mesh?.material as (THREE.Material & { opacity: number }) | undefined;
    if (mat) {
      mat.transparent = true;
      mat.opacity = opacityRef.current;
    }
    if (mesh) mesh.visible = opacityRef.current > 0.04;
  });
}
