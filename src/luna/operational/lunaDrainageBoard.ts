// Drainage V1 — the Drainage Control Board's asset selector, mirroring
// the Water/Network Board pattern exactly (LUNA_DIGITAL_BUILDING_STANDARD
// §12 — reuse the SystemControlBoard grammar, never a bespoke panel per
// system). Only includes real canonical refs already present in
// lunaMepBackbone.ts — nothing invented here. Fixture-level drain points
// (kitchen/bath-01/02/03) are deliberately NOT given their own tabs, the
// same restraint Water shows toward its own fixture branches — they stay
// directly selectable in 3D and via Oyi.
export interface DrainageBoardAsset {
  ref: string;
  shortLabel: string;
}

export const DRAINAGE_BOARD_ASSETS: DrainageBoardAsset[] = [
  { ref: "LUNA-B1-DRAINAGE-MAIN-01", shortLabel: "B1 Discharge" },
  { ref: "LUNA-RISER-DRAINAGE-01", shortLabel: "Soil / Waste Stack" },
  { ref: "LUNA-L06-DRAINAGE-BRANCH-01", shortLabel: "L06 Branch" },
  { ref: "LUNA-L06-APT-A-DRAIN-01", shortLabel: "6A Stack Connection" },
  { ref: "LUNA-ROOF-VENT-TERMINATION-01", shortLabel: "Vent Termination" },
  { ref: "LUNA-ROOFTOP-STORM-DRAIN-01", shortLabel: "Roof Drain" },
  { ref: "LUNA-STORM-DOWNPIPE-01", shortLabel: "Downpipe" },
  { ref: "LUNA-SITE-STORM-DISCHARGE-01", shortLabel: "Site Discharge" },
];

const DRAINAGE_BOARD_REFS = new Set(DRAINAGE_BOARD_ASSETS.map((a) => a.ref));

// Fixture-level drains still need to OPEN and FOCUS the board correctly
// when selected in 3D or via Oyi (matching every prior board's own
// "anything that belongs to a tab, not just a tab's own key" contract) —
// they belong to the 6A stack connection's tab, the real node they
// physically drain to.
const FIXTURE_DRAIN_REFS = new Set([
  "LUNA-L06-APT-A-KITCHEN-DRAIN-01",
  "LUNA-L06-APT-A-BATH-01-DRAIN-01",
  "LUNA-L06-APT-A-BATH-02-DRAIN-01",
  "LUNA-L06-APT-A-BATH-03-DRAIN-01",
]);
const STACK_CONNECTION_REF = "LUNA-L06-APT-A-DRAIN-01";

export function isDrainageBoardRef(ref: string): boolean {
  return DRAINAGE_BOARD_REFS.has(ref) || FIXTURE_DRAIN_REFS.has(ref);
}

export function drainageBoardTabKeyFor(ref: string): string {
  return FIXTURE_DRAIN_REFS.has(ref) ? STACK_CONNECTION_REF : ref;
}

export const DRAINAGE_BOARD_DEFAULT_REF = "LUNA-B1-DRAINAGE-MAIN-01";
