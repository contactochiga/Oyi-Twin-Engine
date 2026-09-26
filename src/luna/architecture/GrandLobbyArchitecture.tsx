// Ground Phase 3A: finishes inside the preserved Phase 2 shell and routes.
import { GroundInteriorFinishes } from "./groundInterior/GroundInteriorFinishes";
import { groundInteriorMaterials } from "./groundInterior/groundInteriorMaterials";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GrandLobbyCeiling } from "./GrandLobbyCeiling";
import { GroundEntrance } from "./GroundEntrance";
import type { SlidingDoorState } from "../../engine/components/SlidingGlassDoor";
import { HingedDoor } from "../../engine/components/HingedDoor";
import { PODIUM_CEILINGS, GROUND_ARRIVAL } from "./podiumCoordination";
import { lunaMaterialFactories } from "../lunaMaterials";
import { LUNA_GROUND_LOBBY } from "../interiors/lunaInteriors";
import { GROUND_STAIR_REFS, stairCore } from "./groundLobbyLayout";
import { LUNA_CORES } from "../lunaProgramme";
import { useSelection, useIsSelected } from "../../engine/hooks/useSelection";
import { useCanonicalHoverHandlers } from "../../engine/hooks/useHover";


function roomByRef(ref: string) {
  const room = LUNA_GROUND_LOBBY.rooms.find((r) => r.ref === ref)!;
  return room;
}

/** One selectable, floor+ceiling-bearing zone within the open lobby
 * volume — the real canonical room ref stays exactly what Phase 3
 * already assigned it (Part 18); only the visual treatment is new. */
function LobbyZone({ ref, label, x, z, width, depth, floorMaterial, clearHeight }: { ref: string; label: string; x: number; z: number; width: number; depth: number; floorMaterial: THREE.Material; clearHeight: number }) {
  const { select } = useSelection();
  const isSelected = useIsSelected(ref);
  const hover = useCanonicalHoverHandlers({ ref, kind: "room", label });
  const highlightMaterial = useMemo(() => {
    const m = floorMaterial.clone();
    if(m instanceof THREE.MeshStandardMaterial) { m.emissive.set("#376d6a"); m.emissiveIntensity = .1; }
    return m;
  }, [floorMaterial]);
  const floorGeometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, depth); const p = g.getAttribute("position"); const uv = g.getAttribute("uv");
    for(let i=0;i<p.count;i++) uv.setXY(i,(p.getX(i)+x)/1.2,(-p.getY(i)+z)/1.2);
    return g;
  },[width,depth,x,z]);
  useEffect(()=>()=>{floorGeometry.dispose();highlightMaterial.dispose();},[floorGeometry,highlightMaterial]);
  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}
        geometry={floorGeometry} material={isSelected ? highlightMaterial : floorMaterial}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          select({ ref, kind: "room", label, parentRef: LUNA_GROUND_LOBBY.interiorRef });
        }}
        {...hover}
      >

      </mesh>
      <GrandLobbyCeiling x={0} z={0} width={width} depth={depth} y={clearHeight} roomRef={ref} />
    </group>
  );
}

export interface GrandLobbyArchitectureProps {
  levelHeight: number;
  entranceDoorState: SlidingDoorState;
  onSelectEntranceDoor?: () => void;
  onEntranceDoorProgress?: (progress: number) => void;
}

export function GrandLobbyArchitecture({ levelHeight, entranceDoorState, onSelectEntranceDoor, onEntranceDoorProgress }: GrandLobbyArchitectureProps) {
  const reception = roomByRef("LUNA-GROUND-LOBBY-RECEPTION");
  const lounge = roomByRef("LUNA-GROUND-LOBBY-LOUNGE");
  const liftLobby = roomByRef("LUNA-GROUND-LOBBY-LIFTS");

  const floorStone = useMemo(() => groundInteriorMaterials.floor(), []);
  const furnitureWood = useMemo(() => lunaMaterialFactories.furnitureWood(), []);
  const frameMaterial = useMemo(() => lunaMaterialFactories.darkAluminium(), []);

  // Stair doors — real hinged leaves (distinct kinematics from the
  // entrance's sliding leaves, Part 15), positioned at each real
  // LUNA_CORES stair core's lobby-facing edge.
  const stairDoors = GROUND_STAIR_REFS.map((ref) => {
    const core = stairCore(ref);
    const doorRef = `${ref}-DOOR-01`;
    return { ref, doorRef, x: core.x, z: core.z - core.depth / 2, label: ref === "LUNA-STAIR-01" ? "Stair 01" : "Stair 02" };
  });

  // Service/fire lift — architecturally distinguished from the three
  // passenger lifts (Part 13), without fabricating fire-lift
  // certification: a small real signage panel at its real core position,
  // reusing the existing disclosed signagePanel() material. The DD06/
  // DD11/DD20 disclosures themselves live on the operational lift record
  // (lunaLift.ts) and its own contextual card — untouched here.
  const serviceLiftCore = LUNA_CORES.find((c) => c.ref === "LUNA-LIFT-SERVICE-01")!;
  const signageMaterial = useMemo(() => lunaMaterialFactories.signagePanel(), []);

  return (
    <group position={[0, -levelHeight / 2, 0]}>
      {/* This group already applies the level's -levelHeight/2 floor
          offset, so GroundEntrance (which also knows how to apply that
          offset itself, for standalone reuse) is passed 0 here to avoid
          double-applying it — its own x/z position is unaffected. */}
      <GroundEntrance levelHeight={0} doorState={entranceDoorState} onSelectDoor={onSelectEntranceDoor} onProgressChange={onEntranceDoorProgress} />

      <GroundInteriorFinishes />
      <LobbyZone ref="LUNA-GROUND-LOBBY-RECEPTION" label="Reception" x={reception.x} z={reception.z} width={reception.width} depth={reception.depth} floorMaterial={floorStone} clearHeight={PODIUM_CEILINGS.reception} />
      <LobbyZone ref="LUNA-GROUND-LOBBY-LOUNGE" label="Waiting Lounge" x={lounge.x} z={lounge.z} width={lounge.width} depth={lounge.depth} floorMaterial={floorStone} clearHeight={PODIUM_CEILINGS.lounge} />
      <LobbyZone ref="LUNA-GROUND-LOBBY-LIFTS" label="Lift Lobby" x={liftLobby.x} z={liftLobby.z} width={liftLobby.width} depth={liftLobby.depth} floorMaterial={floorStone} clearHeight={PODIUM_CEILINGS.gallery} />

      <GrandLobbyCeiling {...GROUND_ARRIVAL} y={PODIUM_CEILINGS.arrival} roomRef={LUNA_GROUND_LOBBY.interiorRef} />

      {/* Stair doors — hinged, closed by default (a real circulation
          door, not an animated feature for this phase) */}
      {stairDoors.map((s) => (
        <group key={s.ref} position={[s.x, 0, s.z]}>
          <HingedDoor ref_={s.doorRef} label={`${s.label} Door`} open={false} width={1.05} height={2.1} leafMaterial={furnitureWood} frameMaterial={frameMaterial} />
        </group>
      ))}

      {/* Service/fire lift signage — real position, real disclosed
          material, no fabricated certification. */}
      <mesh position={[serviceLiftCore.x, 2.0, serviceLiftCore.z + serviceLiftCore.depth / 2 + 0.08]} material={signageMaterial} castShadow>
        <boxGeometry args={[serviceLiftCore.width * 0.7, 0.3, 0.03]} />
      </mesh>
    </group>
  );
}
