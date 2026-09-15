// Resolves a bare canonical ref to whichever kind of space it names —
// used by the Oyi scene-navigation glue (App.tsx) to dispatch a
// space ref from the intelligence layer to the right existing camera
// handler (isolateLevelAndFly / enterInterior / focusRoom) without the
// intelligence layer itself needing to know Luna's level/interior/room
// data shapes.

import { LUNA_LEVELS } from "../lunaProgramme";
import { LUNA_INTERIORS, type InteriorSpec, type RoomLayoutSpec } from "./lunaInteriors";
import { unitPlanGeometry } from "../lunaResidentialUnits";
import type { LevelDescriptor } from "../../engine/types";
import type { CameraFlightTarget } from "../../engine/components/CameraRig";
import { GROUND_ENTRANCE_REF } from "../architecture/GroundEntrance";
import { GROUND_STAIR_REFS, stairCore } from "../architecture/groundLobbyLayout";
import { LUNA_CAMERA_PRESETS, unitExteriorFocusCamera } from "../lunaCameraPresets";

export type SpaceLookupResult =
  | { kind: "level"; level: LevelDescriptor }
  | { kind: "interior"; spec: InteriorSpec }
  | { kind: "room"; spec: InteriorSpec; room: RoomLayoutSpec }
  | { kind: "door"; ref: string; label: string; cameraTarget: CameraFlightTarget }
  /** L06 Gold Standard (Part 35) — a private residential unit with no
   * registered InteriorSpec (Apartment B/C/D, every Phase 16A generated
   * unit) — LOCATE-only (exterior focus, never an instant interior
   * enter): "Where is Apartment B?" resolves here; actually entering one
   * goes through the real route engine's own privacy check instead. The
   * real Lift Lobby/stair-link corridors do NOT need this treatment —
   * they're registered as real rooms on LUNA-L06-COMMON (lunaInteriors.ts)
   * and resolve through the ordinary `room` branch below, exactly like
   * Ground's own lobby zones. */
  | { kind: "unit"; ref: string; label: string; levelRef: string; cameraTarget: CameraFlightTarget };

/** Architectural Reality V1 — a small, explicit registry of the
 * non-"room" architectural objects Oyi can navigate to directly (Part 26:
 * "Show me the main entrance", "Take me to Stair 1"). Deliberately not a
 * general-purpose door index: only the two families this phase actually
 * builds real geometry for. */
function doorSpace(ref: string): SpaceLookupResult | undefined {
  if (ref === GROUND_ENTRANCE_REF) {
    return { kind: "door", ref, label: "Main Entrance", cameraTarget: LUNA_CAMERA_PRESETS.entranceApproach };
  }
  if (GROUND_STAIR_REFS.includes(ref)) {
    const core = stairCore(ref);
    const doorZ = core.z - core.depth / 2;
    return {
      kind: "door",
      ref: `${ref}-DOOR-01`,
      label: ref === "LUNA-STAIR-01" ? "Stair 01" : "Stair 02",
      cameraTarget: { position: [core.x, 1.7, doorZ - 3], target: [core.x, 1.3, doorZ] },
    };
  }
  return undefined;
}

export function findSpace(ref: string): SpaceLookupResult | undefined {
  const level = LUNA_LEVELS.find((l) => l.ref === ref);
  if (level) return { kind: "level", level };

  const interior = LUNA_INTERIORS.find((i) => i.interiorRef === ref);
  if (interior) return { kind: "interior", spec: interior };

  for (const spec of LUNA_INTERIORS) {
    const room = spec.rooms.find((r) => r.ref === ref);
    if (room) return { kind: "room", spec, room };
  }

  const door = doorSpace(ref);
  if (door) return door;

  // L06 Gold Standard (Part 35) — any private unit WITHOUT its own
  // registered interior (Apartment B/C/D, every Phase 16A generated
  // unit): a real exterior-focus destination, never a fabricated
  // interior-enter. Units WITH a real interior (Apartment A, L10-Apt-A)
  // already returned via the `interior` branch above.
  const planGeometry = unitPlanGeometry(ref);
  if (planGeometry) {
    return { kind: "unit", ref, label: ref, levelRef: planGeometry.levelRef, cameraTarget: unitExteriorFocusCamera(planGeometry.levelRef, planGeometry) };
  }

  return undefined;
}

/** True when `ref` names a private residential unit — any unit
 * `unitPlanGeometry` resolves (L06/L10's real units plus every Phase 16A
 * generated unit), or the one private unit that has no plan geometry of
 * its own: LUNA-PENTHOUSE (the whole level IS the one apartment, see
 * lunaRepresentationPolicy.ts's LUNA_PRIVATE_UNIT_REFS, hand-verified to
 * be the only entry there `unitPlanGeometry` can't already recognize —
 * kept as a local literal rather than importing that policy module here,
 * which imports THIS module for `findSpace` and would otherwise create a
 * circular dependency). Spatial-navigation restoration pass §5/§7 — this
 * is the one test that tells a level's own common-area interior (Ground
 * Lobby, Residents' Club, Luna Sky) apart from a private apartment
 * interior that merely happens to share its owner level. */
export function isPrivateUnitInteriorRef(ref: string): boolean {
  return ref === "LUNA-PENTHOUSE" || Boolean(unitPlanGeometry(ref));
}

/** The registered COMMON-area interior for a level, if any — Ground's
 * Lobby, the Residents' Club, Luna Sky. Never a private apartment (see
 * isPrivateUnitInteriorRef), and never fabricated: only ever returns an
 * interior that's actually in LUNA_INTERIORS, so a level with no
 * registered common space (B1, most residential floors) simply returns
 * undefined rather than inventing one. */
export function commonInteriorForLevel(levelRef: string): InteriorSpec | undefined {
  return LUNA_INTERIORS.find((i) => i.ownerLevelRef === levelRef && !isPrivateUnitInteriorRef(i.interiorRef));
}

/** The registered private-apartment interior for a unit ref, if Phase 3
 * ever authored one — only LUNA-L06-APT-A, LUNA-L10-APT-A and
 * LUNA-PENTHOUSE have real room geometry today; every other unit
 * (LUNA-L06-APT-B/C/D, every Phase 16A generated unit) correctly returns
 * undefined here, which is what gates "Enter Apartment" off for them. */
export function interiorForUnit(unitRef: string): InteriorSpec | undefined {
  return LUNA_INTERIORS.find((i) => i.interiorRef === unitRef);
}
