// Luna Residences — unit occupancy/commercial lifecycle state (Phase 8).
// This is deliberately varied across Level 6's four demo units so the
// representation policy actually has to branch on it, proving the
// contract works rather than only ever seeing one value. No sales/public
// surface consumes this yet (that's a later phase) — this establishes the
// data the policy needs to accept now.
import type { UnitLifecycleState } from "../../engine/representationPolicy";

export const LUNA_UNIT_LIFECYCLE: Record<string, UnitLifecycleState> = {
  "LUNA-L06-APT-A": "occupied", // the representative assigned resident
  "LUNA-L06-APT-B": "occupied", // a different resident, not the current viewer
  "LUNA-L06-APT-C": "available", // for a future sales/public surface
  "LUNA-L06-APT-D": "reserved",
  "LUNA-L10-APT-A": "occupied",
};

export function unitLifecycleState(unitRef: string): UnitLifecycleState | undefined {
  return LUNA_UNIT_LIFECYCLE[unitRef];
}
