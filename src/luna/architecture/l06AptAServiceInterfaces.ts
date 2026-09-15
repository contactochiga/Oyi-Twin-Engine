// Luna Architectural Reality V2 — architectural/MEP interface derivation
// (brief Part 11). Never invents a new device, route, or connection: this
// only ASSOCIATES rooms with the real MEP/device assets that already
// exist for Apartment A (lunaOperationalAssets.ts, seeded across Phases
// 4/10/13) by real position-containment in the SAME local ("massing")
// frame both the rooms and these device positions already share — cross-
// checked against each asset's own locationLabel text as corroborating
// evidence, not a second independent guess. A room with no contained
// asset simply gets an empty interface list — never a fabricated one.

import { LUNA_L06_APT_A, type RoomLayoutSpec } from "../interiors/lunaInteriors";
import { LUNA_OPERATIONAL_ASSETS } from "../operational/lunaOperationalAssets";

export interface RoomServiceInterface {
  assetRef: string;
  system: string;
  type: string;
  /** True when the asset's own locationLabel also names this room,
   * corroborating the position-containment match with a second, real,
   * independent signal. False doesn't mean wrong — some real assets
   * (e.g. a riser branch) never carried a room-specific label — it just
   * means only one signal (position) supports this association. */
  locationLabelCorroborates: boolean;
}

const APT_A_REF = "LUNA-L06-APT-A";

function containsPoint(room: RoomLayoutSpec, x: number, z: number): boolean {
  return Math.abs(x - room.x) <= room.width / 2 && Math.abs(z - room.z) <= room.depth / 2;
}

/** Every real Apartment A device/asset, associated to whichever real room
 * (if any) actually contains its real position. An asset outside every
 * room's rect (e.g. it sits in the shared core band, not a real room)
 * correctly associates with no room — not forced into the nearest one. */
export function deriveL06AptARoomServiceInterfaces(): Map<string, RoomServiceInterface[]> {
  const byRoom = new Map<string, RoomServiceInterface[]>();
  const unitAssets = LUNA_OPERATIONAL_ASSETS.filter((a) => a.unitRef === APT_A_REF);

  for (const room of LUNA_L06_APT_A.rooms) {
    const matches: RoomServiceInterface[] = [];
    for (const asset of unitAssets) {
      if (!containsPoint(room, asset.position.x, asset.position.z)) continue;
      const roomNameInLabel = room.label.split(" / ")[0].split(" ")[0]; // "Bathroom 3" -> "Bathroom", "Entry / Foyer" -> "Entry"
      matches.push({
        assetRef: asset.ref,
        system: asset.system,
        type: asset.type,
        locationLabelCorroborates: asset.locationLabel.includes(room.label) || asset.locationLabel.includes(roomNameInLabel),
      });
    }
    if (matches.length) byRoom.set(room.ref, matches);
  }

  return byRoom;
}
