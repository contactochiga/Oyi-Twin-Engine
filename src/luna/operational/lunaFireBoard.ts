// Fire & Life Safety System V1 (Part 9) — the Fire Control Board's asset
// selector, the fourth SystemControlBoard consumer after Elevators,
// Water and Electrical. Only real canonical refs already present in
// lunaOperationalAssets.ts/lunaMepBackbone.ts — no call points/sounders
// are registered, so none are listed here (nothing invented).
export interface FireBoardAsset {
  ref: string;
  shortLabel: string;
}

export const FIRE_BOARD_ASSETS: FireBoardAsset[] = [
  { ref: "LUNA-B1-FIRE-PANEL-01", shortLabel: "Panel" },
  { ref: "LUNA-B1-FIRE-PUMP-01", shortLabel: "Pump" },
  { ref: "LUNA-B1-FIRE-TANK-01", shortLabel: "Tank" },
  { ref: "LUNA-RISER-FIRE-01", shortLabel: "Riser" },
  { ref: "LUNA-L06-FIRE-BRANCH-01", shortLabel: "L06 Zone" },
  { ref: "LUNA-GROUND-FIRE-DET-01", shortLabel: "Grd. Detector" },
  { ref: "LUNA-L06-APT-A-ENTRY-SMOKE-01", shortLabel: "6A Detector" },
];

const FIRE_BOARD_REFS = new Set(FIRE_BOARD_ASSETS.map((a) => a.ref));

export function isFireBoardRef(ref: string): boolean {
  return FIRE_BOARD_REFS.has(ref);
}

export function fireBoardTabKeyFor(ref: string): string {
  return ref;
}

export const FIRE_BOARD_DEFAULT_REF = "LUNA-B1-FIRE-PANEL-01";
