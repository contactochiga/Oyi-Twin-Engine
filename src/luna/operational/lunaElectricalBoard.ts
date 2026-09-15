// Electrical System V1 (Part 7) — the Electrical Control Board's asset
// selector, the third SystemControlBoard consumer after Elevators and
// Water, following the exact same registry pattern as lunaWaterBoard.ts.
// Only real canonical refs already present in lunaOperationalAssets.ts/
// lunaMepBackbone.ts — nothing invented here. Matches the brief's own
// suggested asset list: Utility/Incoming, Main Distribution, ATS,
// Generator, Main Electrical Riser, L06 Distribution, 6A Meter, 6A DB.
export interface ElectricalBoardAsset {
  ref: string;
  shortLabel: string;
}

export const ELECTRICAL_BOARD_ASSETS: ElectricalBoardAsset[] = [
  { ref: "LUNA-B1-ELECTRICAL-GRID-01", shortLabel: "Utility" },
  { ref: "LUNA-B1-ELECTRICAL-MDB-01", shortLabel: "Main Dist." },
  { ref: "LUNA-B1-ELECTRICAL-ATS-01", shortLabel: "ATS" },
  { ref: "LUNA-B1-ELECTRICAL-GEN-01", shortLabel: "Generator" },
  { ref: "LUNA-B1-ELECTRICAL-INV-01", shortLabel: "Inverter" },
  { ref: "LUNA-RISER-ELECTRICAL-01", shortLabel: "Riser" },
  { ref: "LUNA-L06-ELECTRICAL-BRANCH-01", shortLabel: "L06 Dist." },
  { ref: "LUNA-L06-APT-A-METER-ELEC-01", shortLabel: "6A Meter" },
];

// The 6A meter's paired distribution board — a real, independently-
// focusable canonical asset (DB-01, downstream of the meter) that shares
// the meter's tab rather than getting a ninth tab of its own, mirroring
// WATER_METER_PAIRED_VALVE_REF exactly.
export const METER_PAIRED_DB_REF = "LUNA-L06-APT-A-DB-01";

const ELECTRICAL_BOARD_REFS = new Set(ELECTRICAL_BOARD_ASSETS.map((a) => a.ref));

export function isElectricalBoardRef(ref: string): boolean {
  return ELECTRICAL_BOARD_REFS.has(ref) || ref === METER_PAIRED_DB_REF;
}

/** Which tab's activeTabKey a given focusable ref belongs to — identity
 * for everything except the paired DB, which belongs to the meter's tab. */
export function electricalBoardTabKeyFor(ref: string): string {
  return ref === METER_PAIRED_DB_REF ? "LUNA-L06-APT-A-METER-ELEC-01" : ref;
}

export const ELECTRICAL_BOARD_DEFAULT_REF = "LUNA-B1-ELECTRICAL-GRID-01";
