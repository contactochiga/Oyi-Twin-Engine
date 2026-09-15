// CCTV & Spatial Security System V1 — camera live state, the same
// philosophy as resolveFireState()/resolveHvacState()/
// resolveAccessAuthorization(): computed fresh from canonical assets' live
// runtime rows every call, never stored/duplicated state. The CCTV
// Control Board, contextual camera panel, Oyi, and the 3D representation
// all read this exact function — the renderer never decides camera state.
//
// SCHEDULE BOUNDARY (docs/LUNA_MASTER_EQUIPMENT_SCHEDULE.md, EQ-CCTV /
// EQ-RECORDING / "Current instance register"): exactly four cameras are
// registered, all `observable; none` — zero commands, zero PTZ, zero
// recording (EQ-RECORDING has "No registered instance yet" — no NVR
// exists). `lunaRuntimeSeed.ts`'s own comment already states camera
// streams have "no non-fake way to represent" — this resolver reports
// ONLY the `online` field the runtime already tracks (readOnlyBehavior),
// never a fabricated PTZ/recording/live-view state.
//
// Camera state is deliberately limited to online/offline — no FAULT or
// MAINTENANCE is invented, since no `fault`/`maintenance` field exists on
// any camera's runtime row and no scenario sets one (matching the exact
// "do not blindly implement every state" discipline Access V1 already
// established for door-motion states).

import { useEffect, useState } from "react";
import { lunaSimulationProvider } from "./lunaSimulationProvider";
import { lunaTwinDataProvider } from "../operational/lunaTwinDataProvider";
import { relationshipsFrom, relationshipsTo } from "../../engine/engineeringRelationships";
import { LUNA_ENGINEERING_RELATIONSHIPS } from "../operational/lunaEngineeringRelationships";

export type CctvCameraState = "online" | "offline";

export interface CctvCamera {
  ref: string;
  label: string;
  locationLabel: string;
  state: CctvCameraState;
  online: boolean;
  /** The access point this camera has a real, canonical monitored_by
   * relationship TO (reverse direction) — null if none is registered.
   * Never inferred from proximity. */
  monitorsAccessPointRef: string | null;
}

// The CCTV system's own registered inventory — exactly the four cameras
// the Master Equipment Schedule establishes. The apartment video intercom
// (LUNA-L06-APT-A-ENTRY-INTERCOM-01) is also `kind: "camera"` but belongs
// to Access/apartment-devices, not this system's own inventory — it is
// only ever reached via the monitored_by relationship below, never listed
// here (Section 16's Access/CCTV boundary: CCTV owns camera state, Access
// owns the apartment device).
export const CCTV_CAMERA_REFS = ["LUNA-GROUND-SEC-CAM-01", "LUNA-GROUND-LOBBY-CAM-01", "LUNA-B1-PARKING-CAM-01", "LUNA-L06-COMMON-CAM-01"];

export function resolveCameraState(ref: string): CctvCamera | null {
  const asset = lunaTwinDataProvider.getAsset(ref);
  const runtime = lunaSimulationProvider.getState(ref);
  if (!asset || !runtime) return null;
  const online = (runtime.state as { online?: boolean }).online !== false;
  const monitors = relationshipsTo(LUNA_ENGINEERING_RELATIONSHIPS, ref, "monitored_by")[0];
  return {
    ref,
    label: asset.label,
    locationLabel: asset.locationLabel,
    state: online ? "online" : "offline",
    online,
    monitorsAccessPointRef: monitors?.from ?? null,
  };
}

export function resolveAllCameraStates(): CctvCamera[] {
  return CCTV_CAMERA_REFS.map((ref) => resolveCameraState(ref)).filter((c): c is CctvCamera => c !== null);
}

/** The forward direction — given an access point, which camera (if any)
 * has a real, canonical monitored_by edge to it. Never a proximity guess:
 * if no edge exists, this honestly returns null rather than picking the
 * spatially nearest camera. */
export function resolveCameraForAccessPoint(accessPointRef: string): CctvCamera | null {
  const edge = relationshipsFrom(LUNA_ENGINEERING_RELATIONSHIPS, accessPointRef, "monitored_by")[0];
  if (!edge) return null;
  return resolveCameraState(edge.to);
}

export function useCameraState(ref: string): CctvCamera | null {
  const [state, setState] = useState(() => resolveCameraState(ref));
  useEffect(() => {
    setState(resolveCameraState(ref));
    return lunaSimulationProvider.subscribe(() => setState(resolveCameraState(ref)));
  }, [ref]);
  return state;
}

export function useAllCameraStates(): CctvCamera[] {
  const [state, setState] = useState(() => resolveAllCameraStates());
  useEffect(() => {
    setState(resolveAllCameraStates());
    return lunaSimulationProvider.subscribe(() => setState(resolveAllCameraStates()));
  }, []);
  return state;
}
