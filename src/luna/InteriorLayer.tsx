import { useMemo } from "react";
import { InteriorRoom, ServiceZone, AccessPanel } from "../engine";
import type { InteriorSpec } from "./interiors/lunaInteriors";
import { lunaMaterialFactories, floorMaterialForTint } from "./lunaMaterials";
import { mergedBoxGeometry } from "../engine/utils/geometryUtils";
import { l06AptADoorRef } from "./ingestion/lunaL06AptAAdapter";

// Architectural Reality V2 — door selection (brief Part 16) is scoped to
// exactly the one target this phase names: L06 Apartment A. Every other
// interior (Lobby, Club, L10, Penthouse, Rooftop) keeps its door gaps as
// plain openings with no separate identity, unchanged.
const DOOR_SELECTABLE_INTERIOR_REF = "LUNA-L06-APT-A";

const WALL_HEIGHT = 2.4;
// Leaves headroom below the level's own outer box top (level.height/2 from
// the level's local-frame mid-height origin) for the structural slab above
// — see lunaStructuralElements.ts's SLAB_THICKNESS (0.35) plus a small
// margin so the void never visually pokes through it.
const SLAB_CLEARANCE = 0.4;

/** Renders one interior's rooms. Nested as a child of the interior's real
 * parent (a LunaLevel's massing group, or a UnitVolume for an apartment)
 * so it inherits explode offset and participates in level-scope fade for
 * free — never a separately-positioned global scene.
 *
 * `levelHeight` is required, not optional: a level's (and a unit's) own
 * group origin sits at its *vertical center* — baseElevation + height/2,
 * see LevelMassing — matching the convention LevelFacade already uses
 * (floorLocalBottom = -h/2) for balconies/canopies. Without this offset
 * every room here would render floating at the slab's mid-height instead
 * of on its floor, which is exactly the bug that made the Ground Lobby
 * render as an empty scene during Phase 3 verification: the rooms existed
 * but sat 2.5m above where the camera was looking. */
export function InteriorLayer({ spec, levelHeight }: { spec: InteriorSpec; levelHeight: number }) {
  const voidHeight = Math.max(levelHeight - WALL_HEIGHT - SLAB_CLEARANCE, 0.2);
  const voidCenterY = WALL_HEIGHT + voidHeight / 2;

  return (
    <group position={[0, -levelHeight / 2, 0]}>
      {spec.rooms.map((room) => (
        <RoomWithMaterials key={room.ref} ownerLevelRef={spec.ownerLevelRef} interiorRef={spec.interiorRef} room={room} />
      ))}
      {spec.rooms
        .filter((room) => room.serviceVoid)
        .map((room) => (
          <ServiceZone
            key={`${room.ref}-SERVICE-VOID`}
            ref_={`${room.ref}-SERVICE-VOID`}
            label={`${room.label} — Concealed Service Void`}
            center={{ x: room.x, y: voidCenterY, z: room.z }}
            size={{ x: room.width * 0.94, y: voidHeight, z: room.depth * 0.94 }}
            revealInInteriorRef={spec.interiorRef}
          />
        ))}
      {spec.rooms
        .filter((room) => room.serviceVoid)
        .map((room) => (
          <AccessPanel
            key={`${room.ref}-ACCESS-PANEL`}
            ref_={`${room.ref}-ACCESS-PANEL`}
            label={`${room.label} — Ceiling Access Panel`}
            position={{ x: room.x, y: WALL_HEIGHT - 0.02, z: room.z }}
            revealInInteriorRef={spec.interiorRef}
          />
        ))}
    </group>
  );
}

function RoomWithMaterials({ ownerLevelRef, interiorRef, room }: { ownerLevelRef: string; interiorRef: string; room: InteriorSpec["rooms"][number] }) {
  // Every material here is a fresh instance *per room* — never shared
  // across rooms in the same interior. Room-focus fades siblings of the
  // focused room independently (see useRoomOpacity); a shared material
  // instance would make every room holding it fade together instead,
  // exactly the bug already fixed once for exterior levels in Phase 2.
  const floorMaterial = useMemo(() => floorMaterialForTint(room.floorTint), [room.floorTint]);
  const wallMaterial = useMemo(() => lunaMaterialFactories.interiorWall(), []);
  const furnitureMaterial = useMemo(() => lunaMaterialFactories.furnitureWood(), []);
  const furnitureGeometry = useMemo(() => (room.furniture.length ? mergedBoxGeometry(room.furniture) : null), [room.furniture]);

  const doorRef = interiorRef === DOOR_SELECTABLE_INTERIOR_REF && room.doorSide ? l06AptADoorRef(room.ref) : undefined;

  return (
    <InteriorRoom
      ref_={room.ref}
      label={room.label}
      ownerLevelRef={ownerLevelRef}
      interiorRef={interiorRef}
      x={room.x}
      z={room.z}
      width={room.width}
      depth={room.depth}
      doorSide={room.doorSide}
      doors={room.doors}
      doorRef={doorRef}
      floorMaterial={floorMaterial}
      wallMaterial={wallMaterial}
      furnitureGeometry={furnitureGeometry}
      furnitureMaterial={furnitureMaterial}
    />
  );
}
