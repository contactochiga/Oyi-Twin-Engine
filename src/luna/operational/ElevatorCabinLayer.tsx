import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSelection, useIsSelected } from "../../engine/hooks/useSelection";
import { useSystemAssetOpacity } from "../../engine/hooks/useSystemAssetOpacity";
import { useRuntimeAssetState } from "../../engine/twinRuntime";
import { statusTint } from "../../engine/utils/statusPresentation";
import { LUNA_CORES, LUNA_LEVELS } from "../lunaProgramme";
import { LUNA_OPERATIONAL_ASSETS } from "./lunaOperationalAssets";
import { SYSTEM_COLOR } from "./systemPresentation";
import { isLiftRef } from "../lift/lunaLift";

// Four-lift generalization — all four canonical lift refs now render via
// DynamicLift (real shaft/car/doors, provider-driven), not this older
// always-invisible (opacity: 0) lerped-cabin indicator. Previously only
// LUNA-LIFT-PASS-02 was excluded here; the other three would otherwise
// keep an invisible, still click-raycastable duplicate hitbox sitting at
// the same position as their new real geometry.
const ELEVATOR_REFS = LUNA_OPERATIONAL_ASSETS.filter((a) => a.system === "vertical-transport" && !isLiftRef(a.ref)).map((a) => a.ref);
const CORE_BY_REF = new Map(LUNA_CORES.map((c) => [c.ref, c]));

function baseElevationFor(levelRef: string): number {
  return LUNA_LEVELS.find((l) => l.ref === levelRef)?.baseElevation ?? 0;
}

function ElevatorCabin({ ref_, x, z, label }: { ref_: string; x: number; z: number; label: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const runtime = useRuntimeAssetState(ref_);
  useSystemAssetOpacity("vertical-transport", meshRef);

  const geometry = useMemo(() => new THREE.BoxGeometry(1.5, 1.7, 1.5), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SYSTEM_COLOR["vertical-transport"], emissive: SYSTEM_COLOR["vertical-transport"], emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.4, transparent: true, opacity: 0 }),
    []
  );
  const selectedMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffb454", emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.3, transparent: true, opacity: 0 }),
    []
  );

  const tint = statusTint(SYSTEM_COLOR["vertical-transport"], runtime?.status ?? "normal");
  const activeMaterial = isSelected ? selectedMaterial : material;

  useFrame(({ clock }) => {
    activeMaterial.color.set(tint.color);
    activeMaterial.emissive.set(tint.color);
    activeMaterial.emissiveIntensity = tint.pulse ? tint.emissiveIntensity + Math.sin(clock.elapsedTime * 4) * 0.35 : tint.emissiveIntensity;

    const floorRef = typeof runtime?.state.floor === "string" ? (runtime.state.floor as string) : "LUNA-GROUND";
    const targetY = baseElevationFor(floorRef) + 1.2;
    const mesh = meshRef.current;
    if (mesh) mesh.position.y += (targetY - mesh.position.y) * 0.03;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={activeMaterial}
      position={[x, 1.2, z]}
      castShadow
      onClick={(e) => {
        e.stopPropagation();
        select({ ref: ref_, kind: "device", label });
      }}
    />
  );
}

/** One moving cabin indicator per elevator, rendered at the building root
 * (not nested inside any single level's group) since its whole point is
 * to glide smoothly between levels' world-space elevations as the
 * simulation moves it — the same slow useFrame-lerp idiom already used
 * for camera flights and level explode offsets elsewhere in this engine,
 * just applied to a much smaller, much slower travel. Fades with Systems
 * Mode exactly like every other operational marker. */
export function ElevatorCabinLayer() {
  return (
    <>
      {ELEVATOR_REFS.map((ref) => {
        const core = CORE_BY_REF.get(ref);
        if (!core) return null;
        return <ElevatorCabin key={ref} ref_={ref} x={core.x} z={core.z} label={core.label} />;
      })}
    </>
  );
}
