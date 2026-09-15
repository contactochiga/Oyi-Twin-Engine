// Access & Security System V1 — the Access Control Board's asset
// selector, the sixth SystemControlBoard consumer after Elevators, Water,
// Electrical, Fire and HVAC. Only the three common access points — all
// FULL_3D for Facility (common infrastructure, not private-unit assets).
// Apartment 6A's own entrance lock is deliberately NOT a tab here: it is
// HIDDEN to Facility (same privacy boundary HVAC's indoor units already
// established) and stays operable only via the existing interior device-
// interaction surface, not this board.
export interface AccessBoardAsset {
  ref: string;
  shortLabel: string;
}

export const ACCESS_BOARD_ASSETS: AccessBoardAsset[] = [
  { ref: "LUNA-GROUND-ACCESS-MAIN-01", shortLabel: "Main Entrance" },
  { ref: "LUNA-B1-ACCESS-SERVICE-01", shortLabel: "Service Entrance" },
  { ref: "LUNA-GROUND-ACCESS-LIFT-LOBBY-01", shortLabel: "Lift Lobby" },
];

const ACCESS_BOARD_REFS = new Set(ACCESS_BOARD_ASSETS.map((a) => a.ref));

export function isAccessBoardRef(ref: string): boolean {
  return ACCESS_BOARD_REFS.has(ref);
}

export function accessBoardTabKeyFor(ref: string): string {
  return ref;
}

export const ACCESS_BOARD_DEFAULT_REF = "LUNA-GROUND-ACCESS-MAIN-01";
