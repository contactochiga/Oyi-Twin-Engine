import type { BoxSpec } from "../../engine/utils/geometryUtils";
import type { FloorTint } from "../lunaMaterials";
import type { DoorOpening } from "../../engine/components/InteriorRoom";
import { furniture, place } from "./furniture";
import { GROUND_LIFT_LOBBY_LAYOUT } from "../architecture/groundLobbyLayout";
import { L06_LOBBY, L06_STAIR_LINK_WEST, L06_STAIR_LINK_EAST } from "../architecture/l06FloorPlate";

export interface RoomLayoutSpec {
  ref: string;
  label: string;
  /** Rect local to the interior's own group origin (the home/level footprint center). */
  x: number;
  z: number;
  width: number;
  depth: number;
  floorTint: FloorTint;
  /** Already placed via place(...) — room-local coordinates (room center = 0,0). */
  furniture: BoxSpec[];
  /** Which wall carries the door opening (Phase 12) — omit to keep
   * InteriorRoom's "south" default, which is fine for rooms without an
   * authored adjacency (the five non-L06 interiors below). Ignored when
   * `doors` is supplied. */
  doorSide?: "north" | "south" | "east" | "west";
  /** Apartment A Full Interior Reality V1 — a room with more than one real
   * opening (e.g. a bedroom: corridor + its own ensuite). Replaces
   * `doorSide` entirely when supplied. */
  doors?: DoorOpening[];
  /** Phase 13 §5 — this room gets a concealed service-void volume above
   * its ceiling (electrical/water/drainage/data runs, ceiling voids for
   * common areas), rendered by InteriorLayer. Representative subset, not
   * every room: the spaces that actually carry concealed services —
   * wet rooms/kitchen in Apartment 6A, and the common circulation/arrival
   * spaces in Ground Lobby and Residents' Club. */
  serviceVoid?: boolean;
}

export interface InteriorSpec {
  interiorRef: string;
  ownerLevelRef: string;
  label: string;
  rooms: RoomLayoutSpec[];
}

// ============================================================
// Level 06, Apartment A — Apartment A Full Interior Reality V1.
// Canonical refs match pilot/luna-residences/rooms.csv exactly for the
// original 12; this phase ADDS two real canonical spaces — a Guest WC
// (Part 2's own disclosed gap: 3 bedrooms x 1 ensuite each + 1 guest WC =
// 4 toilets, not 3) and a Corridor (the real internal circulation this
// phase's navigation graph needs, matching the precedent L06's own real
// Lift Lobby/stair-links already set) — for 14 real canonical rooms
// total, disclosed honestly rather than forcing the old "12" count.
//
// ROOM PROGRAMME RECONCILIATION (Part 3) — KEEP/MOVE/RESHAPE/RENAME/ADD
// against the original 12:
//   KEEP (ref unchanged):  KITCHEN, DINING, LIVING, BED-01/02/03,
//                          BATH-01/02/03 (already the 3 real ensuites),
//                          BALCONY.
//   MOVE + RESHAPE:        every room above also moves/reshapes — the
//                          original grid was never coordinated against
//                          the real corridor entrance point established by
//                          the L06 Gold Standard phase (the real door
//                          lands at local (5.68, 6.09), a corner far from
//                          the old ENTRY room at local (-1.75, -3.67)).
//   RENAME (ref unchanged): UTILITY-> "Utility" role kept but relocated
//                          near the kitchen; ENTRY -> "Foyer" (same ref,
//                          now genuinely adjacent to the real door).
//   ADD (new refs):        GUEST-WC (the disclosed programme gap),
//                          CORRIDOR (real internal circulation).
//   REMOVE:                none — canonical identity survives for all 12
//                          original refs.
//
// LAYOUT LOGIC: the real entrance (local x=+5.68, z=+6.09 — the box's own
// north wall, east end) puts the PUBLIC zone on the east/north side and
// leaves the west side for a PRIVATE wing, exactly the "a visitor should
// not walk directly into a bedroom" requirement (Part 4) — reaching any
// bedroom requires crossing the foyer/dining public zone first, then the
// private corridor. The apartment's real exterior walls are WEST (local
// x=-HW, tower facade) and SOUTH (local z=-HD, tower facade); NORTH
// (z=+HD) is the real corridor/Lift-Lobby party wall and EAST (x=+HW) is
// the real party wall with Apartment B (established by the L06 Gold
// Standard phase's own floor-plate translation) — so LIVING sits on the
// south exterior wall (real windows), all 3 bedrooms sit on the west
// exterior wall (real windows), and each ensuite is entered ONLY from its
// own bedroom (a true "ensuite", never from the public corridor).
// ============================================================
const AW = 15.652174; // LUNA-L06-APT-A's real, unchanged massing width (L06 Gold Standard's L06_UNIT_BOXES)
const AD = 12.173913; // real, unchanged massing depth
const HW = AW / 2;
const HD = AD / 2;

// East/west split: private wing | corridor | public wing.
const X_WEST = -HW; // real exterior (west facade)
const X_PRIV_CORR = -1.7; // private wing / corridor boundary
const X_CORR_PUB = -0.3; // corridor / public wing boundary
const X_EAST = HW; // real party wall with Apartment B

// North/south split within the public wing.
const Z_SOUTH = -HD; // real exterior (south facade) — Living/Balcony
const Z_LIVING_MID = -2.0;
const Z_MID_NORTH = 2.0;
const Z_NORTH = HD; // real party wall with the L06 Lift Lobby/corridor — the real entrance door lands here

// Three equal bedroom bands within the private wing, each a shallow
// corridor-fed ensuite (south portion of the band) behind a full-width
// bedroom (north portion) — see furniture.ts's longEnsuite() for why a
// wide-but-shallow ensuite shape was added this phase.
const BAND_D = AD / 3;
const Z_BAND_1 = Z_SOUTH + BAND_D;
const Z_BAND_2 = Z_SOUTH + 2 * BAND_D;
const ENSUITE_D = 1.65; // Reference clearance correction: retain a usable aisle in front of fixtures.

function band(bandStart: number, bandEnd: number) {
  const ensuiteZ = bandStart + ENSUITE_D / 2;
  const bedroomZ = bandStart + ENSUITE_D + (bandEnd - bandStart - ENSUITE_D) / 2;
  return { ensuiteZ, ensuiteD: ENSUITE_D, bedroomZ, bedroomD: bandEnd - bandStart - ENSUITE_D };
}
const BAND_A = band(Z_SOUTH, Z_BAND_1); // Primary suite
const BAND_B = band(Z_BAND_1, Z_BAND_2); // Bedroom 2
const BAND_C = band(Z_BAND_2, Z_NORTH); // Bedroom 3

const PRIVATE_CX = (X_WEST + X_PRIV_CORR) / 2;
const PRIVATE_W = X_PRIV_CORR - X_WEST;

const LIVING_CX = (X_CORR_PUB + X_EAST) / 2;
const LIVING_W = X_EAST - X_CORR_PUB;
const DINING_CX = (X_CORR_PUB + 3.5) / 2;
const DINING_W = 3.5 - X_CORR_PUB;
const KITCHEN_CX = (3.5 + X_EAST) / 2;
const KITCHEN_W = X_EAST - 3.5;
const UTILITY_CX = (X_CORR_PUB + 1.5) / 2;
const UTILITY_W = 1.5 - X_CORR_PUB;
const GUESTWC_CX = (1.5 + 3.5) / 2;
const FOYER_CX = (3.5 + X_EAST) / 2;
const FOYER_W = X_EAST - 3.5;
const NORTH_ROW_CZ = (Z_MID_NORTH + Z_NORTH) / 2;
const NORTH_ROW_D = Z_NORTH - Z_MID_NORTH;
const MID_ROW_CZ = (Z_LIVING_MID + Z_MID_NORTH) / 2;
const MID_ROW_D = Z_MID_NORTH - Z_LIVING_MID;
const LIVING_CZ = (Z_SOUTH + Z_LIVING_MID) / 2;
const LIVING_D = Z_LIVING_MID - Z_SOUTH;

export const LUNA_L06_APT_A: InteriorSpec = {
  interiorRef: "LUNA-L06-APT-A",
  ownerLevelRef: "LUNA-L06",
  label: "Level 06 — Apartment A",
  rooms: [
    // --- Public wing ---
    {
      ref: "LUNA-L06-APT-A-ENTRY",
      label: "Foyer",
      x: FOYER_CX,
      z: NORTH_ROW_CZ,
      width: FOYER_W,
      depth: NORTH_ROW_D,
      floorTint: "neutral",
      doors: [
        { side: "north", width: 1.0, offset: 0 }, // the real entrance door (L06_APARTMENT_DOORS) — wall gap only, no InteriorRoom hit-target (the real door assembly owns selection)
        { side: "south", width: 1.0, offset: 0 }, // -> Kitchen
        { side: "west", width: 1.0, offset: 0 }, // -> Guest WC
      ],
      furniture: place(furniture.console(), 0, 1.3, Math.PI),
    },
    {
      ref: "LUNA-L06-APT-A-KITCHEN",
      label: "Kitchen",
      x: KITCHEN_CX,
      z: MID_ROW_CZ,
      width: KITCHEN_W,
      depth: MID_ROW_D,
      floorTint: "kitchen",
      doors: [
        { side: "north", width: 1.0, offset: 0 }, // -> Foyer
        { side: "west", width: 1.2, offset: 0 }, // -> Dining
      ],
      furniture: [...place(furniture.kitchenCounter(2.8), -0.3, 0.3, 0), ...place(furniture.kitchenAppliances(), 1.6, -1.3, Math.PI)],
      serviceVoid: true,
    },
    {
      ref: "LUNA-L06-APT-A-DINING",
      label: "Dining Room",
      x: DINING_CX,
      z: MID_ROW_CZ,
      width: DINING_W,
      depth: MID_ROW_D,
      floorTint: "living",
      doors: [
        { side: "east", width: 1.2, offset: 0 }, // -> Kitchen
        { side: "south", width: 1.4, offset: 0 }, // -> Living
        { side: "west", width: 1.2, offset: 0 }, // -> Corridor
        { side: "north", width: 1.0, offset: UTILITY_CX - DINING_CX }, // -> Utility
      ],
      furniture: place(furniture.diningSet(), 0, 0, 0),
    },
    {
      ref: "LUNA-L06-APT-A-UTILITY",
      label: "Utility",
      x: UTILITY_CX,
      z: NORTH_ROW_CZ,
      width: UTILITY_W,
      depth: NORTH_ROW_D,
      floorTint: "neutral",
      doors: [{ side: "south", width: 1.0, offset: 0 }],
      // Part 9 audit fix — utilityUnit()'s washer+dryer pair (spans local
      // x=[-0.925, 0.475]) is not centered on its own origin; placed at
      // cx=0 the washer's west edge clipped ~2.5cm through this room's
      // own west wall (half-width 0.9). +0.225 recenters the cluster
      // (new span [-0.7, 0.7]) with real clearance on both sides.
      furniture: place(furniture.utilityUnit(), 0.225, -1.0, 0),
      serviceVoid: true,
    },
    {
      ref: "LUNA-L06-APT-A-GUEST-WC",
      label: "Guest WC",
      x: GUESTWC_CX,
      z: NORTH_ROW_CZ,
      width: 2.0,
      depth: NORTH_ROW_D,
      floorTint: "bathroom",
      doors: [{ side: "east", width: 0.9, offset: 0 }], // -> Foyer
      furniture: place(furniture.guestWC(), 0, -1.0, 0),
      serviceVoid: true,
    },
    {
      ref: "LUNA-L06-APT-A-LIVING",
      label: "Living Room",
      x: LIVING_CX,
      z: LIVING_CZ,
      width: LIVING_W,
      depth: LIVING_D,
      floorTint: "living",
      doors: [
        { side: "north", width: 1.4, offset: DINING_CX - LIVING_CX }, // -> Dining
        { side: "south", width: 2.4, offset: 0 }, // -> Balcony
      ],
      furniture: place(furniture.sofaAndTable(), 0.5, -0.6, 0),
    },
    {
      ref: "LUNA-L06-APT-A-BALCONY",
      label: "Balcony",
      x: LIVING_CX,
      z: Z_SOUTH - 0.75,
      width: LIVING_W,
      depth: 1.5,
      floorTint: "outdoor",
      doors: [{ side: "north", width: 2.4, offset: 0 }],
      furniture: [...place(furniture.loungers(2, 1.4), -2.0, 0, Math.PI / 2), ...place(furniture.planter(), 3.0, 0, 0)],
    },
    // --- Private circulation ---
    {
      ref: "LUNA-L06-APT-A-CORRIDOR",
      label: "Corridor",
      x: (X_PRIV_CORR + X_CORR_PUB) / 2,
      z: 0,
      width: X_CORR_PUB - X_PRIV_CORR,
      depth: AD,
      floorTint: "neutral",
      doors: [
        { side: "east", width: 1.2, offset: 0 }, // -> Dining
        { side: "west", width: 1.0, offset: BAND_A.bedroomZ }, // -> Primary Bedroom
        { side: "west", width: 1.0, offset: BAND_B.bedroomZ }, // -> Bedroom 2
        { side: "west", width: 1.0, offset: BAND_C.bedroomZ }, // -> Bedroom 3
      ],
      furniture: [],
    },
    // --- Private wing: 3 bedrooms, each a real ensuite entered ONLY from its own bedroom ---
    {
      ref: "LUNA-L06-APT-A-BED-01",
      label: "Primary Bedroom",
      x: PRIVATE_CX,
      z: BAND_A.bedroomZ,
      width: PRIVATE_W,
      depth: BAND_A.bedroomD,
      floorTint: "bedroom",
      doors: [
        { side: "east", width: 1.0, offset: 0 }, // -> Corridor
        { side: "south", width: 0.9, offset: 0 }, // -> Primary Ensuite
      ],
      furniture: [...place(furniture.bed(), -1.0, 0, 0), ...place(furniture.wardrobeRun(2.2), 2.4, 0, Math.PI / 2)],
    },
    {
      ref: "LUNA-L06-APT-A-BATH-01",
      label: "Primary Ensuite",
      x: PRIVATE_CX,
      z: BAND_A.ensuiteZ,
      width: PRIVATE_W,
      depth: BAND_A.ensuiteD,
      floorTint: "bathroom",
      doors: [{ side: "north", width: 0.9, offset: 0 }],
      furniture: place(furniture.longEnsuite(5.0), 0, 0, 0),
      serviceVoid: true,
    },
    {
      ref: "LUNA-L06-APT-A-BED-02",
      label: "Bedroom 2",
      x: PRIVATE_CX,
      z: BAND_B.bedroomZ,
      width: PRIVATE_W,
      depth: BAND_B.bedroomD,
      floorTint: "bedroom",
      doors: [
        { side: "east", width: 1.0, offset: 0 }, // -> Corridor
        { side: "south", width: 0.9, offset: 0 }, // -> Ensuite 2
      ],
      furniture: [...place(furniture.bed(), -1.0, 0, 0), ...place(furniture.wardrobeRun(2.2), 2.4, 0, Math.PI / 2)],
    },
    {
      ref: "LUNA-L06-APT-A-BATH-02",
      label: "Ensuite 2",
      x: PRIVATE_CX,
      z: BAND_B.ensuiteZ,
      width: PRIVATE_W,
      depth: BAND_B.ensuiteD,
      floorTint: "bathroom",
      doors: [{ side: "north", width: 0.9, offset: 0 }],
      furniture: place(furniture.longEnsuite(5.0), 0, 0, 0),
      serviceVoid: true,
    },
    {
      ref: "LUNA-L06-APT-A-BED-03",
      label: "Bedroom 3",
      x: PRIVATE_CX,
      z: BAND_C.bedroomZ,
      width: PRIVATE_W,
      depth: BAND_C.bedroomD,
      floorTint: "bedroom",
      doors: [
        { side: "east", width: 1.0, offset: 0 }, // -> Corridor
        { side: "south", width: 0.9, offset: 0 }, // -> Ensuite 3
      ],
      furniture: [...place(furniture.bed(), -1.0, 0, 0), ...place(furniture.wardrobeRun(2.2), 2.4, 0, Math.PI / 2)],
    },
    {
      ref: "LUNA-L06-APT-A-BATH-03",
      label: "Ensuite 3",
      x: PRIVATE_CX,
      z: BAND_C.ensuiteZ,
      width: PRIVATE_W,
      depth: BAND_C.ensuiteD,
      floorTint: "bathroom",
      doors: [{ side: "north", width: 0.9, offset: 0 }],
      furniture: place(furniture.longEnsuite(5.0), 0, 0, 0),
      serviceVoid: true,
    },
  ],
};

// ============================================================
// The five interiors below use canonical-STYLE refs that follow the same
// naming convention as the backend contract, but — unlike L06 Apartment A
// above — none of these rows exist in the backend yet (no rooms.csv entry,
// no homes table row for the premium/penthouse units, no facility-space
// concept for the Lobby/Club/Sky destinations). They exist here so the
// *shape* of the navigation system is provable end to end; wiring them to
// real backend rows is future work, not implied to already be done.
// ============================================================

// --- Ground Lobby ---
// lounge sits at -15, not the room's naive "mirror of lifts" position of
// -9 — LUNA-RISER-01 (lunaProgramme.ts, a full-height service riser core)
// sits at world x=-8, z=0, and every core in LUNA_CORES runs the entire
// building height, so a Lounge centered at -9 (half-width 5) put the riser
// almost exactly at the room's own center. Confirmed the hard way: framing
// this room's actual "Enter Ground Lobby" camera shot (Phase 12) revealed
// an opaque near-black shaft standing in the middle of the waiting lounge.
const LOBBY_COL = { reception: 0, lounge: -15 };
// Architectural Reality V1 — the Lift Lobby room rect now comes from
// GROUND_LIFT_LOBBY_LAYOUT (groundLobbyLayout.ts), computed from the real
// LUNA_CORES lift positions so this room genuinely wraps the real lift
// bank DynamicLift.tsx already renders landing doors for — see that
// file's own header comment for the full audit finding. The canonical
// ref is unchanged.
export const LUNA_GROUND_LOBBY: InteriorSpec = {
  interiorRef: "LUNA-GROUND-LOBBY",
  ownerLevelRef: "LUNA-GROUND",
  label: "Ground — Lobby",
  rooms: [
    { ref: "LUNA-GROUND-LOBBY-RECEPTION", label: "Reception", x: LOBBY_COL.reception, z: 6, width: 14, depth: 6, floorTint: "living", furniture: place(furniture.receptionDesk(4), 0, -1, 0), serviceVoid: true },
    { ref: "LUNA-GROUND-LOBBY-LOUNGE", label: "Waiting Lounge", x: LOBBY_COL.lounge, z: -2, width: 10, depth: 10, floorTint: "neutral", furniture: [...place(furniture.loungeSeating(), 0, -1, 0), ...place(furniture.planter(), -3, 3, 0)] },
    { ref: "LUNA-GROUND-LOBBY-LIFTS", label: "Lift Lobby", x: GROUND_LIFT_LOBBY_LAYOUT.x, z: GROUND_LIFT_LOBBY_LAYOUT.z, width: GROUND_LIFT_LOBBY_LAYOUT.width, depth: GROUND_LIFT_LOBBY_LAYOUT.depth, floorTint: "neutral", furniture: place(furniture.console(), 0, 3.5, 0), serviceVoid: true },
  ],
};

// --- Residents' Club (Level 1 Amenities) ---
// Two rooms, not three — LUNA_CORES (lunaProgramme.ts) runs every
// passenger/service lift plus the representative service riser the FULL
// height of the building at a fixed x/z, and on this level that combined
// cluster (x roughly -8.8 to 8.15) is nearly as wide as the whole original
// Pool room. A first attempt tried folding a "Gym" into that central band
// on the theory that structural columns through a gym are normal — but the
// cores are full-height, floor-to-ceiling-and-beyond opaque shafts, so
// standing anywhere near them at room scale still reads as a wall filling
// the frame, not a column you walk past (confirmed the hard way via the
// actual camera shot). There simply isn't usable open floor in that band.
// Pool and Lounge instead sit entirely in the two genuinely clear bands on
// either side, each with real clearance from both the core cluster and the
// two protected stairs at z=9 (handled by keeping depth well under the
// footprint's own z-extent).
export const LUNA_L01_CLUB: InteriorSpec = {
  interiorRef: "LUNA-L01-CLUB",
  ownerLevelRef: "LUNA-L01-AMENITIES",
  label: "Level 1 — Residents' Club",
  rooms: [
    {
      ref: "LUNA-L01-CLUB-POOL",
      label: "Pool",
      x: -14.5,
      z: 0,
      width: 9,
      depth: 16,
      floorTint: "wet",
      furniture: [...place(furniture.pool(6, 12), 0, 0, 0), ...place(furniture.loungers(2, 2.2), 0, 6, 0)],
      serviceVoid: true,
    },
    { ref: "LUNA-L01-CLUB-LOUNGE", label: "Lounge", x: 14.5, z: 0, width: 9, depth: 16, floorTint: "living", furniture: place(furniture.loungeSeating(), 0, 0, -Math.PI / 2), serviceVoid: true },
  ],
};

// --- Premium residence: Level 10, Apartment A ---
export const LUNA_L10_APT_A: InteriorSpec = {
  interiorRef: "LUNA-L10-APT-A",
  ownerLevelRef: "LUNA-L10",
  label: "Level 10 — Apartment A (Premium)",
  rooms: [
    { ref: "LUNA-L10-APT-A-ENTRY", label: "Entry", x: -5.3, z: -4.33, width: 5.3, depth: 4.33, floorTint: "neutral", furniture: place(furniture.console(), 0, -1.2, Math.PI) },
    { ref: "LUNA-L10-APT-A-KITCHEN", label: "Kitchen", x: 0, z: -4.33, width: 5.3, depth: 4.33, floorTint: "kitchen", furniture: place(furniture.kitchenCounter(3.2), 0, -0.5, 0) },
    { ref: "LUNA-L10-APT-A-BATH-02", label: "Bathroom 2", x: 5.3, z: -4.33, width: 5.3, depth: 4.33, floorTint: "bathroom", furniture: place(furniture.vanityAndTub(), 0, 0, 0) },
    { ref: "LUNA-L10-APT-A-BED-02", label: "Bedroom 2", x: -5.3, z: 0, width: 5.3, depth: 4.33, floorTint: "bedroom", furniture: place(furniture.bed(), 0, 0, -Math.PI / 2) },
    { ref: "LUNA-L10-APT-A-BATH-01", label: "Primary Bathroom", x: 5.3, z: 0, width: 5.3, depth: 4.33, floorTint: "bathroom", furniture: place(furniture.vanityAndTub(), 0, 0, Math.PI) },
    { ref: "LUNA-L10-APT-A-BED-01", label: "Primary Bedroom", x: -5.3, z: 4.33, width: 5.3, depth: 4.33, floorTint: "bedroom", furniture: place(furniture.bed(), 0, 0.3, 0) },
    {
      ref: "LUNA-L10-APT-A-LIVING",
      label: "Living / Dining",
      x: 2.65,
      z: 4.33,
      width: 10.6,
      depth: 4.33,
      floorTint: "living",
      furniture: [...place(furniture.sofaAndTable(), -2, 0.4, 0), ...place(furniture.diningSet(), 3, -0.5, 0)],
    },
    { ref: "LUNA-L10-APT-A-BALCONY", label: "Balcony", x: 0, z: 7.4, width: 16, depth: 1.8, floorTint: "outdoor", furniture: place(furniture.loungers(2, 1.6), 0, 0, Math.PI / 2) },
  ],
};

// --- Penthouse ---
export const LUNA_PENTHOUSE_INTERIOR: InteriorSpec = {
  interiorRef: "LUNA-PENTHOUSE",
  ownerLevelRef: "LUNA-PENTHOUSE",
  label: "Penthouse",
  rooms: [
    { ref: "LUNA-PENTHOUSE-STUDY", label: "Study", x: -9, z: -7, width: 9, depth: 7, floorTint: "neutral", furniture: place(furniture.desk(), 0, 0, Math.PI) },
    { ref: "LUNA-PENTHOUSE-ENTRY", label: "Entry", x: 0, z: -7, width: 9, depth: 7, floorTint: "neutral", furniture: place(furniture.console(), 0, -2, Math.PI) },
    { ref: "LUNA-PENTHOUSE-BATH-02", label: "Bathroom 2", x: 9, z: -7, width: 9, depth: 7, floorTint: "bathroom", furniture: place(furniture.vanityAndTub(), 0, 0, 0) },
    { ref: "LUNA-PENTHOUSE-BED-02", label: "Bedroom 2", x: -9, z: 0, width: 9, depth: 7, floorTint: "bedroom", furniture: place(furniture.bed(), 0, 0, -Math.PI / 2) },
    { ref: "LUNA-PENTHOUSE-KITCHEN", label: "Kitchen", x: 0, z: 0, width: 9, depth: 7, floorTint: "kitchen", furniture: place(furniture.kitchenCounter(4), 0, 0, 0) },
    { ref: "LUNA-PENTHOUSE-BATH-01", label: "Primary Bathroom", x: 9, z: 0, width: 9, depth: 7, floorTint: "bathroom", furniture: place(furniture.vanityAndTub(), 0, 0, Math.PI) },
    { ref: "LUNA-PENTHOUSE-BED-01", label: "Primary Bedroom", x: -9, z: 7, width: 9, depth: 7, floorTint: "bedroom", furniture: place(furniture.bed(), 0, 0.5, 0) },
    {
      ref: "LUNA-PENTHOUSE-GREATROOM",
      label: "Great Room",
      x: 4.5,
      z: 7,
      width: 18,
      depth: 7,
      floorTint: "living",
      furniture: [...place(furniture.sofaAndTable(), -3, 0.6, 0), ...place(furniture.diningSet(), 5, -1, 0)],
    },
    { ref: "LUNA-PENTHOUSE-TERRACE", label: "Terrace", x: 0, z: 12, width: 30, depth: 3, floorTint: "outdoor", furniture: [...place(furniture.loungeSeating(), -8, 0, 0), ...place(furniture.planter(), 10, 0, 0), ...place(furniture.planter(), 12, 0, 0)] },
  ],
};

// --- Luna Sky (Rooftop) ---
// Stacked front/back (z), not side-by-side (x) — the Rooftop footprint is
// only 26 wide, and LUNA_CORES' combined lift/riser cluster (x roughly
// -8.8 to 8.15, the same building-wide fixed band as every other level)
// eats nearly two thirds of that width, leaving no side-by-side arrangement
// with real clearance (learned this the more expensive way on the Club
// level first). The cluster's own z-extent is narrow by comparison — under
// 3.5m — so two full-width rooms front and back of z=0 sit entirely clear
// of it while keeping generous width, and both stay short enough in depth
// to clear the two protected stairs at z=9 too.
export const LUNA_ROOFTOP_SKY: InteriorSpec = {
  interiorRef: "LUNA-ROOFTOP-SKY",
  ownerLevelRef: "LUNA-ROOFTOP",
  label: "Luna Sky — Rooftop",
  rooms: [
    { ref: "LUNA-ROOFTOP-SKYBAR", label: "Sky Bar", x: 0, z: -5, width: 20, depth: 7, floorTint: "living", furniture: place(furniture.barCounter(6), 0, 1.5, 0) },
    {
      ref: "LUNA-ROOFTOP-POOLDECK",
      label: "Pool Deck",
      x: 0,
      z: 5,
      width: 20,
      depth: 7,
      floorTint: "wet",
      furniture: [...place(furniture.pool(12, 4), 0, -0.3, 0), ...place(furniture.loungers(3, 2.8), 0, 2.4, 0)],
    },
  ],
};

// --- L06 Common Circulation (True Floor Plan System V1, L06 Gold
// Standard) ---
// The real Lift Lobby + two stair-link corridors, registered here purely
// as the canonical room registry (2D plan cross-checks, commonInteriorForLevel,
// findSpace's generic room lookup) — geometry is read directly from
// l06FloorPlate.ts (the single authoritative source), never re-typed.
// Rendered in 3D by the bespoke L06CommonArchitecture.tsx (an open
// circulation volume, matching GrandLobbyArchitecture's own precedent),
// NOT the generic InteriorLayer — L06 is deliberately absent from
// LunaLevel.tsx's LEVEL_INTERIORS map, so this entry never double-renders.
export const LUNA_L06_COMMON: InteriorSpec = {
  interiorRef: "LUNA-L06-COMMON",
  ownerLevelRef: "LUNA-L06",
  label: "Level 06 — Common Circulation",
  rooms: [
    { ref: L06_LOBBY.ref, label: L06_LOBBY.label, x: L06_LOBBY.x, z: L06_LOBBY.z, width: L06_LOBBY.width, depth: L06_LOBBY.depth, floorTint: "neutral", furniture: [] },
    { ref: L06_STAIR_LINK_WEST.ref, label: L06_STAIR_LINK_WEST.label, x: L06_STAIR_LINK_WEST.x, z: L06_STAIR_LINK_WEST.z, width: L06_STAIR_LINK_WEST.width, depth: L06_STAIR_LINK_WEST.depth, floorTint: "neutral", furniture: [] },
    { ref: L06_STAIR_LINK_EAST.ref, label: L06_STAIR_LINK_EAST.label, x: L06_STAIR_LINK_EAST.x, z: L06_STAIR_LINK_EAST.z, width: L06_STAIR_LINK_EAST.width, depth: L06_STAIR_LINK_EAST.depth, floorTint: "neutral", furniture: [] },
  ],
};

export const LUNA_INTERIORS: InteriorSpec[] = [
  LUNA_GROUND_LOBBY,
  LUNA_L01_CLUB,
  LUNA_L06_APT_A,
  LUNA_L06_COMMON,
  LUNA_L10_APT_A,
  LUNA_PENTHOUSE_INTERIOR,
  LUNA_ROOFTOP_SKY,
];
