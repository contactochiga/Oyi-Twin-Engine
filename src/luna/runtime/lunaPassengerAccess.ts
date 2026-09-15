import type { RepresentationIdentity } from "../../engine/representationPolicy";
import { LUNA_L06_UNITS } from "../lunaProgramme";
/** Passenger action admission only. Never grants engineering or home visibility. */
export function passengerStopAllowed(identity: RepresentationIdentity | undefined, liftRef: string, floorRef: unknown): boolean {
  if (identity?.role !== "resident" || !/^LUNA-LIFT-PASS-0[123]$/.test(liftRef)) return false;
  const assigned = LUNA_L06_UNITS.some(unit => identity.assignedHomeRefs.includes(unit.ref));
  return assigned && (floorRef === "LUNA-GROUND" || floorRef === "LUNA-L06");
}
