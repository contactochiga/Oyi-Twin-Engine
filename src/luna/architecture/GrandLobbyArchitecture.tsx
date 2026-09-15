// Luna Architectural Reality V1 — Grand Entrance + Lobby Gold Standard
// (brief Parts 6-15). LUNA_REFERENCE_DESIGN throughout: Oyi's own
// internally designed reference building, not an architect-approved or
// construction-approved document (brief Part 33).
//
// Design decision, disclosed: the lobby is built as ONE open-plan volume
// (a single floor slab + one feature-ceiling language spanning
// Reception/Lounge/Lift-Lobby) rather than three separately walled
// InteriorRoom boxes with doors between them. A grand residential lobby
// reads as arrival + flow, not a row of closed rooms — and the brief's
// own Part 6 explicitly asks for "a strong sense of arrival," not
// "furniture inside the current box." The three real canonical room refs
// (LUNA-GROUND-LOBBY-RECEPTION/LOUNGE/LIFTS) are preserved exactly
// (Part 18) as the zones within this one volume — nothing about their
// identity, position data, or 2D-plan derivation changes; only HOW they
// render in 3D changes, from three boxed InteriorRooms to one composed
// open lobby.
//
// Structural coordination checked (Part 29) before writing geometry: the
// real Ground perimeter columns (lunaStructuralElements.ts) sit at
// z=±14 — entirely outside this lobby's z∈[-7,9] footprint. Clear, not
// assumed.

import { useMemo } from "react";
import * as THREE from "three";
import { GrandLobbyCeiling } from "./GrandLobbyCeiling";
import { GroundEntrance } from "./GroundEntrance";
import type { SlidingDoorState } from "../../engine/components/SlidingGlassDoor";
import { HingedDoor } from "../../engine/components/HingedDoor";
import { mergedBoxGeometry } from "../../engine/utils/geometryUtils";
import { lunaMaterialFactories } from "../lunaMaterials";
import { furniture, place } from "../interiors/furniture";
import { LUNA_GROUND_LOBBY } from "../interiors/lunaInteriors";
import { GROUND_STAIR_REFS, stairCore } from "./groundLobbyLayout";
import { LUNA_CORES } from "../lunaProgramme";
import { useSelection, useIsSelected } from "../../engine/hooks/useSelection";
import { useCanonicalHoverHandlers } from "../../engine/hooks/useHover";

const ROOM_HEIGHT = 2.4;

function roomByRef(ref: string) {
  const room = LUNA_GROUND_LOBBY.rooms.find((r) => r.ref === ref)!;
  return room;
}

/** One selectable, floor+ceiling-bearing zone within the open lobby
 * volume — the real canonical room ref stays exactly what Phase 3
 * already assigned it (Part 18); only the visual treatment is new. */
function LobbyZone({ ref, label, x, z, width, depth, floorMaterial, ceilingPendant }: { ref: string; label: string; x: number; z: number; width: number; depth: number; floorMaterial: THREE.Material; ceilingPendant?: boolean }) {
  const { select } = useSelection();
  const isSelected = useIsSelected(ref);
  const hover = useCanonicalHoverHandlers({ ref, kind: "room", label });
  const highlightMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffb454", roughness: 0.3, metalness: 0.2 }), []);
  return (
    <group position={[x, 0, z]}>
      <mesh
        position={[0, 0.03, 0]}
        material={isSelected ? highlightMaterial : floorMaterial}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          select({ ref, kind: "room", label, parentRef: LUNA_GROUND_LOBBY.interiorRef });
        }}
        {...hover}
      >
        <boxGeometry args={[width, 0.06, depth]} />
      </mesh>
      <GrandLobbyCeiling x={0} z={0} width={width} depth={depth} y={ROOM_HEIGHT} featurePendant={ceilingPendant} />
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

  const floorStone = useMemo(() => lunaMaterialFactories.lobbyFloorStone(), []);
  const furnitureWood = useMemo(() => lunaMaterialFactories.furnitureWood(), []);
  const furnitureStone = useMemo(() => lunaMaterialFactories.furnitureStone(), []);
  const furnitureFabric = useMemo(() => lunaMaterialFactories.furnitureFabric(), []);
  const receptionWallMat = useMemo(() => lunaMaterialFactories.receptionFeatureWall(), []);
  const frameMaterial = useMemo(() => lunaMaterialFactories.darkAluminium(), []);

  const receptionDeskGeometry = useMemo(() => mergedBoxGeometry(place(furniture.receptionDesk(4), reception.x, reception.z - 1, 0)), [reception.x, reception.z]);
  const loungeGeometry = useMemo(() => mergedBoxGeometry(place(furniture.loungeSeating(), lounge.x, lounge.z - 1, 0)), [lounge.x, lounge.z]);
  const plantersGeometry = useMemo(() => mergedBoxGeometry(place(furniture.planter(), lounge.x - 3, lounge.z + 3, 0)), [lounge.x, lounge.z]);

  // Reception's own feature backdrop — a real accent wall behind the
  // desk, distinct from the general lobby floor finish (Part 10).
  const receptionWallGeometry = useMemo(
    () => new THREE.BoxGeometry(reception.width * 0.85, ROOM_HEIGHT, 0.18),
    [reception.width]
  );

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

      <LobbyZone ref="LUNA-GROUND-LOBBY-RECEPTION" label="Reception" x={reception.x} z={reception.z} width={reception.width} depth={reception.depth} floorMaterial={floorStone} ceilingPendant />
      <LobbyZone ref="LUNA-GROUND-LOBBY-LOUNGE" label="Waiting Lounge" x={lounge.x} z={lounge.z} width={lounge.width} depth={lounge.depth} floorMaterial={floorStone} />
      <LobbyZone ref="LUNA-GROUND-LOBBY-LIFTS" label="Lift Lobby" x={liftLobby.x} z={liftLobby.z} width={liftLobby.width} depth={liftLobby.depth} floorMaterial={floorStone} />

      {/* Reception feature wall + desk */}
      <mesh position={[reception.x, ROOM_HEIGHT / 2, reception.z - reception.depth / 2 + 0.1]} material={receptionWallMat} geometry={receptionWallGeometry} castShadow receiveShadow />
      <mesh geometry={receptionDeskGeometry} material={furnitureStone} castShadow receiveShadow />

      {/* Lounge seating + planting */}
      <mesh geometry={loungeGeometry} material={furnitureFabric} castShadow receiveShadow />
      <mesh geometry={plantersGeometry} material={lunaMaterialFactories.greenAccent()} castShadow receiveShadow />

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
