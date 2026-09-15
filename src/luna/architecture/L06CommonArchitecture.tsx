// Luna — True Floor Plan System V1 (L06 Gold Standard) Parts 6/7/9/10/14.
// LUNA_REFERENCE_DESIGN: Oyi's own internally-designed reference floor,
// not an architect-approved or construction-issued document (Part 41).
//
// Mirrors GrandLobbyArchitecture.tsx's own established design decision:
// the Lift Lobby and the two stair-link corridors are ONE open circulation
// volume (floor + ceiling per zone, no perimeter walls between them) —
// real geometry doesn't leave enough depth here (3.4m, see
// l06FloorPlate.ts's translation math) to also wall off a separate
// service landing without reopening the exact core-overlap problem this
// phase's coordination work exists to fix. Real doors exist ONLY at
// actual thresholds: the four apartment entrances and the two stair
// doors — never a wall for its own sake.

import { useMemo } from "react";
import * as THREE from "three";
import { HingedDoor } from "../../engine/components/HingedDoor";
import { lunaMaterialFactories } from "../lunaMaterials";
import { L06_LOBBY, L06_STAIR_LINK_WEST, L06_STAIR_LINK_EAST, L06_APARTMENT_DOORS, type L06DoorSpec } from "./l06FloorPlate";
import { LUNA_CORES } from "../lunaProgramme";
import { useSelection, useIsSelected } from "../../engine/hooks/useSelection";
import { useCanonicalHoverHandlers } from "../../engine/hooks/useHover";

const ZONE_HEIGHT = 2.4;
const DOOR_HEIGHT = 2.1;

function CirculationZone({ ref_, label, x, z, width, depth, floorMaterial }: { ref_: string; label: string; x: number; z: number; width: number; depth: number; floorMaterial: THREE.Material }) {
  const { select } = useSelection();
  const isSelected = useIsSelected(ref_);
  const hover = useCanonicalHoverHandlers({ ref: ref_, kind: "room", label });
  const highlightMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffb454", roughness: 0.3, metalness: 0.2 }), []);
  const ceilingMaterial = useMemo(() => lunaMaterialFactories.ceilingSoffit(), []);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.03, 0]} material={isSelected ? highlightMaterial : floorMaterial} receiveShadow onClick={(e) => { e.stopPropagation(); select({ ref: ref_, kind: "room", label }); }} {...hover}>
        <boxGeometry args={[width, 0.06, depth]} />
      </mesh>
      <mesh position={[0, ZONE_HEIGHT, 0]} material={ceilingMaterial}>
        <boxGeometry args={[width, 0.06, depth]} />
      </mesh>
    </group>
  );
}

/** Real apartment entrance doors (Part 14; wired live in Apartment A Full
 * Interior Reality V1 Part 8) — frame + hinged leaf, not InteriorRoom's
 * invisible wall-gap. `open`/`onAngleChange` are real for Apartment A only
 * — driven by the SAME LunaRouteDriver transition state and read back into
 * clearance.ts's hingedBoundaryState() exactly the way App.tsx already
 * drives the Main Entrance's SlidingGlassDoor progress; B/C/D remain the
 * honest STATIC_BOUNDARY category (no live access transition targets
 * them), rendered permanently closed. */
function ApartmentEntranceDoor({ door, leafMaterial, frameMaterial, open, onAngleChange }: { door: L06DoorSpec; leafMaterial: THREE.Material; frameMaterial: THREE.Material; open: boolean; onAngleChange?: (openFraction: number) => void }) {
  // HingedDoor's leaf swings toward local +Z by default (see its own
  // pivot math). A/B's door (facing="north": the door sits on the wall
  // with the apartment to its SOUTH, i.e. world -Z) must swing into the
  // apartment, so the whole assembly is flipped 180 degrees; C/D's door
  // (facing="south": apartment to its NORTH, world +Z) already swings the
  // right way unrotated.
  const rotationY = door.facing === "north" ? Math.PI : 0;
  return (
    <group position={[door.x, 0, door.z]} rotation={[0, rotationY, 0]}>
      <HingedDoor ref_={door.ref} label={door.label} open={open} width={door.width} height={DOOR_HEIGHT} hinge={door.hinge} leafMaterial={leafMaterial} frameMaterial={frameMaterial} onAngleChange={onAngleChange} />
    </group>
  );
}

export interface L06CommonArchitectureProps {
  /** Real, live progress for Apartment A's entrance transition — undefined
   * or false means closed. Driven by the same transition engine every
   * other real door in this building uses (Part 33). */
  apartmentAEntranceOpen?: boolean;
  /** Reports Apartment A's real leaf swing progress (0..1) every frame —
   * the caller feeds this into hingedBoundaryState() so WAITING_FOR_ACCESS
   * -> CROSSING is gated on the door's own real animation, never a timer. */
  onApartmentAAngleChange?: (openFraction: number) => void;
  onSelectApartmentEntrance?: (ref: string) => void;
}

export function L06CommonArchitecture({ apartmentAEntranceOpen = false, onApartmentAAngleChange }: L06CommonArchitectureProps) {
  const floorStone = useMemo(() => lunaMaterialFactories.lobbyFloorStone(), []);
  const furnitureWood = useMemo(() => lunaMaterialFactories.furnitureWood(), []);
  const frameMaterial = useMemo(() => lunaMaterialFactories.darkAluminium(), []);
  const signageMaterial = useMemo(() => lunaMaterialFactories.signagePanel(), []);

  // Real stair doors for L06 (Part 9) — same real hinged-door pattern
  // Ground's stairs already use, own distinct per-level refs (a
  // vertical stair core has one physical door per landing, not one door
  // shared across every floor it passes).
  const stairDoors = [
    { ref: "LUNA-STAIR-01", label: "Stair 01" },
    { ref: "LUNA-STAIR-02", label: "Stair 02" },
  ].map(({ ref, label }) => {
    const core = LUNA_CORES.find((c) => c.ref === ref)!;
    return { doorRef: `${ref}-L06-DOOR-01`, label: `${label} Door`, x: core.x, z: core.z - core.depth / 2 };
  });

  const serviceLiftCore = LUNA_CORES.find((c) => c.ref === "LUNA-LIFT-SERVICE-01")!;

  return (
    <group>
      <CirculationZone ref_={L06_LOBBY.ref} label={L06_LOBBY.label} x={L06_LOBBY.x} z={L06_LOBBY.z} width={L06_LOBBY.width} depth={L06_LOBBY.depth} floorMaterial={floorStone} />
      <CirculationZone ref_={L06_STAIR_LINK_WEST.ref} label={L06_STAIR_LINK_WEST.label} x={L06_STAIR_LINK_WEST.x} z={L06_STAIR_LINK_WEST.z} width={L06_STAIR_LINK_WEST.width} depth={L06_STAIR_LINK_WEST.depth} floorMaterial={floorStone} />
      <CirculationZone ref_={L06_STAIR_LINK_EAST.ref} label={L06_STAIR_LINK_EAST.label} x={L06_STAIR_LINK_EAST.x} z={L06_STAIR_LINK_EAST.z} width={L06_STAIR_LINK_EAST.width} depth={L06_STAIR_LINK_EAST.depth} floorMaterial={floorStone} />

      {L06_APARTMENT_DOORS.map((door) => (
        <ApartmentEntranceDoor
          key={door.ref}
          door={door}
          leafMaterial={furnitureWood}
          frameMaterial={frameMaterial}
          open={door.unitRef === "LUNA-L06-APT-A" ? apartmentAEntranceOpen : false}
          onAngleChange={door.unitRef === "LUNA-L06-APT-A" ? onApartmentAAngleChange : undefined}
        />
      ))}

      {stairDoors.map((s) => (
        <group key={s.doorRef} position={[s.x, 0, s.z]}>
          <HingedDoor ref_={s.doorRef} label={s.label} open={false} width={1.05} height={DOOR_HEIGHT} leafMaterial={furnitureWood} frameMaterial={frameMaterial} />
        </group>
      ))}

      {/* Service/fire lift signage — same disclosed, real-position-only
          treatment GrandLobbyArchitecture already uses (Part 8: no
          fabricated life-safety certification). */}
      <mesh position={[serviceLiftCore.x, 2.0, serviceLiftCore.z + serviceLiftCore.depth / 2 + 0.08]} material={signageMaterial} castShadow>
        <boxGeometry args={[serviceLiftCore.width * 0.7, 0.3, 0.03]} />
      </mesh>
    </group>
  );
}
