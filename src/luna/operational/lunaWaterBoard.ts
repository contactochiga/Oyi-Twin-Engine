// Domestic Water Reference System V1 (Part I) — the Water Control Board's
// asset selector, mirroring the elevator LiftDefinition registry pattern:
// one small, explicit list of the actual registered/reference assets that
// legitimately exist (LUNA_DIGITAL_BUILDING_STANDARD.md §12 — reuse the
// SystemControlBoard grammar, never a bespoke panel per system). Only
// includes real canonical refs already present in lunaOperationalAssets.ts/
// lunaMepBackbone.ts — nothing invented here.
//
// The 6A tab is keyed on the apartment's water meter (the natural
// "focus" identity for that demarcation point) but its content panel also
// shows the paired isolation valve (LUNA-L06-APT-A-UTILITY-VALVE-01) —
// they are two distinct canonical assets operated together at one
// physical location, not merged into a fake combined ref.
export interface WaterBoardAsset {
  ref: string;
  shortLabel: string;
}

export const WATER_BOARD_ASSETS: WaterBoardAsset[] = [
  { ref: "LUNA-B1-WATER-TANK-01", shortLabel: "Tank" },
  { ref: "LUNA-B1-WATER-TREAT-01", shortLabel: "Treatment" },
  { ref: "LUNA-B1-WATER-BP-01", shortLabel: "Pump 01" },
  { ref: "LUNA-B1-WATER-BP-02", shortLabel: "Pump 02" },
  { ref: "LUNA-B1-WATER-VALVE-01", shortLabel: "Header" },
  { ref: "LUNA-RISER-WATER-01", shortLabel: "Riser" },
  { ref: "LUNA-L06-WATER-BRANCH-01", shortLabel: "L06 Branch" },
  { ref: "LUNA-L06-APT-A-METER-WATER-01", shortLabel: "6A Meter" },
];

export const WATER_METER_PAIRED_VALVE_REF = "LUNA-L06-APT-A-UTILITY-VALVE-01";

const WATER_BOARD_REFS = new Set(WATER_BOARD_ASSETS.map((a) => a.ref));

// The 6A meter's paired isolation valve is a real, independently-focusable
// canonical asset (Oyi's "nearest isolation point for Apartment 6A" must
// resolve directly to it, not to the meter) even though it shares the
// meter's tab rather than getting a ninth tab of its own. isWaterBoardRef/
// waterBoardTabKeyFor let any ref that BELONGS to a tab (not just a tab's
// own key) open and focus the board correctly.
export function isWaterBoardRef(ref: string): boolean {
  return WATER_BOARD_REFS.has(ref) || ref === WATER_METER_PAIRED_VALVE_REF;
}

/** Which tab's activeTabKey a given focusable ref belongs to — identity
 * for everything except the paired valve, which belongs to the meter's
 * tab. */
export function waterBoardTabKeyFor(ref: string): string {
  return ref === WATER_METER_PAIRED_VALVE_REF ? "LUNA-L06-APT-A-METER-WATER-01" : ref;
}

export const WATER_BOARD_DEFAULT_REF = "LUNA-B1-WATER-TANK-01";
