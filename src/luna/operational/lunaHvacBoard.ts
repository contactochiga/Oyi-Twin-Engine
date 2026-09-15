// HVAC System V1 — the HVAC Control Board's asset selector, the fifth
// SystemControlBoard consumer after Elevators, Water, Electrical and
// Fire. Only real canonical refs already present in lunaMepBackbone.ts/
// lunaOperationalAssets.ts — no "L06 HVAC"/"Apartment 6A HVAC" tab is
// listed since no such distinct canonical asset exists (nothing
// invented); the always-visible HvacStatusSummary header widget already
// covers the aggregate reference-chain summary a dedicated tab would.
export interface HvacBoardAsset {
  ref: string;
  shortLabel: string;
}

export const HVAC_BOARD_ASSETS: HvacBoardAsset[] = [
  { ref: "LUNA-L06-APT-A-AC-OUTDOOR-01", shortLabel: "Condenser" },
  { ref: "LUNA-L06-APT-A-LIVING-AC-01", shortLabel: "Indoor Unit 01" },
  { ref: "LUNA-L06-APT-A-BED-01-AC-01", shortLabel: "Indoor Unit 02" },
];

const HVAC_BOARD_REFS = new Set(HVAC_BOARD_ASSETS.map((a) => a.ref));

export function isHvacBoardRef(ref: string): boolean {
  return HVAC_BOARD_REFS.has(ref);
}

export function hvacBoardTabKeyFor(ref: string): string {
  return ref;
}

export const HVAC_BOARD_DEFAULT_REF = "LUNA-L06-APT-A-AC-OUTDOOR-01";
